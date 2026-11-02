"""Reviews: students rate a tutor once per completed session."""
from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..db import current_user_id, get_db
from .events import fetch_event, is_room_copy

bp = Blueprint('reviews', __name__, url_prefix='/api')

MAX_COMMENT = 1000


def _display_name(name):
    """'Maya Patel' → 'Maya P.' — reviews show first name and initial only."""
    parts = (name or '').split()
    if not parts:
        return 'Student'
    return parts[0] if len(parts) == 1 else f'{parts[0]} {parts[-1][0]}.'


@bp.route('/events/<int:event_id>/review', methods=['POST'])
@jwt_required()
def review_session(event_id):
    data = request.get_json(silent=True) or {}
    try:
        rating = int(data.get('rating'))
    except (TypeError, ValueError):
        rating = 0
    if not 1 <= rating <= 5:
        return jsonify({'error': 'Rating must be between 1 and 5'}), 400
    comment = (data.get('comment') or '').strip()[:MAX_COMMENT] or None

    uid = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        ev = fetch_event(cur, event_id)
        if not ev:
            return jsonify({'error': 'Session not found'}), 404
        if ev['student_user_id'] != uid:
            return jsonify({'error': 'Only the student can review this session'}), 403
        if is_room_copy(ev) or ev.get('kind') == 'intro':
            return jsonify({'error': 'Only 1-to-1 sessions can be reviewed'}), 400
        if ev['status'] not in ('confirmed', 'paid') or ev['end_time'] >= datetime.now():
            return jsonify({'error': 'You can review a session once it has happened'}), 400

        cur.execute("SELECT id FROM reviews WHERE event_id = %s", (event_id,))
        if cur.fetchone():
            return jsonify({'error': 'You already reviewed this session'}), 409
        cur.execute("""
            INSERT INTO reviews (event_id, tutor_id, student_user_id, rating, comment)
            VALUES (%s, %s, %s, %s, %s)
        """, (event_id, ev['tutor_id'], uid, rating, comment))
        conn.commit()
        return jsonify({'review': {'id': cur.lastrowid, 'rating': rating, 'comment': comment}}), 201
    finally:
        cur.close(); conn.close()


@bp.route('/tutors/<int:tutor_id>/reviews', methods=['GET'])
@jwt_required()
def tutor_reviews(tutor_id):
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT r.id, r.rating, r.comment, r.created_at, u.name AS student_name, e.title AS session_title
            FROM reviews r
            JOIN users u  ON u.id_user  = r.student_user_id
            JOIN events e ON e.id_event = r.event_id
            WHERE r.tutor_id = %s
            ORDER BY r.created_at DESC
            LIMIT 50
        """, (tutor_id,))
        reviews = cur.fetchall()
        for r in reviews:
            r['student_name'] = _display_name(r['student_name'])
        count = len(reviews)
        average = round(sum(r['rating'] for r in reviews) / count, 2) if count else None
        return jsonify({'reviews': reviews, 'average': average, 'count': count})
    finally:
        cur.close(); conn.close()
