"""The community — forum, study notes, study rooms and classes — is free for everyone who is logged in.

It used to need the £5/month Explorer plan. The `free_community` tests describe the new contract
and are expected to fail until the pricing change is in this code base (see conftest.py).
"""
import io
from types import SimpleNamespace

import pytest

from tests.support import iso, local

READS = ['/api/forum/categories', '/api/forum/recent', '/api/study-notes', '/api/study-rooms', '/api/classrooms']


@pytest.fixture
def hosted(api, db, make):
    """A verified tutor's thread, study room and class, for everyone else to use."""
    oliver = make.tutor('Oliver Grant')
    category = db.value("SELECT id FROM forum_categories WHERE name = 'Exam Prep'")
    thread = api.post(f'/api/forum/categories/{category}/threads', user=oliver,
                      json={'title': 'How do you plan revision?', 'content': 'Mocks are in six weeks.'})
    room = api.post('/api/study-rooms', user=oliver, json={
        'subject': 'A-level Maths drop-in', 'start_time': iso(local(3, hour=19)), 'end_time': iso(local(3, hour=20)),
        'zoom_link': 'https://zoom.us/j/123'})
    klass = api.post('/api/classrooms', user=oliver, json={
        'title': 'Mechanics in an hour', 'start_time': iso(local(4, hour=18)), 'end_time': iso(local(4, hour=19)),
        'zoom_link': 'https://zoom.us/j/456', 'capacity': 10})
    assert (thread.status_code, room.status_code, klass.status_code) == (201, 201, 201)
    return SimpleNamespace(category=category, thread=thread.get_json()['thread']['id'],
                           room=room.get_json()['room']['id'], klass=klass.get_json()['classroom']['id'])


@pytest.fixture(params=['student', 'pending tutor', 'rejected tutor'])
def anyone(request, make):
    """Accounts that the Explorer gate used to turn away."""
    return {
        'student': lambda: make.user('Maya Patel'),
        'pending tutor': lambda: make.tutor('Pete Pending', status='pending'),
        'rejected tutor': lambda: make.tutor('Rae Rejected', status='rejected'),
    }[request.param]()


@pytest.mark.parametrize('url', READS)
def test_logging_in_is_still_required(api, url):
    assert api.get(url).status_code == 401


@pytest.mark.free_community
@pytest.mark.parametrize('url', READS)
def test_anyone_logged_in_can_read(api, anyone, url):
    assert api.get(url, user=anyone).status_code == 200


@pytest.mark.free_community
def test_anyone_can_take_part_in_the_forum(api, anyone, hosted):
    assert api.get(f'/api/forum/categories/{hosted.category}', user=anyone).status_code == 200
    assert api.get(f'/api/forum/threads/{hosted.thread}', user=anyone).status_code == 200
    assert api.post(f'/api/forum/threads/{hosted.thread}/posts', user=anyone,
                    json={'content': 'Block your week by topic.'}).status_code == 201
    res = api.post(f'/api/forum/categories/{hosted.category}/threads', user=anyone,
                   json={'title': 'Past papers?', 'content': 'Where do you find them?'})
    assert res.status_code == 201
    assert api.delete(f"/api/forum/threads/{res.get_json()['thread']['id']}", user=anyone).status_code == 200


@pytest.mark.free_community
def test_anyone_can_share_and_download_notes(api, anyone):
    res = api.post('/api/study-notes', user=anyone, content_type='multipart/form-data', data={
        'title': 'Integration cheat sheet', 'subject': 'Mathematics',
        'file': (io.BytesIO(b'u-substitution first'), 'integration.txt')})
    assert res.status_code == 201
    note_id = res.get_json()['note']['id']
    download = api.get(f'/api/study-notes/{note_id}/file', user=anyone)
    assert (download.status_code, download.data) == (200, b'u-substitution first')
    assert api.delete(f'/api/study-notes/{note_id}', user=anyone).status_code == 200


@pytest.mark.free_community
def test_anyone_can_join_study_rooms_and_classes(api, anyone, hosted):
    assert api.post(f'/api/study-rooms/{hosted.room}/calendar', user=anyone).status_code == 200
    assert api.post(f'/api/classrooms/{hosted.klass}/enroll', user=anyone).status_code == 200
    enrolled = {c['id']: c['enrolled'] for c in api.get('/api/classrooms', user=anyone).get_json()['classrooms']}
    assert enrolled[hosted.klass] is True
    assert api.delete(f'/api/classrooms/{hosted.klass}/enroll', user=anyone).status_code == 200


def test_only_verified_tutors_host(api, make):
    """Taking part is free; hosting stays with verified tutors."""
    maya, pete = make.user('Maya Patel'), make.tutor('Pete Pending', status='pending')
    room = {'subject': 'Drop-in', 'start_time': iso(local(3, hour=19)), 'end_time': iso(local(3, hour=20)),
            'zoom_link': 'https://zoom.us/j/1'}
    klass = {'title': 'Mechanics', 'start_time': iso(local(3, hour=18)), 'end_time': iso(local(3, hour=19)),
             'zoom_link': 'https://zoom.us/j/2'}
    for person in (maya, pete):
        assert api.post('/api/study-rooms', user=person, json=room).status_code == 403
        assert api.post('/api/classrooms', user=person, json=klass).status_code == 403
