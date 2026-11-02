"""Lesson notes and progress by exam-spec topic.

Once a session has started (confirmed or paid) its tutor writes one note: the subject and
topics covered with a confidence rating (1–5) for each, a summary, homework and next steps.
Tutors can edit a note for a week; students read their notes and tick off homework.
Progress per subject comes from each topic's latest rating.

Who sees what: a student sees every note about themself. A tutor sees only the notes they
wrote, and only for students they have had a confirmed or paid session with.
"""
from datetime import date, datetime, timedelta

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from mysql.connector import IntegrityError

from ..data.topics import (
    SUBJECTS_BY_KEY,
    catalogue,
    is_topic,
    subject_name,
    topic_name,
    topic_sort_key,
)
from ..db import current_user_id, get_db
from .events import fetch_event

bp = Blueprint('progress', __name__, url_prefix='/api')

NOTE_STATUSES  = ('confirmed', 'paid')
EDIT_WINDOW    = timedelta(days=7)
CONFIDENT      = 4     # ratings from here up count as "confident"
MAX_SUMMARY    = 4000
MAX_NEXT_STEPS = 2000
MAX_TASK       = 300
MAX_HOMEWORK   = 10
MAX_NOTES      = 100
MAX_DONE       = 30    # finished homework returned with the progress summary

# Every query below reaches the session's tutor (tp, u_t) and student (sp, u_s) through
# these joins, so the scopes from _note_scope() apply to all of them.
SCOPE_JOINS = """
    JOIN events           e   ON e.id_event    = n.event_id
    JOIN tutor_profiles   tp  ON tp.id_tutor   = e.tutor_id
    JOIN users            u_t ON u_t.id_user   = tp.id_user
    JOIN student_profiles sp  ON sp.id_student = e.student_id
    JOIN users            u_s ON u_s.id_user   = sp.id_user
"""
NOTE_COLUMNS = """
    n.id, n.event_id, n.subject, n.summary, n.next_steps, n.created_at, n.updated_at,
    e.title AS session_title, e.start_time AS session_start, e.end_time AS session_end, e.status AS session_status,
    u_t.name AS tutor_name,   tp.id_user AS tutor_user_id,
    u_s.name AS student_name, sp.id_user AS student_user_id
"""


# ── Access ────────────────────────────────────────────────────────────────────

def _has_started(ev):
    return ev['status'] in NOTE_STATUSES and ev['start_time'] <= datetime.now()


def _note_scope(cur, uid, student_uid):
    """SQL condition (and params) for the notes `uid` may see about a student, or None.

    The condition only ever contains fixed fragments; values always go in as parameters.
    """
    if uid == student_uid:
        return 'sp.id_user = %s', (student_uid,)
    cur.execute("""
        SELECT 1
        FROM events e
        JOIN tutor_profiles   tp ON tp.id_tutor   = e.tutor_id
        JOIN student_profiles sp ON sp.id_student = e.student_id
        WHERE tp.id_user = %s AND sp.id_user = %s AND e.status IN (%s, %s)
        LIMIT 1
    """, (uid, student_uid, *NOTE_STATUSES))
    if not cur.fetchone():
        return None
    return 'sp.id_user = %s AND tp.id_user = %s', (student_uid, uid)


def _event_scope(ev, uid):
    """Scope for someone already known to be the session's tutor or student."""
    if ev['tutor_user_id'] == uid:
        return 'sp.id_user = %s AND tp.id_user = %s', (ev['student_user_id'], uid)
    return 'sp.id_user = %s', (uid,)


# ── Reading ───────────────────────────────────────────────────────────────────

def _notes(cur, where, params, limit=MAX_NOTES):
    cur.execute(f"""
        SELECT {NOTE_COLUMNS}
        FROM lesson_notes n {SCOPE_JOINS}
        WHERE {where}
        ORDER BY e.start_time DESC, n.id DESC
        LIMIT %s
    """, (*params, limit))
    return cur.fetchall()


def _rating_history(cur, where, params):
    """Every topic rating in scope, oldest session first."""
    cur.execute(f"""
        SELECT t.note_id, t.subject, t.topic, t.confidence, e.start_time
        FROM lesson_note_topics t
        JOIN lesson_notes n ON n.id = t.note_id {SCOPE_JOINS}
        WHERE {where}
        ORDER BY e.start_time, n.id
    """, params)
    return cur.fetchall()


