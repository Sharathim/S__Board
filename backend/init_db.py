from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    db.create_all()

    # All schema columns that may be missing in older live DBs
    migrations = [
        # forum_posts columns added over time
        "ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS title VARCHAR(255);",
        "ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS tags TEXT;",
        "ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS attachment_url TEXT;",
        "ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS attachment_type TEXT;",
        "ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();",
        # forum_members columns
        "ALTER TABLE forum_members ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;",
        "ALTER TABLE forum_members ADD COLUMN IF NOT EXISTS is_update_coordinator BOOLEAN DEFAULT FALSE;",
        # students columns
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS is_forum_member BOOLEAN DEFAULT FALSE;",
        # project_messages columns widening for multi-attachment support
        "ALTER TABLE project_messages ALTER COLUMN attachment_url TYPE TEXT;",
        "ALTER TABLE project_messages ALTER COLUMN attachment_type TYPE TEXT;",
        "ALTER TABLE project_messages ALTER COLUMN attachment_name TYPE TEXT;",
        # Backfill NULL updated_at with created_at for existing forum_posts rows
        "UPDATE forum_posts SET updated_at = created_at WHERE updated_at IS NULL;",
        # Backfill NULL is_deleted with FALSE
        "UPDATE forum_posts SET is_deleted = FALSE WHERE is_deleted IS NULL;",
        "UPDATE forum_posts SET is_edited = FALSE WHERE is_edited IS NULL;",
        # api_keys table for Notes API key management
        """CREATE TABLE IF NOT EXISTS api_keys (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            key_hash VARCHAR(128) NOT NULL UNIQUE,
            key_prefix VARCHAR(32) NOT NULL,
            name VARCHAR(100) NOT NULL,
            scope VARCHAR(50) NOT NULL DEFAULT 'notes',
            created_at TIMESTAMP DEFAULT NOW(),
            last_used_at TIMESTAMP,
            is_active BOOLEAN NOT NULL DEFAULT TRUE
        );""",
    ]

    for sql in migrations:
        try:
            db.session.execute(text(sql))
            db.session.commit()
            print(f"  OK: {sql[:60]}...")
        except Exception as e:
            db.session.rollback()
            print(f"  SKIP (already exists or error): {e}")

    print("\nDatabase schema migration complete!")
