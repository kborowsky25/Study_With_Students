"""The 5% booking fee: families pay it on top of the tutor's price; tutors keep 100% of the price.

Stored as `events.booking_fee` and returned by /api/events and /api/payments. These tests describe
the new contract; the `booking_fee` ones are expected to fail until the pricing change is in this code base
(see conftest.py).
"""
from datetime import timedelta

import pytest

from tests.support import iso, local


@pytest.fixture
def booked(api, make):
    """Maya books 1.5 hours with Oliver at £22/hour: £33, plus a £1.65 booking fee."""
    maya, oliver = make.user('Maya Patel'), make.tutor('Oliver Grant', rate=22)
    make.connect(maya, oliver)
    res = api.post('/api/events', user=maya, json={
        'tutor_id': oliver.tutor_id, 'title': 'Mechanics',
        'start_time': iso(local(2, hour=17)), 'end_time': iso(local(2, hour=18, minute=30))})
    assert res.status_code == 201
    return maya, oliver, res.get_json()['event']


@pytest.mark.booking_fee
def test_a_booked_session_carries_a_5_percent_fee(booked):
    _, _, event = booked
    assert event['amount'] == pytest.approx(33.0)
    assert event['booking_fee'] == pytest.approx(1.65)


@pytest.mark.booking_fee
def test_the_fee_is_listed_with_the_session(api, booked):
    maya, oliver, event = booked
    for user, url in [(maya, '/api/events'), (oliver, '/api/events'), (maya, '/api/payments?role=student')]:
        listed = {e['id_event']: e for e in api.get(url, user=user).get_json()['events']}[event['id_event']]
        assert (listed['amount'], listed['booking_fee']) == (pytest.approx(33.0), pytest.approx(1.65))


def test_tutors_earn_the_full_price(api, booked):  # true before and after the fee arrives
    _, oliver, event = booked
    earned = {e['id_event']: e for e in api.get('/api/payments?role=tutor', user=oliver).get_json()['events']}
    assert earned[event['id_event']]['amount'] == pytest.approx(33.0)   # the fee is never taken from it


@pytest.mark.parametrize('rate, minutes, amount, fee', [
    (22.50, 60, 22.50, 1.13),    # 1.125: half-up, as the booking dialog shows it (round() gave 1.12)
    (17.50, 60, 17.50, 0.88),    # 0.875
    (22.25, 30, 11.13, 0.56),    # the price itself rounds half-up too (11.125)
    (22.00, 90, 33.00, 1.65),
])
def test_prices_and_fees_round_half_up_to_the_penny(api, make, rate, minutes, amount, fee):
    maya, oliver = make.user('Maya Patel'), make.tutor('Oliver Grant', rate=rate)
    make.connect(maya, oliver)
    start = local(2, hour=17)
    res = api.post('/api/events', user=maya, json={
        'tutor_id': oliver.tutor_id, 'title': 'Mechanics',
        'start_time': iso(start), 'end_time': iso(start + timedelta(minutes=minutes))})
    assert res.status_code == 201, res.get_json()
    event = res.get_json()['event']
    assert (event['amount'], event['booking_fee']) == (amount, fee)
