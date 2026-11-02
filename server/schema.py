"""Schema bootstrap: creates missing tables and columns. Never drops anything."""
import os

from .config import ROOT_DIR
from .db import column_exists, get_db

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
    lines = [l for l in sql.splitlines() if not l.strip().startswith('--')]
    return [s.strip() for s in '\n'.join(lines).split(';') if s.strip()]


def ensure_schema():
    conn = get_db(); cur = conn.cursor()
    try:
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
        conn.commit()
    finally:
        cur.close(); conn.close()
