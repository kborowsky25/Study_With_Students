"""Paying for sessions: only a verified Stripe checkout marks a session paid, and tutors keep the
full price. Stripe is replaced by a fake; nothing leaves the machine."""
from types import SimpleNamespace

import pytest

from server.routes import payments


class FakeStripe:
    """Just enough of the stripe module for Checkout: create() records, retrieve() replays."""

    def __init__(self):
        self.created = []
        self.sessions = {}
        fake = self

        class Session:
            @staticmethod
            def create(**kwargs):
                fake.created.append(kwargs)
                return SimpleNamespace(id='cs_test_1', url='https://checkout.stripe.test/c/cs_test_1',
                                       client_secret='cs_test_1_secret')

            @staticmethod
            def retrieve(session_id):
                return fake.sessions[session_id]

        self.checkout = SimpleNamespace(Session=Session)
        self.error = SimpleNamespace(StripeError=type('StripeError', (Exception,), {}))


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
