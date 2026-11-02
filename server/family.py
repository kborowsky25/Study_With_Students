"""Parents and under-18s: who is linked to whom, and who counts as a minor.

A parent or guardian (users.is_parent) invites their child by email; the link counts once
the child accepts it in the app (parent_links.status = 'accepted'). A child has at most
MAX_PARENTS linked parents, and either side can unlink. A linked parent sees their child's
sessions, lesson notes, homework and progress, reads (never writes in) their conversations
with tutors, and can pay for their sessions.

Students give their date of birth when they sign up (student_profiles.date_of_birth).
Under-18s need a linked parent before a session can be booked: see needs_parent().
Accounts from before dates of birth were asked for have none, and aren't treated as minors.
"""
from datetime import date

MAX_PARENTS = 2
ADULT_AGE = 18
YOUNGEST, OLDEST = 5, 100  # sensible ages to sign up at


def minor_sql(user_ref):
    """SQL condition: user `user_ref` (a column or placeholder written in code, e.g. 'u.id_user')
    is under 18 by the date of birth on their student profile."""
    return (f"EXISTS (SELECT 1 FROM student_profiles dob WHERE dob.id_user = {user_ref}"
            f" AND dob.date_of_birth > CURDATE() - INTERVAL {ADULT_AGE} YEAR)")


def _exists(cur, sql, params):
    cur.execute(f'SELECT EXISTS ({sql})', params)
    row = cur.fetchall()[0]
    return bool(row[0] if isinstance(row, (tuple, list)) else next(iter(row.values())))


def is_minor(cur, user_id):
    return _exists(cur, f'SELECT 1 FROM DUAL WHERE {minor_sql("%s")}', (user_id,))


def is_linked_parent(cur, parent_id, child_id):
    return _exists(cur, """
        SELECT 1 FROM parent_links
        WHERE parent_user_id = %s AND child_user_id = %s AND status = 'accepted'
    """, (parent_id, child_id))


def has_parent(cur, child_id):
    return _exists(cur, "SELECT 1 FROM parent_links WHERE child_user_id = %s AND status = 'accepted'",
                   (child_id,))


def needs_parent(cur, student_user_id):
    """An under-18 without a linked parent can't have sessions booked yet."""
    return is_minor(cur, student_user_id) and not has_parent(cur, student_user_id)


def parent_required_error(first_name=None):
    """403 body for a booking that needs a linked parent first (`first_name`: the student's,
    when someone else, e.g. their tutor, is booking)."""
    who = f'{first_name} needs' if first_name else 'You need'
    return {
        'error': f'{who} a parent or guardian linked before sessions can be booked (under-18s)',
        'code':  'parent_required',
    }


def age_on(born, day):
    return day.year - born.year - ((day.month, day.day) < (born.month, born.day))


def parse_birth_date(value, today=None):
    """A date of birth from 'YYYY-MM-DD' → (date, None) or (None, error message)."""
    today = today or date.today()
    try:
        born = date.fromisoformat(str(value or '').strip()[:10])
    except ValueError:
        return None, 'Enter your date of birth'
    if born >= today or not YOUNGEST <= age_on(born, today) <= OLDEST:
        return None, 'Check your date of birth'
    return born, None
