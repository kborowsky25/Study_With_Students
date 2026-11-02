"""Seed demo accounts and activity for local development.

Run:  .venv/bin/python -m db.seed

Idempotent — existing demo accounts are left alone. Demo logins:
    student  demo.student@sws.test  /  explorer-demo-1
    tutor    demo.tutor@sws.test    /  explorer-demo-1
"""
from datetime import datetime, timedelta

from werkzeug.security import generate_password_hash

from server.db import get_db
from server.schema import ensure_schema

PASSWORD = 'explorer-demo-1'

STUDENT = {'name': 'Maya Patel', 'email': 'demo.student@sws.test'}
TUTOR = {
    'name': 'Oliver Grant', 'email': 'demo.tutor@sws.test',
    'profile': {
        'age': 21, 'university': 'University College London', 'course': 'Mathematics (MSci)',
        'about_me': "Third-year maths student at UCL. I've tutored GCSE and A-level maths for three "
                    'years and love turning "I don\'t get it" into "oh, that\'s it?".',
        'subjects': 'Mathematics, Further Maths, Physics',
        'availability': 'Weekday evenings, Sunday afternoons',
        'hourly_rate': 22.00,
    },
}


def _user(cur, name, email):
    cur.execute("SELECT id_user FROM users WHERE email = %s", (email,))
    row = cur.fetchone()
    if row:
        return row[0], False
    cur.execute(
        "INSERT INTO users (name, email, password) VALUES (%s, %s, %s)",
        (name, email, generate_password_hash(PASSWORD)),
    )
    return cur.lastrowid, True


def _student_profile(cur, user_id):
    cur.execute("SELECT id_student FROM student_profiles WHERE id_user = %s", (user_id,))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute("INSERT INTO student_profiles (id_user) VALUES (%s)", (user_id,))
    return cur.lastrowid


def seed():
    ensure_schema()
    conn = get_db(); cur = conn.cursor()
    try:
        student_uid, created = _user(cur, STUDENT['name'], STUDENT['email'])
        if not created:
            print('Demo data already present — nothing to do.')
            return
        tutor_uid, _ = _user(cur, TUTOR['name'], TUTOR['email'])
        student_id = _student_profile(cur, student_uid)
        _student_profile(cur, tutor_uid)

        p = TUTOR['profile']
        cur.execute("""
            INSERT INTO tutor_profiles (id_user, age, university, course, about_me, subjects,
                                        availability, hourly_rate, screening_status, uni_email_verified)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'approved', 1)
        """, (tutor_uid, p['age'], p['university'], p['course'], p['about_me'], p['subjects'],
              p['availability'], p['hourly_rate']))
        tutor_id = cur.lastrowid

        # Connection: request accepted
        cur.execute("INSERT INTO tutor_requests (student_id, tutor_id, status) VALUES (%s, %s, 'accepted')",
                    (student_id, tutor_id))
        cur.execute("INSERT INTO active_tutors (id_user, id_student, id_tutor) VALUES (%s, %s, %s)",
                    (student_uid, student_id, tutor_id))
        cur.execute("INSERT INTO active_students (id_tutor, id_student) VALUES (%s, %s)", (tutor_id, student_id))

        # Sessions: one paid in the past, one confirmed, one awaiting the tutor
        now = datetime.now().replace(minute=0, second=0, microsecond=0)
        sessions = [
            ('Integration by parts',   (now - timedelta(days=6)).replace(hour=17), 'paid'),
            ('Mechanics: projectiles', (now + timedelta(days=2)).replace(hour=18), 'confirmed'),
            ('Exam technique review',  (now + timedelta(days=5)).replace(hour=17), 'pending'),
        ]
        for title, start, status in sessions:
            cur.execute("""
                INSERT INTO events (user_id, tutor_id, student_id, title, description,
                                    start_time, end_time, status, amount)
                VALUES (%s, %s, %s, %s, '', %s, %s, %s, %s)
            """, (student_uid, tutor_id, student_id, title, start, start + timedelta(hours=1),
                  status, p['hourly_rate']))

        # A short conversation
        for sender, receiver, text in [
            (student_uid, tutor_uid, "Hi Oliver! Could we go over projectiles before Thursday's mock?"),
            (tutor_uid, student_uid, "Of course — I've confirmed Thursday. Bring the question you got stuck on."),
            (student_uid, tutor_uid, 'Perfect, thank you!'),
        ]:
            cur.execute("INSERT INTO messages (id_sender, id_receiver, message) VALUES (%s, %s, %s)",
                        (sender, receiver, text))

        # Forum activity
        cur.execute("SELECT id FROM forum_categories WHERE name = 'Exam Prep' LIMIT 1")
        category = cur.fetchone()
        if category:
            cur.execute("""
                INSERT INTO forum_threads (category_id, user_id, title, content)
                VALUES (%s, %s, %s, %s)
            """, (category[0], student_uid, 'How do you plan revision for 3 A-levels?',
                  'Mocks are in six weeks. How do you split time between subjects without burning out?'))
            thread_id = cur.lastrowid
            cur.execute("INSERT INTO forum_posts (thread_id, user_id, content) VALUES (%s, %s, %s)",
                        (thread_id, tutor_uid, 'Block your week by topic, not subject, and do one past paper '
                                               'every weekend under timed conditions. It adds up fast.'))

        # A study room hosted by the tutor
        room_start = (now + timedelta(days=3)).replace(hour=19)
        cur.execute("""
            INSERT INTO study_rooms (tutor_id, subject, description, start_time, end_time, zoom_link)
            VALUES (%s, 'A-level Maths drop-in', 'Bring any question — we work through them together.',
                    %s, %s, 'https://zoom.us/j/0000000000')
        """, (tutor_id, room_start, room_start + timedelta(hours=1, minutes=30)))

        conn.commit()
        print('Seeded demo student, demo tutor and their activity.')
    finally:
        cur.close(); conn.close()


if __name__ == '__main__':
    seed()
