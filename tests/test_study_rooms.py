"""Study rooms: verified tutors host them, members save them to their calendar.

A saved room becomes a free (£0) 'confirmed' event titled "Study Room: <subject>" in the
member's calendar. Those copies currently leak into places meant for paid 1-to-1 sessions;
the xfail tests below pin that down.
"""
import pytest

from tests.support import iso, local

ROOM_COPY_BUG = 'Study-room calendar copies are treated as 1-to-1 sessions — see docs/QA-FINDINGS.md'


def host(api, tutor, days=3, **changes):
    room = {'subject': 'A-level Maths drop-in', 'description': 'Bring any question.',
            'start_time': iso(local(days, hour=19)), 'end_time': iso(local(days, hour=20, minute=30)),
            'zoom_link': 'https://zoom.us/j/123', **changes}
    return api.post('/api/study-rooms', user=tutor, json=room)


def past_room(db, tutor):
    """Rooms can't be created in the past through the API, so insert one directly."""
    return db.run(
        """INSERT INTO study_rooms (tutor_id, subject, start_time, end_time, zoom_link)
           VALUES (%s, 'Mechanics clinic', %s, %s, 'https://zoom.us/j/9')""",
        (tutor.tutor_id, local(-2, hour=19), local(-2, hour=20)),
    )


@pytest.fixture
def people(make):
    return make.member('Maya Patel'), make.tutor('Oliver Grant')


def test_host_list_and_save_to_calendar(api, db, people):
    maya, oliver = people
    res = host(api, oliver)
    assert res.status_code == 201
    room_id = res.get_json()['room']['id']

    rooms = api.get('/api/study-rooms', user=maya).get_json()['rooms']
    assert [(r['id'], r['tutor_name'], r['creator_user_id'], r['in_calendar']) for r in rooms] == [
        (room_id, 'Oliver Grant', oliver.id, False)]

    res = api.post(f'/api/study-rooms/{room_id}/calendar', user=maya)
    assert res.get_json() == {'message': 'Added to calendar', 'already_saved': False}
    assert api.get('/api/study-rooms', user=maya).get_json()['rooms'][0]['in_calendar'] is True

    res = api.post(f'/api/study-rooms/{room_id}/calendar', user=maya)
    assert res.get_json()['already_saved'] is True
    assert db.one('SELECT title, status, amount FROM events') == {
        'title': 'Study Room: A-level Maths drop-in', 'status': 'confirmed', 'amount': 0}


@pytest.mark.parametrize('changes', [
    {'subject': '  '},
    {'start_time': 'soon'},
    {'end_time': iso(local(3, hour=18))},                                   # ends before it starts
    {'start_time': iso(local(-1, hour=19)), 'end_time': iso(local(-1, hour=20))},
    {'zoom_link': 'zoom.us/j/1'},
    {'zoom_link': 'javascript:alert(1)'},
])
def test_room_validation(api, people, changes):
    _, oliver = people
    assert host(api, oliver, **changes).status_code == 400


def test_unknown_room(api, people):
    maya, _ = people
    assert api.post('/api/study-rooms/999/calendar', user=maya).status_code == 404


@pytest.mark.xfail(strict=True, reason=ROOM_COPY_BUG)
def test_room_copies_are_not_earnings(api, people):
    maya, oliver = people
    room_id = host(api, oliver).get_json()['room']['id']
    api.post(f'/api/study-rooms/{room_id}/calendar', user=maya)
    assert api.get('/api/payments?role=tutor', user=oliver).get_json()['events'] == []


@pytest.mark.xfail(strict=True, reason=ROOM_COPY_BUG)
def test_room_copies_are_not_sessions_taught(api, db, people):
    maya, oliver = people
    api.post(f'/api/study-rooms/{past_room(db, oliver)}/calendar', user=maya)
    assert api.get(f'/api/tutors/{oliver.tutor_id}', user=maya).get_json()['tutor']['sessions_done'] == 0


@pytest.mark.xfail(strict=True, reason=ROOM_COPY_BUG)
def test_room_copies_cannot_be_reviewed(api, db, people):
    maya, oliver = people
    api.post(f'/api/study-rooms/{past_room(db, oliver)}/calendar', user=maya)
    event_id = db.value('SELECT id_event FROM events')
    assert api.post(f'/api/events/{event_id}/review', user=maya, json={'rating': 5}).status_code == 400
