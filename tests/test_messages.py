"""Direct messages: sending, conversations, unread counts and read receipts; who can write to
whom, the people search and the contact-detail guard."""
import pytest

from server.contact_details import PLACEHOLDER
from tests.support import born


def send(api, sender, receiver, text):
    return api.post('/api/messages', user=sender, json={'receiver_id': receiver.id, 'message': text})


def unread(api, user):
    return api.get('/api/messages/unread-count', user=user).get_json()['unread']


@pytest.fixture
def people(make):
    return make.user('Maya Patel'), make.tutor('Oliver Grant'), make.user('Sam Lee')


class TestSend:
    def test_sends_a_message(self, api, people):
        maya, oliver, _ = people
        res = send(api, maya, oliver, '  Hi Oliver!  ')
        assert res.status_code == 201
        data = res.get_json()['data']
        assert (data['id_sender'], data['id_receiver'], data['message']) == (maya.id, oliver.id, 'Hi Oliver!')
        assert data['read_at'] is None
        assert data['message_timestamp']

    @pytest.mark.parametrize('payload', [{}, {'receiver_id': None, 'message': 'Hi'}, {'message': 'Hi'}])
    def test_needs_a_receiver(self, api, people, payload):
        maya, _, _ = people
        assert api.post('/api/messages', user=maya, json=payload).status_code == 400

    @pytest.mark.parametrize('text', ['', '   ', None])
    def test_needs_text(self, api, people, text):
        maya, oliver, _ = people
        assert send(api, maya, oliver, text).status_code == 400

    def test_cannot_message_yourself(self, api, people):
        maya, _, _ = people
        assert send(api, maya, maya, 'Note to self').status_code == 400

    def test_unknown_receiver(self, api, people):
        maya, _, _ = people
        assert api.post('/api/messages', user=maya, json={'receiver_id': 999, 'message': 'Hi'}).status_code == 404

    def test_length_limit(self, api, people):
        maya, oliver, _ = people
        assert send(api, maya, oliver, 'x' * 4000).status_code == 201
        assert send(api, maya, oliver, 'x' * 4001).status_code == 400

    def test_receiver_id_must_be_a_number(self, api, people):
        maya, _, _ = people
        assert api.post('/api/messages', user=maya, json={'receiver_id': 'abc', 'message': 'Hi'}).status_code == 400

    def test_needs_a_token(self, api, people):
        _, oliver, _ = people
        assert api.post('/api/messages', json={'receiver_id': oliver.id, 'message': 'Hi'}).status_code == 401


class TestInbox:
    def test_conversations_with_latest_message_and_unread_counts(self, api, people):
        maya, oliver, sam = people
        send(api, maya, oliver, 'Hi Oliver!')
        send(api, maya, oliver, 'Could we go over projectiles?')
        send(api, oliver, maya, 'Of course.')
        send(api, sam, oliver, 'Are you free on Sunday?')

        convos = api.get('/api/messages', user=oliver).get_json()['conversations']
        assert [(c['user_id'], c['name'], c['last_message'], c['last_from_me'], c['unread']) for c in convos] == [
            (sam.id, 'Sam Lee', 'Are you free on Sunday?', False, 1),     # most recent first
            (maya.id, 'Maya Patel', 'Of course.', True, 2),
        ]
        assert unread(api, oliver) == 3
        assert unread(api, maya) == 1

    def test_opening_a_thread_marks_it_read(self, api, db, people):
        maya, oliver, sam = people
        send(api, maya, oliver, 'Hi Oliver!')
        send(api, maya, oliver, 'Could we go over projectiles?')
        send(api, sam, oliver, 'Are you free on Sunday?')
        send(api, oliver, maya, 'Of course.')

        thread = api.get(f'/api/messages/{maya.id}', user=oliver).get_json()['messages']
        assert [m['message'] for m in thread] == ['Hi Oliver!', 'Could we go over projectiles?', 'Of course.']
        assert all(m['read_at'] for m in thread if m['id_sender'] == maya.id)

        assert unread(api, oliver) == 1          # only Sam's message is left
        assert unread(api, maya) == 1            # reading doesn't touch the other direction
        convos = {c['user_id']: c['unread'] for c in api.get('/api/messages', user=oliver).get_json()['conversations']}
        assert convos == {maya.id: 0, sam.id: 1}

    def test_threads_are_private(self, api, people):
        maya, oliver, sam = people
        send(api, maya, oliver, 'Hi Oliver!')
        assert api.get(f'/api/messages/{maya.id}', user=sam).get_json()['messages'] == []
        assert api.get('/api/messages', user=sam).get_json()['conversations'] == []

    def test_empty_inbox(self, api, people):
        maya, _, _ = people
        assert api.get('/api/messages', user=maya).get_json()['conversations'] == []
        assert unread(api, maya) == 0


