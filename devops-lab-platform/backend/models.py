import uuid
from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Group(Base):
    __tablename__ = "groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    students = relationship("Student", back_populates="group")
    group_labs = relationship("GroupLab", back_populates="group", cascade="all, delete-orphan")


class Student(Base):
    __tablename__ = "students"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)

    group = relationship("Group", back_populates="students")
    sessions = relationship("LabSession", back_populates="student")


class Lab(Base):
    __tablename__ = "labs"

    id = Column(String, primary_key=True)
    module_number = Column(Integer, nullable=False)
    module_title = Column(String, nullable=False)
    title = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)
    estimated_minutes = Column(Integer, nullable=False)
    points = Column(Integer, nullable=False)
    category = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    is_globally_active = Column(Boolean, default=True)

    group_labs = relationship("GroupLab", back_populates="lab", cascade="all, delete-orphan")


class GroupLab(Base):
    __tablename__ = "group_labs"

    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), primary_key=True)
    lab_id = Column(String, ForeignKey("labs.id"), primary_key=True)
    is_visible = Column(Boolean, default=False)
    unlock_order = Column(Integer, nullable=False)

    group = relationship("Group", back_populates="group_labs")
    lab = relationship("Lab", back_populates="group_labs")


class LabSession(Base):
    __tablename__ = "lab_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    lab_id = Column(String, ForeignKey("labs.id"), nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    last_active_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="running")
    container_name = Column(String, nullable=True)
    host_port = Column(Integer, nullable=True)

    student = relationship("Student", back_populates="sessions")
    lab = relationship("Lab")
    submissions = relationship("Submission", back_populates="session")
    commands = relationship("CommandHistory", back_populates="session")


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("lab_sessions.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    lab_id = Column(String, ForeignKey("labs.id"), nullable=False)
    attempt_number = Column(Integer, nullable=False, default=1)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    passed = Column(Boolean, nullable=False)
    verification_output = Column(Text, nullable=True)
    score = Column(Integer, nullable=False, default=0)
    hints_used = Column(Integer, nullable=False, default=0)
    time_taken_minutes = Column(Integer, nullable=True)

    session = relationship("LabSession", back_populates="submissions")
    student = relationship("Student")
    lab = relationship("Lab")


class CommandHistory(Base):
    __tablename__ = "command_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("lab_sessions.id"), nullable=False)
    command = Column(Text, nullable=False)
    output = Column(Text, nullable=True)
    ran_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("LabSession", back_populates="commands")
