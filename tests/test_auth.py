"""Auth: email verification codes, registration, login, password hashing and token refresh."""
import re
from datetime import timedelta
from unittest.mock import ANY

import pytest
from flask_jwt_extended import decode_token
from werkzeug.security import check_password_hash

from tests.support import ADMIN_EMAIL, PASSWORD, born, utcnow

HASH_PREFIXES = ('scrypt:', 'pbkdf2:')
NEW_PASSWORD = 'a-long-password'
BIRTH_DATE = '2009-03-14'


def request_code(api, db, email='maya@example.com'):
    res = api.post('/api/auth/send-verification', json={'email': email})
    assert res.status_code == 200, res.get_json()
    return db.value('SELECT code FROM email_verifications WHERE email = %s ORDER BY id DESC LIMIT 1',
                    (email.strip().lower(),))


def register(api, code, email='maya@example.com', name='Maya Patel', password=NEW_PASSWORD, **extra):
    return api.post('/api/auth/register', json={
        'name': name, 'email': email, 'password': password, 'verification_code': code,
        'date_of_birth': BIRTH_DATE, **extra,
    })


def login(api, email, password=PASSWORD):
    return api.post('/api/auth/login', json={'email': email, 'password': password})


def claims(app, token):
    with app.app_context():
        return decode_token(token)


class TestVerificationCode:
    def test_code_is_stored_for_ten_minutes_and_not_returned(self, api, db):
        res = api.post('/api/auth/send-verification', json={'email': ' Maya@Example.com '})
        assert res.status_code == 200
        assert 'dev_code' not in res.get_json()  # only ever returned by a debug server without SMTP

        row = db.one('SELECT email, code, used, expires_at FROM email_verifications')
        assert row['email'] == 'maya@example.com'
        assert re.fullmatch(r'\d{6}', row['code'])
        assert row['used'] == 0
        # DATETIME drops fractions by rounding, so allow a second either way
        assert timedelta(minutes=9) < row['expires_at'] - utcnow() <= timedelta(minutes=10, seconds=1)

    def test_a_new_request_replaces_the_old_code(self, api, db):
        request_code(api, db)
        request_code(api, db)
        assert db.value('SELECT COUNT(*) FROM email_verifications') == 1

    @pytest.mark.parametrize('email', ['', 'not-an-email'])
    def test_rejects_an_invalid_email(self, api, db, email):
        assert api.post('/api/auth/send-verification', json={'email': email}).status_code == 400

    def test_rejects_a_registered_email(self, api, make):
        make.user(email='maya@example.com')
        assert api.post('/api/auth/send-verification', json={'email': 'maya@example.com'}).status_code == 409

    def test_says_so_when_the_email_cannot_be_sent(self, api, monkeypatch):
        from server.routes import auth

        def broken_smtp(to_email, code):
            raise OSError('535 Username and Password not accepted')
        monkeypatch.setattr(auth, 'send_verification_email', broken_smtp)
        res = api.post('/api/auth/send-verification', json={'email': 'maya@example.com'})
        assert res.status_code == 503
        assert res.get_json()['error'].startswith("We couldn't send the email")


def test_gmail_app_passwords_lose_their_spaces():
    from server.config import _mail_password
    assert _mail_password('abcd efgh ijkl mnop', 'smtp.gmail.com') == 'abcdefghijklmnop'
    assert _mail_password('pass word', 'smtp.example.com') == 'pass word'   # other hosts keep theirs


