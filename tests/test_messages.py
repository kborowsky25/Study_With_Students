"""Direct messages: sending, conversations, unread counts and read receipts."""
import pytest


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
