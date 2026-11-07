import os
import json
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
import models
from dependencies import get_current_student
from email_service import send_subscription_email_task
from logging_setup import get_logger
import stripe

logger = get_logger("billing")

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
# Unverified (mock) webhooks must never be reachable by accident: they bypass
# signature checks and could grant Pro for free. They only load with an
# explicit STRIPE_DEV_MODE=1 alongside the missing webhook secret.
STRIPE_DEV_MODE = os.getenv("STRIPE_DEV_MODE") == "1"
STRIPE_PRO_PRICE_ID = os.getenv("STRIPE_PRO_PRICE_ID")
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost")

router = APIRouter()

@router.post("/create-checkout-session")
def create_checkout_session(db: Session = Depends(get_db), student=Depends(get_current_student)):
    if not STRIPE_PRO_PRICE_ID:
        raise HTTPException(status_code=500, detail="Stripe price ID is not configured")
        
    try:
        customer_id = student.stripe_customer_id
        if not customer_id:
            customer = stripe.Customer.create(
                email=student.email,
                name=student.full_name,
                metadata={"student_id": str(student.id)}
            )
            customer_id = customer.id
            student.stripe_customer_id = customer_id
            db.commit()
            
        checkout_session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price": STRIPE_PRO_PRICE_ID,
                "quantity": 1
            }],
            mode="subscription",
            success_url=f"{FRONTEND_BASE_URL}/billing?success=true",
            cancel_url=f"{FRONTEND_BASE_URL}/billing?canceled=true",
            metadata={"student_id": str(student.id)}
        )
        return {"url": checkout_session.url}
    except Exception as e:
        # checkout internals (Stripe API errors) stay in the logs, not the response
        logger.error("stripe_checkout_failed", error=str(e))
        raise HTTPException(status_code=400, detail="Could not create checkout session")

@router.post("/webhook")
async def stripe_webhook(request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    if not STRIPE_WEBHOOK_SECRET:
        if not STRIPE_DEV_MODE:
            # Fail closed: no signature secret configured and dev mode not
            # explicitly enabled — never process unverified upgrade events.
            logger.error("Refusing unverified Stripe webhook: STRIPE_WEBHOOK_SECRET missing and STRIPE_DEV_MODE not enabled")
            raise HTTPException(
                status_code=503,
                detail="Webhook verification is not configured",
            )
        # Mock/Development webhook handler — only with STRIPE_DEV_MODE=1
        try:
            data = json.loads(payload)
            event_type = data.get("type")
            event_object = data.get("data", {}).get("object", {})
            logger.warning("[stripe-mock] Accepted UNVERIFIED event %s (STRIPE_DEV_MODE=1)", event_type)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid payload")
    else:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, STRIPE_WEBHOOK_SECRET
            )
            event_type = event["type"]
            event_object = event["data"]["object"]
            # StripeObject has no .get() (attribute access maps through
            # __getitem__, so obj.get("metadata") raises KeyError('get')).
            # to_dict() converts recursively to plain dicts — same shape as
            # the dev-mode branch.
            event_object = event_object.to_dict()
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid signature")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid payload")
            
    if event_type == "checkout.session.completed":
        session = event_object
        student_id = session.get("metadata", {}).get("student_id")
        customer_id = session.get("customer")
        
        student = None
        if student_id:
            student = db.query(models.Student).filter(models.Student.id == student_id).first()
        if not student and customer_id:
            student = db.query(models.Student).filter(models.Student.stripe_customer_id == customer_id).first()
            
        if student:
            student.subscription_tier = "pro"
            if customer_id:
                student.stripe_customer_id = customer_id
            db.commit()
            
            from datetime import datetime
            billing_date = datetime.now().strftime("%B %d, %Y")
            background_tasks.add_task(send_subscription_email_task, student.email, "Pro Tier Plan", billing_date)
            logger.info("stripe_student_upgraded", student_id=str(student.id), tier="pro")
            
    elif event_type in ["customer.subscription.deleted", "invoice.payment_failed"]:
        subscription = event_object
        customer_id = subscription.get("customer")
        if customer_id:
            student = db.query(models.Student).filter(models.Student.stripe_customer_id == customer_id).first()
            if student:
                student.subscription_tier = "free"
                db.commit()
                logger.info("stripe_student_downgraded", student_id=str(student.id), tier="free")
                
    return {"status": "success"}

@router.get("/status")
def get_billing_status(db: Session = Depends(get_db), student=Depends(get_current_student)):
    tier = getattr(student, "subscription_tier", "free")
    customer_id = getattr(student, "stripe_customer_id", None)
    
    plan = "Free Tier" if tier == "free" else "Pro Tier"
    next_billing_date = "N/A"
    cancellation_status = "N/A"
    portal_url = ""
    
    if tier == "pro" and customer_id:
        try:
            subscriptions = stripe.Subscription.list(customer=customer_id, status="active", limit=1)
            if subscriptions.data:
                sub = subscriptions.data[0]
                from datetime import datetime
                next_billing_date = datetime.fromtimestamp(sub.current_period_end).strftime("%B %d, %Y")
                cancellation_status = "Cancelled (ends at period end)" if sub.cancel_at_period_end else "Active"
        except Exception as e:
            logger.error("stripe_subscription_query_failed", error=str(e), customer_id=customer_id)
            
    if customer_id:
        try:
            portal_session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=f"{FRONTEND_BASE_URL}/billing"
            )
            portal_url = portal_session.url
        except Exception as e:
            logger.error("stripe_portal_creation_failed", error=str(e), customer_id=customer_id)
            
    return {
        "tier": tier,
        "plan": plan,
        "next_billing_date": next_billing_date,
        "cancellation_status": cancellation_status,
        "portal_url": portal_url
    }
