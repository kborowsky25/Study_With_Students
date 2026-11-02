"""Authentication: email verification, register, login, token refresh."""
import hmac
import secrets
from functools import cache

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash

from ..db import current_user_id, get_db
from ..family import parse_birth_date
from ..permissions import dev_shortcuts_allowed, is_admin_email
from ..ratelimit import json_field, rate_limit
from ..services.email import mail_configured, send_verification_email
from ..services.verification import issue_code, redeem_code

bp = Blueprint('auth', __name__, url_prefix='/api')

HASH_PREFIXES = ('scrypt:', 'pbkdf2:')
MAX_NAME_LENGTH  = 100
MAX_EMAIL_LENGTH = 254
ACCOUNT_TYPES    = ('student', 'parent')  # a parent account has no student profile


# ── Helpers ───────────────────────────────────────────────────────────────────

def hash_password(password):
    return generate_password_hash(password)


def verify_password(stored, given):
    """Check a password; accounts created before hashing still hold plaintext."""
    if stored.startswith(HASH_PREFIXES):
        return check_password_hash(stored, given)
    return hmac.compare_digest(stored.encode(), given.encode())


@cache
def _dummy_hash():
    """Checked for unknown emails, so a failed login takes as long either way (no enumeration)."""
    return hash_password(secrets.token_hex(16))


def _valid_email(email):
    return 3 <= len(email) <= MAX_EMAIL_LENGTH and '@' in email and not any(c.isspace() for c in email)


def build_session(cur, user_id):
    """Fresh user payload + JWT, read live from the DB."""
    cur.execute("SELECT name, email, is_parent FROM users WHERE id_user = %s", (user_id,))
    row = cur.fetchone()
    if not row:
        return None
    name, email, is_parent = row

    cur.execute("SELECT 1 FROM student_profiles WHERE id_user = %s LIMIT 1", (user_id,))
    is_student = bool(cur.fetchall())

    cur.execute("SELECT screening_status FROM tutor_profiles WHERE id_user = %s LIMIT 1", (user_id,))
    tutor_row = cur.fetchone()
    is_tutor = tutor_row is not None
    screening_status = (tutor_row[0] or 'none') if is_tutor else None

    user = {
        'id':               user_id,
        'name':             name,
        'email':            email,
        'is_tutor':         is_tutor,
        'screening_status': screening_status,
        'is_admin':         is_admin_email(email),
        'is_parent':        bool(is_parent),
        'is_student':       is_student,
    }
    claims = {k: user[k] for k in ('name', 'email', 'is_tutor', 'screening_status', 'is_admin',
                                   'is_parent', 'is_student')}
    token = create_access_token(identity=str(user_id), additional_claims=claims)
    return {'access_token': token, 'user': user}


# ── Email verification ────────────────────────────────────────────────────────

@bp.route('/auth/send-verification', methods=['POST'])
@rate_limit(30, per=3600)                          # per IP
@rate_limit(3, per=600, key=json_field('email'))   # per address — no inbox flooding
def send_verification():
    data  = request.get_json(silent=True) or {}
    email = str(data.get('email') or '').strip().lower()
    if not _valid_email(email):
        return jsonify({'error': 'A valid email is required'}), 400

    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("SELECT id_user FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            return jsonify({'error': 'Email already registered'}), 409
        code = issue_code(cur, email)
        conn.commit()
    finally:
        cur.close(); conn.close()

    try:
        send_verification_email(email, code)
    except Exception as e:
        print(f'[WARN] Email send failed: {e}', flush=True)

    payload = {'message': 'Verification code sent'}
    if dev_shortcuts_allowed() and not mail_configured():
        payload['dev_code'] = code  # local debug runs without SMTP only
    return jsonify(payload), 200


# ── Register / login ──────────────────────────────────────────────────────────

@bp.route('/auth/register', methods=['POST'])
@rate_limit(30, per=3600)  # per IP; guessing codes is capped per code (services/verification.py)
def register():
    data     = request.get_json(silent=True) or {}
    name     = str(data.get('name') or '').strip()
    email    = str(data.get('email') or '').strip().lower()
    password = str(data.get('password') or '')
    code     = str(data.get('verification_code') or '').strip()
    account  = data.get('account_type') or 'student'

    if not name or not email or not password:
        return jsonify({'error': 'All fields required'}), 400
    if len(name) > MAX_NAME_LENGTH:
        return jsonify({'error': f'Names are limited to {MAX_NAME_LENGTH} characters'}), 400
    if not _valid_email(email):
        return jsonify({'error': 'A valid email is required'}), 400
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    if not code:
        return jsonify({'error': 'Verification code required'}), 400
    if account not in ACCOUNT_TYPES:
        return jsonify({'error': 'Choose a student or a parent account'}), 400
    born = None
    if account == 'student':  # the under-18 rules need it (server/family.py)
        born, error = parse_birth_date(data.get('date_of_birth'))
        if error:
            return jsonify({'error': error}), 400

    conn = get_db(); cur = conn.cursor()
    try:
        error = redeem_code(cur, email, code)
        if error:
            conn.commit()  # keep the failed attempt
            return jsonify({'error': error}), 400

        cur.execute("SELECT id_user FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            conn.rollback()  # leave the code usable
            return jsonify({'error': 'Email already registered'}), 409

        cur.execute(
            "INSERT INTO users (name, email, password, is_parent) VALUES (%s, %s, %s, %s)",
            (name, email, hash_password(password), account == 'parent'),
        )
        user_id = cur.lastrowid
        if account == 'student':
            cur.execute("INSERT INTO student_profiles (id_user, date_of_birth) VALUES (%s, %s)", (user_id, born))
        conn.commit()

        session = build_session(cur, user_id)
        return jsonify({'message': 'Account created', **session}), 201
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


@bp.route('/auth/login', methods=['POST'])
@rate_limit(60, per=600)                            # per IP (schools share one)
@rate_limit(10, per=600, key=json_field('email'))   # per account
def login():
    data     = request.get_json(silent=True) or {}
    email    = str(data.get('email') or '').strip().lower()
    password = str(data.get('password') or '')

    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("SELECT id_user, password FROM users WHERE email = %s", (email,))
        row = cur.fetchone()
        if not row:
            check_password_hash(_dummy_hash(), password)
            return jsonify({'error': 'Invalid email or password'}), 401
        if not verify_password(row[1], password):
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
    """Issue a new JWT with fresh claims (call after role or screening changes)."""
    conn = get_db(); cur = conn.cursor()
    try:
        session = build_session(cur, current_user_id())
        if not session:
            return jsonify({'error': 'User not found'}), 404
        return jsonify(session)
    finally:
        cur.close(); conn.close()
