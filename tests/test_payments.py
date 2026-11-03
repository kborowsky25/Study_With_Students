"""Paying for sessions: only a verified Stripe checkout marks a session paid, tutors keep the
full price, and a session has one checkout at a time. Stripe is replaced by a fake; nothing
leaves the machine."""
import time
from types import SimpleNamespace

import pytest

from server.routes import payments


class FakeStripe:
    """Just enough of the stripe module for Checkout: create() opens a session (`created` keeps
    what was asked for), retrieve() reads one back (tests can add their own to `sessions`), and
    expire() closes an open one."""

    def __init__(self):
        self.created = []
        self.sessions = {}
        fake = self
        StripeError = type('StripeError', (Exception,), {})

        class Session:
            @staticmethod
            def create(**kwargs):
                fake.created.append(kwargs)
                session_id = f'cs_test_{len(fake.created)}'
                url = f'https://checkout.stripe.test/c/{session_id}'
                fake.sessions[session_id] = {
                    'id': session_id, 'url': url, 'mode': kwargs.get('mode'), 'status': 'open',
                    'payment_status': 'unpaid', 'metadata': dict(kwargs.get('metadata') or {}),
                    'created': int(time.time()),
                }
                return SimpleNamespace(id=session_id, url=url, client_secret=f'{session_id}_secret')

            @staticmethod
            def retrieve(session_id):
                if session_id not in fake.sessions:
                    raise StripeError(f'No such checkout.session: {session_id}')
                return fake.sessions[session_id]

            @staticmethod
            def expire(session_id):
                session = Session.retrieve(session_id)
                if session.get('status') != 'open':
                    raise StripeError('Only an open Checkout Session can be expired')
                session['status'] = 'expired'
                return session

        self.checkout = SimpleNamespace(Session=Session)
        self.error = SimpleNamespace(StripeError=StripeError)


@pytest.fixture
def stripe(monkeypatch):
    fake = FakeStripe()
    monkeypatch.setattr(payments, 'stripe', fake)
    monkeypatch.setattr(payments, 'stripe_enabled', lambda: True)
    return fake


@pytest.fixture
def people(make):
    maya, oliver = make.user('Maya Patel'), make.tutor('Oliver Grant', rate=22)
    make.connect(maya, oliver)
    return maya, oliver, make.user('Sam Lee')


def test_lists_sessions_by_role(api, make, people):
    maya, oliver, sam = people
    event_id = make.session(maya, oliver, status='confirmed')

    as_student = api.get('/api/payments?role=student', user=maya).get_json()
    assert [e['id_event'] for e in as_student['events']] == [event_id]
    assert as_student['stripe_enabled'] is False
    assert [e['id_event'] for e in api.get('/api/payments?role=tutor', user=oliver).get_json()['events']] == [event_id]
    assert api.get('/api/payments?role=student', user=oliver).get_json()['events'] == []
    assert api.get('/api/payments?role=tutor', user=sam).get_json()['events'] == []


def test_card_payments_are_off_without_stripe(api, make, people):
    maya, oliver, _ = people
    event_id = make.session(maya, oliver, status='confirmed')
    res = api.post(f'/api/payments/checkout/{event_id}', user=maya)
    assert (res.status_code, res.get_json()['code']) == (503, 'stripe_not_configured')
    assert api.post(f'/api/payments/verify/{event_id}', user=maya, json={'session_id': 'cs_1'}).status_code == 503


