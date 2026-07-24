"""add semester to subjects

Revision ID: 9709d33a7391
Revises: f4a1b2c3d4e5
Create Date: 2026-07-24 07:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9709d33a7391'
down_revision = 'f4a1b2c3d4e5'
branch_labels = None
depends_on = None


def upgrade():
    # Add column semester with default=1
    op.add_column('subjects', sa.Column('semester', sa.Integer(), nullable=False, server_default='1'))


def downgrade():
    op.drop_column('subjects', 'semester')
