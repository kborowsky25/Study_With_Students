"""Sample tutors: clearly marked example profiles, so a new site doesn't look empty.

Every page that shows one labels it as a sample; nobody can request, book or message a sample
tutor (they're never screened or DBS checked), recommendations skip them, and search engines
don't get their pages (left out of the sitemap, marked noindex). An admin adds or removes them
all at once from /superadmin. Their accounts can't be used: a random password nobody knows and
an address on a reserved domain that can't receive mail.
"""
import secrets

from werkzeug.security import generate_password_hash

SAMPLE_DOMAIN = 'samples.studywithstudents.invalid'

# name, university, course, subjects, levels, hourly rate, about
SAMPLE_TUTORS = [
    ('Amelia Hart', 'University of Oxford', 'Mathematics', 'Mathematics, Further Maths', 'GCSE, A-level', 24,
     "Third-year maths student. I like turning the step you're stuck on into one you can't unsee, "
     'and I always end a session with a past-paper question.'),
    ('Daniel Okafor', 'Imperial College London', 'Physics', 'Physics, Mathematics', 'GCSE, A-level', 26,
     'Physics undergraduate who loves mechanics and electricity. We start from what you already know '
     'and build the formula sheet together, so you understand where every equation comes from.'),
    ('Priya Shah', 'University of Cambridge', 'Natural Sciences', 'Chemistry, Biology', 'A-level', 25,
     'Natural Sciences student focusing on chemistry. Organic mechanisms, required practicals and '
     'six-mark questions are my favourite things to untangle.'),
    ('Tom Whitfield', 'UCL', 'Economics', 'Economics, Mathematics', 'GCSE, A-level', 22,
     'Economics student at UCL. Diagrams, evaluation and essay structure: I help you write answers '
     'that pick up the marks examiners are looking for.'),
    ("Sofia Rossi", "King's College London", 'Medicine', 'Biology, Chemistry', 'GCSE, A-level', 24,
     'Medical student who tutors biology and chemistry, and helps with personal statements and '
     'interview practice for medicine.'),
    ('Jamie Chen', 'University of Edinburgh', 'Computer Science', 'Computer Science, Mathematics', 'GCSE, A-level', 23,
     'Computer science student. Python, algorithms and the theory papers: we write real code in every '
     'session so the exam questions feel familiar.'),
    ('Hannah Lewis', 'University of Bristol', 'English Literature', 'English, History', 'GCSE, A-level', 20,
     'English Literature student. Close reading, comparative essays and unseen poetry, with plenty of '
     'practice on structuring an argument under time pressure.'),
    ('Omar Haddad', 'University of Manchester', 'Chemistry', 'Chemistry, Mathematics', 'GCSE', 18,
     'Chemistry student who tutors GCSE chemistry and maths. Calm, step-by-step explanations and lots of '
     'worked examples until it clicks.'),
    ('Ella Morgan', 'Durham University', 'History', 'History, English', 'GCSE, A-level', 20,
     'History student at Durham. Source questions, essay plans and revision timelines that actually stick '
     'in your head on exam day.'),
    ('Lucas Martin', 'University of Warwick', 'Mathematics and Statistics', 'Mathematics, Statistics', 'A-level', 22,
     'Maths and stats student. Statistics and mechanics for A-level, with a focus on reading the question '
     'and setting the problem up properly.'),
    ('Grace Adeyemi', 'London School of Economics', 'Psychology and Behavioural Science', 'Psychology, Biology',
     'A-level', 21,
     'Psychology student at the LSE. Research methods, approaches and evaluation: I make the 16-mark '
     'questions feel manageable.'),
    ('Ben Walker', 'University of Bath', 'Mechanical Engineering', 'Physics, Mathematics', 'GCSE', 19,
     'Engineering student who tutors GCSE physics and maths, using everyday examples so the equations '
     'mean something.'),
]


def sample_count(cur):
    cur.execute("SELECT COUNT(*) FROM users WHERE is_sample = 1")
    row = cur.fetchone()
    return int(row[0] if isinstance(row, (tuple, list)) else next(iter(row.values())))


def add_samples(cur):
    """Create the sample tutors that don't exist yet; returns how many were added."""
    added = 0
    for number, (name, university, course, subjects, levels, rate, about) in enumerate(SAMPLE_TUTORS, 1):
        email = f'tutor{number}@{SAMPLE_DOMAIN}'
        cur.execute("SELECT id_user FROM users WHERE email = %s", (email,))
        if cur.fetchall():
            continue
        cur.execute(
            "INSERT INTO users (name, email, password, is_sample) VALUES (%s, %s, %s, 1)",
            (name, email, generate_password_hash(secrets.token_urlsafe(32))),
        )
        cur.execute("""
            INSERT INTO tutor_profiles (id_user, university, course, about_me, subjects, levels,
                                        hourly_rate, screening_status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'none')
        """, (cur.lastrowid, university, course, about, subjects, levels, rate))
        added += 1
    return added


# Rows that can point at a sample tutor (people may save one); nothing else can reach them
TUTOR_LINKS = (
    ('liked_tutors', 'id_tutor'), ('tutor_requests', 'tutor_id'), ('active_tutors', 'id_tutor'),
    ('active_students', 'id_tutor'), ('tutor_availability', 'tutor_id'), ('tutor_blocked_dates', 'tutor_id'),
)


def remove_samples(cur):
    """Delete every sample account and what points at it; returns how many accounts."""
    cur.execute("""
        SELECT u.id_user, tp.id_tutor FROM users u
        LEFT JOIN tutor_profiles tp ON tp.id_user = u.id_user
        WHERE u.is_sample = 1
    """)
    rows = cur.fetchall()
    for row in rows:
        user_id, tutor_id = (row['id_user'], row['id_tutor']) if isinstance(row, dict) else row
        if tutor_id:
            for table, column in TUTOR_LINKS:
                cur.execute(f"DELETE FROM {table} WHERE {column} = %s", (tutor_id,))
            cur.execute("DELETE FROM tutor_profiles WHERE id_tutor = %s", (tutor_id,))
        cur.execute("DELETE FROM users WHERE id_user = %s AND is_sample = 1", (user_id,))
    return len(rows)
