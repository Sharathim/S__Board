from ..models import CLASSES, FORUM_ELIGIBLE_CLASSES


def validate_class_name(class_name):
    """Validate that a class name is one of the predefined classes."""
    return class_name in CLASSES


def validate_forum_eligible(class_name):
    """Validate that a class is eligible for forum membership."""
    return class_name in FORUM_ELIGIBLE_CLASSES


def validate_email(email):
    """Basic email validation."""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))
