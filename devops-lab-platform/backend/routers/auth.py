import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from schemas import LoginData, Token, RefreshData, UserMe
from database import get_db
import models
from auth import verify_password, create_access_token, create_refresh_token, decode_token
from dependencies import get_current_user

router = APIRouter()

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
ADMIN_FULL_NAME = os.getenv("ADMIN_FULL_NAME", "Admin")

@router.post("/login", response_model=Token)
def login(data: LoginData, db: Session = Depends(get_db)):
    if data.email == ADMIN_EMAIL and data.password == ADMIN_PASSWORD:
        user_id = "admin"
        role = "admin"
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

    access_token = create_access_token(data={"sub": user_id, "role": role, "email": data.email})
    refresh_token = create_refresh_token(data={"sub": user_id, "role": role, "email": data.email})

    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

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
        return UserMe(id=current_user.id, email=current_user.email, full_name=current_user.full_name, role="student", group_id=current_user.group_id)
