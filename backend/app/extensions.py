from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_socketio import SocketIO
from flask_cors import CORS
import redis as redis_client

db = SQLAlchemy()
migrate = Migrate()
socketio = SocketIO()
cors = CORS()


def get_redis(app):
    return redis_client.from_url(app.config["REDIS_URL"], decode_responses=True)
