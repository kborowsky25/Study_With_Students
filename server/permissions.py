"""Access rules: admin checks and the Explorer-plan gate."""
from functools import wraps

from flask import jsonify, request
from flask_jwt_extended import get_jwt, verify_jwt_in_request

from .config import Config
from .db import current_user_id, get_db


def is_admin_email(email):
    return bool(Config.SUPER_ADMIN_EMAIL) and (email or '').lower() == Config.SUPER_ADMIN_EMAIL


def check_admin():
    """Admins authenticate with the X-Admin-Secret header or a super-admin JWT."""
    secret = request.headers.get('X-Admin-Secret', '')
    if Config.ADMIN_SECRET and secret == Config.ADMIN_SECRET:
        return True
    try:
        verify_jwt_in_request()
        return is_admin_email(get_jwt().get('email'))
    except Exception:
        return False


def membership_state(cur, user_id):
    """Return (is_premium, is_verified_tutor) for a user, read live from the DB."""
    cur.execute("""
        SELECT u.is_premium, u.premium_expires_at, tp.screening_status
        FROM users u
        LEFT JOIN tutor_profiles tp ON tp.id_user = u.id_user
        WHERE u.id_user = %s
    """, (user_id,))
    row = cur.fetchone()
    if not row:
        return False, False
    is_premium, expires_at, screening = row
    if is_premium and expires_at is not None:
        from datetime import datetime
        is_premium = expires_at > datetime.utcnow()
    return bool(is_premium), screening == 'approved'


def has_explorer_access(user_id):
    """Explorer members and verified tutors can use community features."""
    conn = get_db(); cur = conn.cursor()
    try:
        premium, verified_tutor = membership_state(cur, user_id)
        return premium or verified_tutor
    finally:
        cur.close(); conn.close()


def explorer_required(fn):
    """Gate an endpoint behind the £5/month Explorer plan."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        if not has_explorer_access(current_user_id()):
            return jsonify({
                'error': 'Explorer plan required',
                'code':  'explorer_required',
            }), 402
        return fn(*args, **kwargs)
    return wrapper