class TestRegister:
    def test_creates_the_account_with_a_hashed_password(self, app, api, db):
        code = request_code(api, db)
        res = register(api, code)

        assert res.status_code == 201
        body = res.get_json()
        assert body['user'] == {
            'id': ANY, 'name': 'Maya Patel', 'email': 'maya@example.com', 'is_tutor': False,
            'screening_status': None, 'is_admin': False, 'is_parent': False, 'is_student': True, 'xp': 0,
        }
        assert claims(app, body['access_token'])['sub'] == str(body['user']['id'])

        stored = db.value('SELECT password FROM users WHERE id_user = %s', (body['user']['id'],))
        assert stored.startswith(HASH_PREFIXES)
        assert NEW_PASSWORD not in stored
        assert check_password_hash(stored, NEW_PASSWORD)

        assert db.value('SELECT COUNT(*) FROM student_profiles WHERE id_user = %s', (body['user']['id'],)) == 1
        assert str(db.value('SELECT date_of_birth FROM student_profiles WHERE id_user = %s',
                            (body['user']['id'],))) == BIRTH_DATE
        assert db.value('SELECT used FROM email_verifications WHERE code = %s', (code,)) == 1

    @pytest.mark.parametrize('birth_date', [None, '', 'not a date', '2999-01-01', '1900-01-01'])
    def test_students_give_a_real_date_of_birth(self, api, db, birth_date):
        code = request_code(api, db)
        res = register(api, code, date_of_birth=birth_date)
        assert res.status_code == 400
        assert 'date of birth' in res.get_json()['error']
        assert db.value('SELECT used FROM email_verifications WHERE code = %s', (code,)) == 0  # still usable

    @pytest.mark.parametrize('years, days', [(12, 364), (12, 0), (8, 0), (2, 0)])
    def test_students_are_13_or_over(self, api, db, years, days):
        code = request_code(api, db)
        res = register(api, code, date_of_birth=born(years, days).isoformat())
        assert res.status_code == 400
        assert res.get_json()['error'] == 'Study With Students is for students aged 13 and over'
        assert db.value('SELECT COUNT(*) FROM users') == 0

    def test_thirteen_from_the_birthday(self, api, db):
        code = request_code(api, db)
        assert register(api, code, date_of_birth=born(13).isoformat()).status_code == 201

    def test_parent_account(self, app, api, db):
        code = request_code(api, db, 'kate@example.com')
        res = register(api, code, email='kate@example.com', name='Kate Patel', account_type='parent',
                       date_of_birth=None)

        assert res.status_code == 201
        body = res.get_json()
        assert (body['user']['is_parent'], body['user']['is_student']) == (True, False)
        assert claims(app, body['access_token'])['is_parent'] is True
        assert db.value('SELECT is_parent FROM users WHERE id_user = %s', (body['user']['id'],)) == 1
        assert db.value('SELECT COUNT(*) FROM student_profiles WHERE id_user = %s', (body['user']['id'],)) == 0

    @pytest.mark.parametrize('account', ['tutor', 'admin', ['parent']])
    def test_account_type_is_student_or_parent(self, api, db, account):
        code = request_code(api, db)
        assert register(api, code, account_type=account).status_code == 400

    def test_email_is_normalised(self, api, db):
        code = request_code(api, db, 'Maya@Example.com')
        assert register(api, code, email='  MAYA@example.COM ').status_code == 201
        assert db.column('SELECT email FROM users') == ['maya@example.com']

    def test_a_code_works_once(self, api, db):
        code = request_code(api, db)
        assert register(api, code).status_code == 201
        res = register(api, code)
        assert res.status_code == 400
        assert 'already used' in res.get_json()['error']

    def test_wrong_code(self, api, db):
        code = request_code(api, db)
        wrong = '000000' if code != '000000' else '111111'
        res = register(api, wrong)
        assert res.status_code == 400
        assert res.get_json()['error'].startswith('Invalid verification code')

    def test_code_belongs_to_one_email(self, api, db):
        code = request_code(api, db, 'someone@example.com')
        assert register(api, code, email='maya@example.com').status_code == 400

    def test_expired_code(self, api, db):
        code = request_code(api, db)
        db.run('UPDATE email_verifications SET expires_at = %s', (utcnow() - timedelta(minutes=1),))
        res = register(api, code)
        assert res.status_code == 400
        assert 'expired' in res.get_json()['error']

    def test_email_already_registered(self, api, db, make):
        make.user(email='maya@example.com')
        # send-verification refuses registered emails, so plant a valid code directly
        db.run("INSERT INTO email_verifications (email, code, expires_at) VALUES ('maya@example.com', '123456', %s)",
               (utcnow() + timedelta(minutes=5),))
        assert register(api, '123456').status_code == 409

    @pytest.mark.parametrize('missing', ['name', 'email', 'password'])
    def test_all_fields_are_required(self, api, db, missing):
        code = request_code(api, db)
        payload = {'name': 'Maya Patel', 'email': 'maya@example.com', 'password': NEW_PASSWORD,
                   'verification_code': code, 'date_of_birth': BIRTH_DATE, missing: ''}
        assert api.post('/api/auth/register', json=payload).status_code == 400

    def test_password_needs_eight_characters(self, api, db):
        code = request_code(api, db)
        res = register(api, code, password='short12')
        assert res.status_code == 400
        assert '8 characters' in res.get_json()['error']

    def test_code_is_required(self, api, db):
        assert register(api, '').status_code == 400