class TestSessionCheckout:
    def test_checkout_for_a_confirmed_session(self, api, make, people, stripe):
        maya, oliver, _ = people
        event_id = make.session(maya, oliver, status='confirmed', hours=1.5, amount=33)

        res = api.post(f'/api/payments/checkout/{event_id}', user=maya)
        assert res.status_code == 200
        assert res.get_json() == {'url': 'https://checkout.stripe.test/c/cs_test_1'}
        created = stripe.created[0]
        assert created['line_items'][0]['price_data']['unit_amount'] == 3300
        assert created['line_items'][0]['price_data']['currency'] == 'gbp'
        assert created['metadata'] == {'event_id': str(event_id), 'user_id': str(maya.id)}
        assert f'event_id={event_id}' in created['success_url']

    @pytest.mark.parametrize(('status', 'amount', 'expected'), [
        ('pending', 22, 400),     # the tutor hasn't confirmed yet
        ('paid', 22, 409),  # already paid
        ('canceled', 22, 400),
        ('confirmed', 0, 400),    # free (e.g. a saved study room) — nothing to pay
    ])
    def test_checkout_rules(self, api, make, people, stripe, status, amount, expected):
        maya, oliver, _ = people
        event_id = make.session(maya, oliver, status=status, amount=amount)
        assert api.post(f'/api/payments/checkout/{event_id}', user=maya).status_code == expected
        assert stripe.created == []

    def test_only_the_student_pays(self, api, make, people, stripe):
        maya, oliver, sam = people
        event_id = make.session(maya, oliver, status='confirmed')
        assert api.post(f'/api/payments/checkout/{event_id}', user=oliver).status_code == 403
        assert api.post(f'/api/payments/checkout/{event_id}', user=sam).status_code == 403
        assert api.post('/api/payments/checkout/999', user=maya).status_code == 404

    def test_paid_only_once_stripe_confirms(self, api, db, make, people, stripe):
        maya, oliver, _ = people
        event_id = make.session(maya, oliver, status='confirmed')
        metadata = {'event_id': str(event_id), 'user_id': str(maya.id)}
        verify = f'/api/payments/verify/{event_id}'

        stripe.sessions['cs_open'] = {'mode': 'payment', 'metadata': metadata, 'payment_status': 'unpaid'}
        assert api.post(verify, user=maya, json={'session_id': 'cs_open'}).status_code == 402
        assert db.value('SELECT status FROM events') == 'confirmed'

        stripe.sessions['cs_paid'] = {'mode': 'payment', 'metadata': metadata, 'payment_status': 'paid'}
        assert api.post(verify, user=maya, json={'session_id': 'cs_paid'}).status_code == 200
        assert db.value('SELECT status FROM events') == 'paid'

    def test_a_checkout_only_pays_for_its_own_session(self, api, db, make, people, stripe):
        maya, oliver, sam = people
        event_id = make.session(maya, oliver, status='confirmed')
        other_event = make.session(maya, oliver, status='confirmed')
        stripe.sessions['cs_other'] = {
            'mode': 'payment', 'payment_status': 'paid',
            'metadata': {'event_id': str(other_event), 'user_id': str(maya.id)}}
        stripe.sessions['cs_sam'] = {
            'mode': 'payment', 'payment_status': 'paid',
            'metadata': {'event_id': str(event_id), 'user_id': str(sam.id)}}

        verify = f'/api/payments/verify/{event_id}'
        assert api.post(verify, user=maya, json={'session_id': 'cs_other'}).status_code == 403
        assert api.post(verify, user=maya, json={'session_id': 'cs_sam'}).status_code == 403
        assert api.post(verify, user=maya, json={}).status_code == 400
        assert db.column('SELECT status FROM events') == ['confirmed', 'confirmed']


