"""Session lifecycle and its permissions.

request tutor → tutor accepts (active_tutors + active_students) → student books (pending,
amount = hourly_rate × hours) → tutor confirms (confirmed, video link) → paid via Stripe.
Either side can cancel; only the tutor confirms; paid sessions are locked.
"""
from datetime import timedelta

import pytest

from tests.support import iso, local


def book(api, student, tutor, start=None, hours=1, **extra):
    start = start or local(2)
    return api.post('/api/events', user=student, json={
        'tutor_id': tutor.tutor_id, 'start_time': iso(start), 'end_time': iso(start + timedelta(hours=hours)), **extra,
    })


def set_status(api, user, event_id, status):
    return api.put(f'/api/events/{event_id}/status', user=user, json={'status': status})


def event_status(db, event_id):
    return db.value('SELECT status FROM events WHERE id_event = %s', (event_id,))


@pytest.fixture
def people(make):
    """Maya (student), Oliver (verified tutor, £22/hr) and Sam, who has nothing to do with them."""
    return make.user('Maya Patel'), make.tutor('Oliver Grant', rate=22), make.user('Sam Outsider')


@pytest.fixture
def connected(make, people):
    maya, oliver, sam = people
    make.connect(maya, oliver)
    return people


# ── The whole flow ────────────────────────────────────────────────────────────

def test_request_accept_book_confirm_cancel(api, db, people):
    maya, oliver, sam = people

    # Maya asks Oliver to be her tutor
    res = api.post(f'/api/tutors/{oliver.tutor_id}/request', user=maya)
    assert res.status_code == 200
    request_id = res.get_json()['request_id']
    assert api.post(f'/api/tutors/{oliver.tutor_id}/request', user=maya).status_code == 409

    sent = api.get('/api/tutor-requests/sent', user=maya).get_json()['requests']
    assert [(r['tutor_id'], r['status']) for r in sent] == [(oliver.tutor_id, 'pending')]
    received = api.get('/api/tutor-requests/received', user=oliver).get_json()['requests']
    assert [(r['id'], r['student_name']) for r in received] == [(request_id, 'Maya Patel')]

    # She can't book until he accepts
    assert book(api, maya, oliver).status_code == 403

    res = api.patch(f'/api/tutor-requests/{request_id}', user=oliver, json={'action': 'accepted'})
    assert res.status_code == 200
    assert db.value('SELECT COUNT(*) FROM active_tutors WHERE id_user = %s AND id_tutor = %s',
                    (maya.id, oliver.tutor_id)) == 1
    assert db.value('SELECT COUNT(*) FROM active_students WHERE id_tutor = %s AND id_student = %s',
                    (oliver.tutor_id, maya.student_id)) == 1
    assert [t['id_tutor'] for t in api.get('/api/active-tutors', user=maya).get_json()['tutors']] == [oliver.tutor_id]
    assert [s['user_id'] for s in api.get('/api/active-students', user=oliver).get_json()['students']] == [maya.id]
    assert api.get('/api/tutor-requests/received', user=oliver).get_json()['requests'] == []

    # A 90-minute session at £22/hr
    res = book(api, maya, oliver, hours=1.5, title='Mechanics: projectiles')
    assert res.status_code == 201
    event = res.get_json()['event']
    assert event['status'] == 'pending'
    assert event['amount'] == 33.0
    assert event['meeting_url'] is None
    assert (event['tutor_name'], event['student_name']) == ('Oliver Grant', 'Maya Patel')
    event_id = event['id_event']

    # Only the tutor confirms
    assert set_status(api, maya, event_id, 'confirmed').status_code == 403
    assert set_status(api, sam, event_id, 'confirmed').status_code == 403
    assert set_status(api, sam, event_id, 'canceled').status_code == 403
    assert event_status(db, event_id) == 'pending'

    res = set_status(api, oliver, event_id, 'confirmed')
    assert res.status_code == 200
    confirmed = res.get_json()['event']
    assert confirmed['status'] == 'confirmed'
    assert confirmed['meeting_url'].startswith(f'https://meet.jit.si/StudyWithStudents-{event_id}-')

    # Both see it, each in their own role; Sam sees nothing
    assert [(e['id_event'], e['role']) for e in api.get('/api/events', user=maya).get_json()['events']] == [
        (event_id, 'student')]
    assert [(e['id_event'], e['role']) for e in api.get('/api/events', user=oliver).get_json()['events']] == [
        (event_id, 'tutor')]
    assert api.get('/api/events', user=sam).get_json()['events'] == []

    # Either side can cancel
    assert set_status(api, maya, event_id, 'canceled').status_code == 200
    assert event_status(db, event_id) == 'canceled'


@pytest.mark.parametrize('who', ['student', 'tutor'])
def test_either_side_can_cancel_a_confirmed_session(api, db, make, connected, who):
    maya, oliver, _ = connected
    event_id = make.session(maya, oliver, status='confirmed')
    assert set_status(api, maya if who == 'student' else oliver, event_id, 'canceled').status_code == 200
    assert event_status(db, event_id) == 'canceled'