def _previous_ratings(history):
    """{(note_id, subject, topic): that topic's rating in the lesson before}."""
    latest, previous = {}, {}
    for r in history:
        key = (r['subject'], r['topic'])
        if key in latest:
            previous[(r['note_id'], *key)] = latest[key]
        latest[key] = r['confidence']
    return previous


def _attach(cur, notes, uid, history):
    """Add topics (with their previous rating), homework and the edit window to notes."""
    if not notes:
        return notes
    ids = [n['id'] for n in notes]
    marks = ', '.join(['%s'] * len(ids))
    cur.execute(f"""
        SELECT note_id, subject, topic, confidence FROM lesson_note_topics WHERE note_id IN ({marks})
    """, ids)
    topics = {}
    for t in sorted(cur.fetchall(), key=lambda t: topic_sort_key(t['subject'], t['topic'])):
        topics.setdefault(t['note_id'], []).append(t)
    cur.execute(f"""
        SELECT id, note_id, task, due_date, done_at FROM lesson_homework
        WHERE note_id IN ({marks}) ORDER BY id
    """, ids)
    homework = {}
    for h in cur.fetchall():
        homework.setdefault(h.pop('note_id'), []).append(h)

    previous = _previous_ratings(history)
    now = datetime.now()
    for n in notes:
        n['subject_name'] = subject_name(n['subject'])
        n['topics'] = [{
            'key': t['topic'],
            'name': topic_name(t['subject'], t['topic']),
            'confidence': t['confidence'],
            'previous': previous.get((n['id'], t['subject'], t['topic'])),
        } for t in topics.get(n['id'], [])]
        n['homework'] = homework.get(n['id'], [])
        n['editable_until'] = n['created_at'] + EDIT_WINDOW
        n['can_edit'] = (n['tutor_user_id'] == uid and now < n['editable_until']
                         and n['session_status'] in NOTE_STATUSES)
    return notes


def _event_note(cur, ev, uid):
    """One session's note, as its tutor or student sees it, or None."""
    where, params = _event_scope(ev, uid)
    notes = _notes(cur, f'n.event_id = %s AND {where}', (ev['id_event'], *params), limit=1)
    return _attach(cur, notes, uid, _rating_history(cur, where, params))[0] if notes else None


def _homework(cur, where, params):
    """Open homework (soonest due first), then the most recently finished."""
    cur.execute(f"""
        SELECT h.id, h.task, h.due_date, h.done_at, n.id AS note_id, n.event_id, n.subject,
               e.title AS session_title, e.start_time AS session_start, u_t.name AS tutor_name
        FROM lesson_homework h
        JOIN lesson_notes n ON n.id = h.note_id {SCOPE_JOINS}
        WHERE {where}
    """, params)
    items = cur.fetchall()
    for h in items:
        h['subject_name'] = subject_name(h['subject'])
    open_items = sorted((h for h in items if not h['done_at']),
                        key=lambda h: (h['due_date'] is None, h['due_date'] or date.max, h['id']))
    done = sorted((h for h in items if h['done_at']), key=lambda h: h['done_at'], reverse=True)
    return open_items + done[:MAX_DONE]


def _subject_progress(lessons, history):
    """Coverage and confidence per catalogue subject, and how they grew lesson by lesson."""
    by_note = {}
    for r in history:
        by_note.setdefault(r['note_id'], []).append(r)

    state = {}
    for lesson in lessons:
        key = lesson['subject']
        if key not in SUBJECTS_BY_KEY:
            continue
        s = state.setdefault(key, {'lessons': 0, 'last_lesson': None, 'topics': {}, 'history': []})
        s['lessons'] += 1
        s['last_lesson'] = lesson['start_time']
        for r in by_note.get(lesson['id'], []):
            if r['subject'] != key or not is_topic(key, r['topic']):
                continue
            t = s['topics'].setdefault(r['topic'], {'first': r['confidence'], 'confidence': None, 'times': 0})
            t['previous'] = t['confidence']
            t['confidence'] = r['confidence']
            t['last_covered'] = lesson['start_time']
            t['times'] += 1
        rated = [t['confidence'] for t in s['topics'].values()]
        if rated:
            s['history'].append({
                'date': lesson['start_time'],
                'covered': len(rated),
                'confident': sum(c >= CONFIDENT for c in rated),
                'average': round(sum(rated) / len(rated), 2),
            })

    subjects = []
    for key, spec in SUBJECTS_BY_KEY.items():
        s = state.get(key)
        if not s:
            continue
        rated = s['topics']
        subjects.append({
            'key': key,
            'name': subject_name(key),
            'level': spec['level'],
            'subject': spec['subject'],
            'lessons': s['lessons'],
            'last_lesson': s['last_lesson'],
            'topics_total': len(spec['topics']),
            'topics_covered': len(rated),
            'topics_confident': sum(t['confidence'] >= CONFIDENT for t in rated.values()),
            'topics_improved': sum(t['confidence'] > t['first'] for t in rated.values()),
            'average': round(sum(t['confidence'] for t in rated.values()) / len(rated), 2) if rated else None,
            'topics': [{
                'key': topic,
                'name': name,
                'confidence': rated[topic]['confidence'] if topic in rated else None,
                'previous': rated[topic]['previous'] if topic in rated else None,
                'last_covered': rated[topic]['last_covered'] if topic in rated else None,
                'times': rated[topic]['times'] if topic in rated else 0,
            } for topic, name in spec['topics']],
            'history': s['history'],
        })
    return subjects


