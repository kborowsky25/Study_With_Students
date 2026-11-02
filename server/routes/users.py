"""Users: search and public student profiles."""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..db import current_user_id, get_db

bp = Blueprint('users', __name__, url_prefix='/api')

@bp.route('/users/search', methods=['GET'])
@jwt_required()
def search_users():
    """Find people to message: by name, or by exact email address. Emails are never returned."""
    q = request.args.get('q', '').strip()
    if len(q) < 2:
        return jsonify({'users': []})
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT u.id_user, u.name,
                   tp.id_tutor IS NOT NULL AS is_tutor,
                   tp.university
            FROM users u
            LEFT JOIN tutor_profiles tp ON tp.id_user = u.id_user
            WHERE (u.name LIKE %s OR u.email = %s) AND u.id_user != %s AND u.name <> ''
            ORDER BY u.name
            LIMIT 12
        """, (f'%{q}%', q.lower(), current_user_id()))
        users = cur.fetchall()
        for u in users:
            u['is_tutor'] = bool(u['is_tutor'])
        return jsonify({'users': users})
    finally:
        cur.close(); conn.close()


@bp.route('/users/<int:user_id>/profile', methods=['GET'])
@jwt_required()
def get_user_profile(user_id):
    """Public profile: basic info, student bio and activity stats (no email)."""
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT u.id_user, u.name, u.created_at,
                   sp.education_level, sp.school_name, sp.study_year, sp.bio,
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

        cur.execute("""
            SELECT
              (SELECT COUNT(*) FROM forum_posts WHERE user_id = %s)
            + (SELECT COUNT(*) FROM forum_threads WHERE user_id = %s) AS forum_posts,
              COUNT(e.id_event) AS sessions,
              COALESCE(SUM(e.status IN ('confirmed', 'paid')), 0) AS confirmed_sessions
            FROM student_profiles sp
            LEFT JOIN events e ON e.student_id = sp.id_student AND e.status <> 'canceled'
            WHERE sp.id_user = %s
        """, (user_id, user_id, user_id))
        stats = cur.fetchone() or {}
        user['stats'] = {k: int(stats.get(k) or 0) for k in ('forum_posts', 'sessions', 'confirmed_sessions')}
        return jsonify({'user': user})
    finally:
        cur.close(); conn.close()


# Editable bio fields → their maximum length (column sizes in db/schema.sql)
BIO_FIELDS = {'education_level': 100, 'school_name': 200, 'study_year': 50, 'bio': 5000}


@bp.route('/users/me/student-bio', methods=['PUT'])
@jwt_required()
def update_student_bio():
    """Let a student update their public bio fields."""
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
    conn = get_db(); cur = conn.cursor()
    try:
        # Ensure student_profiles row exists
        cur.execute("SELECT id_student FROM student_profiles WHERE id_user = %s", (uid,))
        if not cur.fetchone():
            cur.execute("INSERT INTO student_profiles (id_user) VALUES (%s)", (uid,))
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
