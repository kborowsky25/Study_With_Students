"""Availability: a tutor's weekly hours and days off, and the start times students can book."""
from datetime import timedelta

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..db import current_user_id, get_db
from ..referrals import available_credits
from ..scheduling import (
    DEFAULT_NOTICE_HOURS,
    MAX_SLOT_WEEKS,
    MIN_WINDOW_MINUTES,
    NOTICE_CHOICES,
    availability_summary,
    busy_times,
    intro_call_available,
    load_blocked,
    load_windows,
    local_now,
    normalise_windows,
    open_slots,
    parse_day,
    parse_hhmm,
    windows_json,
)

# Mounted under /api by the events blueprint
bp = Blueprint('availability', __name__)

MAX_WINDOWS = 42
MAX_DAYS_OFF = 366
SLOT_LENGTHS = (15, 30, 45, 60, 90, 120)


def _own_tutor(cur):
    cur.execute(
        "SELECT id_tutor, id_user, booking_notice_hours FROM tutor_profiles WHERE id_user = %s LIMIT 1",
        (current_user_id(),),
    )
    return cur.fetchone()


def _payload(cur, tutor):
    windows = load_windows(cur, tutor['id_tutor'])
    return {
        'tutor_id':       tutor['id_tutor'],
        'weekly':         windows_json(windows),
        'blocked':        load_blocked(cur, tutor['id_tutor']),
        'notice_hours':   tutor['booking_notice_hours'] or DEFAULT_NOTICE_HOURS,
        'notice_choices': NOTICE_CHOICES,
        'summary':        availability_summary(windows),
    }


def _not_a_tutor():
    return jsonify({'error': 'Only tutors have availability'}), 403


@bp.route('/availability', methods=['GET'])
@jwt_required()
def my_availability():
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        tutor = _own_tutor(cur)
        if not tutor:
            return _not_a_tutor()
        return jsonify(_payload(cur, tutor))
    finally:
        cur.close(); conn.close()


@bp.route('/availability', methods=['PUT'])
@jwt_required()
def save_availability():
    """Replace the weekly hours: `weekly: [{weekday: 0–6, start: 'HH:MM', end: 'HH:MM'}]`,
    plus `notice_hours`. The profile's availability text is rewritten from the hours, so the
    directory and the matching model read the same thing."""
    data = request.get_json(silent=True) or {}
    weekly = data.get('weekly', [])
    if not isinstance(weekly, list) or len(weekly) > MAX_WINDOWS:
        return jsonify({'error': 'Send your weekly hours as a list'}), 400

    windows = []
    for item in weekly:
        item = item if isinstance(item, dict) else {}
        weekday = item.get('weekday')
        start, end = parse_hhmm(item.get('start')), parse_hhmm(item.get('end'))
        if type(weekday) is not int or not 0 <= weekday <= 6 or start is None or end is None:
            return jsonify({'error': 'Each time range needs a day, a start and an end'}), 400
        if end - start < MIN_WINDOW_MINUTES:
            return jsonify({'error': f'Each time range must be at least {MIN_WINDOW_MINUTES} minutes long'}), 400
        windows.append((weekday, start, end))
    windows = normalise_windows(windows)

    notice = data.get('notice_hours')
    if notice is not None and notice not in NOTICE_CHOICES:
        return jsonify({'error': 'Choose one of the notice options'}), 400

    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        tutor = _own_tutor(cur)
        if not tutor:
            return _not_a_tutor()
        tutor_id = tutor['id_tutor']
        cur.execute("DELETE FROM tutor_availability WHERE tutor_id = %s", (tutor_id,))
        for weekday, start, end in windows:
            cur.execute(
                "INSERT INTO tutor_availability (tutor_id, weekday, start_time, end_time) VALUES (%s, %s, %s, %s)",
                (tutor_id, weekday, timedelta(minutes=start), timedelta(minutes=end)),
            )
        if notice is not None:
            cur.execute("UPDATE tutor_profiles SET booking_notice_hours = %s WHERE id_tutor = %s", (notice, tutor_id))
            tutor['booking_notice_hours'] = notice
        if windows:
            cur.execute("UPDATE tutor_profiles SET availability = %s WHERE id_tutor = %s",
                        (availability_summary(windows), tutor_id))
        conn.commit()
        return jsonify(_payload(cur, tutor))
    finally:
        cur.close(); conn.close()


@bp.route('/availability/blocked', methods=['POST'])
@jwt_required()
def add_days_off():
    """Block `start_date` to `end_date` (inclusive; one day when `end_date` is left out)."""
    data = request.get_json(silent=True) or {}
    start = parse_day(data.get('start_date'))
    end = parse_day(data.get('end_date')) if data.get('end_date') else start
    note = (data.get('note') or '').strip()[:120] or None
    if not start or not end:
        return jsonify({'error': 'Choose the days you’re away'}), 400
    if end < start:
        return jsonify({'error': 'The last day can’t be before the first'}), 400
    if end < local_now().date():
        return jsonify({'error': 'Those days have already passed'}), 400
    if (end - start).days >= MAX_DAYS_OFF:
        return jsonify({'error': 'Block at most a year at a time'}), 400

    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        tutor = _own_tutor(cur)
        if not tutor:
            return _not_a_tutor()
        cur.execute(
            "INSERT INTO tutor_blocked_dates (tutor_id, start_date, end_date, note) VALUES (%s, %s, %s, %s)",
            (tutor['id_tutor'], start, end, note),
        )
        conn.commit()
        return jsonify(_payload(cur, tutor)), 201
    finally:
        cur.close(); conn.close()


