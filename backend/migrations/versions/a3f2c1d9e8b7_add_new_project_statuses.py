"""add new project statuses

Revision ID: a3f2c1d9e8b7
Revises: 7b56f9ea72fd
Create Date: 2026-06-23 10:19:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a3f2c1d9e8b7'
down_revision = '7b56f9ea72fd'
branch_labels = None
depends_on = None

# New enum values to add
NEW_STATUSES = ['NOT_STARTED', 'REVIEW', 'ON_HOLD', 'CANCELLED']


def upgrade():
    # PostgreSQL requires ALTER TYPE to add new enum values
    # We add them one by one; IF NOT EXISTS guards against re-runs
    for status in NEW_STATUSES:
        op.execute(
            f"ALTER TYPE projectstatus ADD VALUE IF NOT EXISTS '{status}'"
        )


def downgrade():
    # PostgreSQL does NOT support removing enum values natively.
    # To fully downgrade you would need to recreate the type.
    # Safest approach: convert any rows using new statuses back to IN_PROGRESS,
    # then recreate the enum without the new values.
    op.execute(
        """
        UPDATE projects
        SET status = 'IN_PROGRESS'
        WHERE status IN ('NOT_STARTED', 'REVIEW', 'ON_HOLD', 'CANCELLED')
        """
    )
    # Note: PostgreSQL enum type recreation requires a full type swap.
    # This is left as a manual step; the app remains functional with old statuses
    # simply not appearing in the UI.
