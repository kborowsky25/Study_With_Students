"""Parent accounts: the parent role, invites and links, what a linked parent can see and pay,
and the under-18 rules (a linked parent before booking)."""
from datetime import timedelta

import pytest

from server.contact_details import PLACEHOLDER
from server.routes import payments
from server.scheduling import local_now
from server.services import reminders
from tests.support import born, iso, local
from tests.test_payments import FakeStripe


def family(api, person):
    res = api.get('/api/family', user=person)
    assert res.status_code == 200, res.get_json()
    return res.get_json()


def invite(api, parent, email):
    return api.post('/api/family/invites', user=parent, json={'email': email})


def invite_id(api, child):
    invites = family(api, child)['invites']
    assert len(invites) == 1, invites
    return invites[0]['link_id']


@pytest.fixture
def people(make):
    """Maya (a student), Kate (her linked parent), Oliver (Maya's tutor) and Sam (another student)."""
    maya, oliver, sam = make.user('Maya Patel'), make.tutor('Oliver Grant'), make.user('Sam Lee')
    make.connect(maya, oliver)
    kate = make.parent('Kate Patel', of=maya)
    return maya, kate, oliver, sam


# ── The parent role ───────────────────────────────────────────────────────────

class TestParentRole:
    def test_a_student_turns_on_parent_mode(self, app, api, db, make):
        dan = make.user('Dan Patel', birth_date=born(44))
        assert family(api, dan)['is_parent'] is False

        res = api.post('/api/family/parent-role', user=dan)
        assert res.status_code == 200
        assert res.get_json()['user']['is_parent'] is True
        assert res.get_json()['user']['is_student'] is True
        assert db.value('SELECT is_parent FROM users WHERE id_user = %s', (dan.id,)) == 1
        assert family(api, dan)['is_parent'] is True

    def test_under_18s_cannot_be_parents(self, api, db, make):
        mia = make.child()
        assert api.post('/api/family/parent-role', user=mia).status_code == 403
        assert db.value('SELECT is_parent FROM users WHERE id_user = %s', (mia.id,)) == 0


# ── Invites and links ─────────────────────────────────────────────────────────

