"""Report and block, the admin queue that reviews reports, and suspending accounts.

Anyone can report a user, or a message they received from them, with a reason and an optional
note. A linked parent can report a message sent to their child in a conversation they can read.
Reports wait in the admin queue (Admin → Reports), which also lists the messages whose contact
details were hidden, with the original text.

Blocking someone stops messages both ways until it's undone (messages.CAN_WRITE), hides
invites from them (routes/family.py), and marks what they already sent as read.

An admin can suspend anyone but the super-admin, with a reason (Admin → Users, or a report):
what that stops is in server/suspensions.py. It also cancels their upcoming sessions and closes
any open checkout for them; paid ones are left for the admin to refund in Stripe.
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, jwt_required, verify_jwt_in_request

from ..db import current_user_id, get_db
from ..extensions import stripe, stripe_enabled
from ..family import is_linked_parent
from ..permissions import check_admin, is_admin_email
from ..ratelimit import jwt_user, rate_limit
from ..referrals import release_credit
from ..scheduling import local_now
from ..suspensions import forget_suspensions

bp = Blueprint('safety', __name__, url_prefix='/api')

REPORT_REASONS = ('off_platform', 'inappropriate', 'bullying', 'spam', 'safety', 'other')
OUTCOMES = ('resolved', 'dismissed')
MAX_NOTE = 2000
CONVERSATION_LIMIT = 50  # messages an admin sees around a report


def _first(name):
    parts = (name or '').split()
    return parts[0] if parts else 'them'


def _user(cur, user_id):
    cur.execute("SELECT id_user, name FROM users WHERE id_user = %s", (user_id,))
    rows = cur.fetchall()
    return rows[0] if rows else None


def _int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


# ── Reports ───────────────────────────────────────────────────────────────────

@bp.route('/reports', methods=['POST'])
@jwt_required()
@rate_limit(10, per=3600, key=jwt_user)
def report():
    """Report `user_id` (and, optionally, `message_id`, one of their messages) for `reason`."""
    uid  = current_user_id()
    data = request.get_json(silent=True) or {}
    reported, message_id = _int(data.get('user_id')), _int(data.get('message_id'))
    reason = data.get('reason')
    note = str(data.get('note') or '').strip()[:MAX_NOTE] or None
    if not reported:
        return jsonify({'error': 'Who are you reporting?'}), 400
    if reason not in REPORT_REASONS:
        return jsonify({'error': 'Choose a reason'}), 400
    if reported == uid:
        return jsonify({'error': 'You can’t report yourself'}), 400
    if data.get('message_id') is not None and not message_id:
        return jsonify({'error': 'Message not found'}), 404

    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        if not _user(cur, reported):
            return jsonify({'error': 'User not found'}), 404
        if message_id:
            # A message they sent to me, or to my child
            cur.execute("SELECT id_sender, id_receiver FROM messages WHERE id_message = %s", (message_id,))
            rows = cur.fetchall()
            message = rows[0] if rows else None
            if (not message or message['id_sender'] != reported
                    or (message['id_receiver'] != uid and not is_linked_parent(cur, uid, message['id_receiver']))):
                return jsonify({'error': 'Message not found'}), 404
        cur.execute("""
            SELECT 1 FROM reports
            WHERE reporter_id = %s AND reported_id = %s AND status = 'open' AND message_id <=> %s
        """, (uid, reported, message_id))
        if cur.fetchall():
            return jsonify({'error': 'You’ve already reported this. We’ll look at it soon.'}), 409
        cur.execute("""
            INSERT INTO reports (reporter_id, reported_id, message_id, reason, note) VALUES (%s, %s, %s, %s, %s)
        """, (uid, reported, message_id, reason, note))
        conn.commit()
        return jsonify({'message': 'Report sent', 'report_id': cur.lastrowid}), 201
    finally:
        cur.close(); conn.close()


# ── Blocks ────────────────────────────────────────────────────────────────────

@bp.route('/blocks', methods=['GET'])
@jwt_required()
def my_blocks():
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT b.blocked_id AS user_id, u.name, b.created_at
            FROM user_blocks b JOIN users u ON u.id_user = b.blocked_id
            WHERE b.blocker_id = %s
            ORDER BY b.created_at DESC
        """, (current_user_id(),))
        return jsonify({'blocked': cur.fetchall()})
    finally:
        cur.close(); conn.close()


