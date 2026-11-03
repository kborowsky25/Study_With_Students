"""Suspending accounts: who can, and everything a suspension stops (server/suspensions.py)."""
from datetime import timedelta

import pytest

from server.routes import payments
from server.scheduling import local_now
from server.services import reminders
from tests.support import ADMIN_EMAIL, ADMIN_SECRET, PASSWORD, iso, local
from tests.test_payments import FakeStripe

ADMIN_HEADERS = {'X-Admin-Secret': ADMIN_SECRET}


def suspend(api, person, reason='Asked a student for their number', **kwargs):
    return api.post(f'/api/admin/users/{person.id}/suspend', json={'reason': reason}, **kwargs)


def unsuspend(api, person, **kwargs):
    return api.post(f'/api/admin/users/{person.id}/unsuspend', **kwargs)


def login(api, person, password=PASSWORD):
    return api.post('/api/auth/login', json={'email': person.email, 'password': password})


@pytest.fixture
def people(make):
    """Maya and her tutor Oliver (connected), and Sam, another student."""
    maya, oliver, sam = make.user('Maya Patel'), make.tutor('Oliver Grant'), make.user('Sam Lee')
    make.connect(maya, oliver)
    return maya, oliver, sam


class TestSuspending:
    def test_a_suspended_account_is_signed_out_and_cannot_log_in(self, api, db, people):
        _, oliver, _ = people
        assert api.get('/api/auth/me', user=oliver).status_code == 200   # a token from before

        res = suspend(api, oliver, headers=ADMIN_HEADERS)
        assert res.status_code == 200
        assert res.get_json()['message'] == 'Suspended Oliver'
        row = db.one('SELECT suspended_reason, suspended_by, suspended_at IS NOT NULL AS suspended FROM users '
                     'WHERE id_user = %s', (oliver.id,))
        assert row == {'suspended_reason': 'Asked a student for their number', 'suspended_by': 'admin key',
                       'suspended': 1}

        for url in ('/api/auth/me', '/api/messages', '/api/events'):
            res = api.get(url, user=oliver)
            assert (res.status_code, res.get_json()['code']) == (401, 'suspended'), url
        res = login(api, oliver)
        assert (res.status_code, res.get_json()['code']) == (403, 'suspended')
        assert 'access_token' not in res.get_json()

    def test_the_wrong_password_does_not_reveal_a_suspension(self, api, people):
        _, oliver, _ = people
        suspend(api, oliver, headers=ADMIN_HEADERS)
        res = login(api, oliver, 'wrong-password')
        assert (res.status_code, res.get_json()) == (401, {'error': 'Invalid email or password'})

    def test_lifting_it_lets_them_back_in(self, api, db, people):
        _, oliver, _ = people
        suspend(api, oliver, headers=ADMIN_HEADERS)
        res = unsuspend(api, oliver, headers=ADMIN_HEADERS)
        assert (res.status_code, res.get_json()['message']) == (200, 'Oliver can log in again')
        assert login(api, oliver).status_code == 200
        assert api.get('/api/auth/me', user=oliver).status_code == 200
        assert db.value('SELECT suspended_reason FROM users WHERE id_user = %s', (oliver.id,)) is None

    def test_the_super_admin_signed_in_suspends_too(self, api, db, make, people):
        _, oliver, _ = people
        admin = make.user('Ada Admin', email=ADMIN_EMAIL)
        assert suspend(api, oliver, user=admin).status_code == 200
        assert db.value('SELECT suspended_by FROM users WHERE id_user = %s', (oliver.id,)) == ADMIN_EMAIL

    def test_admins_only(self, api, people):
        maya, oliver, _ = people
        assert suspend(api, oliver).status_code == 403
        assert suspend(api, oliver, user=maya).status_code == 403
        assert suspend(api, oliver, headers={'X-Admin-Secret': 'wrong'}).status_code == 403
        assert unsuspend(api, oliver, user=maya).status_code == 403
        assert api.get('/api/auth/me', user=oliver).status_code == 200

    @pytest.mark.parametrize('reason', ['', '   ', None])
    def test_needs_a_reason(self, api, people, reason):
        _, oliver, _ = people
        assert suspend(api, oliver, reason, headers=ADMIN_HEADERS).status_code == 400

    def test_not_the_admin_account_and_not_twice(self, api, make, people):
        _, oliver, _ = people
        admin = make.user('Ada Admin', email=ADMIN_EMAIL)
        assert suspend(api, admin, headers=ADMIN_HEADERS).status_code == 400
        assert suspend(api, oliver, headers=ADMIN_HEADERS).status_code == 200
        assert suspend(api, oliver, headers=ADMIN_HEADERS).status_code == 409
        assert unsuspend(api, admin, headers=ADMIN_HEADERS).status_code == 409
        assert api.post('/api/admin/users/9999/suspend', json={'reason': 'x'}, headers=ADMIN_HEADERS).status_code == 404

    def test_the_admin_lists_show_it(self, api, make, people):
        maya, oliver, _ = people
        suspend(api, oliver, headers=ADMIN_HEADERS)
        users = {u['id_user']: u for u in api.get('/api/admin/users', headers=ADMIN_HEADERS).get_json()['users']}
        assert users[oliver.id]['suspended_reason'] == 'Asked a student for their number'
        assert users[oliver.id]['suspended_at'] and users[maya.id]['suspended_at'] is None

        res = api.post('/api/reports', user=maya, json={'user_id': oliver.id, 'reason': 'other'})
        assert res.status_code == 201   # reporting someone suspended still works
        report_url = f"/api/admin/reports/{res.get_json()['report_id']}"
        assert api.get(report_url, headers=ADMIN_HEADERS).get_json()['report']['reported_suspended_at']


