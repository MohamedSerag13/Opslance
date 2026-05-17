from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
import models
from auth import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    user_id = payload.get("sub")
    role = payload.get("role")
    
    if role == "admin":
        return {"id": user_id, "role": "admin", "email": payload.get("email")}
    elif role == "student":
        student = db.query(models.Student).filter(models.Student.id == user_id).first()
        if not student or not student.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive user")
        return student
    else:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown role")

def get_current_student(user = Depends(get_current_user)):
    role = user.get("role") if isinstance(user, dict) else getattr(user, "role", "student")
    if role == "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a student")
    return user

def require_admin(user = Depends(get_current_user)):
    if type(user) == dict and user.get("role") == "admin":
        return user
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
