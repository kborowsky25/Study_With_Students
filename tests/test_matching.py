"""The matching model (server/matching.py) — plain unit tests, no database needed.

Points: subjects 45, level 15, budget 15, availability 10, quality 15 (rating 8, verified 4,
experience 3). The component tests hold everything else neutral so each weight shows on its own.
"""
from decimal import Decimal

import pytest

from server.matching import (
    LEVELS,
    parse_availability,
    parse_subjects,
    profile_complete,
    score_tutor,
    smoothed_rating,
)

# A tutor with no reviews, no verification and no sessions: quality = 8 × (4.3 − 3) / 2 = 5.2
TUTOR = {
    'subjects': 'Mathematics', 'levels': '', 'hourly_rate': 20, 'availability': '',
    'rating': None, 'review_count': 0, 'verified': False, 'sessions_done': 0,
}
# A learner who only names a subject: no level → 9, no budget → 10, no availability → 5
LEARNER = {'subjects': 'Maths', 'level': None, 'budget': None, 'availability': None}

NEUTRAL = 9 + 10 + 5 + 5.2   # everything except subjects, for LEARNER × TUTOR


def score(learner=None, tutor=None, **changes):
    learner = {**LEARNER, **(learner or {})}
    tutor = {**TUTOR, **(tutor or {}), **changes}
    return score_tutor(learner, tutor)


# ── Parsing ───────────────────────────────────────────────────────────────────

class TestParseSubjects:
    def test_aliases_and_separators(self):
        assert parse_subjects('Maths, Further Maths & Physics') == {'mathematics', 'further mathematics', 'physics'}
        assert parse_subjects('CS / Econ; bio and chem') == {'computer science', 'economics', 'biology', 'chemistry'}

    def test_normalises_case_spacing_and_trailing_dots(self):
        assert parse_subjects('  MATHS ,  English   Lit. ') == {'mathematics', 'english literature'}

    def test_and_only_splits_on_the_whole_word(self):
        assert parse_subjects('Sandwich design') == {'sandwich design'}

    def test_unknown_subjects_are_kept_verbatim(self):
        assert parse_subjects('Astrophysics') == {'astrophysics'}

    @pytest.mark.parametrize('text', [None, '', '  ', ', ,'])
    def test_empty(self, text):
        assert parse_subjects(text) == set()


class TestParseAvailability:
    def test_day_and_time(self):
        assert parse_availability('Weekday evenings') == {('weekday', 'evening')}
        assert parse_availability('Sunday afternoons') == {('weekend', 'afternoon')}

    def test_after_school_means_weekday_afternoons(self):
        assert parse_availability('after school') == {('weekday', 'afternoon')}

    def test_missing_part_widens_to_every_option(self):
        assert parse_availability('weekends') == {('weekend', t) for t in ('morning', 'afternoon', 'evening')}
        assert parse_availability('evenings') == {('weekday', 'evening'), ('weekend', 'evening')}

    def test_combinations_cross_multiply(self):
        assert parse_availability('Weekday evenings, Sunday afternoons') == {
            ('weekday', 'evening'), ('weekday', 'afternoon'), ('weekend', 'evening'), ('weekend', 'afternoon'),
        }

    @pytest.mark.parametrize('text', [None, '', 'whenever suits'])
    def test_unknown_is_empty(self, text):
        assert parse_availability(text) == set()


def test_smoothed_rating_pulls_small_samples_towards_the_prior():
    assert smoothed_rating(None, 0) == pytest.approx(4.3)
    assert smoothed_rating(5, 3) == pytest.approx(4.65)
    assert smoothed_rating(Decimal('3.0'), 1000) == pytest.approx(3.0039, abs=1e-4)


# ── Scoring components ───────────────────────────────────────────────────────

