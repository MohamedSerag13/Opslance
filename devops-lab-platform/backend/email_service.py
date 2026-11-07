import os
import requests
from dataclasses import dataclass

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
EMAIL_FROM_ADDRESS = os.getenv("EMAIL_FROM_ADDRESS", "no-reply@opslance.com")
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "Opslance")
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost")

@dataclass
class EmailTemplate:
    subject: str
    html_body: str

def get_welcome_template(username: str) -> EmailTemplate:
    subject = "Welcome to Opslance! 🚀"
    html_body = f"""
    <html>
        <body style="font-family: sans-serif; color: #1f2937; line-height: 1.5; padding: 20px;">
            <h2 style="color: #4f46e5;">Welcome to Opslance, {username}!</h2>
            <p>We are thrilled to have you join our interactive DevOps lab platform.</p>
            <p>At Opslance, you learn system engineering, orchestration, and automation by breaking and fixing real running environments.</p>
            <p>Get started immediately by launching your first hands-on lab:</p>
            <div style="margin: 25px 0;">
                <a href="{FRONTEND_BASE_URL}/labs/module-01-lab-01-lost-in-the-filesystem" 
                   style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                   Start Your First Lab
                </a>
            </div>
            <p>Best regards,<br><strong>The Opslance Team</strong></p>
        </body>
    </html>
    """
    return EmailTemplate(subject, html_body)

def get_lab_completion_template(lab_title: str, score: int, next_lab_title: str, next_lab_id: str) -> EmailTemplate:
    subject = f"Congratulations! Lab Completed: {lab_title} 🎉"
    html_body = f"""
    <html>
        <body style="font-family: sans-serif; color: #1f2937; line-height: 1.5; padding: 20px;">
            <h2 style="color: #10b981;">Outstanding Work!</h2>
            <p>You have successfully completed the lab <strong>{lab_title}</strong> with a perfect score of <strong>{score}/100</strong>!</p>
            <p>Don't stop now! Continue your learning momentum with your next recommended lab:</p>
            <p style="font-size: 16px; font-weight: bold; color: #4f46e5;">{next_lab_title}</p>
            <div style="margin: 25px 0;">
                <a href="{FRONTEND_BASE_URL}/labs/{next_lab_id}" 
                   style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                   Start Next Lab
                </a>
            </div>
            <p>Happy engineering,<br><strong>The Opslance Team</strong></p>
        </body>
    </html>
    """
    return EmailTemplate(subject, html_body)

def get_subscription_template(plan_name: str, billing_date: str) -> EmailTemplate:
    subject = "Your Pro Subscription is Confirmed! 💎"
    html_body = f"""
    <html>
        <body style="font-family: sans-serif; color: #1f2937; line-height: 1.5; padding: 20px;">
            <h2 style="color: #4f46e5;">Thank you for upgrading!</h2>
            <p>Your subscription to <strong>{plan_name}</strong> is now confirmed. Your next billing date is <strong>{billing_date}</strong>.</p>
            <p>Here are the Pro features now fully unlocked on your account:</p>
            <ul style="padding-left: 20px;">
                <li style="margin-bottom: 8px;"><strong>Full Access:</strong> Unrestricted access to all modules and advanced labs.</li>
                <li style="margin-bottom: 8px;"><strong>High Capacity:</strong> Spin up to 3 concurrent lab sessions simultaneously.</li>
                <li style="margin-bottom: 8px;"><strong>Extended Duration:</strong> Run containers for up to 2 hours per session.</li>
                <li style="margin-bottom: 8px;"><strong>Time Extension:</strong> Add 30-minute blocks to active sessions anytime.</li>
            </ul>
            <div style="margin: 25px 0;">
                <a href="{FRONTEND_BASE_URL}/dashboard" 
                   style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                   Go to My Dashboard
                </a>
            </div>
            <p>Happy learning,<br><strong>The Opslance Team</strong></p>
        </body>
    </html>
    """
    return EmailTemplate(subject, html_body)

def send_email(to_email: str, subject: str, html_body: str):
    if not SENDGRID_API_KEY:
        print(f"[email-mock] Mock send to {to_email} | Subject: {subject}", flush=True)
        return
        
    url = "https://api.sendgrid.com/v3/mail/send"
    headers = {
        "Authorization": f"Bearer {SENDGRID_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "personalizations": [{
            "to": [{"email": to_email}]
        }],
        "from": {
            "email": EMAIL_FROM_ADDRESS,
            "name": EMAIL_FROM_NAME
        },
        "subject": subject,
        "content": [{
            "type": "text/html",
            "value": html_body
        }]
    }
    
    try:
        response = requests.post(url, headers=headers, json=data, timeout=10)
        if response.status_code >= 300:
            print(f"[email-error] SendGrid failed with code {response.status_code}: {response.text}", flush=True)
        else:
            print(f"[email-success] Email sent to {to_email} successfully", flush=True)
    except Exception as e:
        print(f"[email-error] Error sending mail: {e}", flush=True)

def send_welcome_email_task(to_email: str, username: str):
    tmpl = get_welcome_template(username)
    send_email(to_email, tmpl.subject, tmpl.html_body)

def send_lab_completion_email_task(to_email: str, lab_title: str, score: int, next_lab_title: str, next_lab_id: str):
    tmpl = get_lab_completion_template(lab_title, score, next_lab_title, next_lab_id)
    send_email(to_email, tmpl.subject, tmpl.html_body)

def send_subscription_email_task(to_email: str, plan_name: str, billing_date: str):
    tmpl = get_subscription_template(plan_name, billing_date)
    send_email(to_email, tmpl.subject, tmpl.html_body)