@bp.route('/availability/blocked/<int:block_id>', methods=['DELETE'])
@jwt_required()
def remove_days_off(block_id):
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        tutor = _own_tutor(cur)
        if not tutor:
            return _not_a_tutor()
        cur.execute("DELETE FROM tutor_blocked_dates WHERE id = %s AND tutor_id = %s", (block_id, tutor['id_tutor']))
        if not cur.rowcount:
            return jsonify({'error': 'Days off not found'}), 404
        conn.commit()
        return jsonify(_payload(cur, tutor))
    finally:
        cur.close(); conn.close()


# ── What students see ─────────────────────────────────────────────────────────

def _tutor(cur, tutor_id):
    cur.execute(
        "SELECT id_tutor, id_user, booking_notice_hours FROM tutor_profiles WHERE id_tutor = %s",
        (tutor_id,),
    )
    return cur.fetchone()


@bp.route('/tutors/<int:tutor_id>/booking-info', methods=['GET'])
@jwt_required()
def booking_info(tutor_id):
    """What the booking dialog needs: whether the tutor has set weekly hours (instant booking),
    whether this student can still have their free intro call, and how many booking fees their
    invite credits will pay."""
    uid = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        tutor = _tutor(cur, tutor_id)
        if not tutor:
            return jsonify({'error': 'Tutor not found'}), 404
        windows = load_windows(cur, tutor_id)
        cur.execute("""
            SELECT at2.id_student FROM active_tutors at2
            WHERE at2.id_user = %s AND at2.id_tutor = %s LIMIT 1
        """, (uid, tutor_id))
        link = cur.fetchone()
        return jsonify({
            'connected':        bool(link),
            'has_availability': bool(windows),
            'summary':          availability_summary(windows),
            'notice_hours':     tutor['booking_notice_hours'] or DEFAULT_NOTICE_HOURS,
            'intro_call':       bool(link) and intro_call_available(cur, tutor_id, link['id_student']),
            'fee_credits':      available_credits(cur, uid, local_now()),
        })
    finally:
        cur.close(); conn.close()


@bp.route('/tutors/<int:tutor_id>/slots', methods=['GET'])
@jwt_required()
def bookable_slots(tutor_id):
    """Start times free for a session of `minutes` over the next `weeks` weeks.

    Leaves out the tutor's days off, times taken by pending, confirmed or paid sessions (of the
    tutor and of the student), and anything inside the tutor's booking notice. The student is the
    caller, or with `event` (moving a session) that session's student, or with `student` (a tutor
    scheduling one of their students) that student.
    """
    uid = current_user_id()
    minutes = request.args.get('minutes', 60, type=int)
    weeks = request.args.get('weeks', 3, type=int)
    event_id = request.args.get('event', type=int)
    student_id = request.args.get('student', type=int)
    if minutes not in SLOT_LENGTHS:
        return jsonify({'error': 'Choose a session length'}), 400
    weeks = max(1, min(weeks or 3, MAX_SLOT_WEEKS))

    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        tutor = _tutor(cur, tutor_id)
        if not tutor:
            return jsonify({'error': 'Tutor not found'}), 404

        people = {tutor['id_user'], uid}
        if event_id:
            cur.execute("""
                SELECT e.tutor_id, sp.id_user AS student_user_id
                FROM events e LEFT JOIN student_profiles sp ON sp.id_student = e.student_id
                WHERE e.id_event = %s
            """, (event_id,))
            ev = cur.fetchone()
            if not ev or ev['tutor_id'] != tutor_id or uid not in (tutor['id_user'], ev['student_user_id']):
                return jsonify({'error': 'Not your session'}), 403
            people = {tutor['id_user'], ev['student_user_id']}
        elif student_id:
            cur.execute("""
                SELECT sp.id_user FROM active_students ast2
                JOIN student_profiles sp ON sp.id_student = ast2.id_student
                WHERE ast2.id_tutor = %s AND ast2.id_student = %s LIMIT 1
            """, (tutor_id, student_id))
            row = cur.fetchone()
            if tutor['id_user'] != uid or not row:
                return jsonify({'error': 'You can only schedule your own students'}), 403
            people = {uid, row['id_user']}

        windows = load_windows(cur, tutor_id)
        notice = tutor['booking_notice_hours'] or DEFAULT_NOTICE_HOURS
        slots = []
        if windows:
            now = local_now()
            first_day, days = now.date(), weeks * 7
            busy = busy_times(cur, people, now, now + timedelta(days=days + 1), exclude_event_id=event_id)
            slots = open_slots(windows, load_blocked(cur, tutor_id), busy, minutes, first_day, days,
                               now + timedelta(hours=notice))
        return jsonify({
            'slots':            slots,
            'minutes':          minutes,
            'weeks':            weeks,
            'has_availability': bool(windows),
            'notice_hours':     notice,
        })
    finally:
        cur.close(); conn.close()