class TestSubjects:
    def test_every_subject_taught(self):
        assert score() == (round(45 + NEUTRAL), ['Teaches Mathematics'])

    def test_half_the_subjects(self):
        assert score({'subjects': 'Maths, Physics'}) == (round(22.5 + NEUTRAL), ['Teaches Mathematics'])

    def test_related_subject_counts_half_without_a_reason(self):
        assert score({'subjects': 'Further Maths'}) == (round(22.5 + NEUTRAL), [])

    def test_unrelated_subject_scores_nothing(self):
        assert score({'subjects': 'Chemistry'}) == (round(0 + NEUTRAL), [])

    def test_no_subjects_is_neutral(self):
        assert score({'subjects': ''}) == (round(22.5 + NEUTRAL), [])

    def test_reason_names_two_subjects_at_most(self):
        _, reasons = score({'subjects': 'Maths, Physics, Chemistry'}, subjects='Chemistry, Maths, Physics')
        assert reasons == ['Teaches Chemistry, Mathematics']


class TestLevel:
    # LEARNER × TUTOR without the level part: 45 + 10 + 5 + 5.2
    BASE = 45 + 10 + 5 + 5.2

    def test_tutor_teaches_the_level(self):
        assert score({'level': 'A-level'}, levels='GCSE, A-level') == (round(self.BASE + 15),
                                                                         ['Teaches Mathematics', 'Teaches A-level'])

    def test_level_match_ignores_case(self):
        assert score({'level': 'a-level'}, levels='GCSE, A-level')[0] == round(self.BASE + 15)

    def test_tutor_teaches_other_levels(self):
        assert score({'level': 'IB'}, levels='GCSE')[0] == round(self.BASE + 3)

    def test_tutor_lists_no_levels(self):
        assert score({'level': 'GCSE'})[0] == round(self.BASE + 12)
        assert score({'level': 'University'})[0] == round(self.BASE + 7)

    def test_learner_has_no_level(self):
        assert score()[0] == round(self.BASE + 9)


class TestBudget:
    BASE = 45 + 9 + 5 + 5.2

    def test_within_budget(self):
        assert score({'budget': 20}, hourly_rate=18) == (round(self.BASE + 15),
                                                          ['Teaches Mathematics', '£18/hr — within your budget'])

    def test_up_to_20_percent_over(self):
        assert score({'budget': 20}, hourly_rate=24)[0] == round(self.BASE + 7)

    def test_further_over(self):
        assert score({'budget': 20}, hourly_rate=24.5)[0] == round(self.BASE)

    @pytest.mark.parametrize('budget', [None, ''])
    def test_no_budget(self, budget):
        assert score({'budget': budget}, hourly_rate=200)[0] == round(self.BASE + 10)

    def test_decimals_from_mysql(self):
        _, reasons = score({'budget': Decimal('25.00')}, hourly_rate=Decimal('22.50'))
        assert reasons[-1] == '£22.5/hr — within your budget'

    def test_missing_rate_counts_as_20(self):
        assert score({'budget': 20}, hourly_rate=None)[0] == round(self.BASE + 15)


class TestAvailability:
    BASE = 45 + 9 + 10 + 5.2

    def test_full_overlap(self):
        assert score({'availability': 'weekday evenings'}, availability='Weekday evenings') == (
            round(self.BASE + 10), ['Teaches Mathematics', 'Free weekday evenings'])

    def test_partial_overlap(self):
        # The learner is free on 2 slots (weekday and weekend evenings); the tutor shares one.
        assert score({'availability': 'evenings'}, availability='weekday evenings')[0] == round(self.BASE + 5)

    def test_no_overlap(self):
        assert score({'availability': 'weekday evenings'}, availability='weekends') == (
            round(self.BASE), ['Teaches Mathematics'])

    def test_unknown_on_either_side_is_neutral(self):
        assert score({'availability': 'weekday evenings'})[0] == round(self.BASE + 5)
        assert score(availability='weekday evenings')[0] == round(self.BASE + 5)

    def test_reason_describes_the_shared_slots(self):
        _, reasons = score({'availability': 'weekend mornings and afternoons'}, availability='weekends')
        assert reasons[-1] == 'Free weekend mornings & afternoons'