class TestInvites:
    def test_invite_accept_and_see_each_other(self, api, db, make, capsys):
        maya, kate = make.user('Maya Patel', email='maya@example.com'), make.parent('Kate Patel')

        res = invite(api, kate, '  MAYA@Example.com ')
        assert res.status_code == 201
        assert res.get_json()['invite']['status'] == 'pending'
        assert 'To: maya@example.com' in capsys.readouterr().out  # the invite email (printed without SMTP)
        assert [s['email'] for s in family(api, kate)['sent']] == ['maya@example.com']
        assert family(api, kate)['children'] == []

        invites = family(api, maya)['invites']
        assert [(i['name'], i['email']) for i in invites] == [('Kate Patel', kate.email)]
        res = api.post(f"/api/family/invites/{invites[0]['link_id']}/accept", user=maya)
        assert res.status_code == 200, res.get_json()

        assert [(c['user_id'], c['name']) for c in family(api, kate)['children']] == [(maya.id, 'Maya Patel')]
        assert family(api, kate)['sent'] == []
        mine = family(api, maya)
        assert [(p['user_id'], p['name']) for p in mine['parents']] == [(kate.id, 'Kate Patel')]
        assert mine['invites'] == []

    def test_the_answer_is_the_same_whether_or_not_the_email_has_an_account(self, api, make):
        kate = make.parent()
        make.user('Maya Patel', email='maya@example.com')
        known, unknown = invite(api, kate, 'maya@example.com'), invite(api, kate, 'nobody@example.com')
        assert known.status_code == unknown.status_code == 201
        assert known.get_json()['message'] == unknown.get_json()['message']
        assert known.get_json()['invite'].keys() == unknown.get_json()['invite'].keys()

    def test_someone_who_signs_up_later_sees_the_invite(self, api, make):
        kate = make.parent()
        assert invite(api, kate, 'leo@example.com').status_code == 201
        leo = make.user('Leo Patel', email='leo@example.com')
        assert api.post(f'/api/family/invites/{invite_id(api, leo)}/accept', user=leo).status_code == 200
        assert [c['user_id'] for c in family(api, kate)['children']] == [leo.id]

    def test_only_parents_invite(self, api, make):
        maya, sam = make.user(), make.user('Sam Lee', email='sam@example.com')
        res = invite(api, maya, 'sam@example.com')
        assert res.status_code == 403
        assert res.get_json()['code'] == 'not_parent'
        assert family(api, sam)['invites'] == []

    @pytest.mark.parametrize('email', ['', 'not-an-email', 'two words@example.com'])
    def test_needs_an_email_address(self, api, make, email):
        assert invite(api, make.parent(), email).status_code == 400

    def test_not_your_own_email(self, api, make):
        kate = make.parent(email='kate@example.com')
        assert invite(api, kate, 'kate@example.com').status_code == 400

    def test_one_invite_per_email(self, api, make):
        kate, maya = make.parent(), make.user(email='maya@example.com')
        assert invite(api, kate, 'maya@example.com').status_code == 201
        assert invite(api, kate, 'maya@example.com').status_code == 409
        api.post(f'/api/family/invites/{invite_id(api, maya)}/accept', user=maya)
        assert invite(api, kate, 'maya@example.com').status_code == 409

    def test_a_declined_invite_can_be_sent_again(self, api, db, make):
        kate, maya = make.parent(), make.user(email='maya@example.com')
        invite(api, kate, 'maya@example.com')
        assert api.post(f'/api/family/invites/{invite_id(api, maya)}/decline', user=maya).status_code == 200
        assert [s['status'] for s in family(api, kate)['sent']] == ['declined']
        assert family(api, maya)['invites'] == [] and family(api, maya)['parents'] == []

        assert invite(api, kate, 'maya@example.com').status_code == 201
        assert [s['status'] for s in family(api, kate)['sent']] == ['pending']
        assert len(family(api, maya)['invites']) == 1

    def test_only_the_invited_person_answers(self, api, make):
        kate, maya, sam = make.parent(), make.user(email='maya@example.com'), make.user('Sam Lee')
        invite(api, kate, 'maya@example.com')
        link = invite_id(api, maya)
        for action in ('accept', 'decline'):
            assert api.post(f'/api/family/invites/{link}/{action}', user=sam).status_code == 404
            assert api.post(f'/api/family/invites/{link}/{action}', user=kate).status_code == 404
        assert family(api, kate)['children'] == []

    def test_at_most_two_parents(self, api, make):
        maya = make.user(email='maya@example.com')
        parents = [make.parent(name) for name in ('Kate Patel', 'Dev Patel', 'Ann Lee')]
        for parent in parents:
            invite(api, parent, 'maya@example.com')
        links = [i['link_id'] for i in family(api, maya)['invites']]
        answers = [api.post(f'/api/family/invites/{link}/accept', user=maya).status_code for link in links]
        assert answers == [200, 200, 409]
        assert len(family(api, maya)['parents']) == 2

    def test_parent_accounts_are_not_children(self, api, make):
        kate, dev = make.parent(), make.parent('Dev Patel', email='dev@example.com')
        invite(api, kate, 'dev@example.com')
        assert family(api, dev)['invites'] == []
        link = family(api, kate)['sent'][0]['link_id']
        assert api.post(f'/api/family/invites/{link}/accept', user=dev).status_code == 403

    def test_invites_from_someone_blocked_are_hidden(self, api, make, capsys):
        kate, maya = make.parent(), make.user(email='maya@example.com')
        assert api.post(f'/api/blocks/{kate.id}', user=maya).status_code == 201
        assert invite(api, kate, 'maya@example.com').status_code == 201
        assert 'maya@example.com' not in capsys.readouterr().out  # no email either
        assert family(api, maya)['invites'] == []

    def test_either_side_unlinks(self, api, db, make, people):
        maya, kate, _, sam = people
        link = family(api, maya)['parents'][0]['link_id']
        assert api.delete(f'/api/family/links/{link}', user=sam).status_code == 404
        assert api.delete(f'/api/family/links/{link}', user=maya).status_code == 200
        assert family(api, maya)['parents'] == [] and family(api, kate)['children'] == []

        link = make.link(kate, maya)
        assert api.delete(f'/api/family/links/{link}', user=kate).status_code == 200
        assert family(api, kate)['children'] == []

    def test_the_child_declines_rather_than_deletes_an_invite(self, api, make):
        kate, maya = make.parent(), make.user(email='maya@example.com')
        invite(api, kate, 'maya@example.com')
        link = invite_id(api, maya)
        assert api.delete(f'/api/family/links/{link}', user=maya).status_code == 404
        assert api.delete(f'/api/family/links/{link}', user=kate).status_code == 200  # withdrawn
        assert family(api, maya)['invites'] == []

    def test_invites_are_rate_limited(self, api, make):
        kate = make.parent()
        codes = [invite(api, kate, f'child{i}@example.com').status_code for i in range(6)]
        assert codes == [201] * 5 + [429]