class TestLogin:
    def test_returns_a_token_and_the_user(self, app, api, make):
        maya = make.user(email='maya@example.com')
        res = login(api, 'maya@example.com')
        assert res.status_code == 200
        body = res.get_json()
        assert body['user']['id'] == maya.id
        token = claims(app, body['access_token'])
        assert token['sub'] == str(maya.id)
        assert token['email'] == 'maya@example.com'

    def test_email_is_case_insensitive(self, api, make):
        make.user(email='maya@example.com')
        assert login(api, ' MAYA@Example.com ').status_code == 200

    @pytest.mark.parametrize(('email', 'password'), [
        ('maya@example.com', 'wrong-password'),
        ('nobody@example.com', PASSWORD),
        ('', ''),
    ])
    def test_bad_credentials_get_one_generic_error(self, api, make, email, password):
        make.user(email='maya@example.com')
        res = login(api, email, password)
        assert res.status_code == 401
        assert res.get_json()['error'] == 'Invalid email or password'

    def test_legacy_plaintext_password_is_hashed_on_first_login(self, api, db, make):
        maya = make.user(email='maya@example.com', password='legacy-pass-1')

        assert login(api, 'maya@example.com', 'legacy-pass-1').status_code == 200
        stored = db.value('SELECT password FROM users WHERE id_user = %s', (maya.id,))
        assert stored.startswith(HASH_PREFIXES)
        assert check_password_hash(stored, 'legacy-pass-1')
        assert login(api, 'maya@example.com', 'legacy-pass-1').status_code == 200

    def test_legacy_plaintext_password_still_checks_the_password(self, api, db, make):
        maya = make.user(email='maya@example.com', password='legacy-pass-1')
        assert login(api, 'maya@example.com', 'legacy-pass-2').status_code == 401
        assert db.value('SELECT password FROM users WHERE id_user = %s', (maya.id,)) == 'legacy-pass-1'


class TestSessionClaims:
    def test_me_needs_a_token(self, api, db):
        assert api.get('/api/auth/me').status_code == 401

    def test_me_describes_the_user(self, api, make):
        tutor = make.tutor(status='pending')
        user = api.get('/api/auth/me', user=tutor).get_json()['user']
        assert user['is_tutor'] is True
        assert user['screening_status'] == 'pending'
        assert user['is_admin'] is False
        assert (user['is_parent'], user['is_student']) == (False, True)

    def test_super_admin_email_is_admin(self, api, make):
        admin = make.user('Ada Admin', email=ADMIN_EMAIL)
        assert api.get('/api/auth/me', user=admin).get_json()['user']['is_admin'] is True

    def test_refresh_reissues_the_token_with_live_claims(self, app, api, db, make):
        oliver = make.tutor(status='pending')
        api.token(oliver)  # a token from before the approval
        db.run("UPDATE tutor_profiles SET screening_status = 'approved' WHERE id_tutor = %s", (oliver.tutor_id,))

        res = api.post('/api/auth/refresh', user=oliver)
        assert res.status_code == 200
        body = res.get_json()
        assert body['user']['screening_status'] == 'approved'
        assert claims(app, body['access_token'])['screening_status'] == 'approved'

    def test_deleted_account(self, api, db, make):
        maya = make.user()
        api.token(maya)
        db.run('DELETE FROM users WHERE id_user = %s', (maya.id,))
        assert api.get('/api/auth/me', user=maya).status_code == 404
        assert api.post('/api/auth/refresh', user=maya).status_code == 404
