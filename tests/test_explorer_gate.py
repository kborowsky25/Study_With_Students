"""The Explorer gate: community features need the £5/month plan or a verified tutor account.

Gated endpoints answer 402 with `code: explorer_required` (the frontend turns that into the
upgrade prompt). Anything other than 402 for a member means the gate let them through.
"""
from datetime import timedelta

import pytest

from tests.support import iso, local, utcnow

GATED = [
    ('GET', '/api/forum/categories', None),
    ('GET', '/api/forum/recent', None),
    ('GET', '/api/forum/categories/1', None),
    ('POST', '/api/forum/categories/1/threads', {'title': 'Hello', 'content': 'First post'}),
    ('GET', '/api/forum/threads/1', None),
    ('POST', '/api/forum/threads/1/posts', {'content': 'A reply'}),
    ('DELETE', '/api/forum/threads/1', None),
    ('DELETE', '/api/forum/posts/1', None),
    ('GET', '/api/study-notes', None),
    ('DELETE', '/api/study-notes/1', None),
    ('GET', '/api/study-notes/1/file', None),
    ('GET', '/api/study-rooms', None),
    ('POST', '/api/study-rooms/1/calendar', None),
    ('GET', '/api/classrooms', None),
    ('POST', '/api/classrooms/1/enroll', None),
]
ids = [f'{method} {url}' for method, url, _ in GATED]


def call(api, user, method, url, body):
    return api.request(method, url, user, json=body) if body else api.request(method, url, user)


@pytest.fixture(params=['free student', 'expired Explorer', 'pending tutor', 'rejected tutor'])
def without_access(request, make):
    return {
        'free student': lambda: make.user(),
        'expired Explorer': lambda: make.user(premium=True, premium_until=utcnow() - timedelta(minutes=1)),
        'pending tutor': lambda: make.tutor(status='pending'),
        'rejected tutor': lambda: make.tutor(status='rejected'),
    }[request.param]()


@pytest.fixture(params=['Explorer member', 'Explorer without an end date', 'verified tutor'])
def with_access(request, make):
    return {
        'Explorer member': lambda: make.explorer(),
        'Explorer without an end date': lambda: make.user(premium=True, premium_until=None),
        'verified tutor': lambda: make.tutor(status='approved'),
    }[request.param]()


@pytest.mark.parametrize(('method', 'url', 'body'), GATED, ids=ids)
def test_needs_the_explorer_plan(api, without_access, method, url, body):
    res = call(api, without_access, method, url, body)
    assert res.status_code == 402
    assert res.get_json() == {'error': 'Explorer plan required', 'code': 'explorer_required'}


@pytest.mark.parametrize(('method', 'url', 'body'), GATED, ids=ids)
def test_members_and_verified_tutors_get_through(api, with_access, method, url, body):
    assert call(api, with_access, method, url, body).status_code != 402


@pytest.mark.parametrize(('method', 'url', 'body'), GATED, ids=ids)
def test_needs_a_token(api, db, method, url, body):
    assert call(api, None, method, url, body).status_code == 401


@pytest.mark.parametrize('url', ['/api/forum/categories', '/api/study-notes', '/api/study-rooms', '/api/classrooms'])
def test_member_reads_succeed(api, make, url):
    assert api.get(url, user=make.explorer()).status_code == 200


class TestMembershipStatus:
    def status(self, api, user):
        return api.get('/api/membership/status', user=user).get_json()

    def test_free(self, api, make):
        body = self.status(api, make.user())
        assert (body['is_premium'], body['has_access'], body['verified_tutor']) == (False, False, False)
        assert body['plan']['price_pence'] == 500
        assert body['stripe_enabled'] is False

    def test_explorer(self, api, make):
        body = self.status(api, make.explorer())
        assert (body['is_premium'], body['has_access']) == (True, True)
        assert body['expires_at']
        assert body['managed_by'] == 'demo'

    def test_expired(self, api, make):
        body = self.status(api, make.user(premium=True, premium_until=utcnow() - timedelta(days=1)))
        assert (body['is_premium'], body['has_access'], body['expires_at']) == (False, False, None)

    def test_verified_tutor(self, api, make):
        body = self.status(api, make.tutor())
        assert (body['is_premium'], body['has_access'], body['verified_tutor']) == (False, True, True)


def test_cancelling_a_demo_plan_closes_the_gate(api, make):
    ella = make.explorer()
    assert api.get('/api/forum/categories', user=ella).status_code == 200
    res = api.post('/api/membership/cancel', user=ella)
    assert res.status_code == 200
    assert res.get_json()['has_access'] is False
    assert api.get('/api/forum/categories', user=ella).status_code == 402


def test_demo_activation_is_off_outside_debug(api, make):
    assert api.post('/api/membership/demo-activate', user=make.user()).status_code == 403


class TestHosting:
    """Hosting a study room or a class needs a verified tutor, not just the plan."""

    def room(self):
        return {'subject': 'A-level Maths drop-in', 'start_time': iso(local(3, hour=19)),
                'end_time': iso(local(3, hour=20)), 'zoom_link': 'https://zoom.us/j/1'}

    def test_verified_tutor_hosts(self, api, make):
        assert api.post('/api/study-rooms', user=make.tutor(), json=self.room()).status_code == 201

    @pytest.mark.parametrize('who', ['explorer', 'pending tutor'])
    def test_others_cannot_host(self, api, make, who):
        user = make.explorer() if who == 'explorer' else make.tutor(status='pending')
        assert api.post('/api/study-rooms', user=user, json=self.room()).status_code == 403
        assert api.post('/api/classrooms', user=user, json={**self.room(), 'title': 'Calculus'}).status_code == 403
