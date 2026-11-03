"""Suspended accounts (users.suspended_at). An admin suspends someone from Admin → Users or a
report (server/routes/safety.py), with a reason for the record.

A suspended account can't log in, and the tokens it already holds stop working: every request
with a token is checked against the set of suspended users (extensions.py). Nobody can message
or book a suspended account, it's left out of tutor listings, and a suspended parent no longer
counts as linked (server/family.py). Suspending also cancels the account's upcoming sessions.

The set for the token check is read from the database at most every REFRESH_SECONDS per process,
and at once in the process that changed it. On a deployment with several instances, a suspension
reaches the others within that time; logging in is refused straight away everywhere.
"""
import threading
import time

from .db import get_db

REFRESH_SECONDS = 30
MESSAGE = 'This account is suspended. If you think that’s a mistake, contact us.'

_lock = threading.Lock()
_cache = {'ids': frozenset(), 'read_at': None}


def suspended_sql(user_ref):
    """SQL condition: user `user_ref` (a column or placeholder written in code) is suspended."""
    return f"EXISTS (SELECT 1 FROM users sus WHERE sus.id_user = {user_ref} AND sus.suspended_at IS NOT NULL)"


def is_suspended(cur, user_id):
    """From the database, for decisions that change data (booking, paying, linking)."""
    cur.execute("SELECT suspended_at IS NOT NULL FROM users WHERE id_user = %s", (user_id,))
    rows = cur.fetchall()
    if not rows:
        return False
    row = rows[0]
    return bool(row[0] if isinstance(row, (tuple, list)) else next(iter(row.values())))


def suspended_ids():
    """Every suspended user id, from the cache (the token check runs on every request)."""
    with _lock:
        if _cache['read_at'] is not None and time.monotonic() - _cache['read_at'] < REFRESH_SECONDS:
            return _cache['ids']
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("SELECT id_user FROM users WHERE suspended_at IS NOT NULL")
        ids = frozenset(row[0] for row in cur.fetchall())
    finally:
        cur.close(); conn.close()
    with _lock:
        _cache.update(ids=ids, read_at=time.monotonic())
    return ids


def token_suspended(identity):
    """For the token check: the JWT's subject is the user id, as a string."""
    try:
        return int(identity) in suspended_ids()
    except (TypeError, ValueError):
        return False


def forget_suspensions():
    """Read the set again on the next request (after a change here, and between tests)."""
    with _lock:
        _cache['read_at'] = None
