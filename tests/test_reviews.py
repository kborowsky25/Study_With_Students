"""Reviews: the student rates a tutor once per session that has happened."""
from unittest.mock import ANY

import pytest

from tests.support import local


def review(api, user, event_id, rating=5, comment='Clear, patient and quick.'):
    return api.post(f'/api/events/{event_id}/review', user=user, json={'rating': rating, 'comment': comment})


@pytest.fixture
def people(make):
    maya, oliver = make.user('Maya Patel'), make.tutor('Oliver Grant')
    make.connect(maya, oliver)
    return maya, oliver, make.user('Sam Lee')


@pytest.fixture
def paid(make, people):
    maya, oliver, _ = people
    return make.session(maya, oliver, start=local(-3), status='paid')


def test_student_reviews_a_paid_session(api, db, people, paid):
    maya, oliver, _ = people
    res = review(api, maya, paid, 5, '  Integration by parts finally clicked.  ')
    assert res.status_code == 201
    assert res.get_json()['review'] == {'id': ANY, 'rating': 5, 'comment': 'Integration by parts finally clicked.'}
    assert db.one('SELECT tutor_id, student_user_id FROM reviews') == {
        'tutor_id': oliver.tutor_id, 'student_user_id': maya.id}

    events = api.get('/api/events', user=maya).get_json()['events']
    assert [e['my_rating'] for e in events] == [5]


def test_past_confirmed_sessions_can_be_reviewed(api, make, people):
    maya, oliver, _ = people
    event_id = make.session(maya, oliver, start=local(-1), status='confirmed')
    assert review(api, maya, event_id, 4).status_code == 201


def test_one_review_per_session(api, people, paid):
    maya, _, _ = people
    assert review(api, maya, paid).status_code == 201
    res = review(api, maya, paid, 1)
    assert res.status_code == 409


@pytest.mark.parametrize('who', ['tutor', 'outsider'])
def test_only_the_student_reviews(api, people, paid, who):
    maya, oliver, sam = people
    assert review(api, oliver if who == 'tutor' else sam, paid).status_code == 403


@pytest.mark.parametrize(('days', 'status'), [
    (2, 'confirmed'),     # hasn't happened yet
    (2, 'pending'),
    (-2, 'pending'),      # the tutor never confirmed it
    (-2, 'canceled'),
    pytest.param(2, 'paid', marks=pytest.mark.xfail(
        strict=True, reason='A session paid in advance can be reviewed before it happens — see docs/QA-FINDINGS.md')),
])
def test_only_sessions_that_happened(api, db, make, people, days, status):
    maya, oliver, _ = people
    event_id = make.session(maya, oliver, start=local(days), status=status)
    res = review(api, maya, event_id)
    assert res.status_code == 400
    assert db.value('SELECT COUNT(*) FROM reviews') == 0


@pytest.mark.parametrize('rating', [0, 6, -1, 'five', None])
def test_rating_is_one_to_five(api, people, paid, rating):
    maya, _, _ = people
    assert review(api, maya, paid, rating).status_code == 400


def test_comment_is_optional_and_capped(api, db, make, people, paid):
    maya, oliver, _ = people
    assert review(api, maya, paid, 5, '   ').get_json()['review']['comment'] is None
    second = make.session(maya, oliver, start=local(-5), status='paid')
    assert len(review(api, maya, second, 5, 'x' * 1500).get_json()['review']['comment']) == 1000


def test_unknown_session(api, people):
    maya, _, _ = people
    assert review(api, maya, 999).status_code == 404


def test_tutor_reviews_show_first_name_and_initial(api, make, people, paid):
    maya, oliver, sam = people
    cher = make.user('Cher')
    make.connect(cher, oliver)
    review(api, maya, paid, 5)
    review(api, cher, make.session(cher, oliver, start=local(-1), status='paid'), 3)

    body = api.get(f'/api/tutors/{oliver.tutor_id}/reviews', user=sam).get_json()
    assert (body['average'], body['count']) == (4.0, 2)
    assert sorted(r['student_name'] for r in body['reviews']) == ['Cher', 'Maya P.']
    assert {r['session_title'] for r in body['reviews']} == {'Integration by parts'}

    tutor = api.get(f'/api/tutors/{oliver.tutor_id}', user=sam).get_json()['tutor']
    assert (tutor['rating'], tutor['review_count'], tutor['sessions_done']) == (4.0, 2, 2)


def test_tutor_without_reviews(api, people):
    _, oliver, sam = people
    assert api.get(f'/api/tutors/{oliver.tutor_id}/reviews', user=sam).get_json() == {
        'reviews': [], 'average': None, 'count': 0}
