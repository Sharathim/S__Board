"""make roll number unique

Revision ID: f4e3d2c1b0a9
Revises: e3d8c8d8b8a8
Create Date: 2026-07-14 10:20:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f4e3d2c1b0a9'
down_revision = 'e3d8c8d8b8a8'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # Check existing unique constraints on 'students'
    constraints = inspector.get_unique_constraints('students')
    
    # We check the columns listed in the constraints
    constrained_cols = []
    for c in constraints:
        constrained_cols.extend(c['column_names'])
        
    if 'roll_number' not in constrained_cols:
        with op.batch_alter_table('students', schema=None) as batch_op:
            batch_op.create_unique_constraint('uq_students_roll_number', ['roll_number'])


def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    constraints = inspector.get_unique_constraints('students')
    constrained_cols = []
    for c in constraints:
        constrained_cols.extend(c['column_names'])
        
    if 'roll_number' in constrained_cols:
        with op.batch_alter_table('students', schema=None) as batch_op:
            batch_op.drop_constraint('uq_students_roll_number', type_='unique')
