from datetime import datetime, timedelta


def check_low_activity(app):
    """Run every 6 hours. Mark projects as LOW_ACTIVITY if no message in 3 days."""
    with app.app_context():
        from ..models.project import Project, ProjectStatus
        from ..extensions import db

        threshold = datetime.utcnow() - timedelta(days=3)
        active_projects = Project.query.filter(
            Project.status == ProjectStatus.IN_PROGRESS
        ).all()

        for project in active_projects:
            if project.last_message_time() < threshold:
                project.status = ProjectStatus.LOW_ACTIVITY

        db.session.commit()
