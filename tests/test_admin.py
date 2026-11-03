"""Tutor screening (uni email → proof → review) and the admin endpoints that review it."""
import io
import os

import pytest

from server.config import Config
from tests.support import ADMIN_EMAIL, ADMIN_SECRET, iso, local

SECRET = {'X-Admin-Secret': ADMIN_SECRET}


@pytest.fixture
def admin(make):
    return make.user('Ada Admin', email=ADMIN_EMAIL)


def upload(api, user, name='enrolment.pdf', content=b'%PDF-1.4 proof of enrolment'):
    return api.post('/api/tutor-screening/upload-proof', user=user,
                    data={'proof': (io.BytesIO(content), name)}, content_type='multipart/form-data')


# ── Tutor side ────────────────────────────────────────────────────────────────

class TestScreening:
    def test_uni_email_then_proof_then_review(self, api, db, make, admin):
        oliver = make.tutor(status='none')

        # Proof can only follow a verified university email
        assert upload(api, oliver).status_code == 400

        res = api.post('/api/tutor-screening/send-uni-code', user=oliver, json={'uni_email': 'Oliver@UCL.ac.uk'})
        assert res.status_code == 200
        assert 'dev_code' not in res.get_json()
        code = db.value("SELECT code FROM email_verifications WHERE email = 'oliver@ucl.ac.uk'")

        bad = '000000' if code != '000000' else '111111'
        verify = '/api/tutor-screening/verify-uni-email'
        assert api.post(verify, user=oliver, json={'uni_email': 'oliver@ucl.ac.uk', 'code': bad}).status_code == 400
        assert api.post(verify, user=oliver, json={'uni_email': 'oliver@ucl.ac.uk', 'code': code}).status_code == 200
        assert api.post(verify, user=oliver, json={'uni_email': 'oliver@ucl.ac.uk', 'code': code}).status_code == 400

        assert upload(api, oliver).status_code == 200
        status = api.get('/api/tutor-screening/status', user=oliver).get_json()
        assert (status['screening_status'], status['uni_email'], status['uni_email_verified']) == (
            'pending', 'oliver@ucl.ac.uk', 1)

        # Only admins can open the proof
        proof = db.value('SELECT proof_doc_path FROM tutor_profiles WHERE id_tutor = %s', (oliver.tutor_id,))
        assert api.get(f'/api/uploads/tutor-proofs/{proof}', user=oliver).status_code == 403
        res = api.get(f'/api/uploads/tutor-proofs/{proof}', user=admin)
        assert res.status_code == 200
        assert res.data == b'%PDF-1.4 proof of enrolment'
        res.close()

    @pytest.mark.parametrize('name', ['proof.exe', 'proof', 'proof.pdf.html'])
    def test_proof_file_types(self, api, db, make, name):
        oliver = make.tutor(status='none')
        db.run('UPDATE tutor_profiles SET uni_email_verified = 1 WHERE id_tutor = %s', (oliver.tutor_id,))
        assert upload(api, oliver, name=name).status_code == 400

    def test_proof_size_limit(self, api, db, make):
        oliver = make.tutor(status='none')
        db.run('UPDATE tutor_profiles SET uni_email_verified = 1 WHERE id_tutor = %s', (oliver.tutor_id,))
        assert upload(api, oliver, content=b'x' * (10 * 1024 * 1024 + 1)).status_code == 400

    @pytest.mark.parametrize('uni_email, ok', [
        ('oliver@ucl.ac.uk', True),
        ('o.grant@student.manchester.ac.uk', True),
        ('kilian@gmail.com', False),
        ('oliver@ac.uk', False),
        ('oliver@ucl.ac.uk.example.com', False),
        ('oliver@harvard.edu', False),
    ])
    def test_only_uk_university_addresses(self, api, db, make, uni_email, ok):
        oliver = make.tutor(status='none')
        res = api.post('/api/tutor-screening/send-uni-code', user=oliver, json={'uni_email': uni_email})
        assert res.status_code == (200 if ok else 400), res.get_json()
        assert db.value('SELECT COUNT(*) FROM email_verifications') == (1 if ok else 0)

    def test_needs_a_tutor_profile(self, api, make):
        maya = make.user()
        assert api.post('/api/tutor-screening/send-uni-code', user=maya,
                        json={'uni_email': 'maya@ucl.ac.uk'}).status_code == 400
        assert api.get('/api/tutor-screening/status', user=maya).status_code == 404


@pytest.mark.parametrize('folder', ['tutor-avatars', 'tutor-proofs'])
def test_uploads_cannot_escape_their_folder(api, admin, folder):
    with open(os.path.join(Config.UPLOAD_ROOT, 'secret.txt'), 'w') as fh:
        fh.write('not for the web')
    for path in ('../secret.txt', '%2e%2e/secret.txt', '..%2fsecret.txt'):
        res = api.get(f'/api/uploads/{folder}/{path}', user=admin)
        assert res.status_code == 404, path
        res.close()


