from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    db.create_all()
    try:
        db.session.execute(text("ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS title VARCHAR(255);"))
        db.session.execute(text("ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS tags TEXT;"))
        db.session.commit()
        print("Database schema columns title/tags checked and added if missing!")
    except Exception as e:
        db.session.rollback()
        print(f"Warning: could not run schema updates (might be fine): {e}")
    print("Database tables created successfully!")
