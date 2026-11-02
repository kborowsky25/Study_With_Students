"""Public tutor and subject pages: what anyone (logged out, crawlers) can read.

Every response is an allowlist: first name + initial, never emails, surnames, availability or
contact details, and reviews carry no reviewer name (many reviewers are school pupils).
"""
import pytest

ABOUT = 'Third-year maths student at UCL. I love turning "I don\'t get it" into "oh, that\'s it?".'


def publish(db, tutor, about=ABOUT):
    db.run('UPDATE tutor_profiles SET about_me = %s WHERE id_tutor = %s', (about, tutor.tutor_id))
    return tutor


@pytest.fixture
def oliver(make, db):
    return publish(db, make.tutor('Oliver Grant', email='oliver.grant@sws.test'))


def test_directory_lists_finished_profiles_only(api, make, db, oliver):
    make.tutor('Nadia Short')                                          # no bio yet
    publish(db, make.tutor('Rex Rejected', status='rejected'))
    publish(db, make.tutor('Ada Pending', status='pending', subjects='Chemistry'))

    data = api.get('/api/public/tutors').get_json()
    assert [(t['name'], t['verified']) for t in data['tutors']] == [('Oliver G.', True), ('Ada P.', False)]
    assert data['tutors'][0]['slug'] == f'{oliver.tutor_id}-oliver-g'
    assert data['total'] == 2 and data['verified_count'] == 1


def test_nothing_private_leaks(api, oliver):
    pages = [api.get('/api/public/tutors'), api.get(f'/api/public/tutors/{oliver.tutor_id}'),
             api.get('/api/public/subjects'), api.get('/api/public/sitemap.xml')]
    for res in pages:
        assert res.status_code == 200
        text = res.get_data(as_text=True)
        for private in ('Grant', 'oliver.grant@sws.test', 'Weekday evenings', 'screening', 'dbs'):
            assert private not in text, (res.request.path, private)


def test_contact_details_are_hidden(api, db, oliver):
    publish(db, oliver, 'Oliver Grant here: email oliver@example.com or call 07700 900123. '
                        'Sessions from 17:30, £22 an hour, see www.olivertutors.co.uk')
    about = api.get(f'/api/public/tutors/{oliver.tutor_id}').get_json()['tutor']['about']
    assert about == 'Oliver G. here: email [hidden] or call [hidden]. Sessions from 17:30, £22 an hour, see [hidden]'


def test_reviews_have_no_reviewer_name(api, make, db, oliver):
    maya = make.user('Maya Patel')
    event_id = make.session(maya, oliver, status='paid')
    db.run('INSERT INTO reviews (event_id, tutor_id, student_user_id, rating, comment) VALUES (%s, %s, %s, 5, %s)',
           (event_id, oliver.tutor_id, maya.id, 'Oliver Grant made integration finally click.'))
    tutor = api.get(f'/api/public/tutors/{oliver.tutor_id}').get_json()['tutor']
    assert [set(r) for r in tutor['reviews']] == [{'rating', 'comment', 'date'}]
    assert tutor['reviews'][0]['comment'] == 'Oliver G. made integration finally click.'
    assert (tutor['rating'], tutor['review_count']) == (5, 1)


def test_unlisted_and_unknown_tutors_look_the_same(api, make):
    unfinished = make.tutor('Nadia Short')
    assert api.get(f'/api/public/tutors/{unfinished.tutor_id}').status_code == 404
    assert api.get('/api/public/tutors/999999').status_code == 404


@pytest.mark.parametrize('subject, found', [
    ('mathematics', True), ('maths', True), ('a-level-physics', True), ('further-mathematics', True),
    ('ib-physics', False), ('chemistry', False),
])
def test_subject_filter(api, oliver, subject, found):
    data = api.get('/api/public/tutors', query_string={'subject': subject}).get_json()
    assert [t['id'] for t in data['tutors']] == ([oliver.tutor_id] if found else [])


def test_subjects_and_sitemap(api, oliver):
    subjects = {s['slug']: s for s in api.get('/api/public/subjects').get_json()['subjects']}
    assert set(subjects) == {'mathematics', 'further-mathematics', 'physics'}
    assert [lv['slug'] for lv in subjects['physics']['levels']] == ['gcse-physics', 'a-level-physics']

    for url in ('/api/public/sitemap.xml', '/sitemap.xml'):
        res = api.get(url)
        assert res.status_code == 200 and res.mimetype == 'application/xml'
        xml = res.get_data(as_text=True)
        assert f'/tutors/{oliver.tutor_id}-oliver-g</loc>' in xml
        assert '/subjects/a-level-physics</loc>' in xml


def test_public_pages_ignore_a_stale_login(api, oliver):
    """A returning visitor's expired token must not turn a public page into a 401."""
    res = api.client.get('/api/public/tutors', headers={'Authorization': 'Bearer expired.or.junk'})
    assert res.status_code == 200
    assert 's-maxage' in res.headers['Cache-Control']
