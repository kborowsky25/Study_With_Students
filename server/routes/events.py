"""Events: 1-to-1 sessions. Students request, tutors confirm, students pay the tutor."""
import secrets
from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..config import Config
from ..db import current_user_id, get_db

bp = Blueprint('events', __name__, url_prefix='/api')

# Families pay this on top of the tutor's price; tutors keep 100% of `amount`.
BOOKING_FEE_PERCENT = getattr(Config, 'BOOKING_FEE_PERCENT', 5)


def booking_fee(amount):
    return round(float(amount) * BOOKING_FEE_PERCENT / 100, 2)

EVENT_COLUMNS = """
    e.id_event, e.title, e.description, e.start_time, e.end_time, e.status, e.amount, e.booking_fee,
    e.tutor_id, e.student_id, e.created_at, e.meeting_url,
    rv.rating AS my_rating,
    u_t.name AS tutor_name,   tp.id_user AS tutor_user_id,
    u_s.name AS student_name, sp.id_user AS student_user_id
"""
EVENT_JOINS = """
    FROM events e
    LEFT JOIN tutor_profiles   tp  ON tp.id_tutor   = e.tutor_id
    LEFT JOIN users            u_t ON u_t.id_user   = tp.id_user
    LEFT JOIN student_profiles sp  ON sp.id_student = e.student_id
    LEFT JOIN users            u_s ON u_s.id_user   = sp.id_user
    LEFT JOIN reviews          rv  ON rv.event_id   = e.id_event
"""


def new_meeting_url(event_id):
    """A private video room for the session (Jitsi Meet — free, no account needed to join)."""
    return f'https://meet.jit.si/StudyWithStudents-{event_id}-{secrets.token_hex(5)}'


def _parse_dt(value):
    try:
        return datetime.fromisoformat(str(value).replace('Z', '')[:19])
    except (TypeError, ValueError):
        return None


def _student_profile_id(cur, user_id):
    cur.execute("SELECT id_student FROM student_profiles WHERE id_user = %s LIMIT 1", (user_id,))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute("INSERT INTO student_profiles (id_user) VALUES (%s)", (user_id,))
    return cur.lastrowid


def fetch_event(cur, event_id):
    cur.execute(f"SELECT {EVENT_COLUMNS} {EVENT_JOINS} WHERE e.id_event = %s", (event_id,))
    return cur.fetchone()


@bp.route('/events', methods=['GET'])
@jwt_required()
def get_events():
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute(f"""
            SELECT {EVENT_COLUMNS} {EVENT_JOINS}
            WHERE tp.id_user = %s OR sp.id_user = %s
            ORDER BY e.start_time ASC
        """, (uid, uid))
        events = cur.fetchall()
        for ev in events:
            ev['role'] = 'tutor' if ev['tutor_user_id'] == uid else 'student'
        return jsonify({'events': events})
    finally:
        cur.close(); conn.close()


