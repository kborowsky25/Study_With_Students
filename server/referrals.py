"""Referrals: invite codes and what they earn. No reward costs anything to run.

Everyone has an invite link, /signup?ref=CODE (users.referral_code, made on first use).
Signing up through one records users.referred_by, and each invited person earns each of
these rewards at most once (referral_rewards is unique per kind and invited person):

  welcome  the invited family's first booking fee is waived: a credit at sign-up
  family   the inviter's next booking fee is waived: a credit once that family's first
           session is paid through Stripe, up to MAX_EARNED_CREDITS per inviter
  tutor    TUTOR_REFERRAL_XP (added to users.xp) for a tutor whose invited tutor is
           approved: screening approved and DBS verified

A credit is spent on the next session booked with a booking fee, which then stores
booking_fee = 0 and fee_waived = the fee the credit covered. It comes back when that
session is cancelled before it's paid, or when the request expires unanswered.

Credits and the inviter's reward belong to the family: a student's sessions can use their
linked parents' credits (server/family.py), and a parent who signed up through an invite
earns their inviter a credit when their child's first session is paid.

The helpers run on the caller's cursor (plain or dictionary) inside its transaction.
"""
import secrets

from mysql.connector import IntegrityError

CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'  # no 0/O or 1/I/L to misread
CODE_LENGTH = 8
MAX_EARNED_CREDITS = 10
TUTOR_REFERRAL_XP = 150

GMAIL_DOMAINS = ('gmail.com', 'googlemail.com')

# A credit can be spent when it isn't on a session, or its session can't go ahead any more:
# cancelled, or a request that reached its start time unanswered (it can't be confirmed or
# moved after that). Parameters: %(user)s and %(now)s; `r` is referral_rewards, `e` events.
FREE_CREDIT = """
    r.user_id = %(user)s AND r.kind IN ('welcome', 'family') AND (
        r.event_id IS NULL OR e.id_event IS NULL OR e.status = 'canceled'
        OR (e.status = 'pending' AND e.start_time <= %(now)s
            AND (e.proposed_start IS NULL OR e.proposed_start <= %(now)s)))
"""


def _rows(cur):
    """The last query's rows as dicts, whichever kind of cursor ran it."""
    return [row if isinstance(row, dict) else dict(zip(cur.column_names, row, strict=True)) for row in cur.fetchall()]


def _row(cur):
    rows = _rows(cur)
    return rows[0] if rows else None


# ── Names and addresses ───────────────────────────────────────────────────────

def first_name(name, fallback='A friend'):
    parts = (name or '').split()
    return parts[0] if parts else fallback


def short_name(name):
    """'Sam Lee' → 'Sam L.': enough for the inviter to recognise someone they invited."""
    parts = (name or '').split()
    if not parts:
        return 'Someone'
    return f'{parts[0]} {parts[-1][0]}.' if len(parts) > 1 else parts[0]


def mailbox(email):
    """The inbox an address delivers to: 'Maya.P+sws@googlemail.com' → 'mayap@gmail.com'."""
    local, _, domain = (email or '').strip().lower().rpartition('@')
    local = local.split('+', 1)[0]
    if domain in GMAIL_DOMAINS:
        local, domain = local.replace('.', ''), 'gmail.com'
    return f'{local}@{domain}'


# ── Codes ─────────────────────────────────────────────────────────────────────

def normalize_code(value):
    """An invite code as stored (upper case), or None if `value` can't be one."""
    code = str(value or '').strip().upper()
    return code if len(code) == CODE_LENGTH and all(c in CODE_ALPHABET for c in code) else None


def ensure_code(cur, user_id):
    """The user's invite code, made the first time it's needed. The caller commits."""
    cur.execute("SELECT referral_code FROM users WHERE id_user = %s", (user_id,))
    row = _row(cur)
    if not row or row['referral_code']:
        return row and row['referral_code']
    # First use: lock the row, so two requests at once can't both make one
    cur.execute("SELECT referral_code FROM users WHERE id_user = %s FOR UPDATE", (user_id,))
    existing = _row(cur)['referral_code']
    if existing:
        return existing
    for _ in range(5):
        code = ''.join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))
        try:
            cur.execute("UPDATE users SET referral_code = %s WHERE id_user = %s", (code, user_id))
            return code
        except IntegrityError:  # another account has this one: draw again
            continue
    raise RuntimeError('Could not make a unique invite code')


def find_referrer(cur, code):
    """The account behind an invite code: {id_user, name, email}, or None."""
    code = normalize_code(code)
    if not code:
        return None
    cur.execute("SELECT id_user, name, email FROM users WHERE referral_code = %s", (code,))
    return _row(cur)


# ── Signing up ────────────────────────────────────────────────────────────────

def _grant(cur, user_id, referred_id, kind, xp=0):
    """Record a reward unless this invited person has already earned that kind. True if new."""
    try:
        cur.execute("INSERT INTO referral_rewards (user_id, referred_id, kind, xp) VALUES (%s, %s, %s, %s)",
                    (user_id, referred_id, kind, xp))
    except IntegrityError:  # unique per kind and invited person: earned already
        return False
    return True


