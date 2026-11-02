"""Events: 1-to-1 sessions. Students request, tutors confirm, students (or their parents) pay the tutor.

Booking rules (weekly hours, clashes, notice, intro calls, the 24-hour cancellation policy) live
in server/scheduling.py. A booking can repeat weekly: the weeks share a `series_id` (the first
week's id) and one confirmation from the tutor answers them all.
"""
import secrets
from datetime import timedelta

from flask import Blueprint, Response, jsonify, request
from flask_jwt_extended import jwt_required

from ..config import Config
from ..db import current_user_id, get_db
from ..family import needs_parent, parent_required_error
from ..scheduling import (
    DEFAULT_NOTICE_HOURS,
    FREE_CANCEL_HOURS,
    INTRO_MINUTES,
    MAX_REPEAT_WEEKS,
    MAX_SESSION_MINUTES,
    busy_times,
    intro_call_available,
    load_blocked,
    load_windows,
    local_now,
    parse_dt,
    slot_problem,
)
from ..services.ics import calendar_file
from .availability import bp as availability_bp
from .background import dbs_required_error, tutor_dbs_verified
from .cron import bp as cron_bp

bp = Blueprint('events', __name__, url_prefix='/api')
# Weekly hours, bookable slots and the reminder job have their own modules, mounted under /api here
bp.register_blueprint(availability_bp)
bp.register_blueprint(cron_bp)

# Families pay this on top of the tutor's price; tutors keep 100% of `amount`.
BOOKING_FEE_PERCENT = getattr(Config, 'BOOKING_FEE_PERCENT', 5)


def real_session_sql(alias='e'):
    """SQL condition: a 1-to-1 session, not a study room a student saved to their calendar.

    Calendar copies are tagged kind = 'room'; older ones are recognised by their title.
    """
    return (f"({alias}.kind <> 'room' AND LEFT(COALESCE({alias}.title, ''), 12) <> 'Study Room: ')")


def is_room_copy(ev):
    return ev.get('kind') == 'room' or str(ev.get('title') or '').startswith('Study Room: ')


def booking_fee(amount):
    return round(float(amount) * BOOKING_FEE_PERCENT / 100, 2)

EVENT_COLUMNS = """
    e.id_event, e.title, e.description, e.start_time, e.end_time, e.status, e.amount, e.booking_fee,
    e.tutor_id, e.student_id, e.created_at, e.meeting_url,
    e.kind, e.series_id, e.proposed_start, e.proposed_end, e.proposed_by,
    e.cancel_requested_at, e.canceled_by, e.cancel_type,
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


def new_meeting_url(room_id):
    """A private video room for the session (Jitsi Meet — free, no account needed to join).
    A weekly series shares one room, named after the series."""
    return f'https://meet.jit.si/StudyWithStudents-{room_id}-{secrets.token_hex(5)}'


def fetch_event(cur, event_id):
    cur.execute(f"SELECT {EVENT_COLUMNS} {EVENT_JOINS} WHERE e.id_event = %s", (event_id,))
    return cur.fetchone()


def _booking_connection():
    """A transaction that sees bookings committed while it waited for the tutor's row lock."""
    conn = get_db()
    conn.start_transaction(isolation_level='READ COMMITTED')
    return conn


def _lock_tutor(cur, tutor_id=None, user_id=None):
    """Lock the tutor's row so two bookings for the same time can't both get through."""
    column, value = ('id_tutor', tutor_id) if tutor_id else ('id_user', user_id)
    cur.execute(f"""
        SELECT id_tutor, id_user, hourly_rate, booking_notice_hours
        FROM tutor_profiles WHERE {column} = %s LIMIT 1 FOR UPDATE
    """, (value,))
    return cur.fetchone()


def _student_profile_id(cur, user_id):
    cur.execute("SELECT id_student FROM student_profiles WHERE id_user = %s LIMIT 1", (user_id,))
    row = cur.fetchone()
    if row:
        return row['id_student']
    cur.execute("INSERT INTO student_profiles (id_user) VALUES (%s)", (user_id,))
    return cur.lastrowid


def _first(name, fallback):
    parts = (name or '').split()
    return parts[0] if parts else fallback


def _side(ev, uid):
    if ev['tutor_user_id'] == uid:
        return 'tutor'
    return 'student' if ev['student_user_id'] == uid else None


