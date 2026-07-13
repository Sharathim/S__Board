"""add title and tags to forum posts

Revision ID: e3d8c8d8b8a8
Revises: 240a9aa389c5
Create Date: 2026-07-12 20:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e3d8c8d8b8a8'
down_revision = '240a9aa389c5'
branch_labels = None
depends_on = None


def upgrade():
    # Only add columns if they do not exist
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('forum_posts')]

    with op.batch_alter_table('forum_posts', schema=None) as batch_op:
        if 'title' not in columns:
            batch_op.add_column(sa.Column('title', sa.String(length=255), nullable=True))
        if 'tags' not in columns:
            batch_op.add_column(sa.Column('tags', sa.Text(), nullable=True))


def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('forum_posts')]

    with op.batch_alter_table('forum_posts', schema=None) as batch_op:
        if 'tags' in columns:
            batch_op.drop_column('tags')
        if 'title' in columns:
            batch_op.drop_column('title')