# ── Writing ───────────────────────────────────────────────────────────────────

def _text(value, limit):
    return str(value or '').strip()[:limit] or None


def _parse_note(data):
    """Validate a note payload → (clean data, None) or (None, error message)."""
    if not isinstance(data, dict):
        return None, 'Send the notes as a JSON object'
    subject = data.get('subject') or None
    if subject is not None and subject not in SUBJECTS_BY_KEY:
        return None, 'Choose a subject from the list'

    raw_topics = data.get('topics') or []
    if not isinstance(raw_topics, list):
        return None, 'Topics must be a list'
    topics = {}
    for t in raw_topics:
        key = t.get('key') if isinstance(t, dict) else None
        if not subject or not is_topic(subject, key):
            return None, 'Pick topics from the chosen subject'
        try:
            confidence = int(t.get('confidence'))
        except (TypeError, ValueError):
            confidence = 0
        if not 1 <= confidence <= 5:
            return None, 'Rate each topic from 1 to 5'
        topics[key] = confidence

    raw_homework = data.get('homework') or []
    if not isinstance(raw_homework, list):
        return None, 'Homework must be a list'
    homework = []
    for item in raw_homework:
        if not isinstance(item, dict):
            return None, 'Homework must be a list of tasks'
        task = _text(item.get('task'), MAX_TASK)
        if not task:
            continue
        try:
            item_id = int(item['id']) if item.get('id') is not None else None
            due = date.fromisoformat(str(item['due_date'])[:10]) if item.get('due_date') else None
        except (TypeError, ValueError):
            return None, 'Use a valid date for homework'
        homework.append({'id': item_id, 'task': task, 'due_date': due})
    if len(homework) > MAX_HOMEWORK:
        return None, f'Set at most {MAX_HOMEWORK} homework tasks'

    note = {
        'subject': subject,
        'topics': topics,
        'summary': _text(data.get('summary'), MAX_SUMMARY),
        'next_steps': _text(data.get('next_steps'), MAX_NEXT_STEPS),
        'homework': homework,
    }
    if not (note['topics'] or note['summary'] or note['next_steps'] or note['homework']):
        return None, 'Add what you covered before saving'
    return note, None


def _check_against_session(note, ev):
    if any(h['due_date'] and h['due_date'] < ev['start_time'].date() for h in note['homework']):
        return 'Homework can’t be due before the session'
    return None


def _save_details(cur, note_id, note, existing_homework=frozenset()):
    """Replace the note's topic ratings and sync its homework (keeping what was ticked off)."""
    cur.execute("DELETE FROM lesson_note_topics WHERE note_id = %s", (note_id,))
    if note['topics']:
        cur.executemany(
            "INSERT INTO lesson_note_topics (note_id, subject, topic, confidence) VALUES (%s, %s, %s, %s)",
            [(note_id, note['subject'], topic, confidence) for topic, confidence in note['topics'].items()],
        )
    kept = {h['id'] for h in note['homework'] if h['id']}
    for item_id in existing_homework - kept:
        cur.execute("DELETE FROM lesson_homework WHERE id = %s AND note_id = %s", (item_id, note_id))
    for h in note['homework']:
        if h['id']:
            cur.execute("UPDATE lesson_homework SET task = %s, due_date = %s WHERE id = %s AND note_id = %s",
                        (h['task'], h['due_date'], h['id'], note_id))
        else:
            cur.execute("INSERT INTO lesson_homework (note_id, task, due_date) VALUES (%s, %s, %s)",
                        (note_id, h['task'], h['due_date']))


