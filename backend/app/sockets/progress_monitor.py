from flask_socketio import emit, join_room, leave_room
from ..extensions import socketio


@socketio.on("join_project")
def handle_join(data):
    project_id = data.get("project_id")
    if project_id:
        join_room(f"project_{project_id}")


@socketio.on("leave_project")
def handle_leave(data):
    project_id = data.get("project_id")
    if project_id:
        leave_room(f"project_{project_id}")
