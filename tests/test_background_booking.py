"""Families can only book tutors with a verified, in-date background (DBS) check."""
from tests.support import iso, local


def book(api, student, tutor, **extra):
    start = local(3)
    return api.post('/api/events', user=student, json={
        'tutor_id': tutor.tutor_id, 'start_time': iso(start), 'end_time': iso(local(3, hour=18)),
        **extra,
    })


def test_a_tutor_without_a_check_cannot_be_booked(api, make):
    maya = make.user('Maya Patel')
    oliver = make.tutor(dbs=False)
    make.connect(maya, oliver)
    res = book(api, maya, oliver)
    assert res.status_code == 403
    assert res.get_json()['code'] == 'dbs_required'


def test_a_tutor_with_a_verified_check_can_be_booked(api, make):
    maya = make.user('Maya Patel')
    oliver = make.tutor()
    make.connect(maya, oliver)
    assert book(api, maya, oliver).status_code == 201


def test_a_tutor_without_a_check_cannot_schedule_students(api, make):
    maya = make.user('Maya Patel')
    oliver = make.tutor(dbs=False)
    make.connect(maya, oliver)
    start = local(3)
    res = api.post('/api/events', user=oliver, json={
        'student_id': maya.student_id, 'start_time': iso(start), 'end_time': iso(local(3, hour=18)),
    })
    assert res.status_code == 403
    assert res.get_json()['code'] == 'dbs_required'


def test_listings_show_who_is_checked(api, make):
    maya = make.user('Maya Patel')
    checked = make.tutor('Oliver Grant')
    make.tutor('Sam Lee', dbs=False)
    tutors = {t['name']: t for t in api.get('/api/tutors', user=maya).get_json()['tutors']}
    assert tutors['Oliver Grant']['dbs_verified'] is True
    assert tutors['Sam Lee']['dbs_verified'] is False
    assert api.get(f'/api/tutors/{checked.tutor_id}', user=maya).get_json()['tutor']['dbs_verified'] is True
