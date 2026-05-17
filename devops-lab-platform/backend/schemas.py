from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: str

class LoginData(BaseModel):
    email: EmailStr
    password: str

class RefreshData(BaseModel):
    refresh_token: str

class UserMe(BaseModel):
    id: UUID | str
    email: EmailStr
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
    email: EmailStr
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
    class Config:
        from_attributes = True

class StudentListOut(StudentOut):
    group_name: Optional[str] = None
    labs_done: int = 0
    total_score: int = 0

class ResetPassword(BaseModel):
    password: str

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