# ── Endpoints ─────────────────────────────────────────────────────────────────

@bp.route('/progress/topics', methods=['GET'])
@jwt_required()
def topic_catalogue():
    return jsonify({'subjects': catalogue()})


@bp.route('/lesson-notes', methods=['GET'])
@jwt_required()
def lesson_note_index():
    """Which of my sessions have notes, so session rows can offer them without a request each."""
    uid = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute(f"""
            SELECT n.id, n.event_id
            FROM lesson_notes n {SCOPE_JOINS}
            WHERE tp.id_user = %s OR sp.id_user = %s
        """, (uid, uid))
        return jsonify({'notes': cur.fetchall()})
    finally:
        cur.close(); conn.close()


@bp.route('/events/<int:event_id>/lesson-notes', methods=['GET'])
@jwt_required()
def get_lesson_note(event_id):
    """A session's note. The tutor also gets what the form starts from: the subject they last
    taught this student and each topic's latest rating from earlier sessions."""
    uid = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        ev = fetch_event(cur, event_id)
        if not ev:
            return jsonify({'error': 'Session not found'}), 404
        if uid not in (ev['tutor_user_id'], ev['student_user_id']):
            return jsonify({'error': 'Not your session'}), 403
        is_tutor = ev['tutor_user_id'] == uid
        note = _event_note(cur, ev, uid)
        body = {
            'session': {k: ev[k] for k in ('id_event', 'title', 'start_time', 'end_time', 'status',
                                           'tutor_name', 'tutor_user_id', 'student_name', 'student_user_id')},
            'note': note,
            'can_write': is_tutor and note is None and _has_started(ev),
        }
        if is_tutor:
            where, params = _event_scope(ev, uid)
            previous = {}
            for r in _rating_history(cur, where, params):
                if r['start_time'] < ev['start_time']:
                    previous.setdefault(r['subject'], {})[r['topic']] = r['confidence']
            cur.execute(f"""
                SELECT n.subject FROM lesson_notes n {SCOPE_JOINS}
                WHERE {where} AND n.subject IS NOT NULL
                ORDER BY e.start_time DESC LIMIT 1
            """, params)
            last = cur.fetchone()
            body['editor'] = {'subject': last['subject'] if last else None, 'previous': previous}
        return jsonify(body)
    finally:
        cur.close(); conn.close()