class TestQuality:
    BASE = 45 + 9 + 10 + 5

    def test_rating_reason_needs_4_5_and_reviews(self):
        assert score(rating=4.8, review_count=1)[1][-1] == 'Rated 4.8 by 1 student'
        assert score(rating=5, review_count=12)[1][-1] == 'Rated 5.0 by 12 students'
        assert score(rating=4.4, review_count=12)[1] == ['Teaches Mathematics']

    def test_verified_adds_4_points(self):
        assert score(verified=True) == (
            round(self.BASE + 5.2 + 4), ['Teaches Mathematics', 'Verified university student'])

    @pytest.mark.parametrize(('sessions', 'points'), [(0, 0), (1, 1), (3, 2), (7, 3), (500, 3)])
    def test_experience_is_logarithmic_and_capped(self, sessions, points):
        assert score(sessions_done=sessions)[0] == round(self.BASE + 5.2 + points)


# ── Whole model ───────────────────────────────────────────────────────────────

PERFECT_LEARNER = {'subjects': 'Maths', 'level': 'A-level', 'budget': 25, 'availability': 'Weekday evenings'}
PERFECT_TUTOR = {
    'subjects': 'Mathematics, Physics', 'levels': 'GCSE, A-level', 'hourly_rate': 22,
    'availability': 'Weekday evenings', 'rating': 5, 'review_count': 10, 'verified': True, 'sessions_done': 7,
}


def test_strong_match_scores_high_and_explains_itself_in_three_reasons():
    points, reasons = score_tutor(PERFECT_LEARNER, PERFECT_TUTOR)
    # 45 + 15 + 15 + 10 + 8 × (4.8385 − 3) / 2 + 4 + 3
    assert points == 99
    # Six reasons apply; the three most useful are kept, in a fixed order.
    assert reasons == ['Teaches Mathematics', '£22/hr — within your budget', 'Free weekday evenings']


def test_score_never_exceeds_100():
    best = {**PERFECT_TUTOR, 'review_count': 10**6, 'sessions_done': 10**6}
    assert score_tutor(PERFECT_LEARNER, best)[0] == 100


def test_weak_match_scores_low():
    tutor = {**TUTOR, 'subjects': 'History', 'levels': 'University', 'hourly_rate': 60,
             'availability': 'weekend mornings'}
    points, reasons = score_tutor(PERFECT_LEARNER, tutor)
    assert points == round(0 + 3 + 0 + 0 + 5.2)
    assert reasons == []


@pytest.mark.parametrize(('learner', 'complete'), [
    (None, False),
    ({}, False),
    ({'subjects': ''}, False),
    ({'subjects': ' , '}, False),
    ({'subjects': 'Maths'}, True),
])
def test_profile_complete_needs_a_subject(learner, complete):
    assert profile_complete(learner) is complete


def test_levels_offered():
    assert LEVELS == ('GCSE', 'A-level', 'IB', 'University', 'Other')


def test_weekly_hours_become_slots():
    from datetime import timedelta

    from server.matching import slots_from_hours
    rows = [(1, timedelta(hours=17), timedelta(hours=20)),   # Tuesday evening
            (6, timedelta(hours=13), timedelta(hours=15)),   # Sunday afternoon
            (2, timedelta(hours=11, minutes=30), timedelta(hours=12, minutes=15))]  # under an hour: ignored
    assert slots_from_hours(rows) == {('weekday', 'evening'), ('weekend', 'afternoon')}


def test_weekly_hours_win_over_free_text():
    learner = {'subjects': 'Maths', 'availability': 'Weekend afternoons'}
    tutor = {'subjects': 'Maths', 'availability': 'Weekday mornings', 'hourly_rate': 20,
             'hours_slots': {('weekend', 'afternoon')}}
    score, reasons = score_tutor(learner, tutor)
    assert any(r.startswith('Free weekend') for r in reasons)
