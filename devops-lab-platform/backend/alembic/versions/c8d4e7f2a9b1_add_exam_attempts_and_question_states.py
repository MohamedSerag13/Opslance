"""add exam_attempts and question_states (runner, schema v2)

Revision ID: c8d4e7f2a9b1
Revises: merge_heads_123
Create Date: 2026-11-06 10:30:00.000000

Additive only: two new tables for the question-by-question lab runner
(see docs/AUTHORING_LABS.md). No existing table or checker is touched.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'c8d4e7f2a9b1'
down_revision: Union[str, Sequence[str], None] = 'merge_heads_123'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'exam_attempts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('lab_sessions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('student_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('students.id'), nullable=False),
        sa.Column('lab_id', sa.String(), sa.ForeignKey('labs.id'), nullable=False),
        sa.Column('mode', sa.String(), nullable=False, server_default='practice'),
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
        sa.Column('question_ids', sa.Text(), nullable=False, server_default='[]'),
        sa.Column('current_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('pass_mark', sa.Integer(), nullable=False, server_default='70'),
        sa.Column('score_total', sa.Integer(), nullable=False, server_default='100'),
        sa.Column('score_earned', sa.Integer(), server_default='0'),
        sa.Column('passed', sa.Boolean(), nullable=True),
    )
    op.create_index('idx_attempts_session_status', 'exam_attempts', ['session_id', 'status'])

    op.create_table(
        'question_states',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('attempt_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('exam_attempts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('question_id', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='unanswered'),
        sa.Column('checks_run', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_passed', sa.Boolean(), nullable=True),
        sa.Column('last_output', sa.Text(), nullable=True),
        sa.Column('hints_revealed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('flagged', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('first_passed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.UniqueConstraint('attempt_id', 'question_id', name='uq_attempt_question'),
    )


def downgrade() -> None:
    op.drop_table('question_states')
    op.drop_index('idx_attempts_session_status', table_name='exam_attempts')
    op.drop_table('exam_attempts')
