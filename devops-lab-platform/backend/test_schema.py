from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
import uuid

class UserMe(BaseModel):
    id: UUID | str
    email: EmailStr
    full_name: str
    role: str
    group_id: Optional[UUID] = None

try:
    user = UserMe(id="admin", email="admin@opslance.local", full_name="Admin", role="admin")
    print("Admin ID parsing successful:", user.id)
except Exception as e:
    print("Error:", e)
