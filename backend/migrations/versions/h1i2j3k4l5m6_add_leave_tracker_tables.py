"""add leave tracker tables (academic_years, leave_balances, leave_requests)

Revision ID: h1i2j3k4l5m6
Revises: g5b2a3c4d5e6
Create Date: 2026-07-29 06:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'h1i2j3k4l5m6'
down_revision = 'g5b2a3c4d5e6'
branch_labels = None
depends_on = None


def upgrade():
    # Create enums (IF NOT EXISTS guard via raw SQL is cleaner than create_type=True on every run)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE leavetype AS ENUM ('CASUAL', 'MEDICAL', 'ON_DUTY', 'PERMISSION', 'COMP_OFF');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE leavestatus AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE leaveduration AS ENUM ('FULL_DAY', 'HALF_DAY_FIRST', 'HALF_DAY_SECOND', 'PERMISSION_HOURS');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    # 1. academic_years — no FK dependencies
    op.create_table(
        'academic_years',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('label', sa.String(length=20), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('label'),
    )

    # 2. leave_balances — depends on faculty + academic_years
    op.create_table(
        'leave_balances',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('faculty_id', sa.Integer(), nullable=False),
        sa.Column('academic_year_id', sa.Integer(), nullable=False),
        sa.Column('leave_type', sa.Enum('CASUAL', 'MEDICAL', 'ON_DUTY', 'PERMISSION', 'COMP_OFF',
                                        name='leavetype', create_type=False), nullable=False),
        sa.Column('entitled', sa.Float(), nullable=False, server_default=sa.text('0')),
        sa.Column('used', sa.Float(), nullable=False, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['faculty_id'], ['faculty.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['academic_year_id'], ['academic_years.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('faculty_id', 'academic_year_id', 'leave_type', name='uq_faculty_year_leavetype'),
    )
    op.create_index(op.f('ix_leave_balances_faculty_id'), 'leave_balances', ['faculty_id'], unique=False)
    op.create_index(op.f('ix_leave_balances_academic_year_id'), 'leave_balances', ['academic_year_id'], unique=False)

    # 3. leave_requests — depends on faculty + academic_years + users
    op.create_table(
        'leave_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('faculty_id', sa.Integer(), nullable=False),
        sa.Column('academic_year_id', sa.Integer(), nullable=True),
        sa.Column('leave_type', sa.Enum('CASUAL', 'MEDICAL', 'ON_DUTY', 'PERMISSION', 'COMP_OFF',
                                        name='leavetype', create_type=False), nullable=False),
        sa.Column('duration', sa.Enum('FULL_DAY', 'HALF_DAY_FIRST', 'HALF_DAY_SECOND', 'PERMISSION_HOURS',
                                      name='leaveduration', create_type=False), nullable=False,
                  server_default='FULL_DAY'),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('period_numbers', postgresql.ARRAY(sa.Integer()), nullable=True),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('document_url', sa.String(length=500), nullable=True),
        sa.Column('document_name', sa.String(length=255), nullable=True),
        sa.Column('status', sa.Enum('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED',
                                    name='leavestatus', create_type=False), nullable=False,
                  server_default='PENDING'),
        sa.Column('hod_comment', sa.Text(), nullable=True),
        sa.Column('decided_by', sa.Integer(), nullable=True),
        sa.Column('decided_at', sa.DateTime(), nullable=True),
        sa.Column('is_hod_initiated', sa.Boolean(), nullable=True, server_default=sa.text('false')),
        sa.Column('affected_entries', sa.JSON(), nullable=True),
        sa.Column('days_count', sa.Float(), nullable=False, server_default=sa.text('1')),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['faculty_id'], ['faculty.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['academic_year_id'], ['academic_years.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['decided_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_leave_requests_faculty_id'), 'leave_requests', ['faculty_id'], unique=False)
    op.create_index(op.f('ix_leave_requests_status'), 'leave_requests', ['status'], unique=False)
    op.create_index(op.f('ix_leave_requests_start_date'), 'leave_requests', ['start_date'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_leave_requests_start_date'), table_name='leave_requests')
    op.drop_index(op.f('ix_leave_requests_status'), table_name='leave_requests')
    op.drop_index(op.f('ix_leave_requests_faculty_id'), table_name='leave_requests')
    op.drop_table('leave_requests')

    op.drop_index(op.f('ix_leave_balances_academic_year_id'), table_name='leave_balances')
    op.drop_index(op.f('ix_leave_balances_faculty_id'), table_name='leave_balances')
    op.drop_table('leave_balances')

    op.drop_table('academic_years')

    op.execute("DROP TYPE IF EXISTS leaveduration;")
    op.execute("DROP TYPE IF EXISTS leavestatus;")
    op.execute("DROP TYPE IF EXISTS leavetype;")
