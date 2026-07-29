"""add department leave settings table

Revision ID: i2j3k4l5m6n7
Revises: h1i2j3k4l5m6
Create Date: 2026-07-29 07:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'i2j3k4l5m6n7'
down_revision = 'h1i2j3k4l5m6'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'department_leave_settings' not in tables:
        op.create_table(
            'department_leave_settings',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('monthly_permission_quota', sa.Integer(), nullable=False, server_default=sa.text('3')),
            sa.Column('max_permission_hours', sa.Integer(), nullable=False, server_default=sa.text('2')),
            sa.Column('default_casual_leave', sa.Float(), nullable=False, server_default=sa.text('12')),
            sa.Column('default_medical_leave', sa.Float(), nullable=False, server_default=sa.text('12')),
            sa.Column('default_on_duty_leave', sa.Float(), nullable=False, server_default=sa.text('999')),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )


def downgrade():
    op.drop_table('department_leave_settings')