def _load(cur, event_id, uid):
    """The session and the caller's side of it ('tutor' or 'student'), or an error response."""
    ev = fetch_event(cur, event_id)
    if not ev:
        return None, None, (jsonify({'error': 'Session not found'}), 404)
    side = _side(ev, uid)
    if not side:
        return None, None, (jsonify({'error': 'Not your session'}), 403)
    return ev, side, None


def _weeks(cur, ev, statuses, from_start=None):
    """This session alone, or the weeks of its series in `statuses` (from `from_start` on)."""
    if not ev['series_id']:
        return [ev]
    query = f"""
        SELECT id_event, status, start_time FROM events
        WHERE series_id = %s AND status IN ({', '.join(['%s'] * len(statuses))})
    """
    params = [ev['series_id'], *statuses]
    if from_start:
        query += " AND start_time >= %s"
        params.append(from_start)
    cur.execute(query + " ORDER BY start_time", params)
    return cur.fetchall()


def _problem_message(problem, *, tutor, student, by_tutor, notice):
    """Why a time can't be booked, worded for whoever is booking (`tutor`/`student`: first names)."""
    return {
        'notice':       f'{tutor} needs {notice} hours’ notice',
        'away':         f'{tutor} is away that day',
        'hours':        f'That’s outside {tutor}’s available hours',
        'tutor_busy':   'You already have a session then' if by_tutor else f'{tutor} already has a session then',
        'student_busy': f'{student} already has a session then' if by_tutor else 'You already have a session then',
    }[problem]


def _number_series(events):
    """Week 2 of 6: `series_index`/`series_size` for weekly sessions (cancelled weeks aren't counted)."""
    weeks = {}
    for ev in events:
        if ev['series_id'] and ev['status'] != 'canceled':
            weeks.setdefault(ev['series_id'], []).append(ev['id_event'])
    for ev in events:
        ids = weeks.get(ev['series_id'], [])
        ev['series_size'] = len(ids) if ev['series_id'] else None
        ev['series_index'] = ids.index(ev['id_event']) + 1 if ev['id_event'] in ids else None
    return events


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
        return jsonify({'events': _number_series(events)})
    finally:
        cur.close(); conn.close()


