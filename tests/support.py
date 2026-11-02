"""Test helpers: SQL access, data factories, an authenticated client and time helpers.

Imported by conftest.py after it has pointed the app at the test database.
"""
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from functools import cache

from werkzeug.security import generate_password_hash

from server.db import get_db
from server.routes.auth import build_session

PASSWORD = 'correct-horse-battery'
ADMIN_EMAIL = 'admin@sws.test'          # SUPER_ADMIN_EMAIL in conftest.py
ADMIN_SECRET = 'test-admin-secret'      # ADMIN_SECRET in conftest.py
KEEP_TABLES = {'forum_categories'}      # seeded by ensure_schema(); everything else is emptied per test


@cache
def password_hash():
    """Hashed once per run: scrypt is deliberately slow."""
    return generate_password_hash(PASSWORD)


# ── Time ──────────────────────────────────────────────────────────────────────

def utcnow():
    """Naive UTC — how the API stores premium_expires_at and verification expiry."""
    return datetime.now(UTC).replace(tzinfo=None)


def local(days, hour=17, minute=0):
    """Naive local time `days` from today at hour:minute (negative days are in the past).

    Sessions are stored and compared in local time, like the API does.
    """
    today = datetime.now().replace(hour=hour, minute=minute, second=0, microsecond=0)
    return today + timedelta(days=days)


def iso(value):
    return value.isoformat(timespec='seconds')


# ── Database ──────────────────────────────────────────────────────────────────

class Database:
    """Direct SQL access to the test database (autocommit, so reads always see the API's writes)."""

    tables = None

    def __init__(self):
        self.conn = get_db()
        self.conn.autocommit = True

    def run(self, sql, params=()):
        cur = self.conn.cursor()
        try:
            cur.execute(sql, params)
            return cur.lastrowid
        finally:
            cur.close()

    def all(self, sql, params=()):
        cur = self.conn.cursor(dictionary=True)
        try:
            cur.execute(sql, params)
            return cur.fetchall()
        finally:
            cur.close()

    def one(self, sql, params=()):
        rows = self.all(sql, params)
        return rows[0] if rows else None

    def value(self, sql, params=()):
        row = self.one(sql, params)
        return next(iter(row.values())) if row else None

    def column(self, sql, params=()):
        return [next(iter(row.values())) for row in self.all(sql, params)]

    def reset(self):
        """Empty every table that has rows (TRUNCATE also resets the ids)."""
        if Database.tables is None:
            Database.tables = [t for t in self.column('SHOW TABLES') if t not in KEEP_TABLES]
        used = ' UNION ALL '.join(
            f"SELECT '{t}' AS name FROM DUAL WHERE EXISTS (SELECT 1 FROM `{t}`)" for t in Database.tables
        )
        for table in self.column(used):
            self.run(f'TRUNCATE TABLE `{table}`')

    def close(self):
        self.conn.close()


# ── Factories ─────────────────────────────────────────────────────────────────

@dataclass
class Person:
    id: int
    name: str
    email: str
    student_id: int | None = None
    tutor_id: int | None = None


class Factory:
    """Creates rows the way the app would, straight in SQL — fast, and independent of the endpoints under test."""

    def __init__(self, db):
        self.db = db
        self.count = 0

    def user(self, name='Maya Patel', email=None, *, premium=False, premium_until=None,
             password=None, student_profile=True):
        """A registered user (with the student profile registration creates). `password` stores it as-is."""
        self.count += 1
        email = email or f'user{self.count}@sws.test'
        if premium and premium_until is None:
            premium_until = utcnow() + timedelta(days=30)
        user_id = self.db.run(
            'INSERT INTO users (name, email, password, is_premium, premium_expires_at) VALUES (%s, %s, %s, %s, %s)',
            (name, email, password or password_hash(), int(premium), premium_until),
        )
        student_id = None
        if student_profile:
            student_id = self.db.run('INSERT INTO student_profiles (id_user) VALUES (%s)', (user_id,))
        return Person(user_id, name, email, student_id)

    def explorer(self, name='Ella Explorer', **kwargs):
        """A member on the £5/month Explorer plan."""
        return self.user(name, premium=True, **kwargs)

    def tutor(self, name='Oliver Grant', *, status='approved', rate=22, subjects='Mathematics, Further Maths, Physics',
              levels='GCSE, A-level', availability='Weekday evenings', university='University College London',
              **kwargs):
        """A tutor (screening `status`: approved, pending, none or rejected)."""
        person = self.user(name, **kwargs)
        person.tutor_id = self.db.run(
            """
            INSERT INTO tutor_profiles (id_user, university, course, subjects, levels, availability,
                                        hourly_rate, screening_status, uni_email_verified)
            VALUES (%s, %s, 'Mathematics (MSci)', %s, %s, %s, %s, %s, %s)
            """,
            (person.id, university, subjects, levels, availability, rate, status, int(status == 'approved')),
        )
        return person

    def connect(self, student, tutor):
        """What accepting a tutor request leaves behind."""
        self.db.run("INSERT INTO tutor_requests (student_id, tutor_id, status) VALUES (%s, %s, 'accepted')",
                    (student.student_id, tutor.tutor_id))
        self.db.run('INSERT INTO active_tutors (id_user, id_student, id_tutor) VALUES (%s, %s, %s)',
                    (student.id, student.student_id, tutor.tutor_id))
        self.db.run('INSERT INTO active_students (id_tutor, id_student) VALUES (%s, %s)',
                    (tutor.tutor_id, student.student_id))

    def session(self, student, tutor, *, start=None, hours=1, status='pending', amount=None,
                title='Integration by parts', meeting_url=None):
        """A 1-to-1 session (an `events` row) booked by `student`."""
        start = start or local(2)
        return self.db.run(
            """
            INSERT INTO events (user_id, tutor_id, student_id, title, description, start_time, end_time,
                                status, amount, meeting_url)
            VALUES (%s, %s, %s, %s, '', %s, %s, %s, %s, %s)
            """,
            (student.id, tutor.tutor_id, student.student_id, title, start, start + timedelta(hours=hours),
             status, 22 * hours if amount is None else amount, meeting_url),
        )


# ── Client ────────────────────────────────────────────────────────────────────

class Api:
    """The Flask test client with JWTs minted the way /api/auth/login mints them."""

    def __init__(self, app):
        self.app = app
        self.client = app.test_client()
        self.tokens = {}

    def token(self, person):
        if person.id not in self.tokens:
            with self.app.app_context():
                conn = get_db(); cur = conn.cursor()
                try:
                    self.tokens[person.id] = build_session(cur, person.id)['access_token']
                finally:
                    cur.close(); conn.close()
        return self.tokens[person.id]

    def request(self, method, url, user=None, headers=None, **kwargs):
        headers = dict(headers or {})
        if user is not None:
            headers['Authorization'] = f'Bearer {self.token(user)}'
        return self.client.open(url, method=method, headers=headers, **kwargs)

    def get(self, url, user=None, **kwargs):
        return self.request('GET', url, user, **kwargs)

    def post(self, url, user=None, **kwargs):
        return self.request('POST', url, user, **kwargs)

    def put(self, url, user=None, **kwargs):
        return self.request('PUT', url, user, **kwargs)

    def patch(self, url, user=None, **kwargs):
        return self.request('PATCH', url, user, **kwargs)

    def delete(self, url, user=None, **kwargs):
        return self.request('DELETE', url, user, **kwargs)
