"""add title column to project_messages

Revision ID: g5b2a3c4d5e6
Revises: f4a1b2c3d4e5
Create Date: 2026-07-26 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'g5b2a3c4d5e6'
down_revision = '9709d33a7391'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('project_messages', sa.Column('title', sa.String(length=500), nullable=True))


def downgrade():
    op.drop_column('project_messages', 'title')