@bp.route('/events/<int:event_id>/lesson-notes', methods=['POST'])
@jwt_required()
def create_lesson_note(event_id):
    uid = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        ev = fetch_event(cur, event_id)
        if not ev:
            return jsonify({'error': 'Session not found'}), 404
        if ev['tutor_user_id'] != uid:
            return jsonify({'error': 'Only the tutor can write lesson notes'}), 403
        if not _has_started(ev):
            return jsonify({'error': 'You can add notes once the session has started'}), 400
        note, error = _parse_note(request.get_json(silent=True))
        error = error or _check_against_session(note, ev)
        if error:
            return jsonify({'error': error}), 400

        now = datetime.now().replace(microsecond=0)
        try:
            cur.execute("""
                INSERT INTO lesson_notes (event_id, subject, summary, next_steps, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (event_id, note['subject'], note['summary'], note['next_steps'], now, now))
        except IntegrityError:
            return jsonify({'error': 'This session already has notes'}), 409
        _save_details(cur, cur.lastrowid, note)
        conn.commit()
        return jsonify({'note': _event_note(cur, ev, uid)}), 201
    finally:
        cur.close(); conn.close()


@bp.route('/events/<int:event_id>/lesson-notes', methods=['PUT'])
@jwt_required()
def update_lesson_note(event_id):
    uid = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        ev = fetch_event(cur, event_id)
        if not ev:
            return jsonify({'error': 'Session not found'}), 404
        if ev['tutor_user_id'] != uid:
            return jsonify({'error': 'Only the tutor can edit lesson notes'}), 403
        cur.execute("SELECT id, created_at FROM lesson_notes WHERE event_id = %s", (event_id,))
        current = cur.fetchone()
        if not current:
            return jsonify({'error': 'This session has no notes yet'}), 404
        if datetime.now() >= current['created_at'] + EDIT_WINDOW:
            return jsonify({'error': f'Notes can only be edited for {EDIT_WINDOW.days} days'}), 403
        if ev['status'] not in NOTE_STATUSES:
            return jsonify({'error': 'This session was cancelled'}), 400
        note, error = _parse_note(request.get_json(silent=True))
        error = error or _check_against_session(note, ev)
        if error:
            return jsonify({'error': error}), 400

        cur.execute("SELECT id FROM lesson_homework WHERE note_id = %s", (current['id'],))
        existing = frozenset(r['id'] for r in cur.fetchall())
        if any(h['id'] and h['id'] not in existing for h in note['homework']):
            return jsonify({'error': 'That homework task no longer exists — reopen the notes'}), 409
        cur.execute("""
            UPDATE lesson_notes SET subject = %s, summary = %s, next_steps = %s, updated_at = %s
            WHERE id = %s
        """, (note['subject'], note['summary'], note['next_steps'], datetime.now().replace(microsecond=0),
              current['id']))
        _save_details(cur, current['id'], note, existing)
        conn.commit()
        return jsonify({'note': _event_note(cur, ev, uid)})
    finally:
        cur.close(); conn.close()


@bp.route('/students/<int:student_uid>/lesson-notes', methods=['GET'])
@jwt_required()
def student_lesson_notes(student_uid):
    """A student's notes, newest first (optionally for one `subject`)."""
    uid = current_user_id()
    subject = request.args.get('subject') or None
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        scope = _note_scope(cur, uid, student_uid)
        if not scope:
            return jsonify({'error': 'You can only see notes for your own students'}), 403
        where, params = scope
        if subject:
            notes = _notes(cur, f'{where} AND n.subject = %s', (*params, subject))
        else:
            notes = _notes(cur, where, params)
        return jsonify({'notes': _attach(cur, notes, uid, _rating_history(cur, where, params))})
    finally:
        cur.close(); conn.close()


@bp.route('/students/<int:student_uid>/progress', methods=['GET'])
@jwt_required()
def student_progress(student_uid):
    """Per subject: topics covered out of the spec, confidence per topic and its trend,
    plus open homework."""
    uid = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        scope = _note_scope(cur, uid, student_uid)
        if not scope:
            return jsonify({'error': 'You can only see progress for your own students'}), 403
        where, params = scope
        cur.execute("SELECT id_user, name FROM users WHERE id_user = %s", (student_uid,))
        student = cur.fetchone()
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        cur.execute(f"""
            SELECT n.id, n.subject, e.start_time
            FROM lesson_notes n {SCOPE_JOINS}
            WHERE {where}
            ORDER BY e.start_time, n.id
        """, params)
        lessons = cur.fetchall()
        return jsonify({
            'student': {'user_id': student['id_user'], 'name': student['name']},
            'lessons': len(lessons),
            'last_lesson': lessons[-1]['start_time'] if lessons else None,
            'subjects': _subject_progress(lessons, _rating_history(cur, where, params)),
            'homework': _homework(cur, where, params),
        })
    finally:
        cur.close(); conn.close()


@bp.route('/homework/<int:homework_id>', methods=['PATCH'])
@jwt_required()
def tick_homework(homework_id):
    """The student ticks a homework task off (or back on)."""
    body = request.get_json(silent=True)
    done = body.get('done') if isinstance(body, dict) else None
    if not isinstance(done, bool):
        return jsonify({'error': 'Send done: true or false'}), 400
    uid = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute(f"""
            SELECT h.id, h.done_at, sp.id_user AS student_user_id
            FROM lesson_homework h
            JOIN lesson_notes n ON n.id = h.note_id {SCOPE_JOINS}
            WHERE h.id = %s
        """, (homework_id,))
        item = cur.fetchone()
        if not item:
            return jsonify({'error': 'Homework not found'}), 404
        if item['student_user_id'] != uid:
            return jsonify({'error': 'Only the student can tick off homework'}), 403
        done_at = (item['done_at'] or datetime.now().replace(microsecond=0)) if done else None
        cur.execute("UPDATE lesson_homework SET done_at = %s WHERE id = %s", (done_at, homework_id))
        conn.commit()
        return jsonify({'homework': {'id': homework_id, 'done_at': done_at}})
    finally:
        cur.close(); conn.close()
