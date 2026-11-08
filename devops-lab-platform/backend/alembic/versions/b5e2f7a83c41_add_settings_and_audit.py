"""add platform settings + admin audit log

Revision ID: b5e2f7a83c41
Revises: a7c3d9e41b52
Create Date: 2026-11-08
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "b5e2f7a83c41"
down_revision = "a7c3d9e41b52"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "platform_settings",
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("value", sa.Text(), nullable=True),
        sa.Column("updated_by", sa.String(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("key"),
    )
    op.create_table(
        "admin_audit_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_email", sa.String(), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("target", sa.String(), nullable=True),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_admin_audit_log_created_at", "admin_audit_log", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_admin_audit_log_created_at", table_name="admin_audit_log")
    op.drop_table("admin_audit_log")
    op.drop_table("platform_settings")
