"""Schema bootstrap: creates missing tables and columns. Never drops anything."""
import hashlib
import os

from mysql.connector import Error

from .config import IS_PRODUCTION, ROOT_DIR
from .db import column_exists, get_db
from .samples import add_samples

SCHEMA_FILE = os.path.join(ROOT_DIR, 'db', 'schema.sql')

# Columns added after the first deployment — applied to existing databases.
COLUMN_MIGRATIONS = [
    ('users',            'is_premium',             "TINYINT(1) NOT NULL DEFAULT 0"),
    ('users',            'premium_expires_at',     "DATETIME NULL"),
    ('users',            'stripe_customer_id',     "VARCHAR(255) NULL"),
    ('users',            'stripe_subscription_id', "VARCHAR(255) NULL"),
    ('users',            'created_at',             "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP"),
    ('student_profiles', 'education_level',        "VARCHAR(100) NULL"),
    ('student_profiles', 'school_name',            "VARCHAR(200) NULL"),
    ('student_profiles', 'study_year',             "VARCHAR(50) NULL"),
    ('student_profiles', 'bio',                    "TEXT NULL"),
    ('tutor_profiles',   'linkedin_url',           "VARCHAR(500) NULL"),
    ('tutor_profiles',   'hourly_rate',            "DECIMAL(6,2) NOT NULL DEFAULT 20.00"),
    ('tutor_profiles',   'screening_status',       "ENUM('none','pending','approved','rejected') NOT NULL DEFAULT 'none'"),
    ('tutor_profiles',   'uni_email',              "VARCHAR(255) NULL"),
    ('tutor_profiles',   'uni_email_verified',     "TINYINT(1) NOT NULL DEFAULT 0"),
    ('tutor_profiles',   'proof_doc_path',         "VARCHAR(500) NULL"),
    ('tutor_profiles',   'screening_notes',        "TEXT NULL"),
    ('tutor_profiles',   'avatar_path',            "VARCHAR(500) NULL"),
    ('messages',         'read_at',                "DATETIME NULL"),
    ('events',           'meeting_url',            "VARCHAR(500) NULL"),
    ('events',           'booking_fee',            "DECIMAL(10,2) NOT NULL DEFAULT 0.00"),
    ('student_profiles', 'subjects',               "VARCHAR(255) NULL"),
    ('student_profiles', 'level',                  "VARCHAR(40) NULL"),
    ('student_profiles', 'budget',                 "DECIMAL(6,2) NULL"),
    ('student_profiles', 'availability',           "VARCHAR(255) NULL"),
    ('student_profiles', 'goals',                  "TEXT NULL"),
    ('tutor_profiles',   'levels',                 "VARCHAR(120) NULL"),
    ('forum_categories', 'icon',                   "VARCHAR(50) NULL"),
    # Scheduling: booking notice, intro calls, weekly series, reschedules, cancellation policy
    ('tutor_profiles',   'booking_notice_hours',   "SMALLINT NOT NULL DEFAULT 12"),
    ('events',           'kind',                   "VARCHAR(16) NOT NULL DEFAULT 'session'"),
    ('events',           'series_id',              "INT NULL"),
    ('events',           'proposed_start',         "DATETIME NULL"),
    ('events',           'proposed_end',           "DATETIME NULL"),
    ('events',           'proposed_by',            "VARCHAR(10) NULL"),
    ('events',           'cancel_requested_at',    "DATETIME NULL"),
    ('events',           'canceled_by',            "VARCHAR(10) NULL"),
    ('events',           'canceled_at',            "DATETIME NULL"),
    ('events',           'cancel_type',            "VARCHAR(16) NULL"),
    ('email_verifications', 'attempts',               "INT NOT NULL DEFAULT 0"),
    # Referrals (server/referrals.py): XP they award (older databases may lack users.xp), invite
    # codes made on first use, who invited whom (indexed for the invite list), fees a credit paid
    ('users',            'xp',                     "INT NOT NULL DEFAULT 0"),
    ('users',            'referral_code',          "VARCHAR(12) NULL UNIQUE"),
    ('users',            'referred_by',            "INT NULL, ADD KEY ix_users_referred_by (referred_by)"),
    ('events',           'fee_waived',             "DECIMAL(10,2) NOT NULL DEFAULT 0.00"),
    # Parents and safer messaging: the parent role, students' dates of birth (under-18 rules) and
    # the text of a message before its contact details were hidden (kept for moderation)
    ('users',            'is_parent',              "TINYINT(1) NOT NULL DEFAULT 0"),
    ('student_profiles', 'date_of_birth',          "DATE NULL"),
    ('messages',         'original_message',       "TEXT NULL"),
    # One Stripe checkout at a time per session (payments.py), and suspended accounts (suspensions.py)
    ('events',           'checkout_session_id',    "VARCHAR(255) NULL"),
    ('users',            'suspended_at',           "DATETIME NULL"),
    ('users',            'suspended_reason',       "TEXT NULL"),
    ('users',            'suspended_by',           "VARCHAR(255) NULL"),
    # The Stripe PaymentIntent that paid a session: a refund (charge.refunded) finds it by this
    ('events',           'stripe_payment_intent',  "VARCHAR(255) NULL, ADD KEY ix_events_payment_intent (stripe_payment_intent)"),
    # Sample tutors (server/samples.py): labelled example profiles that can't be requested or booked
    ('users',            'is_sample',              "TINYINT(1) NOT NULL DEFAULT 0"),
]