@bp.route('/events', methods=['POST'])
@jwt_required()
def create_event():
    """A student books a tutor (`tutor_id`), or a tutor schedules a student (`student_id`)."""
    uid   = current_user_id()
    data  = request.get_json(silent=True) or {}
    start = _parse_dt(data.get('start_time'))
    end   = _parse_dt(data.get('end_time'))
    title = (data.get('title') or '').strip() or 'Tutoring session'

    if not start or not end or end <= start:
        return jsonify({'error': 'Choose a valid start and end time'}), 400
    if start < datetime.now():
        return jsonify({'error': 'Sessions must be booked in the future'}), 400

    conn = get_db(); cur = conn.cursor()
    try:
        if data.get('tutor_id'):
            cur.execute(
                "SELECT id_tutor, id_user, hourly_rate FROM tutor_profiles WHERE id_tutor = %s",
                (data['tutor_id'],),
            )
            tutor = cur.fetchone()
            if not tutor:
                return jsonify({'error': 'Tutor not found'}), 404
            if tutor[1] == uid:
                return jsonify({'error': "You can't book a session with yourself"}), 400
            tutor_id, rate = tutor[0], float(tutor[2] or 20)
            cur.execute("SELECT 1 FROM active_tutors WHERE id_user = %s AND id_tutor = %s", (uid, tutor_id))
            if not cur.fetchone():
                return jsonify({'error': 'Send this tutor a request first — you can book once they accept'}), 403
            student_id = _student_profile_id(cur, uid)
        elif data.get('student_id'):
            cur.execute("SELECT id_tutor, hourly_rate FROM tutor_profiles WHERE id_user = %s LIMIT 1", (uid,))
            tutor = cur.fetchone()
            if not tutor:
                return jsonify({'error': 'Only tutors can schedule students'}), 403
            tutor_id, rate = tutor[0], float(tutor[1] or 20)
            student_id = data['student_id']
            cur.execute(
                "SELECT 1 FROM active_students WHERE id_tutor = %s AND id_student = %s",
                (tutor_id, student_id),
            )
            if not cur.fetchone():
                return jsonify({'error': 'You can only schedule your own students'}), 403
        else:
            return jsonify({'error': 'tutor_id or student_id required'}), 400

        hours  = (end - start).total_seconds() / 3600
        amount = round(rate * hours, 2)
        status = 'confirmed' if data.get('student_id') else 'pending'

        cur.execute("""
            INSERT INTO events (user_id, tutor_id, student_id, title, description,
                                start_time, end_time, status, amount, booking_fee)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (uid, tutor_id, student_id, title, (data.get('description') or '').strip(),
              start, end, status, amount, booking_fee(amount)))
        event_id = cur.lastrowid
        if status == 'confirmed':
            cur.execute("UPDATE events SET meeting_url = %s WHERE id_event = %s", (new_meeting_url(event_id), event_id))
        conn.commit()
    finally:
        cur.close(); conn.close()

    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        return jsonify({'event': fetch_event(cur, event_id)}), 201
    finally:
        cur.close(); conn.close()


@bp.route('/events/<int:event_id>/status', methods=['PUT'])
@jwt_required()
def update_event_status(event_id):
    """Tutors confirm or decline; either side can cancel. 'paid' is set by Payments only."""
    uid    = current_user_id()
    status = (request.get_json(silent=True) or {}).get('status')
    if status not in ('confirmed', 'canceled'):
        return jsonify({'error': 'Status must be confirmed or canceled'}), 400

    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        ev = fetch_event(cur, event_id)
        if not ev:
            return jsonify({'error': 'Session not found'}), 404
        is_tutor   = ev['tutor_user_id'] == uid
        is_student = ev['student_user_id'] == uid
        if not (is_tutor or is_student):
            return jsonify({'error': 'Not your session'}), 403
        if status == 'confirmed' and not is_tutor:
            return jsonify({'error': 'Only the tutor can confirm a session'}), 403
        if ev['status'] == 'paid':
            return jsonify({'error': 'Paid sessions can no longer be changed'}), 400

        if status == 'confirmed' and not ev['meeting_url']:
            cur.execute("UPDATE events SET status = %s, meeting_url = %s WHERE id_event = %s",
                        (status, new_meeting_url(event_id), event_id))
        else:
            cur.execute("UPDATE events SET status = %s WHERE id_event = %s", (status, event_id))
        conn.commit()
        return jsonify({'message': 'Session updated', 'event': fetch_event(cur, event_id)})
    finally:
        cur.close(); conn.close()


@bp.route('/events/<int:event_id>/meeting', methods=['PUT'])
@jwt_required()
def set_meeting_link(event_id):
    """The tutor can swap the generated video room for their own link (Zoom, Meet, Teams…)."""
    url = ((request.get_json(silent=True) or {}).get('meeting_url') or '').strip()
    if url and (not url.startswith(('https://', 'http://')) or len(url) > 500):
        return jsonify({'error': 'Use a full https:// link'}), 400

    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        ev = fetch_event(cur, event_id)
        if not ev:
            return jsonify({'error': 'Session not found'}), 404
        if ev['tutor_user_id'] != current_user_id():
            return jsonify({'error': 'Only the tutor can change the session link'}), 403
        cur.execute("UPDATE events SET meeting_url = %s WHERE id_event = %s", (url or new_meeting_url(event_id), event_id))
        conn.commit()
        return jsonify({'event': fetch_event(cur, event_id)})
    finally:
        cur.close(); conn.close()