# ── Who can start a conversation ──────────────────────────────────────────────

class TestWhoCanWrite:
    def test_students_and_parents_write_to_tutors(self, api, make, people):
        maya, oliver, _ = people
        assert send(api, maya, oliver, 'Hi Oliver!').status_code == 201
        assert send(api, make.parent(), oliver, 'Hello, I’m Maya’s mum').status_code == 201

    def test_a_tutor_cannot_cold_message_a_student(self, api, db, people):
        _, oliver, sam = people
        res = send(api, oliver, sam, 'Want some tutoring?')
        assert res.status_code == 403
        assert res.get_json()['code'] == 'not_your_student'
        assert db.value('SELECT COUNT(*) FROM messages') == 0

    def test_a_tutor_writes_to_students_they_accepted(self, api, make, people):
        _, oliver, sam = people
        make.connect(sam, oliver)
        assert send(api, oliver, sam, 'Welcome aboard!').status_code == 201

    def test_a_tutor_replies_to_a_student_who_wrote_first(self, api, people):
        _, oliver, sam = people
        send(api, sam, oliver, 'Are you free on Sunday?')
        assert send(api, oliver, sam, 'I am!').status_code == 201

    def test_students_cannot_cold_message_students(self, api, people):
        maya, _, sam = people
        res = send(api, maya, sam, 'Hey')
        assert res.status_code == 403
        assert res.get_json()['code'] == 'tutors_only'

    @pytest.mark.parametrize('status', ['pending', 'none', 'rejected'])
    def test_only_verified_tutors_can_be_written_to_first(self, api, make, people, status):
        maya, _, _ = people
        res = send(api, maya, make.tutor('Noah Fox', status=status), 'Hi')
        assert res.status_code == 403
        assert res.get_json()['code'] == 'tutor_not_verified'

    def test_nobody_can_cold_message_an_under_18(self, api, make, people):
        maya, oliver, _ = people
        mia = make.child('Mia Khan')
        strangers = [oliver, maya, make.parent(), make.tutor('Noah Fox')]
        for person in strangers:
            res = send(api, person, mia, 'Hi Mia')
            assert res.status_code == 403
            assert '18' not in res.get_json()['error']  # refusals never give away someone's age

    def test_an_under_18_writes_to_tutors_and_gets_replies(self, api, make, people):
        _, oliver, _ = people
        mia = make.child('Mia Khan')
        assert send(api, mia, oliver, 'Hi, can you help with physics?').status_code == 201
        assert send(api, oliver, mia, 'Of course').status_code == 201

    def test_a_tutor_an_under_18_asked_for_writes_first(self, api, make, people):
        _, oliver, _ = people
        mia = make.child('Mia Khan')
        make.connect(mia, oliver)
        assert send(api, oliver, mia, 'Welcome!').status_code == 201

    def test_a_tutor_under_18_is_not_open_to_everyone(self, api, make, people):
        maya, _, _ = people
        young = make.tutor('Noah Fox')
        make.db.run('UPDATE student_profiles SET date_of_birth = %s WHERE id_user = %s', (born(16), young.id))
        assert send(api, maya, young, 'Hi').status_code == 403

    def test_a_parent_cannot_message_their_child(self, api, make, people):
        maya, _, _ = people
        assert send(api, make.parent(of=maya), maya, 'Tea is ready').status_code == 403

    def test_the_thread_says_whether_i_can_write(self, api, people):
        maya, oliver, sam = people
        assert api.get(f'/api/messages/{oliver.id}', user=maya).get_json()['can_send'] is True
        thread = api.get(f'/api/messages/{sam.id}', user=oliver).get_json()
        assert (thread['can_send'], thread['reason_code']) == (False, 'not_your_student')
        assert thread['reason'].startswith('You can message Sam once')


