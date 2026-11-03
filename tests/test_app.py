"""App-wide behaviour: health check, JSON errors, JSON encoding and the clock."""
from datetime import date, datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from server import scheduling
from server.db import get_db
from server.json import ApiJSONProvider


def test_health_reports_the_database(api):
    res = api.get('/api/health')
    assert res.status_code == 200
    body = res.get_json()
    assert (body['ok'], body['database'], body['mail']) == (True, True, False)  # no SMTP in tests
    assert isinstance(body['db_ms'], int)


def test_unknown_routes_answer_in_json(api):
    res = api.get('/api/does-not-exist')
    assert res.status_code == 404
    assert 'error' in res.get_json()


def test_wrong_method_answers_in_json(api):
    res = api.delete('/api/health')
    assert res.status_code == 405
    assert 'error' in res.get_json()


def test_protected_routes_need_a_token(api):
    assert api.get('/api/events').status_code == 401
    bad = api.get('/api/events', headers={'Authorization': 'Bearer not-a-jwt'})
    assert bad.status_code == 401  # every token problem is a 401 so the app signs the user out


def test_dates_serialise_as_iso_and_decimals_as_numbers():
    assert ApiJSONProvider.default(datetime(2026, 11, 2, 17, 30)) == '2026-11-02T17:30:00'
    assert ApiJSONProvider.default(date(2026, 11, 2)) == '2026-11-02'
    assert ApiJSONProvider.default(Decimal('22.50')) == 22.5


def test_the_database_clock_is_uk_time(app):
    """NOW() and CURRENT_TIMESTAMP (message and post times) match the session clock on any host."""
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute('SELECT NOW()')
        assert abs((cur.fetchone()[0] - scheduling.local_now()).total_seconds()) < 5
    finally:
        cur.close(); conn.close()


def test_utc_offset_is_in_mysql_format(monkeypatch):
    monkeypatch.setattr(scheduling, '_TZ', ZoneInfo('Asia/Kolkata'))
    assert scheduling.utc_offset() == '+05:30'
    monkeypatch.setattr(scheduling, '_TZ', ZoneInfo('America/New_York'))
    assert scheduling.utc_offset() in ('-05:00', '-04:00')
    monkeypatch.setattr(scheduling, '_TZ', None)
    assert scheduling.utc_offset() is None


def test_a_pasted_ca_certificate_is_written_to_a_file():
    from server.config import _ca_file
    pem = '-----BEGIN CERTIFICATE-----\\nMIIBfake\\n-----END CERTIFICATE-----'  # line breaks kept as \n
    path = _ca_file(pem)
    with open(path) as f:
        assert f.read() == '-----BEGIN CERTIFICATE-----\nMIIBfake\n-----END CERTIFICATE-----\n'
    assert _ca_file('/etc/ssl/ca.pem') == '/etc/ssl/ca.pem'


def test_mail_goes_from_mail_from_when_set(monkeypatch):
    from email.mime.text import MIMEText

    from server.config import Config
    from server.services import email

    sent = {}

    class FakeSMTP:
        def __init__(self, host, port): sent['server'] = (host, port)
        def __enter__(self): return self
        def __exit__(self, *exc): return False
        def ehlo(self): pass
        def starttls(self): pass
        def login(self, user, password): sent['login'] = user
        def sendmail(self, sender, to, body): sent.update(sender=sender, to=to, body=body)

    monkeypatch.setattr(email.smtplib, 'SMTP', FakeSMTP)
    monkeypatch.setattr(Config, 'MAIL_SERVER', 'smtp.example.com')
    monkeypatch.setattr(Config, 'MAIL_USERNAME', 'login@example.com')
    monkeypatch.setattr(Config, 'MAIL_FROM', 'Study with Students <hello@example.com>')
    msg = MIMEText('hi')
    msg['Subject'] = 'Hello'
    email.smtp_send(msg, 'maya@example.com')
    assert (sent['login'], sent['sender'], sent['to']) == ('login@example.com', 'hello@example.com', 'maya@example.com')
    assert 'From: Study with Students <hello@example.com>' in sent['body']


def test_a_certificate_pasted_on_one_line_gets_its_line_breaks_back():
    from server.config import _pem
    body = 'A' * 70 + 'B' * 10
    one_line = f'-----BEGIN CERTIFICATE----- {body[:30]} {body[30:]} -----END CERTIFICATE-----'
    expected = f"-----BEGIN CERTIFICATE-----\n{'A' * 64}\n{'A' * 6}{'B' * 10}\n-----END CERTIFICATE-----\n"
    assert _pem(one_line) == expected


def test_health_says_which_database_setting_to_check():
    from mysql.connector import Error

    from server import db_problem
    assert db_problem(Error(errno=1045, msg='Access denied')).startswith('access denied')
    assert db_problem(Error(errno=1049, msg="Unknown database 'x'")).startswith('unknown database')
    assert db_problem(Error(errno=2003, msg="Can't connect")).startswith("can't reach")
    assert db_problem(Error(msg='SSL connection error: CERTIFICATE_VERIFY_FAILED')).startswith('TLS failed')


def test_schema_setup_is_skipped_when_nothing_changed(app):
    """A cold start runs one query instead of the whole setup."""
    from server.schema import ensure_schema
    assert ensure_schema() is False           # set up once already, when the app started
    assert ensure_schema(force=True) is True
