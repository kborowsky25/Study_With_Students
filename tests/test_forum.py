"""Forum: categories, threads and replies — validation and who may delete what."""
import pytest


@pytest.fixture
def members(make):
    """Two community members and a verified tutor."""
    return make.member('Maya Patel'), make.member('Sam Lee'), make.tutor('Oliver Grant')


@pytest.fixture
def category(db):
    return db.value("SELECT id FROM forum_categories WHERE name = 'Exam Prep'")


def new_thread(api, user, category, title='How do you plan revision?', content='Mocks are in six weeks.'):
    return api.post(f'/api/forum/categories/{category}/threads', user=user, json={'title': title, 'content': content})


def reply(api, user, thread_id, content='Block your week by topic.'):
    return api.post(f'/api/forum/threads/{thread_id}/posts', user=user, json={'content': content})


def test_categories_are_seeded_with_counts(api, members):
    maya, _, _ = members
    categories = api.get('/api/forum/categories', user=maya).get_json()['categories']
    assert len(categories) == 9
    assert {c['name'] for c in categories} >= {'Mathematics', 'Exam Prep', 'General Chat'}
    assert all(c['icon'] for c in categories)
    assert all((c['thread_count'], c['post_count'], c['last_activity']) == (0, 0, None) for c in categories)


def test_thread_and_replies(api, db, members, category):
    maya, sam, oliver = members
    res = new_thread(api, maya, category)
    assert res.status_code == 201
    thread_id = res.get_json()['thread']['id']

    assert reply(api, oliver, thread_id).status_code == 201
    assert reply(api, sam, thread_id, 'Past papers every weekend.').status_code == 201

    is_tutor = lambda person: person.tutor_id is not None  # noqa: E731 — members are tutors until the community is free
    body = api.get(f'/api/forum/threads/{thread_id}', user=sam).get_json()
    assert body['thread']['title'] == 'How do you plan revision?'
    assert (body['thread']['author_name'], body['thread']['author_is_tutor']) == ('Maya Patel', is_tutor(maya))
    assert body['thread']['category_name'] == 'Exam Prep'
    assert [(p['author_name'], p['author_is_tutor']) for p in body['posts']] == [
        ('Oliver Grant', True), ('Sam Lee', is_tutor(sam))]

    listing = api.get(f'/api/forum/categories/{category}', user=maya).get_json()
    assert listing['category']['name'] == 'Exam Prep'
    assert [(t['id'], t['post_count']) for t in listing['threads']] == [(thread_id, 2)]

    counts = {c['id']: c for c in api.get('/api/forum/categories', user=maya).get_json()['categories']}
    assert (counts[category]['thread_count'], counts[category]['post_count']) == (1, 2)
    assert counts[category]['last_activity'] is not None


def test_recent_threads_and_limit(api, members, category):
    maya, _, _ = members
    for i in range(3):
        new_thread(api, maya, category, title=f'Thread {i}')
    recent = api.get('/api/forum/recent?limit=2', user=maya).get_json()['threads']
    assert len(recent) == 2
    assert all(t['category_name'] == 'Exam Prep' for t in recent)
    assert len(api.get('/api/forum/recent?limit=0', user=maya).get_json()['threads']) == 1
    assert len(api.get('/api/forum/recent?limit=500', user=maya).get_json()['threads']) == 3


class TestValidation:
    @pytest.mark.parametrize(('title', 'content'), [('', 'Body'), ('Title', ''), ('   ', '   ')])
    def test_thread_needs_a_title_and_content(self, api, members, category, title, content):
        maya, _, _ = members
        assert new_thread(api, maya, category, title, content).status_code == 400

    def test_title_length(self, api, members, category):
        maya, _, _ = members
        assert new_thread(api, maya, category, title='x' * 200).status_code == 201
        assert new_thread(api, maya, category, title='x' * 201).status_code == 400

    def test_unknown_category(self, api, members):
        maya, _, _ = members
        assert new_thread(api, maya, 999).status_code == 404
        assert api.get('/api/forum/categories/999', user=maya).status_code == 404

    def test_reply_needs_content(self, api, members, category):
        maya, _, _ = members
        thread_id = new_thread(api, maya, category).get_json()['thread']['id']
        assert reply(api, maya, thread_id, '   ').status_code == 400

    def test_unknown_thread(self, api, members):
        maya, _, _ = members
        assert api.get('/api/forum/threads/999', user=maya).status_code == 404
        assert reply(api, maya, 999).status_code == 404
        assert api.delete('/api/forum/threads/999', user=maya).status_code == 404
        assert api.delete('/api/forum/posts/999', user=maya).status_code == 404


class TestOwnership:
    def test_only_the_author_deletes_a_reply(self, api, db, members, category):
        maya, sam, oliver = members
        thread_id = new_thread(api, maya, category).get_json()['thread']['id']
        post_id = reply(api, sam, thread_id).get_json()['post']['id']

        assert api.delete(f'/api/forum/posts/{post_id}', user=maya).status_code == 403   # not even the thread author
        assert api.delete(f'/api/forum/posts/{post_id}', user=oliver).status_code == 403
        assert api.delete(f'/api/forum/posts/{post_id}', user=sam).status_code == 200
        assert db.value('SELECT COUNT(*) FROM forum_posts') == 0

    def test_only_the_author_deletes_a_thread_and_its_replies_go_with_it(self, api, db, members, category):
        maya, sam, oliver = members
        thread_id = new_thread(api, maya, category).get_json()['thread']['id']
        reply(api, sam, thread_id)
        reply(api, oliver, thread_id)

        assert api.delete(f'/api/forum/threads/{thread_id}', user=sam).status_code == 403
        assert api.delete(f'/api/forum/threads/{thread_id}', user=oliver).status_code == 403
        assert db.value('SELECT COUNT(*) FROM forum_posts') == 2

        assert api.delete(f'/api/forum/threads/{thread_id}', user=maya).status_code == 200
        assert db.value('SELECT COUNT(*) FROM forum_threads') == 0
        assert db.value('SELECT COUNT(*) FROM forum_posts') == 0
        assert api.get(f'/api/forum/threads/{thread_id}', user=maya).status_code == 404