@bp.route('/blocks/<int:user_id>', methods=['POST'])
@jwt_required()
@rate_limit(30, per=3600, key=jwt_user)
def block(user_id):
    uid = current_user_id()
    if user_id == uid:
        return jsonify({'error': 'You can’t block yourself'}), 400
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        person = _user(cur, user_id)
        if not person:
            return jsonify({'error': 'User not found'}), 404
        cur.execute("INSERT IGNORE INTO user_blocks (blocker_id, blocked_id) VALUES (%s, %s)", (uid, user_id))
        cur.execute("UPDATE messages SET read_at = NOW() WHERE id_sender = %s AND id_receiver = %s AND read_at IS NULL",
                    (user_id, uid))
        conn.commit()
        return jsonify({'message': f"Blocked {_first(person['name'])}"}), 201
    finally:
        cur.close(); conn.close()


@bp.route('/blocks/<int:user_id>', methods=['DELETE'])
@jwt_required()
@rate_limit(30, per=3600, key=jwt_user)
def unblock(user_id):
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        person = _user(cur, user_id)
        cur.execute("DELETE FROM user_blocks WHERE blocker_id = %s AND blocked_id = %s", (current_user_id(), user_id))
        conn.commit()
        return jsonify({'message': f"Unblocked {_first(person['name'])}" if person else 'Unblocked'})
    finally:
        cur.close(); conn.close()


# ── Admin ─────────────────────────────────────────────────────────────────────

REPORT_COLUMNS = """
    r.id, r.reason, r.note, r.status, r.created_at, r.reviewed_at, r.reviewed_by, r.admin_note,
    r.reporter_id, ur.name AS reporter_name, ur.email AS reporter_email,
    r.reported_id, ud.name AS reported_name, ud.email AS reported_email, tp.id_tutor AS reported_tutor_id,
    ud.suspended_at AS reported_suspended_at,
    (SELECT COUNT(*) FROM reports r2 WHERE r2.reported_id = r.reported_id) AS reports_on_user,
    r.message_id, m.message, m.original_message, m.message_timestamp, m.id_sender, m.id_receiver,
    uc.name AS receiver_name
"""
REPORT_JOINS = """
    FROM reports r
    JOIN users ur ON ur.id_user = r.reporter_id
    JOIN users ud ON ud.id_user = r.reported_id
    LEFT JOIN tutor_profiles tp ON tp.id_user  = r.reported_id
    LEFT JOIN messages       m  ON m.id_message = r.message_id
    LEFT JOIN users          uc ON uc.id_user   = m.id_receiver
"""


def _reviewer():
    """The super-admin's email, or 'admin key' when the X-Admin-Secret header was used."""
    try:
        verify_jwt_in_request(optional=True)
        return get_jwt().get('email') or 'admin key'
    except Exception:
        return 'admin key'


def _unauthorized():
    return jsonify({'error': 'Unauthorized'}), 403


def _for_admin(row):
    """A parent reporting a message to their child: say whose conversation it was."""
    row['for_child'] = row['receiver_name'] if row['message_id'] and row['id_receiver'] != row['reporter_id'] else None
    return row