def record_referral(cur, user_id, email, code):
    """Link a new account to whoever invited it, and give it the welcome credit.

    Call it in the transaction that creates the account, so an email that already had an
    account never gets here. Unknown codes and inviting yourself (the same account, or the
    same inbox: maya+2@… is maya@…) are ignored. Returns the inviter's first name, or None.
    """
    referrer = find_referrer(cur, code)
    if not referrer or referrer['id_user'] == user_id or mailbox(referrer['email']) == mailbox(email):
        return None
    cur.execute("UPDATE users SET referred_by = %s WHERE id_user = %s AND referred_by IS NULL",
                (referrer['id_user'], user_id))
    if not cur.rowcount:
        return None
    _grant(cur, user_id, user_id, 'welcome')
    return first_name(referrer['name'])


# ── Credits: one waives one session's booking fee ─────────────────────────────

def family_of(cur, student_user_id):
    """The student first, then their linked parents: whose credits a student's session can use."""
    cur.execute("""
        SELECT parent_user_id FROM parent_links
        WHERE child_user_id = %s AND status = 'accepted' ORDER BY id
    """, (student_user_id,))
    return [student_user_id, *(row['parent_user_id'] for row in _rows(cur))]


def available_credits(cur, user_id, now, family=False):
    """Free credits of the user, or with `family` of the student and their linked parents."""
    members = family_of(cur, user_id) if family else [user_id]
    total = 0
    for member in members:
        cur.execute(f"""
            SELECT COUNT(*) AS n FROM referral_rewards r LEFT JOIN events e ON e.id_event = r.event_id
            WHERE {FREE_CREDIT}
        """, {'user': member, 'now': now})
        total += int(_row(cur)['n'])
    return total


def spend_credit(cur, user_id, event_id, now):
    """Put a free credit (the student's own first, then a linked parent's; oldest first) on a
    session. False if the family has none.

    The caller sets the session's booking_fee to 0 and fee_waived to the fee.
    """
    for member in family_of(cur, user_id):
        cur.execute(f"""
            SELECT r.id FROM referral_rewards r LEFT JOIN events e ON e.id_event = r.event_id
            WHERE {FREE_CREDIT}
            ORDER BY r.id LIMIT 1 FOR UPDATE
        """, {'user': member, 'now': now})
        row = _row(cur)
        if row:
            cur.execute("UPDATE referral_rewards SET event_id = %s, used_at = %s WHERE id = %s",
                        (event_id, now, row['id']))
            return True
    return False


def release_credit(cur, event_id):
    """The session was cancelled before it was paid: its credit can be spent again."""
    cur.execute("""
        UPDATE referral_rewards r JOIN events e ON e.id_event = r.event_id
        SET r.event_id = NULL, r.used_at = NULL
        WHERE r.event_id = %s AND e.status <> 'paid'
    """, (event_id,))


# ── Rewards for the inviter ───────────────────────────────────────────────────

def reward_first_payment(cur, user_id, event_id):
    """Stripe confirmed a session of student `user_id` was paid (by them or a parent): if
    someone invited the student, or a linked parent, the inviter earns a credit. Once per
    invited person (so for the family's first paid session), and at most MAX_EARNED_CREDITS
    per inviter. True if a credit was earned."""
    invited = inviter = None
    for member in family_of(cur, user_id):
        cur.execute("SELECT referred_by FROM users WHERE id_user = %s", (member,))
        inviter = (_row(cur) or {}).get('referred_by')
        if inviter:
            invited = member
            break
    if not inviter:
        return False
    cur.execute("SELECT amount FROM events WHERE id_event = %s", (event_id,))
    event = _row(cur)
    if not event or not event['amount'] or event['amount'] <= 0:  # free sessions don't count
        return False
    # Lock the inviter, so two families paying at once can't both take the last credit under the cap
    cur.execute("SELECT id_user FROM users WHERE id_user = %s FOR UPDATE", (inviter,))
    if not _rows(cur):
        return False
    cur.execute("SELECT COUNT(*) AS n FROM referral_rewards WHERE user_id = %s AND kind = 'family'", (inviter,))
    if _row(cur)['n'] >= MAX_EARNED_CREDITS:
        return False
    return _grant(cur, inviter, invited, 'family')


def reward_tutor_approval(cur, tutor_id):
    """Call after a tutor's screening is approved and after their DBS check is verified: once
    both are true, a tutor who invited them earns TUTOR_REFERRAL_XP (once). True if earned."""
    from .routes.background import dbs_verified_sql  # imported here: the routes import this module

    cur.execute(f"""
        SELECT u.id_user, u.referred_by FROM tutor_profiles tp JOIN users u ON u.id_user = tp.id_user
        WHERE tp.id_tutor = %s AND tp.screening_status = 'approved' AND {dbs_verified_sql('tp')}
    """, (tutor_id,))
    tutor = _row(cur)
    if not tutor or not tutor['referred_by']:
        return False
    cur.execute("SELECT id_tutor FROM tutor_profiles WHERE id_user = %s LIMIT 1", (tutor['referred_by'],))
    if not _rows(cur):  # the XP is for tutors who bring in tutors
        return False
    if not _grant(cur, tutor['referred_by'], tutor['id_user'], 'tutor', xp=TUTOR_REFERRAL_XP):
        return False
    cur.execute("UPDATE users SET xp = xp + %s WHERE id_user = %s", (TUTOR_REFERRAL_XP, tutor['referred_by']))
    return True
