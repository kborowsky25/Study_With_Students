"""Access rules: admin checks and local-only dev shortcuts."""
import hmac

from flask import current_app, request
from flask_jwt_extended import get_jwt, verify_jwt_in_request

from .config import IS_PRODUCTION, ON_VERCEL, Config


def dev_shortcuts_allowed():
    """Verification codes in API responses: a local debug run only, never a deployment."""
    return current_app.debug and not (IS_PRODUCTION or ON_VERCEL)


def is_admin_email(email):
    return bool(Config.SUPER_ADMIN_EMAIL) and (email or '').lower() == Config.SUPER_ADMIN_EMAIL


def check_admin():
    """Admins authenticate with the X-Admin-Secret header or a super-admin JWT."""
    secret = request.headers.get('X-Admin-Secret', '')
    if Config.ADMIN_SECRET and secret and hmac.compare_digest(secret.encode(), Config.ADMIN_SECRET.encode()):
        return True
    try:
        verify_jwt_in_request()
        return is_admin_email(get_jwt().get('email'))
    except Exception:
        return False
