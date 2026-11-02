"""Report and block, and the admin queue for reports and hidden contact details."""
import pytest

from server.contact_details import PLACEHOLDER
from tests.support import ADMIN_EMAIL, ADMIN_SECRET

ADMIN_HEADERS = {'X-Admin-Secret': ADMIN_SECRET}


def send(api, sender, receiver, text):
    res = api.post('/api/messages', user=sender, json={'receiver_id': receiver.id, 'message': text})
    assert res.status_code in (201, 403), res.get_json()
    return res


def report(api, reporter, reported, reason='inappropriate', **extra):
    return api.post('/api/reports', user=reporter, json={'user_id': reported.id, 'reason': reason, **extra})


@pytest.fixture
def people(make):
    """Maya and her tutor Oliver, who have been talking, and Sam, another student."""
    maya, oliver, sam = make.user('Maya Patel'), make.tutor('Oliver Grant'), make.user('Sam Lee')
    make.connect(maya, oliver)
    return maya, oliver, sam


@pytest.fixture
def talked(api, people):
    maya, oliver, sam = people
    send(api, maya, oliver, 'Hi Oliver')
    message_id = send(api, oliver, maya, 'Message me on 07700 900123 instead').get_json()['data']['id_message']
    return maya, oliver, sam, message_id


# ── Blocking ──────────────────────────────────────────────────────────────────

class TestBlock:
    def test_a_block_stops_messages_both_ways(self, api, talked):
        maya, oliver, _, _ = talked
        assert api.post(f'/api/blocks/{oliver.id}', user=maya).status_code == 201

        res = send(api, oliver, maya, 'Hello?')
        assert (res.status_code, res.get_json()['code']) == (403, 'blocked')
        assert 'blocked' not in res.get_json()['error'].lower()  # they aren't told why
        res = send(api, maya, oliver, 'Actually…')
        assert (res.status_code, res.get_json()['code']) == (403, 'you_blocked')

        thread = api.get(f'/api/messages/{oliver.id}', user=maya).get_json()
        assert (thread['blocked'], thread['can_send']) == (True, False)
        assert [c['blocked'] for c in api.get('/api/messages', user=maya).get_json()['conversations']] == [True]
        assert [b['user_id'] for b in api.get('/api/blocks', user=maya).get_json()['blocked']] == [oliver.id]

        assert api.delete(f'/api/blocks/{oliver.id}', user=maya).status_code == 200
        assert send(api, oliver, maya, 'Hello again').status_code == 201
        assert api.get('/api/blocks', user=maya).get_json()['blocked'] == []

    def test_blocking_clears_their_unread_messages(self, api, talked):
        maya, oliver, _, _ = talked
        assert api.get('/api/messages/unread-count', user=maya).get_json()['unread'] == 1
        api.post(f'/api/blocks/{oliver.id}', user=maya)
        assert api.get('/api/messages/unread-count', user=maya).get_json()['unread'] == 0

    def test_blocking_twice_is_fine(self, api, people):
        maya, oliver, _ = people
        assert api.post(f'/api/blocks/{oliver.id}', user=maya).status_code == 201
        assert api.post(f'/api/blocks/{oliver.id}', user=maya).status_code == 201

    def test_not_yourself_or_nobody(self, api, people):
        maya, _, _ = people
        assert api.post(f'/api/blocks/{maya.id}', user=maya).status_code == 400
        assert api.post('/api/blocks/9999', user=maya).status_code == 404
        assert api.post(f'/api/blocks/{maya.id}').status_code == 401


# ── Reporting ─────────────────────────────────────────────────────────────────

class TestReport:
    def test_report_a_message(self, api, db, talked):
        maya, oliver, _, message_id = talked
        res = report(api, maya, oliver, 'off_platform', message_id=message_id, note='  Asked me to text him  ')
        assert res.status_code == 201
        row = db.one('SELECT reporter_id, reported_id, message_id, reason, note, status FROM reports')
        assert row == {'reporter_id': maya.id, 'reported_id': oliver.id, 'message_id': message_id,
                       'reason': 'off_platform', 'note': 'Asked me to text him', 'status': 'open'}
        assert report(api, maya, oliver, 'off_platform', message_id=message_id).status_code == 409

    def test_report_a_person(self, api, db, talked):
        maya, oliver, _, message_id = talked
        report(api, maya, oliver, message_id=message_id)
        assert report(api, maya, oliver, 'bullying').status_code == 201  # not about one message
        assert report(api, maya, oliver, 'bullying').status_code == 409
        assert db.value('SELECT COUNT(*) FROM reports') == 2

    @pytest.mark.parametrize('payload', [{'reason': 'rude'}, {'reason': None}, {'reason': 'spam', 'user_id': None}])
    def test_needs_a_person_and_a_reason(self, api, people, payload):
        maya, oliver, _ = people
        body = {'user_id': oliver.id, **payload}
        assert api.post('/api/reports', user=maya, json=body).status_code == 400

    def test_not_yourself_or_nobody(self, api, people):
        maya, _, _ = people
        assert report(api, maya, maya).status_code == 400
        assert api.post('/api/reports', user=maya, json={'user_id': 9999, 'reason': 'spam'}).status_code == 404

    def test_only_messages_sent_to_you(self, api, talked):
        maya, oliver, sam, message_id = talked
        mine = send(api, maya, oliver, 'My own message').get_json()['data']['id_message']
        assert report(api, sam, oliver, message_id=message_id).status_code == 404       # sent to Maya
        assert report(api, oliver, maya, message_id=mine).status_code == 201            # sent to Oliver: fine
        assert report(api, maya, oliver, message_id=mine).status_code == 404           # Maya sent it
        assert report(api, maya, oliver, message_id=99999).status_code == 404
        assert report(api, maya, oliver, message_id='abc').status_code == 404

    def test_a_linked_parent_reports_a_message_to_their_child(self, api, db, make, talked):
        maya, oliver, _, message_id = talked
        kate, stranger = make.parent(of=maya), make.parent('Ann Lee')
        assert report(api, stranger, oliver, 'safety', message_id=message_id).status_code == 404
        assert report(api, kate, oliver, 'safety', message_id=message_id).status_code == 201

    def test_reports_are_rate_limited(self, api, make, people):
        maya, _, _ = people
        tutors = [make.tutor(f'Tutor {i}') for i in range(11)]
        codes = [report(api, maya, tutor, 'spam').status_code for tutor in tutors]
        assert codes == [201] * 10 + [429]


