"""Messages: direct conversations between users, with read receipts.

Who can write to whom is one rule, CAN_WRITE: anyone may write to a verified tutor, a verified
tutor may write to the students whose request they accepted, and anyone may reply to someone who
wrote to them. So nobody can start a conversation with an under-18 student: only the tutors they
asked for, and people they wrote to themselves, can message them. "Verified" is an approved
tutor screening; a tutor profile still waiting for it can't start conversations either way.
A block stops messages both ways (server/routes/safety.py).

Between a tutor and a student or parent (and whenever an under-18 is involved), phone numbers,
emails and off-platform handles are hidden (server/contact_details.py). The original stays in
messages.original_message for moderation and is never sent to users.

A linked parent can read their child's conversations with tutors (server/routes/family.py),
and the thread header tells both sides.
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..contact_details import hide_contact_details
from ..db import current_user_id, get_db
from ..family import minor_sql
from ..ratelimit import jwt_user, rate_limit

bp = Blueprint('messages', __name__, url_prefix='/api')

MAX_MESSAGE_LENGTH = 4000

# Who `%(me)s` may write to, as a condition on the other person, `u`. The same rule decides
# sending, the "can I reply" state of a thread and who the people search finds.
CAN_WRITE = f"""
    u.id_user <> %(me)s
    AND NOT EXISTS (SELECT 1 FROM user_blocks b
                    WHERE (b.blocker_id = u.id_user AND b.blocked_id = %(me)s)
                       OR (b.blocker_id = %(me)s AND b.blocked_id = u.id_user))
    AND (
        EXISTS (SELECT 1 FROM messages w WHERE w.id_sender = u.id_user AND w.id_receiver = %(me)s)
        OR EXISTS (SELECT 1 FROM tutor_requests r
                   JOIN tutor_profiles   mt ON mt.id_tutor  = r.tutor_id
                   JOIN student_profiles s  ON s.id_student = r.student_id
                   WHERE r.status = 'accepted' AND mt.id_user = %(me)s AND mt.screening_status = 'approved'
                     AND s.id_user = u.id_user)
        OR EXISTS (SELECT 1 FROM active_students a
                   JOIN tutor_profiles   mt ON mt.id_tutor  = a.id_tutor
                   JOIN student_profiles s  ON s.id_student = a.id_student
                   WHERE mt.id_user = %(me)s AND mt.screening_status = 'approved' AND s.id_user = u.id_user)
        OR EXISTS (SELECT 1 FROM active_tutors a
                   JOIN tutor_profiles mt ON mt.id_tutor = a.id_tutor
                   WHERE mt.id_user = %(me)s AND mt.screening_status = 'approved' AND a.id_user = u.id_user)
        OR (EXISTS (SELECT 1 FROM tutor_profiles t WHERE t.id_user = u.id_user AND t.screening_status = 'approved')
            AND NOT {minor_sql('u.id_user')})
    )
