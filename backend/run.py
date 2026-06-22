from app import create_app
from app.extensions import socketio

app = create_app()

if __name__ == "__main__":
    # Port 5000 is squatted by Intel's OneApp.IGCC.WinService on Windows
    # (it binds localhost:5000), so we use 5055 to avoid the conflict.
    socketio.run(app, host="0.0.0.0", port=5055, debug=True)