# ── What a linked parent sees ─────────────────────────────────────────────────

class TestParentView:
    def test_overview_of_my_child(self, api, make, people):
        maya, kate, oliver, _ = people
        event_id = make.session(maya, oliver, status='confirmed', meeting_url='https://meet.jit.si/private-room')

        res = api.get(f'/api/family/children/{maya.id}', user=kate)
        assert res.status_code == 200
        body = res.get_json()
        assert body['child'] == {'user_id': maya.id, 'name': 'Maya Patel', 'under_18': False}
        assert [e['id_event'] for e in body['events']] == [event_id]
        assert 'meeting_url' not in body['events'][0]  # the video link stays with the tutor and student
        assert [(t['user_id'], t['can_message']) for t in body['tutors']] == [(oliver.id, True)]

    def test_a_parent_sees_only_their_own_children(self, api, db, make, people):
        maya, kate, oliver, sam = people
        make.session(sam, oliver, status='confirmed')
        for url in (f'/api/family/children/{sam.id}', f'/api/students/{sam.id}/progress',
                    f'/api/students/{sam.id}/lesson-notes', f'/api/family/children/{sam.id}/messages/{oliver.id}'):
            assert api.get(url, user=kate).status_code == 403, url

    @pytest.mark.parametrize('status', ['pending', 'declined'])
    def test_an_unanswered_or_declined_invite_shows_nothing(self, api, make, status):
        maya, oliver, kate = make.user(), make.tutor(), make.parent()
        make.link(kate, maya, status)
        for url in (f'/api/family/children/{maya.id}', f'/api/students/{maya.id}/progress',
                    f'/api/family/children/{maya.id}/messages/{oliver.id}'):
            assert api.get(url, user=kate).status_code == 403, url
        assert api.get('/api/family/conversations', user=kate).get_json()['children'] == []

    def test_unlinking_ends_access(self, api, make, people):
        maya, kate, _, _ = people
        link = family(api, kate)['children'][0]['link_id']
        api.delete(f'/api/family/links/{link}', user=maya)
        assert api.get(f'/api/family/children/{maya.id}', user=kate).status_code == 403
        assert api.get(f'/api/students/{maya.id}/progress', user=kate).status_code == 403

    def test_lesson_notes_homework_and_progress(self, api, db, make, people):
        maya, kate, oliver, _ = people
        event_id = make.session(maya, oliver, status='paid', start=local(-2))
        res = api.post(f'/api/events/{event_id}/lesson-notes', user=oliver, json={
            'subject': 'gcse-maths', 'summary': 'Quadratics',
            'topics': [{'key': 'quadratic-equations', 'confidence': 3}],
            'homework': [{'task': 'Exercise 4B'}],
        })
        assert res.status_code == 201, res.get_json()

        progress = api.get(f'/api/students/{maya.id}/progress', user=kate).get_json()
        assert progress['lessons'] == 1
        assert [h['task'] for h in progress['homework']] == ['Exercise 4B']
        notes = api.get(f'/api/students/{maya.id}/lesson-notes', user=kate).get_json()['notes']
        assert [n['summary'] for n in notes] == ['Quadratics']
        assert notes[0]['can_edit'] is False
        homework_id = progress['homework'][0]['id']
        assert api.patch(f'/api/homework/{homework_id}', user=kate, json={'done': True}).status_code == 403

    def test_reads_conversations_with_tutors_only(self, api, db, make, people):
        maya, kate, oliver, sam = people
        api.post('/api/messages', user=maya, json={'receiver_id': oliver.id, 'message': 'Hi! Text me on 07700 900123'})
        api.post('/api/messages', user=oliver, json={'receiver_id': maya.id, 'message': 'Let’s keep it here'})
        db.run('INSERT INTO messages (id_sender, id_receiver, message) VALUES (%s, %s, %s)',
               (sam.id, maya.id, 'A chat between friends'))
        unread_before = api.get('/api/messages/unread-count', user=maya).get_json()['unread']

        children = api.get('/api/family/conversations', user=kate).get_json()['children']
        assert [(c['user_id'], [x['user_id'] for x in c['conversations']]) for c in children] == \
            [(maya.id, [oliver.id])]
        assert 'unread' not in children[0]['conversations'][0]

        thread = api.get(f'/api/family/children/{maya.id}/messages/{oliver.id}', user=kate).get_json()
        assert [m['message'] for m in thread['messages']] == [f'Hi! Text me on {PLACEHOLDER}', 'Let’s keep it here']
        assert all('original_message' not in m for m in thread['messages'])
        assert api.get(f'/api/family/children/{maya.id}/messages/{sam.id}', user=kate).status_code == 403
        # Reading as a parent leaves Maya's messages unread
        assert api.get('/api/messages/unread-count', user=maya).get_json()['unread'] == unread_before

    def test_parents_read_but_do_not_write(self, api, make, people):
        maya, kate, oliver, _ = people
        api.post('/api/messages', user=maya, json={'receiver_id': oliver.id, 'message': 'Hi'})
        res = api.post('/api/messages', user=kate, json={'receiver_id': maya.id, 'message': 'Dinner at 6'})
        assert res.status_code == 403

    def test_both_sides_see_that_a_parent_can_read(self, api, db, make, people):
        maya, kate, oliver, sam = people
        api.post('/api/messages', user=maya, json={'receiver_id': oliver.id, 'message': 'Hi'})
        expected = {'user_id': maya.id, 'name': 'Maya Patel', 'parents': 1}
        assert api.get(f'/api/messages/{oliver.id}', user=maya).get_json()['parents_can_read'] == expected
        assert api.get(f'/api/messages/{maya.id}', user=oliver).get_json()['parents_can_read'] == expected
        assert api.get(f'/api/messages/{sam.id}', user=maya).get_json()['parents_can_read'] is None