class TestUpcomingSessions:
    def test_suspending_cancels_what_is_still_to_come(self, api, db, make, people):
        maya, oliver, _ = people
        pending = make.session(maya, oliver, start=local(3), status='pending')
        confirmed = make.session(maya, oliver, start=local(4), status='confirmed')
        paid = make.session(maya, oliver, start=local(5), status='paid')
        past = make.session(maya, oliver, start=local(-3), status='confirmed')

        res = suspend(api, oliver, headers=ADMIN_HEADERS)
        assert (res.get_json()['cancelled'], res.get_json()['cancelled_paid']) == (3, 1)
        rows = {r['id_event']: r for r in db.all('SELECT id_event, status, canceled_by, cancel_type FROM events')}
        for event_id in (pending, confirmed, paid):
            assert rows[event_id] == {'id_event': event_id, 'status': 'canceled', 'canceled_by': 'admin',
                                      'cancel_type': 'suspended'}
        assert rows[past]['status'] == 'confirmed'   # it happened: left for the admin

    def test_a_suspended_students_sessions_are_cancelled_too(self, api, db, make, people):
        maya, oliver, _ = people
        event_id = make.session(maya, oliver, start=local(4), status='confirmed')
        suspend(api, maya, headers=ADMIN_HEADERS)
        assert db.value('SELECT status FROM events WHERE id_event = %s', (event_id,)) == 'canceled'

    def test_open_checkouts_for_them_are_closed(self, api, db, make, people, monkeypatch):
        maya, oliver, _ = people
        fake = FakeStripe()
        monkeypatch.setattr(payments, 'stripe', fake)
        monkeypatch.setattr(payments, 'stripe_enabled', lambda: True)
        from server.routes import safety
        monkeypatch.setattr(safety, 'stripe', fake)
        monkeypatch.setattr(safety, 'stripe_enabled', lambda: True)
        event_id = make.session(maya, oliver, start=local(4), status='confirmed')
        assert api.post(f'/api/payments/checkout/{event_id}', user=maya).status_code == 200

        suspend(api, oliver, headers=ADMIN_HEADERS)
        assert fake.sessions['cs_test_1']['status'] == 'expired'


