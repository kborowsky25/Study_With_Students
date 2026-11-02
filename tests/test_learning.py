"""Learning profile (what a student needs) and the tutor recommendations built on it."""
import pytest

PROFILE = {'subjects': 'Maths', 'level': 'A-level', 'budget': 25, 'availability': 'Weekday evenings',
           'goals': 'An A* in the summer'}


def save(api, user, **fields):
    return api.put('/api/learning-profile', user=user, json=fields)


def recommended(api, user, query=''):
    res = api.get(f'/api/tutors/recommended{query}', user=user)
    assert res.status_code == 200
    return res.get_json()


class TestProfile:
    def test_starts_empty(self, api, make):
        body = api.get('/api/learning-profile', user=make.user()).get_json()
        assert body['profile'] == {'subjects': None, 'level': None, 'budget': None, 'availability': None, 'goals': None}
        assert body['complete'] is False
        assert body['levels'] == ['GCSE', 'A-level', 'IB', 'University', 'Other']

    def test_save_and_read_back(self, api, make):
        maya = make.user()
        res = save(api, maya, **{**PROFILE, 'budget': '25'})
        assert res.status_code == 200
        assert res.get_json()['complete'] is True
        profile = api.get('/api/learning-profile', user=maya).get_json()['profile']
        assert profile == {**PROFILE, 'budget': 25.0}   # decimals come back as numbers

    def test_creates_the_student_profile_if_missing(self, api, db, make):
        maya = make.user(student_profile=False)
        assert api.get('/api/learning-profile', user=maya).get_json()['complete'] is False
        assert save(api, maya, subjects='Physics').status_code == 200
        assert db.value('SELECT subjects FROM student_profiles WHERE id_user = %s', (maya.id,)) == 'Physics'

    def test_partial_updates_keep_other_fields(self, api, make):
        maya = make.user()
        save(api, maya, **PROFILE)
        profile = save(api, maya, goals='Pass the mock').get_json()['profile']
        assert (profile['subjects'], profile['level'], profile['goals']) == ('Maths', 'A-level', 'Pass the mock')

    def test_blank_values_clear_fields(self, api, make):
        maya = make.user()
        save(api, maya, **PROFILE)
        body = save(api, maya, subjects='  ', level='', budget='', availability='', goals='').get_json()
        assert body['profile'] == {'subjects': None, 'level': None, 'budget': None, 'availability': None, 'goals': None}
        assert body['complete'] is False

    def test_long_text_is_trimmed(self, api, make):
        profile = save(api, make.user(), subjects='x' * 300, goals='y' * 1200).get_json()['profile']
        assert (len(profile['subjects']), len(profile['goals'])) == (255, 1000)

    @pytest.mark.parametrize(('field', 'value'), [
        ('level', 'Masters'), ('budget', 'twenty'), ('budget', 4.99), ('budget', 200.01), ('budget', [25]),
    ])
    def test_rejects_invalid_values(self, api, make, field, value):
        assert save(api, make.user(), **{field: value}).status_code == 400

    @pytest.mark.parametrize('budget', [5, 200, '42.5'])
    def test_budget_range_is_inclusive(self, api, make, budget):
        assert save(api, make.user(), budget=budget).status_code == 200


class TestRecommended:
    @pytest.fixture
    def tutors(self, make):
        return {
            'oliver': make.tutor('Oliver Grant', subjects='Mathematics, Physics', levels='GCSE, A-level', rate=22,
                                 availability='Weekday evenings'),
            'pete':   make.tutor('Pete Pending', status='pending', subjects='Maths', levels='A-level', rate=20,
                                 availability='Weekday evenings'),
            'priya':  make.tutor('Priya Shah', subjects='Chemistry', levels='GCSE', rate=30, availability='weekends'),
            'rita':   make.tutor('Rita Rejected', status='rejected', subjects='Maths'),
            'nora':   make.tutor('Nora No-Uni', subjects='Maths', university=''),
            'connor': make.tutor('Connor Connected', subjects='Maths'),
        }

    def test_ranks_by_match_and_explains_why(self, api, make, tutors):
        maya = make.user()
        make.connect(maya, tutors['connor'])
        save(api, maya, **PROFILE)

        body = recommended(api, maya)
        assert body['profile_complete'] is True
        ranked = [(t['name'], t['match']) for t in body['tutors']]
        # Rejected tutors, tutors without a university and her current tutors are left out.
        assert [name for name, _ in ranked] == ['Oliver Grant', 'Pete Pending', 'Priya Shah']
        assert ranked[0][1] > ranked[1][1] > ranked[2][1]

        oliver = body['tutors'][0]
        assert oliver['verified'] is True
        assert oliver['reasons'] == ['Teaches Mathematics', '£22/hr — within your budget', 'Free weekday evenings']
        assert body['tutors'][1]['verified'] is False

    def test_never_recommends_yourself(self, api, make, tutors):
        maya = make.tutor('Maya Patel', subjects='Maths')
        save(api, maya, **PROFILE)
        assert maya.id not in [t['id_user'] for t in recommended(api, maya)['tutors']]

    def test_works_without_a_profile(self, api, make, tutors):
        body = recommended(api, make.user())
        assert body['profile_complete'] is False
        assert len(body['tutors']) == 4
        assert all('match' in t and 'reasons' in t for t in body['tutors'])

    def test_limit_is_clamped(self, api, make):
        for i in range(26):
            make.tutor(f'Tutor {i:02}')
        maya = make.user()
        assert len(recommended(api, maya)['tutors']) == 6
        assert len(recommended(api, maya, '?limit=1')['tutors']) == 1
        assert len(recommended(api, maya, '?limit=0')['tutors']) == 1
        assert len(recommended(api, maya, '?limit=100')['tutors']) == 24


class TestDirectory:
    def test_ranked_by_match_once_the_profile_is_complete(self, api, make):
        make.tutor('Priya Shah', subjects='Chemistry', rate=30)
        make.tutor('Oliver Grant', subjects='Mathematics', rate=22)
        maya = make.user()

        before = api.get('/api/tutors', user=maya).get_json()
        assert before['matched'] is False
        assert 'match' not in before['tutors'][0]

        save(api, maya, **PROFILE)
        after = api.get('/api/tutors', user=maya).get_json()
        assert after['matched'] is True
        assert [t['name'] for t in after['tutors']] == ['Oliver Grant', 'Priya Shah']

    def test_explicit_sort_wins(self, api, make):
        make.tutor('Priya Shah', subjects='Chemistry', rate=18)
        make.tutor('Oliver Grant', subjects='Mathematics', rate=22)
        maya = make.user()
        save(api, maya, **PROFILE)
        tutors = api.get('/api/tutors?sort=price_low', user=maya).get_json()['tutors']
        assert [t['hourly_rate'] for t in tutors] == [18.0, 22.0]

    def test_filters(self, api, make):
        make.tutor('Priya Shah', subjects='Chemistry', university="King's College London")
        make.tutor('Oliver Grant', subjects='Mathematics')
        maya = make.user()
        by_subject = api.get('/api/tutors?subject=chem', user=maya).get_json()['tutors']
        assert [t['name'] for t in by_subject] == ['Priya Shah']
        by_uni = api.get('/api/tutors?university=King', user=maya).get_json()['tutors']
        assert [t['name'] for t in by_uni] == ['Priya Shah']
