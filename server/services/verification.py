"""Email verification codes: 6 random digits, valid for 10 minutes, dead after 5 wrong guesses."""
import hmac
import secrets
from datetime import UTC, datetime, timedelta

CODE_TTL     = timedelta(minutes=10)
MAX_ATTEMPTS = 5


def issue_code(cur, email):
    """Replace any earlier code for `email` with a fresh one and return it."""
    code = f'{secrets.randbelow(10 ** 6):06d}'
    cur.execute("DELETE FROM email_verifications WHERE email = %s", (email,))
    cur.execute(
        "INSERT INTO email_verifications (email, code, expires_at) VALUES (%s, %s, %s)",
        (email, code, datetime.now(UTC).replace(tzinfo=None) + CODE_TTL),
    )
    return code


def redeem_code(cur, email, code):
    """Check `code` for `email` and mark it used. Returns None on success, else the error to show.

    Wrong guesses are counted, so the caller must commit even when this returns an error.
    """
    cur.execute("""
        SELECT id, code, expires_at, used, attempts FROM email_verifications
        WHERE email = %s ORDER BY id DESC LIMIT 1 FOR UPDATE
    """, (email,))
    row = cur.fetchone()
    if not row:
        return 'Invalid verification code'
    ver_id, expected, expires_at, used, attempts = row
    if used:
        return 'Verification code already used'
    if attempts >= MAX_ATTEMPTS:
        return 'Too many wrong attempts — please request a new code'
    if datetime.now(UTC).replace(tzinfo=None) > expires_at:
        return 'Verification code expired — please request a new one'
    if not hmac.compare_digest(expected.encode(), code.encode()):
        cur.execute("UPDATE email_verifications SET attempts = attempts + 1 WHERE id = %s", (ver_id,))
        left = MAX_ATTEMPTS - attempts - 1
        if not left:
            return 'Too many wrong attempts — please request a new code'
        return f'Invalid verification code ({left} attempt{"" if left == 1 else "s"} left)'
    cur.execute("UPDATE email_verifications SET used = 1 WHERE id = %s", (ver_id,))
    return None