FORUM_CATEGORIES = [
    ('Mathematics',            'Algebra, calculus, statistics and everything in between.', 'calculate'),
    ('Sciences',               'Physics, chemistry and biology questions.',                'science'),
    ('Computer Science',       'Programming, algorithms and computing theory.',            'terminal'),
    ('Languages & Literature', 'Essays, grammar, reading lists and language practice.',    'translate'),
    ('Economics & Business',   'Micro, macro, finance and business studies.',              'trending_up'),
    ('Exam Prep',              'Revision plans, past papers and exam technique.',          'event_note'),
    ('Study Tips & Wellbeing', 'Focus, motivation and looking after yourself.',            'self_improvement'),
    ('Uni Life',               'Applications, open days and student life.',                'school'),
    ('General Chat',           'Anything else — say hi to the community.',                 'forum'),
]


def _statements(sql):
    lines = [line for line in sql.splitlines() if not line.strip().startswith('--')]
    return [s.strip() for s in '\n'.join(lines).split(';') if s.strip()]


# One-off changes to the live site's data, each run once, the first time a deploy that
# includes it starts, and recorded in schema_meta (so undoing one by hand sticks).
# Production only: tests and local copies start from their own data.
DATA_STEPS = (
    ('sample-tutors-1', add_samples),  # the labelled sample tutors; /superadmin removes them
)


def fingerprint():
    """Changes whenever schema.sql, the column migrations, the forum categories or the data
    steps change."""
    digest = hashlib.sha256()
    with open(SCHEMA_FILE, 'rb') as fh:
        digest.update(fh.read())
    digest.update(repr((COLUMN_MIGRATIONS, FORUM_CATEGORIES, [name for name, _ in DATA_STEPS])).encode())
    return digest.hexdigest()[:16]


def run_data_steps(cur):
    """Run the data steps this database hasn't had yet; returns their names."""
    ran = []
    for name, step in DATA_STEPS:
        cur.execute("SELECT 1 FROM schema_meta WHERE name = %s", (f'data:{name}',))
        if cur.fetchall():
            continue
        step(cur)
        cur.execute("INSERT INTO schema_meta (name, value) VALUES (%s, 'done')", (f'data:{name}',))
        ran.append(name)
    return ran


def _stored_fingerprint(cur):
    try:
        cur.execute("SELECT value FROM schema_meta WHERE name = 'fingerprint'")
        row = cur.fetchone()
        return row[0] if row else None
    except Error:  # a database from before schema_meta existed
        return None


def ensure_schema(force=False):
    """Bring the database up to this code's schema. A serverless cold start calls this, so it
    first compares fingerprints and skips the ~100 statements when nothing has changed.
    Returns True when it ran."""
    current = fingerprint()
    conn = get_db(); cur = conn.cursor()
    try:
        if not force and _stored_fingerprint(cur) == current:
            return False
        with open(SCHEMA_FILE) as fh:
            for statement in _statements(fh.read()):
                cur.execute(statement)

        for table, column, definition in COLUMN_MIGRATIONS:
            if not column_exists(cur, table, column):
                cur.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
                print(f'[schema] added {table}.{column}', flush=True)

        for name, description, icon in FORUM_CATEGORIES:
            cur.execute("SELECT id FROM forum_categories WHERE LOWER(name) = LOWER(%s) LIMIT 1", (name,))
            row = cur.fetchone()
            if row:
                cur.execute(
                    "UPDATE forum_categories SET icon = COALESCE(icon, %s), "
                    "description = COALESCE(NULLIF(description, ''), %s) WHERE id = %s",
                    (icon, description, row[0]),
                )
            else:
                cur.execute(
                    "INSERT INTO forum_categories (name, description, icon) VALUES (%s, %s, %s)",
                    (name, description, icon),
                )
        if IS_PRODUCTION:
            for name in run_data_steps(cur):
                print(f'[schema] data step {name} done', flush=True)
        cur.execute("""
            INSERT INTO schema_meta (name, value) VALUES ('fingerprint', %s)
            ON DUPLICATE KEY UPDATE value = VALUES(value)
        """, (current,))
        conn.commit()
        return True
    finally:
        cur.close(); conn.close()
