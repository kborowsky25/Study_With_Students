"""Family: parent accounts and linking them to their children (rules in server/family.py).

A parent invites their child by email; the child accepts or declines in the app. The answer
to the parent is the same whether or not that email has an account, so invites can't be used
to find out who is signed up. Either side can unlink.

A linked parent gets, per child: sessions (without the video link) and which ones are left to
pay, their tutors, and their conversations with tutors, read-only. Lesson notes, homework and
progress come from the progress endpoints, which let linked parents in (routes/progress.py),
and paying goes through the usual checkout (routes/payments.py).
"""
from html import escape

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..config import Config
from ..db import current_user_id, get_db
from ..family import MAX_PARENTS, is_linked_parent, is_minor, needs_parent
from ..ratelimit import jwt_user, rate_limit
from .auth import _valid_email, build_session
from .events import EVENT_COLUMNS, EVENT_JOINS, real_session_sql
from .messages import can_write, conversation_rows, thread_rows

bp = Blueprint('family', __name__, url_prefix='/api')

MAX_CHILDREN = 10   # children and open invites per parent
RECENT_DAYS  = 60   # past sessions shown to a parent


def _first(name):
    parts = (name or '').split()
    return parts[0] if parts else 'them'


def _me(cur, uid):
    cur.execute("SELECT id_user, name, email, is_parent FROM users WHERE id_user = %s", (uid,))
    rows = cur.fetchall()
    return rows[0] if rows else None


def _not_your_child():
    return jsonify({'error': 'You can only see your own children'}), 403


# ── Invite email ──────────────────────────────────────────────────────────────

