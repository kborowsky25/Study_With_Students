"""Sample tutors (server/samples.py): labelled example profiles an admin adds or removes at once.
They show on the site, marked as samples, but nobody can request, book or message them, they
are never recommended, and the sitemap leaves them out."""
import pytest

from server.samples import SAMPLE_DOMAIN, SAMPLE_TUTORS
from tests.support import ADMIN_EMAIL


@pytest.fixture
def admin(make):
    return make.user('Ada Admin', email=ADMIN_EMAIL)


@pytest.fixture
def samples(api, admin):
    res = api.post('/api/admin/samples', user=admin)
    assert res.status_code == 200, res.get_json()
    return res.get_json()


def sample_tutor_id(db):
    return db.value("""SELECT tp.id_tutor FROM tutor_profiles tp JOIN users u ON u.id_user = tp.id_user
                       WHERE u.is_sample = 1 ORDER BY tp.id_tutor LIMIT 1""")


def test_only_admins_manage_samples(api, make):
    maya = make.user('Maya Patel')
    for method in (api.get, api.post, api.delete):
        assert method('/api/admin/samples', user=maya).status_code == 403


def test_adding_twice_adds_them_once(api, db, admin, samples):
    assert samples == {'changed': len(SAMPLE_TUTORS), 'live': len(SAMPLE_TUTORS), 'total': len(SAMPLE_TUTORS)}
    again = api.post('/api/admin/samples', user=admin).get_json()
    assert (again['changed'], again['live']) == (0, len(SAMPLE_TUTORS))
    assert db.value('SELECT COUNT(*) FROM users WHERE email LIKE %s', (f'%@{SAMPLE_DOMAIN}',)) == len(SAMPLE_TUTORS)


def test_samples_are_labelled_and_never_verified(api, samples):
    tutors = api.get('/api/public/tutors').get_json()['tutors']
    assert len(tutors) == len(SAMPLE_TUTORS)
    assert all(t['sample'] and not t['verified'] for t in tutors)


def test_samples_cannot_be_requested_or_recommended(api, db, make, samples):
    maya = make.user('Maya Patel')
    db.run("UPDATE student_profiles SET subjects = 'Mathematics' WHERE id_user = %s", (maya.id,))
    res = api.post(f'/api/tutors/{sample_tutor_id(db)}/request', user=maya)
    assert res.status_code == 400
    assert api.get('/api/tutors/recommended', user=maya).get_json()['tutors'] == []
    listed = api.get('/api/tutors', user=maya).get_json()['tutors']
    assert listed and all(t['sample'] for t in listed)


def test_the_sitemap_leaves_samples_out(api, make, db, samples):
    oliver = make.tutor('Oliver Grant', subjects='Physics')
    db.run('UPDATE tutor_profiles SET about_me = %s WHERE id_tutor = %s',
           ('Physics student at UCL who loves mechanics and making it click.', oliver.tutor_id))
    xml = api.get('/api/public/sitemap.xml').get_data(as_text=True)
    assert f'/tutors/{oliver.tutor_id}-oliver-g<' in xml
    assert '/subjects/physics<' in xml
    assert 'amelia-h' not in xml and '/subjects/economics<' not in xml   # samples only


def test_removing_takes_everything_away(api, db, make, admin, samples):
    maya = make.user('Maya Patel')
    api.post(f'/api/tutors/{sample_tutor_id(db)}/like', user=maya)
    res = api.delete('/api/admin/samples', user=admin).get_json()
    assert (res['changed'], res['live']) == (len(SAMPLE_TUTORS), 0)
    assert db.value('SELECT COUNT(*) FROM users WHERE is_sample = 1') == 0
    assert db.value('SELECT COUNT(*) FROM tutor_profiles') == 0
    assert db.value('SELECT COUNT(*) FROM liked_tutors') == 0
