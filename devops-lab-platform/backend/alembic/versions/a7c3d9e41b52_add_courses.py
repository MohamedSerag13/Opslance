"""add courses

Revision ID: a7c3d9e41b52
Revises: merge_heads (f6c9cf301a78 + efa96a293865)
Create Date: 2026-11-08
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "a7c3d9e41b52"
down_revision = "c8d4e7f2a9b1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "courses",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("subtitle", sa.String(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("author", sa.String(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_weeks", sa.Integer(), nullable=True),
        sa.Column("hours_per_week", sa.Integer(), nullable=True),
        sa.Column("exam_domain", sa.String(), nullable=True),
        sa.Column("pass_mark", sa.Integer(), nullable=True),
        sa.Column("difficulty", sa.String(), nullable=True),
        sa.Column("tags", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("cover_color", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_table(
        "course_weeks",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("course_id", sa.String(), nullable=False),
        sa.Column("week_number", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("dates", sa.String(), nullable=True),
        sa.Column("focus", sa.Text(), nullable=True),
        sa.Column("exam_domain", sa.String(), nullable=True),
        sa.Column("gate", sa.Text(), nullable=True),
        sa.Column("days", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "student_course_progress",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("course_id", sa.String(), nullable=False),
        sa.Column("week_number", sa.Integer(), nullable=False),
        sa.Column("day_index", sa.Integer(), nullable=False),
        sa.Column("tick_read", sa.Boolean(), nullable=True),
        sa.Column("tick_course", sa.Boolean(), nullable=True),
        sa.Column("tick_lab", sa.Boolean(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_id", "course_id", "week_number", "day_index",
                            name="uq_student_course_day"),
    )


def downgrade() -> None:
    op.drop_table("student_course_progress")
    op.drop_table("course_weeks")
    op.drop_table("courses")