def _send_invite(to_email, parent, has_account):
    from ..services.reminders import send_email  # its delivery prints to the terminal without SMTP

    page = f"{Config.FRONTEND_URL}/{'login' if has_account else 'signup'}"
    action = 'Log in to accept or decline it' if has_account else 'Sign up with this email address to accept it'
    subject = f"{parent['name']} wants to link to your Study With Students account"
    text = '\n'.join([
        f"{parent['name']} ({parent['email']}) has invited you to link your account as their child.",
        'Once you accept, they can see your sessions, lesson notes, homework and progress, read your '
        'messages with tutors, and pay for sessions. You can unlink at any time.',
        f'{action}: {page}',
        "Don't know them? Ignore this email, or decline the invite in the app.",
    ])
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
      <h2 style="color:#1b263b;margin:0 0 12px;">{escape(parent['name'])} wants to link your account</h2>
      <p style="color:#556275;margin:0 0 14px;">{escape(parent['name'])} ({escape(parent['email'])}) has invited
        you to link your Study With Students account as their child. Once you accept, they can see your
        sessions, lesson notes, homework and progress, read your messages with tutors, and pay for sessions.
        You can unlink at any time.</p>
      <a href="{escape(page)}" style="display:inline-block;background:#ff725e;color:#fff;padding:11px 18px;
        border-radius:8px;text-decoration:none;font-weight:600;">{escape(action)}</a>
      <p style="color:#556275;font-size:13px;margin:22px 0 0;">Don't know them? Ignore this email, or decline
        the invite in the app.</p>
    </div>
    """
    try:
        send_email(to_email, subject, html, text)
    except Exception as e:  # the invite still works in the app
        print(f'[WARN] Invite email failed: {e}', flush=True)


# ── Me and my family ──────────────────────────────────────────────────────────

@bp.route('/family', methods=['GET'])
@jwt_required()
def my_family():
    """Everything about my links: as a parent, my children and the invites I sent; as a child,
    my parents and the invites waiting for my answer (not from people I blocked)."""
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        me = _me(cur, uid)
        if not me:
            return jsonify({'error': 'User not found'}), 404
        cur.execute("""
            SELECT pl.id AS link_id, pl.status, pl.child_email AS email, pl.created_at, pl.answered_at,
                   u.id_user AS user_id, u.name
            FROM parent_links pl
            LEFT JOIN users u ON u.id_user = pl.child_user_id
            WHERE pl.parent_user_id = %s
            ORDER BY pl.created_at, pl.id
        """, (uid,))
        mine = cur.fetchall()
        children = [{'link_id': r['link_id'], 'user_id': r['user_id'], 'name': r['name'], 'since': r['answered_at']}
                    for r in mine if r['status'] == 'accepted' and r['user_id']]
        sent = [{'link_id': r['link_id'], 'email': r['email'], 'status': r['status'], 'created_at': r['created_at']}
                for r in mine if r['status'] != 'accepted']

        cur.execute("SELECT 1 FROM student_profiles WHERE id_user = %s LIMIT 1", (uid,))
        is_student = bool(cur.fetchall())
        cur.execute("""
            SELECT pl.id AS link_id, pl.status, pl.created_at, pl.answered_at,
                   u.id_user AS user_id, u.name, u.email
            FROM parent_links pl
            JOIN users u ON u.id_user = pl.parent_user_id
            WHERE (pl.child_user_id = %(me)s AND pl.status = 'accepted')
               OR (%(student)s AND pl.status = 'pending' AND pl.child_email = %(email)s
                   AND NOT EXISTS (SELECT 1 FROM user_blocks b
                                   WHERE b.blocker_id = %(me)s AND b.blocked_id = pl.parent_user_id))
            ORDER BY pl.created_at, pl.id
        """, {'me': uid, 'email': me['email'], 'student': is_student})
        theirs = cur.fetchall()
        parents = [{'link_id': r['link_id'], 'user_id': r['user_id'], 'name': r['name'], 'since': r['answered_at']}
                   for r in theirs if r['status'] == 'accepted']
        invites = [{'link_id': r['link_id'], 'user_id': r['user_id'], 'name': r['name'], 'email': r['email'],
                    'created_at': r['created_at']}
                   for r in theirs if r['status'] == 'pending']

        return jsonify({
            'is_parent':    bool(me['is_parent']),
            'under_18':     is_minor(cur, uid),
            'needs_parent': needs_parent(cur, uid),
            'max_parents':  MAX_PARENTS,
            'children':     children,
            'sent':         sent,
            'parents':      parents,
            'invites':      invites,
        })
    finally:
        cur.close(); conn.close()


@bp.route('/family/parent-role', methods=['POST'])
@jwt_required()
@rate_limit(10, per=3600, key=jwt_user)
def add_parent_role():
    """Turn on parent mode for an existing account. Returns a fresh session (the JWT carries it)."""
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor()
    try:
        if is_minor(cur, uid):
            return jsonify({'error': 'Parent accounts are for adults'}), 403
        cur.execute("UPDATE users SET is_parent = 1 WHERE id_user = %s", (uid,))
        conn.commit()
        session = build_session(cur, uid)
        if not session:
            return jsonify({'error': 'User not found'}), 404
        return jsonify({'message': 'Parent mode is on', **session})
    finally:
        cur.close(); conn.close()


# ── Invites and links ─────────────────────────────────────────────────────────

@bp.route('/family/invites', methods=['POST'])
@jwt_required()
@rate_limit(5, per=3600, key=jwt_user)
@rate_limit(20, per=86400, key=jwt_user)
def invite_child():
    """A parent invites their child by email (re-sending a declined invite reopens it)."""
    uid   = current_user_id()
    data  = request.get_json(silent=True) or {}
    email = str(data.get('email') or '').strip().lower()
    if not _valid_email(email):
        return jsonify({'error': 'Enter your child’s email address'}), 400

    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        me = _me(cur, uid)
        if not me:
            return jsonify({'error': 'User not found'}), 404
        if not me['is_parent']:
            return jsonify({'error': 'Turn on parent mode first', 'code': 'not_parent'}), 403
        if email == me['email']:
            return jsonify({'error': 'That’s your own email address'}), 400

        cur.execute("SELECT id, status FROM parent_links WHERE parent_user_id = %s AND child_email = %s FOR UPDATE",
                    (uid, email))
        existing = cur.fetchall()
        if existing and existing[0]['status'] == 'accepted':
            return jsonify({'error': 'You’re already linked to this account'}), 409
        if existing and existing[0]['status'] == 'pending':
            return jsonify({'error': 'You’ve already invited this email address'}), 409
        if existing:
            link_id = existing[0]['id']
            cur.execute("""
                UPDATE parent_links SET status = 'pending', child_user_id = NULL, answered_at = NULL,
                       created_at = NOW()
                WHERE id = %s
            """, (link_id,))
        else:
            cur.execute("SELECT COUNT(*) AS n FROM parent_links WHERE parent_user_id = %s AND status <> 'declined'",
                        (uid,))
            if cur.fetchall()[0]['n'] >= MAX_CHILDREN:
                return jsonify({'error': f'You can link up to {MAX_CHILDREN} children'}), 409
            cur.execute("INSERT INTO parent_links (parent_user_id, child_email) VALUES (%s, %s)", (uid, email))
            link_id = cur.lastrowid
        conn.commit()

        # Email the child either way. Skipped only if they have blocked this parent.
        cur.execute("""
            SELECT u.id_user,
                   EXISTS (SELECT 1 FROM user_blocks b WHERE b.blocker_id = u.id_user AND b.blocked_id = %s) AS blocked
            FROM users u WHERE u.email = %s
        """, (uid, email))
        child = cur.fetchall()
        if not (child and child[0]['blocked']):
            _send_invite(email, me, has_account=bool(child))
        cur.execute("SELECT id AS link_id, child_email AS email, status, created_at FROM parent_links WHERE id = %s",
                    (link_id,))
        return jsonify({'message': 'Invite sent', 'invite': cur.fetchone()}), 201
    finally:
        cur.close(); conn.close()


def _pending_invite(cur, link_id, uid):
    """The pending invite `link_id` addressed to my email, locked, or None."""
    cur.execute("""
        SELECT pl.id, pl.parent_user_id, u.name AS parent_name
        FROM parent_links pl
        JOIN users me ON me.id_user = %s AND me.email = pl.child_email
        JOIN users u  ON u.id_user  = pl.parent_user_id
        WHERE pl.id = %s AND pl.status = 'pending'
        FOR UPDATE
    """, (uid, link_id))
    rows = cur.fetchall()
    return rows[0] if rows else None


@bp.route('/family/invites/<int:link_id>/accept', methods=['POST'])
@jwt_required()
@rate_limit(30, per=3600, key=jwt_user)
def accept_invite(link_id):
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id_user FROM users WHERE id_user = %s FOR UPDATE", (uid,))  # one answer at a time
        cur.fetchall()
        invite = _pending_invite(cur, link_id, uid)
        if not invite:
            return jsonify({'error': 'Invite not found'}), 404
        cur.execute("SELECT 1 FROM student_profiles WHERE id_user = %s LIMIT 1", (uid,))
        if not cur.fetchall():
            return jsonify({'error': 'Only student accounts can be linked to a parent'}), 403
        if is_linked_parent(cur, uid, invite['parent_user_id']):
            return jsonify({'error': f"{_first(invite['parent_name'])} is linked as your child"}), 409
        cur.execute("SELECT COUNT(*) AS n FROM parent_links WHERE child_user_id = %s AND status = 'accepted'", (uid,))
        if cur.fetchall()[0]['n'] >= MAX_PARENTS:
            return jsonify({'error': f'You can link up to {MAX_PARENTS} parents. Unlink one first.'}), 409
        cur.execute("""
            UPDATE parent_links SET status = 'accepted', child_user_id = %s, answered_at = NOW() WHERE id = %s
        """, (uid, link_id))
        conn.commit()
        return jsonify({'message': f"Linked to {_first(invite['parent_name'])}"})
    finally:
        cur.close(); conn.close()


@bp.route('/family/invites/<int:link_id>/decline', methods=['POST'])
@jwt_required()
@rate_limit(30, per=3600, key=jwt_user)
def decline_invite(link_id):
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        if not _pending_invite(cur, link_id, uid):
            return jsonify({'error': 'Invite not found'}), 404
        cur.execute("""
            UPDATE parent_links SET status = 'declined', child_user_id = %s, answered_at = NOW() WHERE id = %s
        """, (uid, link_id))
        conn.commit()
        return jsonify({'message': 'Invite declined'})
    finally:
        cur.close(); conn.close()


@bp.route('/family/links/<int:link_id>', methods=['DELETE'])
@jwt_required()
def remove_link(link_id):
    """The parent withdraws an invite or unlinks; the child unlinks."""
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT parent_user_id, child_user_id, status FROM parent_links WHERE id = %s", (link_id,))
        rows = cur.fetchall()
        link = rows[0] if rows else None
        if not link or not (link['parent_user_id'] == uid
                            or (link['child_user_id'] == uid and link['status'] == 'accepted')):
            return jsonify({'error': 'Link not found'}), 404
        cur.execute("DELETE FROM parent_links WHERE id = %s", (link_id,))
        conn.commit()
        return jsonify({'message': 'Unlinked' if link['status'] == 'accepted' else 'Invite withdrawn'})
    finally:
        cur.close(); conn.close()


# ── A parent's view of a child ────────────────────────────────────────────────

@bp.route('/family/children/<int:child_id>', methods=['GET'])
@jwt_required()
def child_overview(child_id):
    """Sessions (upcoming and the last RECENT_DAYS days) and tutors of one of my children."""
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        if not is_linked_parent(cur, uid, child_id):
            return _not_your_child()
        cur.execute("SELECT id_user AS user_id, name FROM users WHERE id_user = %s", (child_id,))
        child = cur.fetchall()[0]
        child['under_18'] = is_minor(cur, child_id)

        cur.execute(f"""
            SELECT {EVENT_COLUMNS} {EVENT_JOINS}
            WHERE sp.id_user = %s AND {real_session_sql()} AND e.end_time >= NOW() - INTERVAL {RECENT_DAYS} DAY
            ORDER BY e.start_time
        """, (child_id,))
        events = cur.fetchall()
        for ev in events:
            ev.pop('meeting_url')  # the session link is for the tutor and the student
            ev.pop('my_rating')
            ev['role'] = 'student'

        cur.execute("""
            SELECT DISTINCT tp.id_tutor, tp.id_user AS user_id, u.name, tp.subjects, tp.university, tp.avatar_path
            FROM active_tutors at2
            JOIN tutor_profiles tp ON tp.id_tutor = at2.id_tutor
            JOIN users u ON u.id_user = tp.id_user
            WHERE at2.id_user = %s
            ORDER BY u.name
        """, (child_id,))
        tutors = cur.fetchall()
        for t in tutors:
            path = t.pop('avatar_path')
            t['avatar_url'] = f'/api/uploads/tutor-avatars/{path}' if path else None
            t['can_message'] = can_write(cur, uid, t['user_id'])
        return jsonify({'child': child, 'events': events, 'tutors': tutors})
    finally:
        cur.close(); conn.close()


@bp.route('/family/conversations', methods=['GET'])
@jwt_required()
def children_conversations():
    """Each linked child's conversations with tutors (what I can read), newest first."""
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT u.id_user AS user_id, u.name
            FROM parent_links pl JOIN users u ON u.id_user = pl.child_user_id
            WHERE pl.parent_user_id = %s AND pl.status = 'accepted'
            ORDER BY pl.answered_at, pl.id
        """, (uid,))
        children = cur.fetchall()
        for child in children:
            rows = conversation_rows(cur, child['user_id'], tutors_only=True)
            for c in rows:
                del c['unread'], c['blocked']  # the child's own inbox state
            child['conversations'] = rows
        return jsonify({'children': children})
    finally:
        cur.close(); conn.close()


@bp.route('/family/children/<int:child_id>/messages/<int:partner_id>', methods=['GET'])
@jwt_required()
def child_thread(child_id, partner_id):
    """One of my child's conversations with a tutor, read-only (nothing is marked as read)."""
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        if not is_linked_parent(cur, uid, child_id):
            return _not_your_child()
        cur.execute("""
            SELECT u.id_user AS user_id, u.name,
                   EXISTS (SELECT 1 FROM tutor_profiles WHERE id_user = u.id_user) AS is_tutor
            FROM users u WHERE u.id_user IN (%s, %s)
        """, (child_id, partner_id))
        people = {r['user_id']: r for r in cur.fetchall()}
        if partner_id not in people or not people[partner_id]['is_tutor'] or partner_id == child_id:
            return jsonify({'error': 'You can read your child’s conversations with tutors'}), 403
        return jsonify({
            'child':    {'user_id': child_id, 'name': people[child_id]['name']},
            'partner':  {'user_id': partner_id, 'name': people[partner_id]['name']},
            'messages': thread_rows(cur, child_id, partner_id),
        })
    finally:
        cur.close(); conn.close()