@bp.route('/admin/reports', methods=['GET'])
def admin_reports():
    """`status`: open (default) or closed (resolved and dismissed), newest first."""
    if not check_admin():
        return _unauthorized()
    closed = request.args.get('status') == 'closed'
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute(f"""
            SELECT {REPORT_COLUMNS} {REPORT_JOINS}
            WHERE r.status {"<>" if closed else "="} 'open'
            ORDER BY r.created_at DESC, r.id DESC
            LIMIT 200
        """)
        reports = [_for_admin(r) for r in cur.fetchall()]
        cur.execute("SELECT COUNT(*) AS n FROM reports WHERE status = 'open'")
        return jsonify({'reports': reports, 'open': cur.fetchall()[0]['n']})
    finally:
        cur.close(); conn.close()


@bp.route('/admin/reports/<int:report_id>', methods=['GET'])
def admin_report(report_id):
    """One report with the conversation it's about (original text where contact details were hidden)."""
    if not check_admin():
        return _unauthorized()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute(f"SELECT {REPORT_COLUMNS} {REPORT_JOINS} WHERE r.id = %s", (report_id,))
        rows = cur.fetchall()
        if not rows:
            return jsonify({'error': 'Report not found'}), 404
        report = _for_admin(rows[0])
        a, b = ((report['id_sender'], report['id_receiver']) if report['message_id']
                else (report['reporter_id'], report['reported_id']))
        cur.execute("""
            SELECT m.id_message, m.id_sender, us.name AS sender_name, m.id_receiver, m.message, m.original_message,
                   m.message_timestamp
            FROM messages m JOIN users us ON us.id_user = m.id_sender
            WHERE (m.id_sender = %s AND m.id_receiver = %s) OR (m.id_sender = %s AND m.id_receiver = %s)
            ORDER BY m.id_message DESC
            LIMIT %s
        """, (a, b, b, a, CONVERSATION_LIMIT))
        report['conversation'] = cur.fetchall()[::-1]
        return jsonify({'report': report})
    finally:
        cur.close(); conn.close()


@bp.route('/admin/reports/<int:report_id>/close', methods=['POST'])
def admin_close_report(report_id):
    """`outcome`: resolved (acted on) or dismissed, with an optional `note` for the record."""
    if not check_admin():
        return _unauthorized()
    data = request.get_json(silent=True) or {}
    outcome = data.get('outcome')
    if outcome not in OUTCOMES:
        return jsonify({'error': 'Resolve or dismiss the report'}), 400
    note = str(data.get('note') or '').strip()[:MAX_NOTE] or None
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            UPDATE reports SET status = %s, admin_note = %s, reviewed_by = %s, reviewed_at = NOW()
            WHERE id = %s AND status = 'open'
        """, (outcome, note, _reviewer(), report_id))
        conn.commit()
        if not cur.rowcount:
            return jsonify({'error': 'This report is already closed'}), 409
        return jsonify({'message': 'Report resolved' if outcome == 'resolved' else 'Report dismissed'})
    finally:
        cur.close(); conn.close()


@bp.route('/admin/hidden-messages', methods=['GET'])
def admin_hidden_messages():
    """The latest messages whose contact details were hidden, with what was actually written."""
    if not check_admin():
        return _unauthorized()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT m.id_message, m.message, m.original_message, m.message_timestamp,
                   m.id_sender, us.name AS sender_name, us.email AS sender_email,
                   EXISTS (SELECT 1 FROM tutor_profiles WHERE id_user = m.id_sender) AS sender_is_tutor,
                   m.id_receiver, ur.name AS receiver_name
            FROM messages m
            JOIN users us ON us.id_user = m.id_sender
            JOIN users ur ON ur.id_user = m.id_receiver
            WHERE m.original_message IS NOT NULL
            ORDER BY m.id_message DESC
            LIMIT 100
        """)
        rows = cur.fetchall()
        for r in rows:
            r['sender_is_tutor'] = bool(r['sender_is_tutor'])
        return jsonify({'messages': rows})
    finally:
        cur.close(); conn.close()


# ── Suspending accounts ───────────────────────────────────────────────────────

