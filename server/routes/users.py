"""Users: search and public student profiles."""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..db import current_user_id, get_db
from ..family import parse_birth_date
from .events import real_session_sql
from .messages import CAN_WRITE, can_write

bp = Blueprint('users', __name__, url_prefix='/api')

@bp.route('/users/search', methods=['GET'])
@jwt_required()
def search_users():
    """Find people to message: by name, or by exact email address. Emails are never returned.

    Only people I'm allowed to write to (messages.CAN_WRITE) are found.
    """
    q = request.args.get('q', '').strip()
    if len(q) < 2:
        return jsonify({'users': []})
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute(f"""
            SELECT u.id_user, u.name,
                   tp.id_tutor IS NOT NULL AS is_tutor,
                   tp.university
            FROM users u
            LEFT JOIN tutor_profiles tp ON tp.id_user = u.id_user
            WHERE (u.name LIKE %(like)s OR u.email = %(email)s) AND u.name <> '' AND {CAN_WRITE}
            ORDER BY u.name
            LIMIT 12
        """, {'like': f'%{q}%', 'email': q.lower(), 'me': current_user_id()})
        users = cur.fetchall()
        for u in users:
            u['is_tutor'] = bool(u['is_tutor'])
        return jsonify({'users': users})
    finally:
        cur.close(); conn.close()


@bp.route('/users/<int:user_id>/profile', methods=['GET'])
@jwt_required()
def get_user_profile(user_id):
    """Public profile: basic info, student bio and activity stats (no email).

    `can_message`: whether I may write to them. My own profile also has my date of birth.
    """
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT u.id_user, u.name, u.created_at,
                   sp.education_level, sp.school_name, sp.study_year, sp.bio, sp.date_of_birth,
                   tp.id_tutor
            FROM users u
            LEFT JOIN student_profiles sp ON sp.id_user = u.id_user
            LEFT JOIN tutor_profiles   tp ON tp.id_user = u.id_user
            WHERE u.id_user = %s
            LIMIT 1
        """, (user_id,))
        user = cur.fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        cur.execute(f"""
            SELECT
              (SELECT COUNT(*) FROM forum_posts WHERE user_id = %s)
            + (SELECT COUNT(*) FROM forum_threads WHERE user_id = %s) AS forum_posts,
              COUNT(e.id_event) AS sessions,
              COALESCE(SUM(e.status IN ('confirmed', 'paid')), 0) AS confirmed_sessions
            FROM student_profiles sp
            LEFT JOIN events e ON e.student_id = sp.id_student AND e.status <> 'canceled' AND {real_session_sql()}
            WHERE sp.id_user = %s
        """, (user_id, user_id, user_id))
        stats = cur.fetchone() or {}
        user['stats'] = {k: int(stats.get(k) or 0) for k in ('forum_posts', 'sessions', 'confirmed_sessions')}
        if user_id != uid:
            user.pop('date_of_birth')
            user['can_message'] = can_write(cur, uid, user_id)
        return jsonify({'user': user})
    finally:
        cur.close(); conn.close()


# Editable bio fields → their maximum length (column sizes in db/schema.sql)
BIO_FIELDS = {'education_level': 100, 'school_name': 200, 'study_year': 50, 'bio': 5000}


@bp.route('/users/me/student-bio', methods=['PUT'])
@jwt_required()
def update_student_bio():
    """Let a student update their public bio fields.

    `date_of_birth` can be added once, by accounts from before sign-up asked for it; changing it
    afterwards goes through us, since the under-18 rules depend on it.
    """
    uid  = current_user_id()
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({'error': 'Send the fields to update as JSON'}), 400
    # Column names come from BIO_FIELDS only, never from the request
    fields = {k: data[k] for k in BIO_FIELDS if k in data}
    for key, value in fields.items():
        if value is not None and not isinstance(value, str):
            return jsonify({'error': f'{key} must be text'}), 400
        if value and len(value) > BIO_FIELDS[key]:
            return jsonify({'error': f'{key} is limited to {BIO_FIELDS[key]:,} characters'}), 400
    born = None
    if data.get('date_of_birth'):
        born, error = parse_birth_date(data['date_of_birth'])
        if error:
            return jsonify({'error': error}), 400
    conn = get_db(); cur = conn.cursor()
    try:
        # Ensure student_profiles row exists
        cur.execute("SELECT id_student, date_of_birth FROM student_profiles WHERE id_user = %s", (uid,))
        rows = cur.fetchall()
        if not rows:
            cur.execute("INSERT INTO student_profiles (id_user) VALUES (%s)", (uid,))
            conn.commit()
        if born and any(row[1] for row in rows):
            if any(row[1] == born for row in rows):
                born = None
            else:
                return jsonify({'error': 'Your date of birth is already set. Contact us to correct it.'}), 409
        if born:
            cur.execute("UPDATE student_profiles SET date_of_birth = %s WHERE id_user = %s", (born, uid))
            conn.commit()
        if not fields:
            return jsonify({'message': 'nothing to update'}), 200
        set_clause = ', '.join(f"{k} = %s" for k in fields)
        cur.execute(f"UPDATE student_profiles SET {set_clause} WHERE id_user = %s",
                    (*fields.values(), uid))
        conn.commit()
        return jsonify({'message': 'updated'})
    finally:
        cur.close(); conn.close()
