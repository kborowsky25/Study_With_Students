"""MySQL connection helpers. All SQL in this project is parameterised."""
import mysql.connector
from flask_jwt_extended import get_jwt_identity
from mysql.connector import Error

from .config import Config
from .scheduling import utc_offset


def get_db():
    """A connection whose clock is UK time, like the stored session times (scheduling.local_now):
    NOW(), CURDATE() and CURRENT_TIMESTAMP defaults (message and post times) then agree with
    them on any host, a UTC database included."""
    offset = utc_offset()
    try:
        return mysql.connector.connect(**Config.DB, **({'time_zone': offset} if offset else {}))
    except Error as e:
        raise RuntimeError(f'DB connection failed: {e}') from e


def current_user_id():
    return int(get_jwt_identity())


def is_tutor_user(user_id):
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("SELECT id_tutor FROM tutor_profiles WHERE id_user = %s", (user_id,))
        return cur.fetchone() is not None
    finally:
        cur.close(); conn.close()


def column_exists(cur, table, column):
    cur.execute("""
        SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND COLUMN_NAME = %s
    """, (table, column))
    row = cur.fetchone()
    count = row[0] if isinstance(row, (tuple, list)) else next(iter(row.values()))
    return count > 0