class TestWhatItStops:
    def test_a_suspended_tutor_is_not_listed_booked_or_messaged(self, api, make, people):
        maya, oliver, sam = people
        api.post('/api/messages', user=maya, json={'receiver_id': oliver.id, 'message': 'Hi'})
        suspend(api, oliver, headers=ADMIN_HEADERS)

        assert oliver.tutor_id not in [t['id_tutor'] for t in api.get('/api/tutors', user=sam).get_json()['tutors']]
        recommended = api.get('/api/tutors/recommended', user=sam).get_json()['tutors']
        assert oliver.tutor_id not in [t['id_tutor'] for t in recommended]
        assert api.get('/api/users/search', user=maya, query_string={'q': 'Oliver'}).get_json()['users'] == []

        start = local(3)
        res = api.post('/api/events', user=maya, json={'tutor_id': oliver.tutor_id, 'start_time': iso(start),
                                                       'end_time': iso(start + timedelta(hours=1))})
        assert (res.status_code, res.get_json()['code']) == (403, 'tutor_unavailable')

        res = api.post('/api/messages', user=maya, json={'receiver_id': oliver.id, 'message': 'Are you there?'})
        assert (res.status_code, res.get_json()['code']) == (403, 'suspended')
        thread = api.get(f'/api/messages/{oliver.id}', user=maya).get_json()
        assert (thread['can_send'], thread['reason_code']) == (False, 'suspended')

    def test_a_tutor_cannot_schedule_a_suspended_student(self, api, db, people):
        maya, oliver, _ = people
        suspend(api, maya, headers=ADMIN_HEADERS)
        start = local(3, 18)
        res = api.post('/api/events', user=oliver, json={'student_id': maya.student_id, 'start_time': iso(start),
                                                         'end_time': iso(start + timedelta(hours=1))})
        assert (res.status_code, res.get_json()['code']) == (403, 'student_unavailable')

    def test_a_session_with_a_suspended_tutor_cannot_be_paid(self, api, make, people, monkeypatch):
        maya, oliver, _ = people
        fake = FakeStripe()
        monkeypatch.setattr(payments, 'stripe', fake)
        monkeypatch.setattr(payments, 'stripe_enabled', lambda: True)
        event_id = make.session(maya, oliver, start=local(-2), status='confirmed')   # happened, not paid
        suspend(api, oliver, headers=ADMIN_HEADERS)
        res = api.post(f'/api/payments/checkout/{event_id}', user=maya)
        assert (res.status_code, res.get_json()['code']) == (409, 'tutor_suspended')
        assert fake.created == []

    def test_a_suspended_parent_no_longer_counts(self, api, db, make, people, capsys):
        _, oliver, _ = people
        mia = make.child('Mia Khan')
        make.connect(mia, oliver)
        kate = make.parent('Kate Khan', of=mia)
        family = lambda: api.get('/api/family', user=mia).get_json()  # noqa: E731
        assert (family()['needs_parent'], len(family()['parents'])) == (False, 1)

        suspend(api, kate, headers=ADMIN_HEADERS)
        assert (family()['needs_parent'], family()['parents']) == (True, [])
        start = local(3)
        res = api.post('/api/events', user=mia, json={'tutor_id': oliver.tutor_id, 'start_time': iso(start),
                                                      'end_time': iso(start + timedelta(hours=1))})
        assert res.get_json()['code'] == 'parent_required'

        # …and no longer hears about the child's sessions
        unsuspend(api, kate, headers=ADMIN_HEADERS)
        start = local_now().replace(second=0) + timedelta(hours=5)
        make.session(mia, oliver, start=start, status='confirmed')
        suspend(api, kate, headers=ADMIN_HEADERS)
        capsys.readouterr()
        with api.app.app_context():
            assert reminders.send_due_reminders()['sent'] == 2   # the student and the tutor
        assert kate.email not in capsys.readouterr().out

    def test_invites_from_a_suspended_account_are_hidden(self, api, make, people):
        maya, _, _ = people
        kate = make.parent('Kate Patel')
        api.post('/api/family/invites', user=kate, json={'email': maya.email})
        link = api.get('/api/family', user=maya).get_json()['invites'][0]['link_id']
        suspend(api, kate, headers=ADMIN_HEADERS)
        assert api.get('/api/family', user=maya).get_json()['invites'] == []
        assert api.post(f'/api/family/invites/{link}/accept', user=maya).status_code == 404
