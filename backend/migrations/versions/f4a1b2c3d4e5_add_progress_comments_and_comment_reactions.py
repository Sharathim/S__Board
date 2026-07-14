"""add progress_comments and comment_reactions tables

Revision ID: f4a1b2c3d4e5
Revises: e3d8c8d8b8a8
Create Date: 2026-07-14 07:11:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f4a1b2c3d4e5'
down_revision = 'e3d8c8d8b8a8'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'progress_comments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('progress_post_id', sa.Integer(), nullable=False),
        sa.Column('author_id', sa.Integer(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=True, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['progress_post_id'], ['project_messages.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_progress_comments_progress_post_id'), 'progress_comments', ['progress_post_id'], unique=False)

    op.create_table(
        'comment_reactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('comment_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('emoji', sa.String(length=10), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['comment_id'], ['progress_comments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('comment_id', 'user_id', 'emoji', name='uq_comment_reaction'),
    )
    op.create_index(op.f('ix_comment_reactions_comment_id'), 'comment_reactions', ['comment_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_comment_reactions_comment_id'), table_name='comment_reactions')
    op.drop_table('comment_reactions')
    op.drop_index(op.f('ix_progress_comments_progress_post_id'), table_name='progress_comments')
    op.drop_table('progress_comments')
