from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: str
    must_reset_password: Optional[bool] = False

class LoginData(BaseModel):
    email: str
    password: str

class RefreshData(BaseModel):
    refresh_token: str

class UserMe(BaseModel):
    id: UUID | str
    email: str
    full_name: str
    role: str
    group_id: Optional[UUID] = None

class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None

class GroupCreate(GroupBase):
    pass

class GroupUpdate(GroupBase):
    pass

class GroupOut(GroupBase):
    id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

class GroupListOut(GroupOut):
    student_count: int = 0
    labs_completed: int = 0
    avg_score: float = 0.0

class StudentBase(BaseModel):
    full_name: str
    email: str
    group_id: Optional[UUID] = None
    is_active: bool = True

class StudentCreate(StudentBase):
    password: str

class StudentUpdate(StudentBase):
    pass

class StudentOut(StudentBase):
    id: UUID
    created_at: datetime
    last_login: Optional[datetime] = None
    subscription_tier: Optional[str] = 'free'
    xp: int = 0
    level: int = 1
    class Config:
        from_attributes = True

class StudentListOut(StudentOut):
    group_name: Optional[str] = None
    labs_done: int = 0
    total_score: int = 0

class PointsUpdate(BaseModel):
    xp: int
    reason: Optional[str] = None

class PlanUpdate(BaseModel):
    plan: str # "free" | "pro" | "enterprise"

class ResetPassword(BaseModel):
    password: str

class PasswordResetRequest(BaseModel):
    new_password: str
    confirm_password: str

    @field_validator('new_password')
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

class LabBase(BaseModel):
    id: str
    module_number: int
    module_title: str
    title: str
    difficulty: str
    estimated_minutes: int
    points: int
    category: str
    description: Optional[str] = None
    is_globally_active: bool = True

class LabUpdate(BaseModel):
    points: Optional[int] = None
    estimated_minutes: Optional[int] = None
    difficulty: Optional[str] = None

class LabOut(LabBase):
    class Config:
        from_attributes = True

class GroupLabUpdate(BaseModel):
    is_visible: bool
    unlock_order: int

class ReorderLabs(BaseModel):
    lab_ids: List[str]

class SessionCreate(BaseModel):
    lab_id: str

class SessionOut(BaseModel):
    id: UUID
    lab_id: str
    status: str
    started_at: datetime
    expires_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class SubmissionOut(BaseModel):
    passed: bool
    score: int
    verification_output: Optional[str] = None