class TestOneCheckoutAtATime:
    """A child and a parent can't both pay for the same session."""

    @pytest.fixture
    def family(self, make, people):
        maya, oliver, _ = people
        return maya, make.parent('Kate Patel', of=maya), make.session(maya, oliver, status='confirmed')

    def checkout(self, api, person, event_id):
        return api.post(f'/api/payments/checkout/{event_id}', user=person)

    def test_asking_again_gives_back_your_own_checkout(self, api, db, family, stripe):
        maya, _, event_id = family
        first, second = self.checkout(api, maya, event_id), self.checkout(api, maya, event_id)
        assert first.status_code == second.status_code == 200
        assert first.get_json() == second.get_json()
        assert len(stripe.created) == 1
        assert db.value('SELECT checkout_session_id FROM events WHERE id_event = %s', (event_id,)) == 'cs_test_1'

    def test_someone_else_waits_while_a_checkout_is_fresh(self, api, family, stripe):
        maya, kate, event_id = family
        self.checkout(api, maya, event_id)
        res = self.checkout(api, kate, event_id)
        assert res.status_code == 409
        body = res.get_json()
        assert body['code'] == 'payment_in_progress'
        assert body['error'].startswith('Maya is paying for this session right now')
        assert body['error'].endswith('you can pay in 5 minutes.')
        assert len(stripe.created) == 1
        assert stripe.sessions['cs_test_1']['status'] == 'open'

    def test_an_abandoned_checkout_is_closed_before_a_new_one(self, api, db, family, stripe):
        maya, kate, event_id = family
        self.checkout(api, maya, event_id)
        stripe.sessions['cs_test_1']['created'] -= payments.CHECKOUT_HOLD * 60 + 1
        res = self.checkout(api, kate, event_id)
        assert res.status_code == 200
        assert stripe.sessions['cs_test_1']['status'] == 'expired'   # Maya's can't be paid any more
        assert stripe.created[1]['metadata'] == {'event_id': str(event_id), 'user_id': str(kate.id),
                                                 'student_user_id': str(maya.id)}
        assert db.value('SELECT checkout_session_id FROM events WHERE id_event = %s', (event_id,)) == 'cs_test_2'

    def test_a_checkout_that_went_through_is_recorded_instead(self, api, db, family, stripe):
        maya, kate, event_id = family
        self.checkout(api, maya, event_id)
        stripe.sessions['cs_test_1'].update(status='complete', payment_status='paid')
        res = self.checkout(api, kate, event_id)
        assert (res.status_code, res.get_json()['code']) == (409, 'already_paid')
        assert db.value('SELECT status FROM events WHERE id_event = %s', (event_id,)) == 'paid'
        assert len(stripe.created) == 1
        res = self.checkout(api, maya, event_id)
        assert (res.status_code, res.get_json()['code']) == (409, 'already_paid')

    def test_a_payment_still_settling_blocks_a_second_one(self, api, db, family, stripe):
        maya, kate, event_id = family
        self.checkout(api, maya, event_id)
        stripe.sessions['cs_test_1'].update(status='complete', payment_status='unpaid')  # e.g. a bank debit
        res = self.checkout(api, kate, event_id)
        assert (res.status_code, res.get_json()['code']) == (409, 'payment_processing')
        assert db.value('SELECT status FROM events WHERE id_event = %s', (event_id,)) == 'confirmed'

    def test_paid_just_before_it_could_be_closed(self, api, db, family, stripe, monkeypatch):
        maya, kate, event_id = family
        self.checkout(api, maya, event_id)
        stripe.sessions['cs_test_1']['created'] -= payments.CHECKOUT_HOLD * 60 + 1

        def paid_meanwhile(session_id):
            stripe.sessions[session_id].update(status='complete', payment_status='paid')
            raise stripe.error.StripeError('This Checkout Session is not open')
        monkeypatch.setattr(stripe.checkout.Session, 'expire', staticmethod(paid_meanwhile))

        res = self.checkout(api, kate, event_id)
        assert (res.status_code, res.get_json()['code']) == (409, 'already_paid')
        assert db.value('SELECT status FROM events WHERE id_event = %s', (event_id,)) == 'paid'
        assert len(stripe.created) == 1

    @pytest.mark.parametrize('status', ['expired', 'unknown'])
    def test_an_expired_or_unknown_checkout_is_replaced_straight_away(self, api, db, family, stripe, status):
        maya, kate, event_id = family
        self.checkout(api, maya, event_id)
        if status == 'unknown':
            del stripe.sessions['cs_test_1']   # e.g. the test-mode data was reset
        else:
            stripe.sessions['cs_test_1']['status'] = 'expired'
        assert self.checkout(api, kate, event_id).status_code == 200
        assert len(stripe.created) == 2

    def test_checkouts_expire_on_their_own(self, api, family, stripe):
        maya, _, event_id = family
        before = int(time.time())
        self.checkout(api, maya, event_id)
        expires = stripe.created[0]['expires_at'] - before
        assert payments.CHECKOUT_MINUTES * 60 - 5 <= expires <= payments.CHECKOUT_MINUTES * 60 + 5
        assert expires >= 30 * 60   # Stripe's minimum
