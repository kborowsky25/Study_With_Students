"""App-wide behaviour: health check, JSON errors and JSON encoding."""
from datetime import date, datetime
from decimal import Decimal

from server.json import ApiJSONProvider


def test_health_reports_the_database(api):
    res = api.get('/api/health')
    assert res.status_code == 200
    assert res.get_json() == {'ok': True, 'database': True}


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