"""

MESSAGE_COLUMNS = 'id_message, id_sender, id_receiver, message, message_timestamp, read_at'


def _first(name):
    parts = (name or '').split()
    return parts[0] if parts else 'them'


def can_write(cur, me, other):
    cur.execute(f"SELECT u.id_user FROM users u WHERE u.id_user = %(other)s AND {CAN_WRITE}",
                {'me': me, 'other': other})
    return bool(cur.fetchall())


def refusal(cur, me, other):
    """Why `me` can't write to `other`, once can_write() said no: (code, message).

    The wording never says whether someone is under 18.
    """
    cur.execute("""
        SELECT u.name,
               EXISTS (SELECT 1 FROM user_blocks WHERE blocker_id = %(me)s AND blocked_id = u.id_user) AS i_blocked,
               EXISTS (SELECT 1 FROM user_blocks WHERE blocker_id = u.id_user AND blocked_id = %(me)s) AS blocked_me,
               EXISTS (SELECT 1 FROM tutor_profiles WHERE id_user = u.id_user) AS is_tutor,
               EXISTS (SELECT 1 FROM tutor_profiles WHERE id_user = %(me)s) AS me_tutor,
               EXISTS (SELECT 1 FROM tutor_profiles
                       WHERE id_user = %(me)s AND screening_status = 'approved') AS me_verified
        FROM users u WHERE u.id_user = %(other)s
    """, {'me': me, 'other': other})
    rows = cur.fetchall()
    if not rows or me == other:
        return 'not_allowed', 'You can’t message this person'
    r, first = rows[0], _first(rows[0]['name'])
    if r['i_blocked']:
        return 'you_blocked', f'You blocked {first}. Unblock them to send a message.'
    if r['blocked_me']:
        return 'blocked', 'You can’t message this person'
    if r['is_tutor']:
        return 'tutor_not_verified', f'You can message {first} once they’re a verified tutor'
    if r['me_tutor'] and not r['me_verified']:
        return 'not_verified', 'You can message students once your tutor profile is verified'
    if r['me_tutor']:
        return 'not_your_student', (f'You can message {first} once you’ve accepted their request '
                                    'to be their tutor, or after they write to you')
    return 'tutors_only', 'Messages are for tutoring: you can write to tutors, and reply to anyone who writes to you'


def guard_applies(cur, a, b):
    """Contact details are hidden between a tutor and a student or parent, and whenever an
    under-18 is in the conversation."""
    cur.execute(f"""
        SELECT EXISTS (SELECT 1 FROM tutor_profiles WHERE id_user = %(a)s) AS a_tutor,
               EXISTS (SELECT 1 FROM tutor_profiles WHERE id_user = %(b)s) AS b_tutor,
               {minor_sql('%(a)s')} OR {minor_sql('%(b)s')} AS minor
    """, {'a': a, 'b': b})
    r = cur.fetchall()[0]
    return bool(r['a_tutor']) != bool(r['b_tutor']) or bool(r['minor'])


def parents_can_read(cur, a, b):
    """Whose parents can read the conversation between users a and b: a child's, when the other
    side is a tutor. → {'user_id', 'name', 'parents'} or None."""
    for child, other in ((a, b), (b, a)):
        cur.execute("""
            SELECT u.name, COUNT(*) AS parents
            FROM users u
            JOIN parent_links pl ON pl.child_user_id = u.id_user AND pl.status = 'accepted'
            WHERE u.id_user = %s AND EXISTS (SELECT 1 FROM tutor_profiles WHERE id_user = %s)
            GROUP BY u.id_user, u.name
        """, (child, other))
        rows = cur.fetchall()
        if rows:
            return {'user_id': child, 'name': rows[0]['name'], 'parents': rows[0]['parents']}
    return None


def conversation_rows(cur, uid, tutors_only=False):
    """One row per conversation partner of `uid`, newest first, with the latest message.
    `tutors_only`: just the conversations with tutors (what a linked parent can read)."""
    partners = "WHERE EXISTS (SELECT 1 FROM tutor_profiles tp WHERE tp.id_user = t.partner_id)" if tutors_only else ''
    cur.execute(f"""
        SELECT t.partner_id AS user_id, u.name,
               m.message AS last_message, m.message_timestamp AS last_ts,
               m.id_sender = %(uid)s AS last_from_me,
               (SELECT COUNT(*) FROM messages um
                 WHERE um.id_sender = t.partner_id AND um.id_receiver = %(uid)s
                   AND um.read_at IS NULL) AS unread,
               EXISTS (SELECT 1 FROM tutor_profiles tp WHERE tp.id_user = t.partner_id) AS is_tutor,
               EXISTS (SELECT 1 FROM user_blocks b
                       WHERE b.blocker_id = %(uid)s AND b.blocked_id = t.partner_id) AS blocked
        FROM (
            SELECT IF(id_sender = %(uid)s, id_receiver, id_sender) AS partner_id,
                   MAX(id_message) AS last_id
            FROM messages
            WHERE id_sender = %(uid)s OR id_receiver = %(uid)s
            GROUP BY partner_id
        ) t
        JOIN messages m ON m.id_message = t.last_id
        JOIN users    u ON u.id_user    = t.partner_id
        {partners}
        ORDER BY m.id_message DESC
    """, {'uid': uid})
    rows = cur.fetchall()
    for c in rows:
        for key in ('last_from_me', 'is_tutor', 'blocked'):
            c[key] = bool(c[key])
    return rows


def thread_rows(cur, a, b):
    """Every message between users a and b, oldest first (contact details already hidden)."""
    cur.execute(f"""
        SELECT {MESSAGE_COLUMNS} FROM messages
        WHERE (id_sender = %s AND id_receiver = %s) OR (id_sender = %s AND id_receiver = %s)
        ORDER BY id_message ASC
    """, (a, b, b, a))
    return cur.fetchall()


@bp.route('/messages', methods=['GET'])
@jwt_required()
def get_conversations():
    """One row per conversation partner, with the latest message and unread count."""
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        return jsonify({'conversations': conversation_rows(cur, current_user_id())})
    finally:
        cur.close(); conn.close()


@bp.route('/messages/unread-count', methods=['GET'])
@jwt_required()
def unread_count():
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute(
            "SELECT COUNT(*) FROM messages WHERE id_receiver = %s AND read_at IS NULL",
            (current_user_id(),),
        )
        return jsonify({'unread': cur.fetchone()[0]})
    finally:
        cur.close(); conn.close()


@bp.route('/messages/<int:other_user_id>', methods=['GET'])
@jwt_required()
def get_messages(other_user_id):
    """Full thread with one user; opening it marks their messages as read.

    Also says whether I can write (`can_send`, else `reason`/`reason_code`), whether I blocked
    them, and whose parents can read the conversation (`parents_can_read`).
    """
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "UPDATE messages SET read_at = NOW() "
            "WHERE id_sender = %s AND id_receiver = %s AND read_at IS NULL",
            (other_user_id, uid),
        )
        conn.commit()
        body = {'messages': thread_rows(cur, uid, other_user_id), 'can_send': can_write(cur, uid, other_user_id)}
        if not body['can_send']:
            body['reason_code'], body['reason'] = refusal(cur, uid, other_user_id)
        cur.execute("SELECT 1 FROM user_blocks WHERE blocker_id = %s AND blocked_id = %s", (uid, other_user_id))
        body['blocked'] = bool(cur.fetchall())
        body['parents_can_read'] = parents_can_read(cur, uid, other_user_id)
        return jsonify(body)
    finally:
        cur.close(); conn.close()


@bp.route('/messages', methods=['POST'])
@jwt_required()
@rate_limit(30, per=60, key=jwt_user)
@rate_limit(200, per=3600, key=jwt_user)
def send_message():
    uid         = current_user_id()
    data        = request.get_json(silent=True) or {}
    message     = str(data.get('message') or '').strip()
    try:
        receiver_id = int(data.get('receiver_id') or 0)
    except (TypeError, ValueError):
        receiver_id = 0

    if not receiver_id or not message:
        return jsonify({'error': 'receiver_id and message required'}), 400
    if receiver_id == uid:
        return jsonify({'error': "You can't message yourself"}), 400
    if len(message) > MAX_MESSAGE_LENGTH:
        return jsonify({'error': f'Messages are limited to {MAX_MESSAGE_LENGTH} characters'}), 400

    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id_user FROM users WHERE id_user = %s", (receiver_id,))
        if not cur.fetchall():
            return jsonify({'error': 'User not found'}), 404
        if not can_write(cur, uid, receiver_id):
            code, reason = refusal(cur, uid, receiver_id)
            return jsonify({'error': reason, 'code': code}), 403

        shown, hidden = hide_contact_details(message) if guard_applies(cur, uid, receiver_id) else (message, [])
        cur.execute(
            "INSERT INTO messages (id_sender, id_receiver, message, original_message) VALUES (%s, %s, %s, %s)",
            (uid, receiver_id, shown, message if hidden else None),
        )
        conn.commit()
        cur.execute(f"SELECT {MESSAGE_COLUMNS} FROM messages WHERE id_message = %s", (cur.lastrowid,))
        return jsonify({'message': 'Sent', 'data': cur.fetchone(), 'hidden': hidden}), 201
    finally:
        cur.close(); conn.close()
