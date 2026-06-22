from .user import User, UserRole
from .faculty import Faculty
from .student import Student
from .forum_member import ForumMember
from .project import Project, ProjectStatus, project_members
from .message import ProjectMessage
from .update import Update, update_likes
from .forum_post import ForumPost, forum_post_likes
from .notification import Notification
from .invite import InviteLink

CLASSES = ["UG_1A", "UG_1B", "UG_2A", "UG_2B", "UG_3A", "UG_3B", "PG_1A", "PG_2A"]
FORUM_ELIGIBLE_CLASSES = ["UG_3A", "UG_3B"]