# ── The admin queue ───────────────────────────────────────────────────────────

class TestAdminQueue:
    URLS = ['/api/admin/reports', '/api/admin/reports/1', '/api/admin/hidden-messages']

    @pytest.mark.parametrize('url', URLS)
    def test_admins_only(self, api, people, url):
        maya, _, _ = people
        assert api.get(url).status_code == 403
        assert api.get(url, user=maya).status_code == 403
        assert api.get(url, headers={'X-Admin-Secret': 'wrong'}).status_code == 403
        assert api.post('/api/admin/reports/1/close', user=maya, json={'outcome': 'dismissed'}).status_code == 403

    def test_review_and_close_a_report(self, api, db, make, talked):
        maya, oliver, _, message_id = talked
        kate = make.parent(of=maya)
        report(api, kate, oliver, 'off_platform', message_id=message_id, note='He asked her to text him')
        admin = make.user('Ada Admin', email=ADMIN_EMAIL)

        body = api.get('/api/admin/reports', user=admin).get_json()
        assert body['open'] == 1
        [item] = body['reports']
        assert (item['reporter_name'], item['reported_name'], item['for_child']) == \
            ('Kate Patel', 'Oliver Grant', 'Maya Patel')
        assert item['message'] == f'Message me on {PLACEHOLDER} instead'
        assert item['original_message'] == 'Message me on 07700 900123 instead'
        assert item['reports_on_user'] == 1

        detail = api.get(f"/api/admin/reports/{item['id']}", headers=ADMIN_HEADERS).get_json()['report']
        assert [m['message'] for m in detail['conversation']] == ['Hi Oliver', f'Message me on {PLACEHOLDER} instead']
        assert detail['conversation'][1]['original_message'] == 'Message me on 07700 900123 instead'

        close = lambda body: api.post(f"/api/admin/reports/{item['id']}/close", user=admin, json=body)  # noqa: E731
        assert close({'outcome': 'resolved', 'note': 'Warned'}).status_code == 200
        row = db.one('SELECT status, admin_note, reviewed_by FROM reports')
        assert row == {'status': 'resolved', 'admin_note': 'Warned', 'reviewed_by': ADMIN_EMAIL}
        assert close({'outcome': 'dismissed'}).status_code == 409
        assert api.get('/api/admin/reports', user=admin).get_json() == {'reports': [], 'open': 0}
        closed = api.get('/api/admin/reports', user=admin, query_string={'status': 'closed'}).get_json()['reports']
        assert [r['status'] for r in closed] == ['resolved']

    def test_a_report_about_a_person_shows_their_conversation(self, api, talked):
        maya, oliver, _, _ = talked
        report_id = report(api, maya, oliver, 'bullying').get_json()['report_id']
        detail = api.get(f'/api/admin/reports/{report_id}', headers=ADMIN_HEADERS).get_json()['report']
        assert detail['for_child'] is None
        assert len(detail['conversation']) == 2

    @pytest.mark.parametrize('outcome', ['', 'deleted', None])
    def test_closing_needs_an_outcome(self, api, talked, outcome):
        maya, oliver, _, _ = talked
        report_id = report(api, maya, oliver).get_json()['report_id']
        res = api.post(f'/api/admin/reports/{report_id}/close', headers=ADMIN_HEADERS, json={'outcome': outcome})
        assert res.status_code == 400

    def test_hidden_contact_details_are_listed_with_the_original(self, api, talked):
        _, oliver, _, message_id = talked
        rows = api.get('/api/admin/hidden-messages', headers=ADMIN_HEADERS).get_json()['messages']
        assert [(r['id_message'], r['sender_name'], r['sender_is_tutor'], r['original_message']) for r in rows] == [
            (message_id, 'Oliver Grant', True, 'Message me on 07700 900123 instead'),
        ]