@pytest.mark.parametrize(('who', 'status'), [('student', 'canceled'), ('tutor', 'canceled'), ('tutor', 'confirmed')])
def test_paid_sessions_are_locked(api, db, make, connected, who, status):
    maya, oliver, _ = connected
    event_id = make.session(maya, oliver, status='paid')
    res = set_status(api, maya if who == 'student' else oliver, event_id, status)
    assert res.status_code == 400
    assert event_status(db, event_id) == 'paid'


@pytest.mark.parametrize('status', ['paid', 'pending', 'bogus', None])
def test_status_can_only_be_set_to_confirmed_or_canceled(api, make, connected, status):
    """'paid' is only ever set by a verified Stripe checkout."""
    maya, oliver, _ = connected
    event_id = make.session(maya, oliver)
    assert set_status(api, oliver, event_id, status).status_code == 400


def test_unknown_session(api, people):
    _, oliver, _ = people
    assert set_status(api, oliver, 999, 'canceled').status_code == 404


def test_confirming_keeps_a_custom_meeting_link(api, make, connected):
    maya, oliver, _ = connected
    event_id = make.session(maya, oliver, meeting_url='https://zoom.us/j/123')
    assert set_status(api, oliver, event_id, 'confirmed').get_json()['event']['meeting_url'] == 'https://zoom.us/j/123'


def test_a_cancelled_session_cannot_be_revived(api, db, make, connected):
    maya, oliver, _ = connected
    event_id = make.session(maya, oliver, status='canceled')
    assert set_status(api, oliver, event_id, 'confirmed').status_code == 400
    assert event_status(db, event_id) == 'canceled'


# ── Booking rules ─────────────────────────────────────────────────────────────

def test_booking_needs_an_accepted_request(api, people):
    maya, oliver, _ = people
    res = book(api, maya, oliver)
    assert res.status_code == 403
    assert 'request' in res.get_json()['error']


def test_booking_in_the_past(api, connected):
    maya, oliver, _ = connected
    assert book(api, maya, oliver, start=local(-1)).status_code == 400


@pytest.mark.parametrize(('start', 'end'), [
    (iso(local(2)), iso(local(2))),                    # zero length
    (iso(local(2, hour=18)), iso(local(2, hour=17))),  # ends before it starts
    ('tomorrow', 'later'),
    (None, None),
])
def test_booking_needs_a_valid_time_range(api, connected, start, end):
    maya, oliver, _ = connected
    res = api.post('/api/events', user=maya, json={'tutor_id': oliver.tutor_id, 'start_time': start, 'end_time': end})
    assert res.status_code == 400


def test_cannot_book_yourself(api, make):
    oliver = make.tutor()
    res = book(api, oliver, oliver)
    assert res.status_code == 400
    assert "yourself" in res.get_json()['error']


def test_unknown_tutor(api, people):
    maya, _, _ = people
    res = api.post('/api/events', user=maya, json={
        'tutor_id': 999, 'start_time': iso(local(2)), 'end_time': iso(local(2, hour=18)),
    })
    assert res.status_code == 404


def test_needs_a_tutor_or_a_student(api, people):
    maya, _, _ = people
    res = api.post('/api/events', user=maya, json={'start_time': iso(local(2)), 'end_time': iso(local(2, hour=18))})
    assert res.status_code == 400


def test_title_defaults(api, connected):
    maya, oliver, _ = connected
    assert book(api, maya, oliver, title='   ').get_json()['event']['title'] == 'Tutoring session'


def test_tutor_schedules_their_own_student(api, connected):
    maya, oliver, _ = connected
    start = local(3)
    res = api.post('/api/events', user=oliver, json={
        'student_id': maya.student_id, 'start_time': iso(start), 'end_time': iso(start + timedelta(hours=2)),
    })
    assert res.status_code == 201
    event = res.get_json()['event']
    assert event['status'] == 'confirmed'      # the tutor proposed it, so it needs no confirming
    assert event['amount'] == 44.0
    assert event['meeting_url'].startswith('https://meet.jit.si/')
    assert event['student_user_id'] == maya.id


def test_tutor_cannot_schedule_someone_elses_student(api, people):
    _, oliver, sam = people
    res = api.post('/api/events', user=oliver, json={
        'student_id': sam.student_id, 'start_time': iso(local(2)), 'end_time': iso(local(2, hour=18)),
    })
    assert res.status_code == 403


def test_only_tutors_schedule_students(api, connected):
    maya, _, sam = connected
    res = api.post('/api/events', user=sam, json={
        'student_id': maya.student_id, 'start_time': iso(local(2)), 'end_time': iso(local(2, hour=18)),
    })
    assert res.status_code == 403


