"""add semester column to subjects

Revision ID: a1b2c3d4e5f6
Revises: 7b56f9ea72fd
Create Date: 2026-07-20 22:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '7b56f9ea72fd'
branch_labels = None
depends_on = None


def upgrade():
    # Add nullable semester column to subjects table
    # Existing subjects will have semester=NULL and appear in "Unsorted" tab on frontend
    op.add_column('subjects',
        sa.Column('semester', sa.Integer(), nullable=True)
    )


def downgrade():
    op.drop_column('subjects', 'semester')
