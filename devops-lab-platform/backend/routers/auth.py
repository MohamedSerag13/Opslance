import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from schemas import LoginData, Token, RefreshData, UserMe, PasswordResetRequest
from database import get_db
import models
from auth import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from dependencies import get_current_user, get_current_student

router = APIRouter()

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
ADMIN_FULL_NAME = os.getenv("ADMIN_FULL_NAME", "Admin")

@router.post("/login", response_model=Token)
def login(data: LoginData, db: Session = Depends(get_db)):
    # Admin login — not a Student row, flag does not apply
    if data.email == ADMIN_EMAIL and data.password == ADMIN_PASSWORD:
        user_id = "admin"
        role = "admin"
        must_reset = False
    else:
        student = db.query(models.Student).filter(models.Student.email == data.email).first()
        if not student or not verify_password(data.password, student.password_hash):
            raise HTTPException(status_code=401, detail="Incorrect email or password")
        if not student.is_active:
            raise HTTPException(status_code=401, detail="Account is inactive")

        student.last_login = datetime.utcnow()
        db.commit()
        user_id = str(student.id)
        role = "student"
        must_reset = bool(student.must_reset_password)

    access_token = create_access_token(data={"sub": user_id, "role": role, "email": data.email})
    refresh_token = create_refresh_token(data={"sub": user_id, "role": role, "email": data.email})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "must_reset_password": must_reset,
    }

@router.post("/refresh", response_model=Token)
def refresh(data: RefreshData):
    payload = decode_token(data.refresh_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload.get("sub")
    role = payload.get("role")
    email = payload.get("email")

    access_token = create_access_token(data={"sub": user_id, "role": role, "email": email})
    new_refresh = create_refresh_token(data={"sub": user_id, "role": role, "email": email})

    return {"access_token": access_token, "refresh_token": new_refresh, "token_type": "bearer"}

@router.post("/logout")
def logout():
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserMe)
def get_me(current_user = Depends(get_current_user)):
    if type(current_user) == dict:
        return UserMe(id="admin", email=current_user["email"], full_name=ADMIN_FULL_NAME, role="admin")
    else:
        return UserMe(
            id=current_user.id,
            email=current_user.email,
            full_name=current_user.full_name,
            role="student",
            group_id=current_user.group_id
        )

@router.put("/preferences")
def update_preferences(data: dict, db: Session = Depends(get_db), student=Depends(get_current_student)):
    opt_out = data.get("opt_out_completion")
    if opt_out is not None:
        student.opt_out_completion = opt_out
        db.commit()
    return {
        "message": "Preferences updated successfully",
        "opt_out_completion": student.opt_out_completion
    }

@router.put("/reset-password")
def reset_password(
    data: PasswordResetRequest,
    db: Session = Depends(get_db),
    student: models.Student = Depends(get_current_student),
):
    """
    Authenticated endpoint — requires a valid student JWT.
    Validates that new_password == confirm_password (min 8 chars enforced by schema),
    hashes the new password, and clears the must_reset_password flag.
    """
    if data.new_password != data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match",
        )

    student.password_hash = get_password_hash(data.new_password)
    student.must_reset_password = False
    db.commit()

    return {"message": "Password updated successfully"}