@bp.route('/events', methods=['POST'])
@jwt_required()
def create_event():
    """A student books a tutor (`tutor_id`), or a tutor schedules a student (`student_id`).

    `repeat_weeks` (1–12) books the same time every week as one series. `kind: 'intro'` is the
    free 15-minute intro call (students only, one per tutor before the first paid session).
    When the tutor has weekly hours, students book inside them, outside days off and the notice.
    Weeks that clash fail the booking with a list of `conflicts`, unless `skip_conflicts` is set.
    """
    uid   = current_user_id()
    data  = request.get_json(silent=True) or {}
    intro = data.get('kind') == 'intro'
    start = parse_dt(data.get('start_time'))
    end   = start + timedelta(minutes=INTRO_MINUTES) if intro and start else parse_dt(data.get('end_time'))
    title = 'Intro call' if intro else (data.get('title') or '').strip()[:255] or 'Tutoring session'
    try:
        weeks = 1 if intro else int(data.get('repeat_weeks') or 1)
    except (TypeError, ValueError):
        weeks = 0

    if not start or not end or end <= start:
        return jsonify({'error': 'Choose a valid start and end time'}), 400
    length = end - start
    if length > timedelta(minutes=MAX_SESSION_MINUTES):
        return jsonify({'error': 'Sessions can be up to 4 hours long'}), 400
    if not 1 <= weeks <= MAX_REPEAT_WEEKS:
        return jsonify({'error': f'Repeat a session for 1 to {MAX_REPEAT_WEEKS} weeks'}), 400
    now = local_now()
    if start < now:
        return jsonify({'error': 'Sessions must be booked in the future'}), 400

    conn = _booking_connection(); cur = conn.cursor(dictionary=True)
    try:
        by_tutor = not data.get('tutor_id')
        if not by_tutor:
            tutor = _lock_tutor(cur, tutor_id=data['tutor_id'])
            if not tutor:
                return jsonify({'error': 'Tutor not found'}), 404
            if tutor['id_user'] == uid:
                return jsonify({'error': "You can't book a session with yourself"}), 400
            if not tutor_dbs_verified(cur, tutor['id_tutor']):
                return jsonify(dbs_required_error()), 403
            cur.execute("SELECT 1 FROM active_tutors WHERE id_user = %s AND id_tutor = %s", (uid, tutor['id_tutor']))
            if not cur.fetchall():
                return jsonify({'error': 'Send this tutor a request first — you can book once they accept'}), 403
            student_id = _student_profile_id(cur, uid)
        elif data.get('student_id'):
            if intro:
                return jsonify({'error': 'Intro calls are booked by students'}), 400
            tutor = _lock_tutor(cur, user_id=uid)
            if not tutor:
                return jsonify({'error': 'Only tutors can schedule students'}), 403
            if not tutor_dbs_verified(cur, tutor['id_tutor']):
                return jsonify(dbs_required_error(own=True)), 403
            student_id = data['student_id']
            cur.execute(
                "SELECT 1 FROM active_students WHERE id_tutor = %s AND id_student = %s",
                (tutor['id_tutor'], student_id),
            )
            if not cur.fetchall():
                return jsonify({'error': 'You can only schedule your own students'}), 403
        else:
            return jsonify({'error': 'tutor_id or student_id required'}), 400

        cur.execute("SELECT id_user FROM student_profiles WHERE id_student = %s FOR UPDATE", (student_id,))
        student_user = (cur.fetchone() or {}).get('id_user')
        tutor_id = tutor['id_tutor']
        if student_user and needs_parent(cur, student_user):  # under-18s book once a parent is linked
            name = None
            if by_tutor:
                cur.execute("SELECT name FROM users WHERE id_user = %s", (student_user,))
                name = _first(cur.fetchall()[0]['name'], 'Your student')
            return jsonify(parent_required_error(name)), 403
        if intro and not intro_call_available(cur, tutor_id, student_id):
            return jsonify({
                'error': 'You’ve already had your free intro call with this tutor',
                'code':  'intro_used',
            }), 409

        cur.execute("SELECT id_user, name FROM users WHERE id_user IN (%s, %s)", (tutor['id_user'], student_user))
        names = {r['id_user']: r['name'] for r in cur.fetchall()}

        # Students book inside the tutor's weekly hours (when set), outside days off and the notice
        windows  = [] if by_tutor else load_windows(cur, tutor_id)
        blocked  = [] if by_tutor else load_blocked(cur, tutor_id)
        notice   = tutor['booking_notice_hours'] or DEFAULT_NOTICE_HOURS
        earliest = now + timedelta(hours=notice) if windows else now
        dates    = [start + timedelta(weeks=i) for i in range(weeks)]
        span     = (start, dates[-1] + length)
        minutes  = int(length.total_seconds() // 60)
        tutor_busy, student_busy = busy_times(cur, [tutor['id_user']], *span), busy_times(cur, [student_user], *span)
        problems = {}
        for when in dates:
            problem = slot_problem(when, minutes, windows=windows, blocked=blocked, tutor_busy=tutor_busy,
                                   student_busy=student_busy, earliest=earliest)
            if problem:
                problems[when] = problem

        wording = {'tutor': _first(names.get(tutor['id_user']), 'Your tutor'),
                   'student': _first(names.get(student_user), 'Your student'), 'by_tutor': by_tutor, 'notice': notice}
        if problems and weeks == 1:
            problem = problems[start]
            return jsonify({'error': _problem_message(problem, **wording), 'code': problem}), \
                409 if problem.endswith('busy') else 400
        if problems and (not data.get('skip_conflicts') or len(problems) == weeks):
            return jsonify({
                'error':     f'{len(problems)} of {weeks} weeks can’t be booked',
                'code':      'conflicts',
                'conflicts': [{'start_time': when, 'reason': problem, 'message': _problem_message(problem, **wording)}
                              for when, problem in sorted(problems.items())],
            }), 409

        amount = 0 if intro else round(float(tutor['hourly_rate'] or 20) * length.total_seconds() / 3600, 2)
        fee    = 0 if intro else booking_fee(amount)
        status = 'confirmed' if by_tutor else 'pending'
        ids = []
        for when in dates:
            if when in problems:
                continue
            cur.execute("""
                INSERT INTO events (user_id, tutor_id, student_id, title, description, start_time, end_time,
                                    status, amount, booking_fee, kind)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (uid, tutor_id, student_id, title, (data.get('description') or '').strip(),
                  when, when + length, status, amount, fee, 'intro' if intro else 'session'))
            ids.append(cur.lastrowid)
        marks = ', '.join(['%s'] * len(ids))
        series_id = ids[0] if len(ids) > 1 else None
        if series_id:
            cur.execute(f"UPDATE events SET series_id = %s WHERE id_event IN ({marks})", (series_id, *ids))
        if status == 'confirmed':
            cur.execute(f"UPDATE events SET meeting_url = %s WHERE id_event IN ({marks})",
                        (new_meeting_url(series_id or ids[0]), *ids))
        conn.commit()

        cur.execute(f"SELECT {EVENT_COLUMNS} {EVENT_JOINS} WHERE e.id_event IN ({marks}) ORDER BY e.start_time", ids)
        created = cur.fetchall()
        for ev in created:
            ev['role'] = 'tutor' if by_tutor else 'student'
        _number_series(created)
        return jsonify({'event': created[0], 'events': created, 'series_id': series_id,
                        'skipped': sorted(problems)}), 201
    finally:
        cur.close(); conn.close()


def _cancel(cur, week, *, by, kind, now):
    cur.execute("""
        UPDATE events
        SET status = 'canceled', canceled_by = %s, canceled_at = %s, cancel_type = %s,
            cancel_requested_at = NULL, proposed_start = NULL, proposed_end = NULL, proposed_by = NULL
        WHERE id_event = %s
    """, (by, now, kind, week['id_event']))


@bp.route('/events/<int:event_id>/status', methods=['PUT'])
@jwt_required()
def update_event_status(event_id):
    """Tutors confirm or decline; either side can cancel. 'paid' is set by Payments only.

    A weekly series is answered as one: confirming or declining covers every pending week, and
    `scope: 'series'` cancels this week and the ones after it. Students cancel free of charge
    until 24 hours before; after that a confirmed session needs the tutor's agreement
    (/cancel-request). Tutors can always cancel; `canceled_by` keeps count of it.
    """
    uid    = current_user_id()
    data   = request.get_json(silent=True) or {}
    status = data.get('status')
    whole_series = data.get('scope') == 'series'
    if status not in ('confirmed', 'canceled'):
        return jsonify({'error': 'Status must be confirmed or canceled'}), 400

    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        ev, side, error = _load(cur, event_id, uid)
        if error:
            return error
        if status == 'confirmed' and side != 'tutor':
            return jsonify({'error': 'Only the tutor can confirm a session'}), 403
        if ev['status'] == 'paid':
            return jsonify({'error': 'Paid sessions can no longer be changed'}), 400
        if ev['status'] == 'canceled':
            return jsonify({'error': 'This session is already cancelled'}), 400
        now = local_now()

        if status == 'confirmed':
            if ev['status'] != 'pending':
                return jsonify({'error': 'This session is already confirmed'}), 400
            if ev['start_time'] <= now:
                return jsonify({'error': 'This request has expired'}), 400
            weeks = _weeks(cur, ev, ('pending',), from_start=now)
            ids = [w['id_event'] for w in weeks]
            cur.execute(f"""
                UPDATE events
                SET status = 'confirmed', meeting_url = COALESCE(meeting_url, %s),
                    proposed_start = NULL, proposed_end = NULL, proposed_by = NULL
                WHERE id_event IN ({', '.join(['%s'] * len(ids))})
            """, (new_meeting_url(ev['series_id'] or event_id), *ids))
            message = 'Session confirmed' if len(ids) == 1 else f'{len(ids)} sessions confirmed'
        elif ev['status'] == 'pending':
            # An unanswered request: the tutor declines all of it, the student withdraws it
            if side == 'tutor':
                weeks = _weeks(cur, ev, ('pending',))
            else:
                weeks = _weeks(cur, ev, ('pending',), from_start=ev['start_time']) if whole_series else [ev]
            for week in weeks:
                _cancel(cur, week, by=side, kind='declined' if side == 'tutor' else 'withdrawn', now=now)
            done = 'declined' if side == 'tutor' else 'withdrawn'
            message = f'Request {done}' if len(weeks) == 1 else f'{len(weeks)} requests {done}'
        else:
            if ev['start_time'] <= now:
                return jsonify({'error': 'This session has already started'}), 400
            late = ev['start_time'] - now < timedelta(hours=FREE_CANCEL_HOURS)
            if side == 'student' and late:
                return jsonify({
                    'error': f'Free cancellation ends {FREE_CANCEL_HOURS} hours before a session. '
                             f'Ask {_first(ev["tutor_name"], "your tutor")} to agree instead.',
                    'code':  'late_cancel',
                }), 409
            # A tutor cancelling a session the student asked to cancel is agreeing to the request
            agreed = side == 'tutor' and ev['cancel_requested_at'] is not None
            weeks = _weeks(cur, ev, ('pending', 'confirmed'), from_start=ev['start_time']) if whole_series else [ev]
            for week in weeks:
                if agreed and week['id_event'] == event_id:
                    _cancel(cur, week, by='student', kind='late', now=now)
                elif week['status'] == 'pending':
                    _cancel(cur, week, by=side, kind='declined' if side == 'tutor' else 'withdrawn', now=now)
                else:
                    soon = week['start_time'] - now < timedelta(hours=FREE_CANCEL_HOURS)
                    _cancel(cur, week, by=side, kind='late' if soon else 'canceled', now=now)
            message = 'Session cancelled' if len(weeks) == 1 else f'{len(weeks)} sessions cancelled'
        conn.commit()
        return jsonify({'message': message, 'updated': len(weeks), 'event': fetch_event(cur, event_id)})
    finally:
        cur.close(); conn.close()


# ── Moving a session ──────────────────────────────────────────────────────────

def _time_problem(cur, ev, start, side, now, rules=True):
    """Why `ev` can't move to `start`, as (message, HTTP status), or None. Students moving a
    session keep to the tutor's weekly hours, days off and notice (`rules`); tutors don't."""
    tutor = _lock_tutor(cur, tutor_id=ev['tutor_id'])
    length = ev['end_time'] - ev['start_time']
    student_rules = rules and side == 'student'
    windows = load_windows(cur, ev['tutor_id']) if student_rules else []
    blocked = load_blocked(cur, ev['tutor_id']) if student_rules else []
    notice = tutor['booking_notice_hours'] or DEFAULT_NOTICE_HOURS
    problem = slot_problem(
        start, int(length.total_seconds() // 60), windows=windows, blocked=blocked,
        tutor_busy=busy_times(cur, [ev['tutor_user_id']], start, start + length, ev['id_event']),
        student_busy=busy_times(cur, [ev['student_user_id']], start, start + length, ev['id_event']),
        earliest=now + timedelta(hours=notice) if windows else now,
    )
    if not problem:
        return None
    message = _problem_message(problem, tutor=_first(ev['tutor_name'], 'Your tutor'),
                               student=_first(ev['student_name'], 'Your student'),
                               by_tutor=side == 'tutor', notice=notice)
    return message, 409 if problem.endswith('busy') else 400


@bp.route('/events/<int:event_id>/reschedule', methods=['POST'])
@jwt_required()
def propose_new_time(event_id):
    """Either side proposes a new `start_time` (same length); the other accepts or declines it.
    A student's own pending request simply moves, since the tutor hasn't agreed to a time yet."""
    uid = current_user_id()
    start = parse_dt((request.get_json(silent=True) or {}).get('start_time'))
    conn = _booking_connection(); cur = conn.cursor(dictionary=True)
    try:
        ev, side, error = _load(cur, event_id, uid)
        if error:
            return error
        now = local_now()
        if ev['status'] == 'canceled':
            return jsonify({'error': 'Cancelled sessions can’t be moved'}), 400
        if ev['start_time'] <= now:
            return jsonify({'error': 'This session has already started'}), 400
        if not start or start <= now:
            return jsonify({'error': 'Pick a time in the future'}), 400
        if start == ev['start_time']:
            return jsonify({'error': 'That’s already the session’s time'}), 400
        problem = _time_problem(cur, ev, start, side, now)
        if problem:
            return jsonify({'error': problem[0]}), problem[1]

        end = start + (ev['end_time'] - ev['start_time'])
        if side == 'student' and ev['status'] == 'pending':
            cur.execute("""
                UPDATE events SET start_time = %s, end_time = %s,
                       proposed_start = NULL, proposed_end = NULL, proposed_by = NULL
                WHERE id_event = %s
            """, (start, end, event_id))
            message = 'Request moved'
        else:
            cur.execute(
                "UPDATE events SET proposed_start = %s, proposed_end = %s, proposed_by = %s WHERE id_event = %s",
                (start, end, side, event_id),
            )
            message = 'New time proposed'
        conn.commit()
        return jsonify({'message': message, 'event': fetch_event(cur, event_id)})
    finally:
        cur.close(); conn.close()


@bp.route('/events/<int:event_id>/reschedule/accept', methods=['POST'])
@jwt_required()
def accept_new_time(event_id):
    """Accepting the other side's new time moves the session (and confirms a pending request)."""
    conn = _booking_connection(); cur = conn.cursor(dictionary=True)
    try:
        ev, side, error = _load(cur, event_id, current_user_id())
        if error:
            return error
        if not ev['proposed_start'] or ev['status'] == 'canceled':
            return jsonify({'error': 'There’s no new time to answer'}), 400
        if ev['proposed_by'] == side:
            return jsonify({'error': 'The other side needs to answer your proposal'}), 403
        now = local_now()
        if ev['proposed_start'] <= now:
            return jsonify({'error': 'That time has passed. Propose another one.'}), 400
        problem = _time_problem(cur, ev, ev['proposed_start'], side, now, rules=False)
        if problem:
            return jsonify({'error': problem[0]}), problem[1]

        confirm = ev['status'] == 'pending'
        cur.execute("""
            UPDATE events
            SET start_time = proposed_start, end_time = proposed_end,
                proposed_start = NULL, proposed_end = NULL, proposed_by = NULL,
                status = %s, meeting_url = COALESCE(meeting_url, %s)
            WHERE id_event = %s
        """, ('confirmed' if confirm else ev['status'], new_meeting_url(event_id) if confirm else None, event_id))
        conn.commit()
        return jsonify({'message': 'Session moved', 'event': fetch_event(cur, event_id)})
    finally:
        cur.close(); conn.close()


@bp.route('/events/<int:event_id>/reschedule', methods=['DELETE'])
@jwt_required()
def drop_new_time(event_id):
    """Decline the other side's new time, or withdraw your own proposal."""
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        ev, side, error = _load(cur, event_id, current_user_id())
        if error:
            return error
        if not ev['proposed_start']:
            return jsonify({'error': 'There’s no new time to answer'}), 400
        cur.execute(
            "UPDATE events SET proposed_start = NULL, proposed_end = NULL, proposed_by = NULL WHERE id_event = %s",
            (event_id,),
        )
        conn.commit()
        message = 'Proposal withdrawn' if ev['proposed_by'] == side else 'New time declined'
        return jsonify({'message': message, 'event': fetch_event(cur, event_id)})
    finally:
        cur.close(); conn.close()


# ── Late cancellations (inside 24 hours, the tutor has to agree) ──────────────

@bp.route('/events/<int:event_id>/cancel-request', methods=['POST'])
@jwt_required()
def ask_to_cancel(event_id):
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        ev, side, error = _load(cur, event_id, current_user_id())
        if error:
            return error
        if side != 'student':
            return jsonify({'error': 'Only the student asks to cancel'}), 403
        if ev['status'] != 'confirmed':
            return jsonify({'error': 'Only confirmed sessions need the tutor’s agreement to cancel'}), 400
        now = local_now()
        if ev['start_time'] <= now:
            return jsonify({'error': 'This session has already started'}), 400
        if ev['start_time'] - now >= timedelta(hours=FREE_CANCEL_HOURS):
            return jsonify({'error': 'You can still cancel this session yourself'}), 400
        if ev['cancel_requested_at']:
            return jsonify({'error': 'You’ve already asked to cancel this session'}), 409
        cur.execute("UPDATE events SET cancel_requested_at = %s WHERE id_event = %s", (now, event_id))
        conn.commit()
        return jsonify({'message': f'Asked {_first(ev["tutor_name"], "your tutor")} to cancel',
                        'event': fetch_event(cur, event_id)})
    finally:
        cur.close(); conn.close()


@bp.route('/events/<int:event_id>/cancel-request', methods=['DELETE'])
@jwt_required()
def drop_cancel_request(event_id):
    """The student withdraws the request, or the tutor keeps the session."""
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        ev, side, error = _load(cur, event_id, current_user_id())
        if error:
            return error
        if not ev['cancel_requested_at'] or ev['status'] != 'confirmed':
            return jsonify({'error': 'There’s no request to cancel this session'}), 400
        cur.execute("UPDATE events SET cancel_requested_at = NULL WHERE id_event = %s", (event_id,))
        conn.commit()
        message = 'Request withdrawn' if side == 'student' else 'Session kept'
        return jsonify({'message': message, 'event': fetch_event(cur, event_id)})
    finally:
        cur.close(); conn.close()


@bp.route('/events/<int:event_id>/cancel-request/accept', methods=['POST'])
@jwt_required()
def agree_to_cancel(event_id):
    """The tutor agrees: cancelled at the student's request, so it doesn't count against the tutor."""
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        ev, side, error = _load(cur, event_id, current_user_id())
        if error:
            return error
        if side != 'tutor':
            return jsonify({'error': 'Only the tutor can agree to cancel'}), 403
        if not ev['cancel_requested_at'] or ev['status'] != 'confirmed':
            return jsonify({'error': 'There’s no request to cancel this session'}), 400
        _cancel(cur, ev, by='student', kind='late', now=local_now())
        conn.commit()
        return jsonify({'message': 'Session cancelled', 'event': fetch_event(cur, event_id)})
    finally:
        cur.close(); conn.close()


# ── Calendar files ────────────────────────────────────────────────────────────

def _ics(body, filename):
    return Response(body, mimetype='text/calendar',
                    headers={'Content-Disposition': f'attachment; filename="{filename}"'})


@bp.route('/events/<int:event_id>/ics', methods=['GET'])
@jwt_required()
def session_ics(event_id):
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        ev, side, error = _load(cur, event_id, current_user_id())
        if error:
            return error
        if ev['status'] == 'canceled':
            return jsonify({'error': 'This session was cancelled'}), 400
        return _ics(calendar_file([ev], lambda _: side), f'session-{event_id}.ics')
    finally:
        cur.close(); conn.close()


@bp.route('/series/<int:series_id>/ics', methods=['GET'])
@jwt_required()
def series_ics(series_id):
    """Every remaining week of a series in one file."""
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute(f"""
            SELECT {EVENT_COLUMNS} {EVENT_JOINS}
            WHERE e.series_id = %s AND e.status <> 'canceled' AND (tp.id_user = %s OR sp.id_user = %s)
            ORDER BY e.start_time
        """, (series_id, uid, uid))
        events = cur.fetchall()
        if not events:
            return jsonify({'error': 'Series not found'}), 404
        return _ics(calendar_file(events, lambda ev: _side(ev, uid)), f'sessions-{series_id}.ics')
    finally:
        cur.close(); conn.close()


@bp.route('/events/<int:event_id>/meeting', methods=['PUT'])
@jwt_required()
def set_meeting_link(event_id):
    """The tutor can swap the generated video room for their own link (Zoom, Meet, Teams…).
    `scope: 'series'` uses it for this week and the later weeks of a series."""
    data = request.get_json(silent=True) or {}
    url = (data.get('meeting_url') or '').strip()
    if url and (not url.startswith(('https://', 'http://')) or len(url) > 500):
        return jsonify({'error': 'Use a full https:// link'}), 400

    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        ev = fetch_event(cur, event_id)
        if not ev:
            return jsonify({'error': 'Session not found'}), 404
        if ev['tutor_user_id'] != current_user_id():
            return jsonify({'error': 'Only the tutor can change the session link'}), 403
        weeks = (_weeks(cur, ev, ('pending', 'confirmed', 'paid'), from_start=ev['start_time'])
                 if data.get('scope') == 'series' else [ev])
        ids = [w['id_event'] for w in weeks]
        cur.execute(f"UPDATE events SET meeting_url = %s WHERE id_event IN ({', '.join(['%s'] * len(ids))})",
                    (url or new_meeting_url(ev['series_id'] if len(ids) > 1 else event_id), *ids))
        conn.commit()
        return jsonify({'event': fetch_event(cur, event_id)})
    finally:
        cur.close(); conn.close()
