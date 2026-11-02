"""Study rooms: live group sessions hosted by tutors."""
import re
from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..db import current_user_id, get_db

bp = Blueprint('study_rooms', __name__, url_prefix='/api')

# Calendar copies of a room are events titled "Study Room: <subject>".
CALENDAR_PREFIX = 'Study Room: '
MAX_SUBJECT_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_LINK_LENGTH = 150, 2000, 500


def _parse_dt(value):
    try:
        return datetime.fromisoformat(str(value).replace('Z', '')[:19])
    except (TypeError, ValueError):
        return None


# ── Study Rooms ───────────────────────────────────────────────────────────────

@bp.route('/study-rooms', methods=['GET'])
@jwt_required()
def get_study_rooms():
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        try:
            cur.execute("""
                SELECT sr.id, sr.subject, sr.description, sr.start_time, sr.end_time,
                       sr.zoom_link, u.name AS tutor_name, tp.id_user AS creator_user_id,
                       EXISTS(
                           SELECT 1 FROM events e
                           WHERE e.user_id = %s AND e.tutor_id = sr.tutor_id
                             AND e.start_time = sr.start_time AND e.title LIKE %s
                       ) AS in_calendar
                FROM study_rooms sr
                JOIN tutor_profiles tp ON tp.id_tutor = sr.tutor_id
                JOIN users u ON u.id_user = tp.id_user
                ORDER BY sr.start_time ASC
            """, (uid, CALENDAR_PREFIX + '%'))
            rooms = cur.fetchall()
        except Exception:
            # study_rooms table may not exist yet
            rooms = []
        for r in rooms:
            r['in_calendar'] = bool(r.get('in_calendar'))
            for key in ('start_time', 'end_time'):
                if r.get(key) and hasattr(r[key], 'isoformat'):
                    r[key] = r[key].isoformat()
        return jsonify({'rooms': rooms})
    finally:
        cur.close(); conn.close()


@bp.route('/study-rooms', methods=['POST'])
@jwt_required()
def create_study_room():
    uid     = current_user_id()
    data    = request.get_json(silent=True) or {}
    subject     = str(data.get('subject') or '').strip()
    description = str(data.get('description') or '').strip()
    start       = _parse_dt(data.get('start_time'))
    end         = _parse_dt(data.get('end_time'))

    if not subject:
        return jsonify({'error': 'Give the room a subject'}), 400
    if len(subject) > MAX_SUBJECT_LENGTH or len(description) > MAX_DESCRIPTION_LENGTH:
        return jsonify({'error': f'Subjects are limited to {MAX_SUBJECT_LENGTH} characters '
                                 f'and descriptions to {MAX_DESCRIPTION_LENGTH:,}'}), 400
    if not start or not end or end <= start:
        return jsonify({'error': 'Choose a valid start and end time'}), 400
    if end <= datetime.now():
        return jsonify({'error': 'That time has already passed'}), 400
    link = str(data.get('zoom_link') or '').strip()
    if link and (len(link) > MAX_LINK_LENGTH or not re.match(r'https://[^/\s]+\S*$', link, re.IGNORECASE)):
        return jsonify({'error': 'The meeting link must start with https://'}), 400

    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("SELECT id_tutor, screening_status FROM tutor_profiles WHERE id_user = %s", (uid,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Tutor profile required'}), 403
        if row[1] != 'approved':
            return jsonify({'error': 'Only verified tutors can host study rooms'}), 403

        cur.execute("""
            INSERT INTO study_rooms (tutor_id, subject, description, start_time, end_time, zoom_link)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (row[0], subject, description or None, start, end, link or None))
        conn.commit()
        return jsonify({'room': {'id': cur.lastrowid}}), 201
    finally:
        cur.close(); conn.close()


@bp.route('/study-rooms/<int:room_id>/calendar', methods=['POST'])
@jwt_required()
def save_room_to_calendar(room_id):
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM study_rooms WHERE id = %s", (room_id,))
        room = cur.fetchone()
        if not room:
            return jsonify({'error': 'Room not found'}), 404
        # A calendar entry belongs to a student profile (parent-only accounts have none)
        cur.execute("SELECT id_student FROM student_profiles WHERE id_user = %s", (uid,))
        sp = cur.fetchone()
        if not sp:
            return jsonify({'error': 'Only student accounts can add study rooms to a calendar'}), 403

        # Saving twice should not create a second calendar entry
        cur.execute("""
            SELECT 1 FROM events
            WHERE user_id = %s AND tutor_id = %s AND start_time = %s AND title LIKE %s
            LIMIT 1
        """, (uid, room['tutor_id'], room['start_time'], CALENDAR_PREFIX + '%'))
        if cur.fetchone():
            return jsonify({'message': 'Already in your calendar', 'already_saved': True})

        student_id = sp['id_student']

        # Study rooms are free: the calendar copy carries no fee (amount 0),
        # so it never shows up as a session to pay for.
        cur.execute("""
            INSERT INTO events (user_id, tutor_id, student_id, title, description, start_time, end_time,
                                status, amount, kind)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'confirmed', 0, 'room')
        """, (uid, room['tutor_id'], student_id,
              CALENDAR_PREFIX + room['subject'], room['description'],
              room['start_time'], room['end_time']))
        conn.commit()
        return jsonify({'message': 'Added to calendar', 'already_saved': False})
    finally:
        cur.close(); conn.close()
