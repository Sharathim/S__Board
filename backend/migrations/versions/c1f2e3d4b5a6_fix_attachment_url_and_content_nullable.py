"""fix attachment_url to Text and forum_post content to nullable

Revision ID: c1f2e3d4b5a6
Revises: a3f2c1d9e8b7
Create Date: 2026-06-27 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c1f2e3d4b5a6'
down_revision = 'a3f2c1d9e8b7'
branch_labels = None
depends_on = None


def upgrade():
    # ── forum_posts ──────────────────────────────────────────────────────────
    # Make content nullable (so image-only posts work)
    with op.batch_alter_table('forum_posts', schema=None) as batch_op:
        batch_op.alter_column('content',
                              existing_type=sa.Text(),
                              nullable=True)
        batch_op.alter_column('attachment_url',
                              existing_type=sa.String(length=500),
                              type_=sa.Text(),
                              existing_nullable=True)
        batch_op.alter_column('attachment_type',
                              existing_type=sa.String(length=50),
                              type_=sa.Text(),
                              existing_nullable=True)

    # ── updates ──────────────────────────────────────────────────────────────
    # Widen attachment_url / attachment_type to Text so multiple URLs fit
    with op.batch_alter_table('updates', schema=None) as batch_op:
        batch_op.alter_column('attachment_url',
                              existing_type=sa.String(length=500),
                              type_=sa.Text(),
                              existing_nullable=True)
        batch_op.alter_column('attachment_type',
                              existing_type=sa.String(length=50),
                              type_=sa.Text(),
                              existing_nullable=True)


def downgrade():
    with op.batch_alter_table('updates', schema=None) as batch_op:
        batch_op.alter_column('attachment_type',
                              existing_type=sa.Text(),
                              type_=sa.String(length=50),
                              existing_nullable=True)
        batch_op.alter_column('attachment_url',
                              existing_type=sa.Text(),
                              type_=sa.String(length=500),
                              existing_nullable=True)

    with op.batch_alter_table('forum_posts', schema=None) as batch_op:
        batch_op.alter_column('attachment_type',
                              existing_type=sa.Text(),
                              type_=sa.String(length=50),
                              existing_nullable=True)
        batch_op.alter_column('attachment_url',
                              existing_type=sa.Text(),
                              type_=sa.String(length=500),
                              existing_nullable=True)
        batch_op.alter_column('content',
                              existing_type=sa.Text(),
                              nullable=False)
