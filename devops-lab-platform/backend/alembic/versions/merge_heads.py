"""merge heads

Revision ID: merge_heads_123
Revises: ('21be2f9b1a77', 'a1b2c3d4e5f6')
Create Date: 2026-06-10 09:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'merge_heads_123'
down_revision: Union[str, Sequence[str], None] = ('21be2f9b1a77', 'a1b2c3d4e5f6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