# ── Admin side ────────────────────────────────────────────────────────────────

class TestAdminAccess:
    @pytest.mark.parametrize('url', ['/api/admin/screening-queue', '/api/admin/stats', '/api/admin/users',
                                     '/api/admin/recent-events'])
    def test_refused_without_admin_rights(self, api, make, url):
        maya = make.user()
        assert api.get(url).status_code == 403
        assert api.get(url, user=maya).status_code == 403
        assert api.get(url, headers={'X-Admin-Secret': 'wrong'}).status_code == 403

    @pytest.mark.parametrize('url', ['/api/admin/screening-queue', '/api/admin/stats', '/api/admin/users',
                                     '/api/admin/recent-events'])
    def test_super_admin_account_or_secret_header(self, api, admin, url):
        assert api.get(url, user=admin).status_code == 200
        assert api.get(url, headers=SECRET).status_code == 200


class TestReview:
    def test_queue(self, api, make, admin):
        make.tutor('Oliver Grant', status='pending')
        make.tutor('Priya Shah', status='approved')
        queue = api.get('/api/admin/screening-queue', user=admin).get_json()['queue']
        assert {(t['name'], t['screening_status']) for t in queue} == {('Oliver Grant', 'pending'),
                                                                      ('Priya Shah', 'approved')}

    def test_approving_unlocks_the_tutor_tools(self, api, db, make, admin):
        oliver = make.tutor(status='pending')
        db.run("UPDATE tutor_profiles SET screening_notes = 'Blurry scan' WHERE id_tutor = %s", (oliver.tutor_id,))
        room = {'subject': 'A-level Maths drop-in', 'start_time': iso(local(3, hour=19)),
                'end_time': iso(local(3, hour=20)), 'zoom_link': 'https://zoom.us/j/123'}
        assert api.post('/api/study-rooms', user=oliver, json=room).status_code == 403

        assert api.post(f'/api/admin/screening/{oliver.tutor_id}/approve', user=admin).status_code == 200
        assert db.one('SELECT screening_status, screening_notes FROM tutor_profiles') == {
            'screening_status': 'approved', 'screening_notes': None}
        assert api.post('/api/study-rooms', user=oliver, json=room).status_code == 201
        assert api.post('/api/auth/refresh', user=oliver).get_json()['user']['screening_status'] == 'approved'

    def test_rejecting_tells_the_tutor_why(self, api, make, admin):
        oliver = make.tutor(status='pending')
        res = api.post(f'/api/admin/screening/{oliver.tutor_id}/reject', user=admin,
                       json={'notes': '  The document has expired.  '})
        assert res.status_code == 200
        status = api.get('/api/tutor-screening/status', user=oliver).get_json()
        assert (status['screening_status'], status['screening_notes']) == ('rejected', 'The document has expired.')

    @pytest.mark.parametrize('action', ['approve', 'reject'])
    def test_unknown_tutor(self, api, admin, action):
        assert api.post(f'/api/admin/screening/999/{action}', user=admin).status_code == 404

    def test_stats(self, api, make, admin):
        maya, oliver = make.user('Maya Patel'), make.tutor('Oliver Grant')
        make.user('Sam Lee')
        make.tutor('Pete Pending', status='pending')
        make.session(maya, oliver, status='paid')
        make.session(maya, oliver, status='confirmed')
        make.session(maya, oliver, status='canceled')

        stats = api.get('/api/admin/stats', user=admin).get_json()['stats']
        assert {k: stats[k] for k in ('total_users', 'total_tutors', 'pending_screenings', 'approved_tutors',
                                       'total_sessions', 'completed_sessions')} == {
            'total_users': 5, 'total_tutors': 2, 'pending_screenings': 1, 'approved_tutors': 1,
            'total_sessions': 2, 'completed_sessions': 1,
        }
        assert sum(day['signups'] for day in stats['signups_last_30d']) == 5

    def test_user_list_never_exposes_passwords(self, api, make, admin):
        make.tutor('Oliver Grant')
        users = api.get('/api/admin/users', user=admin).get_json()['users']
        assert all('password' not in u for u in users)
        assert {(u['name'], u['is_tutor']) for u in users} == {('Oliver Grant', True), ('Ada Admin', False)}

    def test_recent_events(self, api, make, admin):
        maya, oliver = make.user('Maya Patel'), make.tutor('Oliver Grant')
        make.session(maya, oliver, status='confirmed')
        events = api.get('/api/admin/recent-events', user=admin).get_json()['events']
        assert [(e['student_name'], e['tutor_name'], e['status']) for e in events] == [
            ('Maya Patel', 'Oliver Grant', 'confirmed')]
