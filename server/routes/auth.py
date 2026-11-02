"""Authentication: email verification, register, login, token refresh."""
import random
from datetime import datetime, timedelta

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import create_access_token, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash

from ..db import current_user_id, get_db
from ..permissions import is_admin_email, membership_state
from ..services.email import mail_configured, send_verification_email

bp = Blueprint('auth', __name__, url_prefix='/api')

HASH_PREFIXES = ('scrypt:', 'pbkdf2:')


# ── Helpers ───────────────────────────────────────────────────────────────────

def hash_password(password):
    return generate_password_hash(password)


def verify_password(stored, given):
    """Check a password; accounts created before hashing still hold plaintext."""
    if stored.startswith(HASH_PREFIXES):
        return check_password_hash(stored, given)
    return stored == given


def build_session(cur, user_id):
    """Fresh user payload + JWT, read live from the DB."""
    cur.execute("SELECT name, email FROM users WHERE id_user = %s", (user_id,))
    row = cur.fetchone()
    if not row:
        return None
    name, email = row

    cur.execute("SELECT screening_status FROM tutor_profiles WHERE id_user = %s LIMIT 1", (user_id,))
    tutor_row = cur.fetchone()
    is_tutor = tutor_row is not None
    screening_status = (tutor_row[0] or 'none') if is_tutor else None

    is_premium, _ = membership_state(cur, user_id)

    user = {
        'id':               user_id,
        'name':             name,
        'email':            email,
        'is_tutor':         is_tutor,
        'is_premium':       is_premium,
        'screening_status': screening_status,
        'is_admin':         is_admin_email(email),
    }
    claims = {k: user[k] for k in ('name', 'email', 'is_tutor', 'is_premium', 'screening_status', 'is_admin')}
    token = create_access_token(identity=str(user_id), additional_claims=claims)
    return {'access_token': token, 'user': user}


# ── Email verification ────────────────────────────────────────────────────────

@bp.route('/auth/send-verification', methods=['POST'])
def send_verification():
    data  = request.get_json(silent=True) or {}
    email = data.get('email', '').strip().lower()
    if not email or '@' not in email:
        return jsonify({'error': 'A valid email is required'}), 400

    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("SELECT id_user FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            return jsonify({'error': 'Email already registered'}), 409

        code    = ''.join(random.choices('0123456789', k=6))
        expires = datetime.utcnow() + timedelta(minutes=10)
        cur.execute("DELETE FROM email_verifications WHERE email = %s", (email,))
        cur.execute(
            "INSERT INTO email_verifications (email, code, expires_at) VALUES (%s, %s, %s)",
            (email, code, expires),
        )
        conn.commit()
    finally:
        cur.close(); conn.close()

    try:
        send_verification_email(email, code)
    except Exception as e:
        print(f'[WARN] Email send failed: {e}', flush=True)

    payload = {'message': 'Verification code sent'}
    if current_app.debug and not mail_configured():
        payload['dev_code'] = code  # local development only — no SMTP configured
    return jsonify(payload), 200


# ── Register / login ──────────────────────────────────────────────────────────

@bp.route('/auth/register', methods=['POST'])
def register():
    data     = request.get_json(silent=True) or {}
    name     = data.get('name', '').strip()
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')
    code     = data.get('verification_code', '').strip()

    if not name or not email or not password:
        return jsonify({'error': 'All fields required'}), 400
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    if not code:
        return jsonify({'error': 'Verification code required'}), 400

    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("""
            SELECT id, expires_at, used FROM email_verifications
            WHERE email = %s AND code = %s
            ORDER BY id DESC LIMIT 1
        """, (email, code))
        ver = cur.fetchone()
        if not ver:
            return jsonify({'error': 'Invalid verification code'}), 400
        ver_id, expires_at, used = ver
        if used:
            return jsonify({'error': 'Verification code already used'}), 400
        if datetime.utcnow() > expires_at:
            return jsonify({'error': 'Verification code expired — please request a new one'}), 400

        cur.execute("SELECT id_user FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            return jsonify({'error': 'Email already registered'}), 409

        cur.execute("UPDATE email_verifications SET used = 1 WHERE id = %s", (ver_id,))
        cur.execute(
            "INSERT INTO users (name, email, password) VALUES (%s, %s, %s)",
            (name, email, hash_password(password)),
        )
        user_id = cur.lastrowid
        cur.execute("INSERT INTO student_profiles (id_user) VALUES (%s)", (user_id,))
        conn.commit()

        session = build_session(cur, user_id)
        return jsonify({'message': 'Account created', **session}), 201
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


@bp.route('/auth/login', methods=['POST'])
def login():
    data     = request.get_json(silent=True) or {}
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')

    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("SELECT id_user, password FROM users WHERE email = %s", (email,))
        row = cur.fetchone()
        if not row or not verify_password(row[1], password):
            return jsonify({'error': 'Invalid email or password'}), 401

        user_id, stored = row
        if not stored.startswith(HASH_PREFIXES):
            # Upgrade legacy plaintext passwords on first successful login
            cur.execute("UPDATE users SET password = %s WHERE id_user = %s", (hash_password(password), user_id))
            conn.commit()

        return jsonify(build_session(cur, user_id))
    finally:
        cur.close(); conn.close()


@bp.route('/auth/me', methods=['GET'])
@jwt_required()
def me():
    conn = get_db(); cur = conn.cursor()
    try:
        session = build_session(cur, current_user_id())
        if not session:
            return jsonify({'error': 'User not found'}), 404
        return jsonify({'user': session['user']})
    finally:
        cur.close(); conn.close()


@bp.route('/auth/refresh', methods=['POST'])
@jwt_required()
def refresh_auth_token():
    """Issue a new JWT with fresh claims (call after membership or screening changes)."""
    conn = get_db(); cur = conn.cursor()
    try:
        session = build_session(cur, current_user_id())
        if not session:
            return jsonify({'error': 'User not found'}), 404
        return jsonify(session)
    finally:
        cur.close(); conn.close()
