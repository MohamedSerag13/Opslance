"""add_must_reset_password_to_students

Revision ID: a1b2c3d4e5f6
Revises: 0c1e972043e9
Create Date: 2026-06-08 15:49:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '0c1e972043e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add the must_reset_password column.
    # New rows default to True so every newly-created student will be prompted
    # to reset on first login.
    # NOTE: Existing rows will also receive True — see the one-off SQL note
    # in the PR description if you want to grandfather existing students in.
    op.add_column(
        'students',
        sa.Column('must_reset_password', sa.Boolean(), nullable=False, server_default=sa.text('true'))
    )


def downgrade() -> None:
    op.drop_column('students', 'must_reset_password')
