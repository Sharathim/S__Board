import os
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret")
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }
    _fb_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH")
    if _fb_path and not os.path.isabs(_fb_path) and not os.path.exists(_fb_path):
        _backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        _resolved = os.path.join(_backend_dir, _fb_path)
        if os.path.exists(_resolved):
            _fb_path = _resolved
    FIREBASE_SERVICE_ACCOUNT_PATH = _fb_path
    CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME")
    CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY")
    CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET")
    HOD_EMAIL = os.environ.get("HOD_EMAIL")
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
