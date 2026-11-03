"""Fixtures: a throwaway MySQL database, the Flask app and data factories.

The suite never touches the development database. Before `server` is imported,
DB_NAME is forced to `users_tutoring_test` (override with TEST_DB_NAME, which
must end in `_test`). That database is created for the run, emptied before every
test that uses it and dropped at the end. Mail and Stripe are switched off and
uploads go to a temporary folder, so nothing leaves the machine.

Pure unit tests (test_matching.py) use none of these fixtures and need no MySQL.
"""
# The `server` imports below must come after the environment is set up (E402).
# ruff: noqa: E402
import os
import re
import shutil
import tempfile

import pytest

TEST_DB_NAME = os.environ.get('TEST_DB_NAME', 'users_tutoring_test')
if not re.fullmatch(r'\w+_test', TEST_DB_NAME):
    raise pytest.UsageError(f'Refusing to run: the test database name {TEST_DB_NAME!r} must end in "_test".')

UPLOAD_ROOT = tempfile.mkdtemp(prefix='sws-test-uploads-')

# server.config reads the environment when it is first imported, and load_dotenv()
# never overrides variables that are already set — so these win over .env.
os.environ.update({
    'DB_NAME':           TEST_DB_NAME,
    'UPLOAD_ROOT':       UPLOAD_ROOT,
    'SECRET_KEY':        'test-secret-key-not-for-production-0001',
    'JWT_SECRET_KEY':    'test-jwt-secret-not-for-production-0001',
    'SUPER_ADMIN_EMAIL': 'admin@sws.test',
    'ADMIN_SECRET':      'test-admin-secret',
    'MAIL_SERVER':       '',
    'MAIL_USERNAME':     '',
    'MAIL_PASSWORD':     '',
    'STRIPE_SECRET_KEY': '',
    'STRIPE_PRICE_ID':   '',
})

import mysql.connector

from server import create_app, extensions
from server.config import Config
from server.ratelimit import reset_limits
from server.schema import ensure_schema
from server.suspensions import forget_suspensions
from tests.support import COMMUNITY_IS_FREE, HAS_BOOKING_FEE, Api, Database, Factory

# Tests of the new pricing contract, and whether this code base implements it yet.
PENDING_CONTRACT = {
    'free_community': (COMMUNITY_IS_FREE, 'the community is still behind the Explorer gate here'),
    'booking_fee': (HAS_BOOKING_FEE, 'sessions have no booking_fee here yet'),
}


def _server_connection():
    """A connection to the MySQL server itself (no database selected)."""
    return mysql.connector.connect(**{k: v for k, v in Config.DB.items() if k != 'database'})


@pytest.fixture(scope='session')
def app():
    # Belt and braces: this must never be the development database.
    assert Config.DB['database'] == TEST_DB_NAME, Config.DB['database']
    assert not Config.MAIL_SERVER and not extensions.stripe_enabled()

    try:
        conn = _server_connection()
    except mysql.connector.Error as e:
        pytest.fail(f'MySQL is not reachable with the settings in .env ({e}). Start it to run the API tests.',
                    pytrace=False)
    cur = conn.cursor()
    cur.execute(f'DROP DATABASE IF EXISTS `{TEST_DB_NAME}`')
    cur.execute(f'CREATE DATABASE `{TEST_DB_NAME}` CHARACTER SET utf8mb4')
    cur.close(); conn.close()

    try:
        flask_app = create_app()
        flask_app.config.update(TESTING=True)
        # create_app() swallows schema errors so /api/health can report them; surface them here.
        ensure_schema()
        yield flask_app
    finally:
        conn = _server_connection(); cur = conn.cursor()
        cur.execute(f'DROP DATABASE IF EXISTS `{TEST_DB_NAME}`')
        cur.close(); conn.close()


@pytest.fixture
def db(app):
    """Direct SQL access to the test database, emptied before each test."""
    database = Database()
    database.reset()
    reset_limits()
    forget_suspensions()  # ids start again from 1 in every test
    yield database
    database.close()


@pytest.fixture
def api(app, db):
    """The Flask test client; pass `user=` to call as that person."""
    return Api(app)


@pytest.fixture
def make(db):
    """Factories for users, tutors, connections and sessions."""
    return Factory(db)


def pytest_collection_modifyitems(config, items):
    """Until the pricing change is in this code base, its contract tests are expected to fail
    (strictly: if one passes early, the run says so). Once it is, they run like any other test."""
    for item in items:
        for marker, (implemented, why) in PENDING_CONTRACT.items():
            if item.get_closest_marker(marker) and not implemented:
                item.add_marker(pytest.mark.xfail(strict=True, reason=f'Pricing change not merged yet: {why}'))


def pytest_sessionfinish(session, exitstatus):
    shutil.rmtree(UPLOAD_ROOT, ignore_errors=True)