# ── Paying for a child's session ──────────────────────────────────────────────

@pytest.fixture
def stripe(monkeypatch):
    fake = FakeStripe()
    monkeypatch.setattr(payments, 'stripe', fake)
    monkeypatch.setattr(payments, 'stripe_enabled', lambda: True)
    return fake


class TestPaying:
    def test_a_linked_parent_pays_through_checkout(self, api, db, make, people, stripe):
        maya, kate, oliver, _ = people
        event_id = make.session(maya, oliver, status='confirmed')

        res = api.post(f'/api/payments/checkout/{event_id}', user=kate)
        assert res.status_code == 200, res.get_json()
        created = stripe.created[-1]
        metadata = {'event_id': str(event_id), 'user_id': str(kate.id), 'student_user_id': str(maya.id)}
        assert created['metadata'] == metadata
        assert '/hub/parent?event_id=' in created['success_url']

        verify = lambda session_id: api.post(f'/api/payments/verify/{event_id}', user=kate,  # noqa: E731
                                             json={'session_id': session_id})
        stripe.sessions['cs_open'] = {'mode': 'payment', 'metadata': metadata, 'payment_status': 'unpaid'}
        assert verify('cs_open').status_code == 402
        assert db.value('SELECT status FROM events WHERE id_event = %s', (event_id,)) == 'confirmed'

        stripe.sessions['cs_paid'] = {'mode': 'payment', 'metadata': metadata, 'payment_status': 'paid'}
        assert verify('cs_paid').status_code == 200
        assert db.value('SELECT status FROM events WHERE id_event = %s', (event_id,)) == 'paid'

    def test_the_webhook_records_a_parents_payment(self, api, db, make, people):
        maya, kate, oliver, _ = people
        event_id = make.session(maya, oliver, status='confirmed')
        metadata = {'event_id': str(event_id), 'user_id': str(kate.id), 'student_user_id': str(maya.id)}
        assert payments._record_checkout({'mode': 'payment', 'payment_status': 'paid', 'metadata': metadata}) == \
            'session paid'
        assert db.value('SELECT status FROM events WHERE id_event = %s', (event_id,)) == 'paid'

    def test_only_linked_parents_pay(self, api, make, people, stripe):
        maya, kate, oliver, sam = people
        event_id = make.session(maya, oliver, status='confirmed')
        strangers = [make.parent('Ann Lee'), sam, make.parent('Dev Patel')]
        make.link(strangers[2], maya, 'pending')
        for person in strangers:
            assert api.post(f'/api/payments/checkout/{event_id}', user=person).status_code == 403
        assert stripe.created == []

    def test_the_student_still_pays_as_before(self, api, make, people, stripe):
        maya, _, oliver, _ = people
        event_id = make.session(maya, oliver, status='confirmed')
        assert api.post(f'/api/payments/checkout/{event_id}', user=maya).status_code == 200
        assert stripe.created[-1]['metadata'] == {'event_id': str(event_id), 'user_id': str(maya.id)}
        assert '/payments?event_id=' in stripe.created[-1]['success_url']