def _cancel_upcoming(cur, user_id):
    """Cancel the sessions still to come that `user_id` teaches or takes. Returns them, as they were."""
    now = local_now()
    cur.execute("""
        SELECT e.id_event, e.status, e.checkout_session_id
        FROM events e
        LEFT JOIN tutor_profiles   tp ON tp.id_tutor   = e.tutor_id
        LEFT JOIN student_profiles sp ON sp.id_student = e.student_id
        WHERE (tp.id_user = %s OR sp.id_user = %s)
          AND e.status IN ('pending', 'confirmed', 'paid') AND e.start_time > %s
        FOR UPDATE
    """, (user_id, user_id, now))
    events = cur.fetchall()
    for ev in events:
        cur.execute("""
            UPDATE events
            SET status = 'canceled', canceled_by = 'admin', canceled_at = %s, cancel_type = 'suspended',
                cancel_requested_at = NULL, proposed_start = NULL, proposed_end = NULL, proposed_by = NULL
            WHERE id_event = %s
        """, (now, ev['id_event']))
        release_credit(cur, ev['id_event'])  # an invite credit spent on it can be used again
    return events


def _close_checkouts(events):
    """Expire the open Stripe checkouts of cancelled sessions, so nobody can pay for them now."""
    if not stripe_enabled():
        return
    for ev in events:
        if ev['checkout_session_id'] and ev['status'] != 'paid':
            try:
                stripe.checkout.Session.expire(ev['checkout_session_id'])
            except stripe.error.StripeError:
                pass  # already expired or finished


@bp.route('/admin/users/<int:user_id>/suspend', methods=['POST'])
def admin_suspend(user_id):
    """Suspend an account, with a `reason` for the record."""
    if not check_admin():
        return _unauthorized()
    reason = str((request.get_json(silent=True) or {}).get('reason') or '').strip()[:MAX_NOTE]
    if not reason:
        return jsonify({'error': 'Say why, for the record'}), 400
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id_user, name, email, suspended_at FROM users WHERE id_user = %s FOR UPDATE", (user_id,))
        rows = cur.fetchall()
        if not rows:
            return jsonify({'error': 'User not found'}), 404
        user = rows[0]
        if is_admin_email(user['email']):
            return jsonify({'error': 'The admin account can’t be suspended'}), 400
        if user['suspended_at']:
            return jsonify({'error': 'This account is already suspended'}), 409
        cur.execute("UPDATE users SET suspended_at = NOW(), suspended_reason = %s, suspended_by = %s "
                    "WHERE id_user = %s", (reason, _reviewer(), user_id))
        cancelled = _cancel_upcoming(cur, user_id)
        conn.commit()
    finally:
        cur.close(); conn.close()
    forget_suspensions()  # their tokens stop working on this instance straight away
    _close_checkouts(cancelled)
    return jsonify({
        'message': f"Suspended {_first(user['name'])}",
        'cancelled': len(cancelled),
        'cancelled_paid': sum(ev['status'] == 'paid' for ev in cancelled),
    })


@bp.route('/admin/users/<int:user_id>/unsuspend', methods=['POST'])
def admin_unsuspend(user_id):
    """Lift a suspension. Sessions it cancelled stay cancelled."""
    if not check_admin():
        return _unauthorized()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT name, suspended_at FROM users WHERE id_user = %s", (user_id,))
        rows = cur.fetchall()
        if not rows:
            return jsonify({'error': 'User not found'}), 404
        if not rows[0]['suspended_at']:
            return jsonify({'error': 'This account isn’t suspended'}), 409
        cur.execute("UPDATE users SET suspended_at = NULL, suspended_reason = NULL, suspended_by = NULL "
                    "WHERE id_user = %s", (user_id,))
        conn.commit()
    finally:
        cur.close(); conn.close()
    forget_suspensions()
    return jsonify({'message': f"{_first(rows[0]['name'])} can log in again"})