class TestSearch:
    def search(self, api, user, q):
        return [u['name'] for u in api.get('/api/users/search', user=user, query_string={'q': q}).get_json()['users']]

    def test_finds_only_people_i_can_write_to(self, api, make, people):
        maya, oliver, sam = people
        make.tutor('Noah Fox', status='pending')
        make.child('Sami Khan')
        assert self.search(api, maya, 'Oliver') == ['Oliver Grant']
        assert self.search(api, maya, 'Sam') == []
        assert self.search(api, maya, 'Noah') == []
        assert self.search(api, oliver, 'Sam') == []

        make.connect(sam, oliver)
        assert self.search(api, oliver, 'Sam') == ['Sam Lee']
        api.post(f'/api/blocks/{oliver.id}', user=maya)
        assert self.search(api, maya, 'Oliver') == []

    def test_finds_someone_who_wrote_to_me(self, api, make, people):
        _, oliver, sam = people
        send(api, sam, oliver, 'Hi')
        assert self.search(api, oliver, 'Sam') == ['Sam Lee']

    def test_profiles_say_whether_i_can_write(self, api, people):
        maya, oliver, sam = people
        assert api.get(f'/api/users/{oliver.id}/profile', user=maya).get_json()['user']['can_message'] is True
        assert api.get(f'/api/users/{sam.id}/profile', user=maya).get_json()['user']['can_message'] is False
        assert 'can_message' not in api.get(f'/api/users/{maya.id}/profile', user=maya).get_json()['user']


# ── Contact details ───────────────────────────────────────────────────────────

class TestContactGuard:
    def test_hidden_between_a_student_and_a_tutor(self, api, db, people):
        maya, oliver, _ = people
        res = send(api, maya, oliver, 'Text me on 07700 900123 or maya@gmail.com')
        assert res.status_code == 201
        body = res.get_json()
        assert body['data']['message'] == f'Text me on {PLACEHOLDER} or {PLACEHOLDER}'
        assert body['hidden'] == ['email', 'phone']
        assert 'original_message' not in body['data']
        # The original is kept for moderation only
        assert db.value('SELECT original_message FROM messages') == 'Text me on 07700 900123 or maya@gmail.com'

        for user, other in ((oliver, maya), (maya, oliver)):
            thread = api.get(f'/api/messages/{other.id}', user=user).get_json()['messages']
            assert [m['message'] for m in thread] == [f'Text me on {PLACEHOLDER} or {PLACEHOLDER}']
            assert '07700' not in str(api.get('/api/messages', user=user).get_json())

    def test_hidden_from_a_tutor_to_a_student(self, api, make, people):
        maya, oliver, _ = people
        send(api, maya, oliver, 'Hi')
        res = send(api, oliver, maya, 'Add me on snap: oliver_g23')
        assert res.get_json()['data']['message'] == f'Add me on {PLACEHOLDER}'

    def test_hidden_between_a_parent_and_a_tutor(self, api, make, people):
        _, oliver, _ = people
        res = send(api, make.parent(), oliver, 'My number is 07700 900123')
        assert res.get_json()['hidden'] == ['phone']

    def test_everyday_messages_are_stored_as_written(self, api, db, people):
        maya, oliver, _ = people
        res = send(api, maya, oliver, 'Can we do 17:30 on Tuesday? Paper 8300/1H, it’s £22 right?')
        assert res.get_json()['hidden'] == []
        assert res.get_json()['data']['message'] == 'Can we do 17:30 on Tuesday? Paper 8300/1H, it’s £22 right?'
        assert db.value('SELECT original_message FROM messages') is None

    def test_tutors_can_swap_numbers_with_each_other(self, api, make, people):
        _, oliver, _ = people
        noah = make.tutor('Noah Fox')
        assert send(api, oliver, noah, 'Call me: 07700 900123').get_json()['hidden'] == []

    def test_hidden_whenever_an_under_18_is_in_the_conversation(self, api, db, make, people):
        _, _, sam = people
        mia = make.child('Mia Khan')
        db.run('INSERT INTO messages (id_sender, id_receiver, message) VALUES (%s, %s, %s)',
               (sam.id, mia.id, 'Hi Mia, from before the rules'))
        res = send(api, mia, sam, 'My number is 07700 900123')
        assert res.status_code == 201
        assert res.get_json()['hidden'] == ['phone']