# ── Meeting links ─────────────────────────────────────────────────────────────

class TestMeetingLink:
    def test_tutor_sets_their_own_link(self, api, make, connected):
        maya, oliver, _ = connected
        event_id = make.session(maya, oliver, status='confirmed')
        res = api.put(f'/api/events/{event_id}/meeting', user=oliver, json={'meeting_url': 'https://zoom.us/j/42'})
        assert res.status_code == 200
        assert res.get_json()['event']['meeting_url'] == 'https://zoom.us/j/42'

    def test_clearing_it_generates_a_new_room(self, api, make, connected):
        maya, oliver, _ = connected
        event_id = make.session(maya, oliver, status='confirmed', meeting_url='https://zoom.us/j/42')
        res = api.put(f'/api/events/{event_id}/meeting', user=oliver, json={'meeting_url': ''})
        assert res.get_json()['event']['meeting_url'].startswith('https://meet.jit.si/')

    @pytest.mark.parametrize('url', ['zoom.us/j/1', 'ftp://files.example.com', 'javascript:alert(1)',
                                     'https://' + 'x' * 500])
    def test_must_be_a_web_link(self, api, make, connected, url):
        maya, oliver, _ = connected
        event_id = make.session(maya, oliver, status='confirmed')
        assert api.put(f'/api/events/{event_id}/meeting', user=oliver, json={'meeting_url': url}).status_code == 400

    @pytest.mark.parametrize('who', ['student', 'outsider'])
    def test_only_the_tutor(self, api, make, connected, who):
        maya, oliver, sam = connected
        event_id = make.session(maya, oliver, status='confirmed')
        user = maya if who == 'student' else sam
        res = api.put(f'/api/events/{event_id}/meeting', user=user, json={'meeting_url': 'https://zoom.us/j/1'})
        assert res.status_code == 403


# ── Tutor requests ────────────────────────────────────────────────────────────

class TestTutorRequests:
    def send(self, api, student, tutor):
        return api.post(f'/api/tutors/{tutor.tutor_id}/request', user=student)

    def test_declined_requests_can_be_sent_again(self, api, db, people):
        maya, oliver, _ = people
        request_id = self.send(api, maya, oliver).get_json()['request_id']
        res = api.patch(f'/api/tutor-requests/{request_id}', user=oliver, json={'action': 'declined'})
        assert res.status_code == 200
        assert db.value('SELECT COUNT(*) FROM active_tutors') == 0
        assert db.value('SELECT COUNT(*) FROM active_students') == 0

        res = self.send(api, maya, oliver)
        assert res.status_code == 200
        assert res.get_json()['message'] == 'Request re-sent'
        assert db.value('SELECT status FROM tutor_requests WHERE id = %s', (request_id,)) == 'pending'

    def test_cannot_request_an_active_tutor(self, api, connected):
        maya, oliver, _ = connected
        assert self.send(api, maya, oliver).status_code == 409

    def test_only_the_requested_tutor_can_answer(self, api, make, people):
        maya, oliver, _ = people
        other = make.tutor('Priya Shah')
        request_id = self.send(api, maya, oliver).get_json()['request_id']
        url = f'/api/tutor-requests/{request_id}'
        assert api.patch(url, user=other, json={'action': 'accepted'}).status_code == 404
        assert api.patch(url, user=maya, json={'action': 'accepted'}).status_code == 404

    def test_answering_twice(self, api, people):
        maya, oliver, _ = people
        request_id = self.send(api, maya, oliver).get_json()['request_id']
        url = f'/api/tutor-requests/{request_id}'
        assert api.patch(url, user=oliver, json={'action': 'accepted'}).status_code == 200
        assert api.patch(url, user=oliver, json={'action': 'declined'}).status_code == 404

    def test_action_must_be_accept_or_decline(self, api, people):
        maya, oliver, _ = people
        request_id = self.send(api, maya, oliver).get_json()['request_id']
        assert api.patch(f'/api/tutor-requests/{request_id}', user=oliver, json={'action': 'maybe'}).status_code == 400

    def test_student_ends_the_connection(self, api, db, connected):
        maya, oliver, _ = connected
        assert api.delete(f'/api/tutors/{oliver.tutor_id}/activate', user=maya).status_code == 200
        assert db.value('SELECT COUNT(*) FROM active_tutors') == 0
        assert db.value('SELECT COUNT(*) FROM active_students') == 0
        assert db.value('SELECT COUNT(*) FROM tutor_requests') == 0
        assert book(api, maya, oliver).status_code == 403

    def test_tutor_cannot_request_themselves(self, api, make):
        oliver = make.tutor()
        assert self.send(api, oliver, oliver).status_code == 400

    def test_unknown_tutor(self, api, db, people):
        maya, _, _ = people
        assert api.post('/api/tutors/999/request', user=maya).status_code == 404
        assert db.value('SELECT COUNT(*) FROM tutor_requests') == 0
