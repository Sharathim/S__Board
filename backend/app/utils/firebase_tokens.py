from firebase_admin import auth as firebase_auth
import time


def verify_firebase_token(token, attempts=3, backoff=2):
    """Verify a Firebase ID token with retries for transient network errors.

    Args:
        token (str): The raw ID token (may include a "Bearer " prefix).
        attempts (int): Number of verification attempts.
        backoff (int|float): Seconds to wait between retries.

    Raises the last exception encountered if verification ultimately fails.
    """
    normalized_token = (token or "").replace("Bearer ", "").strip()
    if not normalized_token:
        raise ValueError("Missing Firebase ID token")

    last_exc = None
    for i in range(attempts):
        try:
            return firebase_auth.verify_id_token(normalized_token, clock_skew_seconds=60)
        except Exception as exc:
            last_exc = exc
            # For transient network/DNS/timeout errors, retry a few times
            if i < attempts - 1:
                time.sleep(backoff)
                continue
            raise