# ── Under-18s ─────────────────────────────────────────────────────────────────

def book(api, student, tutor, days=3):
    start = local(days, 17)
    return api.post('/api/events', user=student, json={
        'tutor_id': tutor.tutor_id, 'start_time': iso(start), 'end_time': iso(start + timedelta(hours=1)),
    })


def schedule(api, tutor, student, days=3):
    start = local(days, 18)
    return api.post('/api/events', user=tutor, json={
        'student_id': student.student_id, 'start_time': iso(start), 'end_time': iso(start + timedelta(hours=1)),
    })


class TestUnder18:
    def test_an_under_18_books_once_a_parent_is_linked(self, api, make):
        mia, oliver = make.child('Mia Khan'), make.tutor()
        make.connect(mia, oliver)
        assert family(api, mia)['needs_parent'] is True

        res = book(api, mia, oliver)
        assert res.status_code == 403
        assert res.get_json()['code'] == 'parent_required'
        res = schedule(api, oliver, mia)
        assert res.status_code == 403
        assert res.get_json()['error'].startswith('Mia needs a parent or guardian linked')

        make.parent(of=mia)
        assert family(api, mia)['needs_parent'] is False
        assert book(api, mia, oliver).status_code == 201
        assert schedule(api, oliver, mia, days=4).status_code == 201

    def test_intro_calls_need_a_parent_too(self, api, make):
        mia, oliver = make.child(), make.tutor()
        make.connect(mia, oliver)
        start = local(3, 17)
        res = api.post('/api/events', user=mia, json={'tutor_id': oliver.tutor_id, 'kind': 'intro',
                                                      'start_time': iso(start)})
        assert res.get_json()['code'] == 'parent_required'

    @pytest.mark.parametrize('birth_date', [born(18), born(30), None])
    def test_adults_and_accounts_without_a_date_of_birth_book_as_before(self, api, make, birth_date):
        student, oliver = make.user(birth_date=birth_date), make.tutor()
        make.connect(student, oliver)
        assert book(api, student, oliver).status_code == 201

    def test_eighteen_from_the_birthday(self, api, make):
        today, tomorrow = make.user('Ada', birth_date=born(18)), make.user('Ben', birth_date=born(18, days=-1))
        assert (family(api, today)['under_18'], family(api, tomorrow)['under_18']) == (False, True)

    def test_a_date_of_birth_can_be_added_once(self, api, db, make):
        legacy = make.user()
        put = lambda value: api.put('/api/users/me/student-bio', user=legacy, json={'date_of_birth': value})  # noqa: E731
        assert put('2010-04-02').status_code == 200
        stored = db.value('SELECT date_of_birth FROM student_profiles WHERE id_user = %s', (legacy.id,))
        assert str(stored) == '2010-04-02'
        assert put('2010-04-02').status_code == 200
        assert put('2001-04-02').status_code == 409
        assert put('not a date').status_code == 400
        me = api.get(f'/api/users/{legacy.id}/profile', user=legacy).get_json()['user']
        assert me['date_of_birth'] == '2010-04-02'
        other = api.get(f'/api/users/{legacy.id}/profile', user=make.user('Sam Lee')).get_json()['user']
        assert 'date_of_birth' not in other


# ── Reminders ─────────────────────────────────────────────────────────────────

class TestReminders:
    def test_linked_parents_get_session_reminders_without_the_link(self, app, db, make, people, capsys):
        maya, kate, oliver, _ = people
        start = local_now().replace(second=0) + timedelta(hours=5)
        make.session(maya, oliver, status='confirmed', start=start, meeting_url='https://meet.jit.si/private-room')

        with app.app_context():
            result = reminders.send_due_reminders()
        assert result['sent'] == 3
        recipients = db.column('SELECT recipient FROM session_reminders')
        assert sorted(recipients) == sorted(['student', 'tutor', f'p{kate.id}'])
        printed = capsys.readouterr().out
        parent_email = printed[printed.index(f'To: {kate.email}'):]
        assert 'Maya’s session' in parent_email.split('\n')[0]
        assert 'private-room' not in parent_email.split('📧')[0]
