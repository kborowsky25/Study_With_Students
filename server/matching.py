"""Tutor ↔ student matching.

A transparent points model (0–100) so every recommendation can explain itself:

    subjects      45   how many of the student's subjects the tutor teaches
    level         15   tutor teaches the student's level (GCSE, A-level, …)
    budget        15   hourly rate within the student's budget
    availability  10   overlapping days/times
    quality       15   rating (Bayesian-smoothed), verification, experience

Weights are deliberately simple; tune them here as real booking data arrives.
"""
import math
import re

LEVELS = ('GCSE', 'A-level', 'IB', 'University', 'Other')

SUBJECT_ALIASES = {
    'maths': 'mathematics', 'math': 'mathematics', 'further maths': 'further mathematics',
    'further math': 'further mathematics', 'stats': 'statistics',
    'cs': 'computer science', 'comp sci': 'computer science', 'comp. sci.': 'computer science',
    'computing': 'computer science', 'programming': 'computer science', 'coding': 'computer science',
    'bio': 'biology', 'chem': 'chemistry', 'phys': 'physics',
    'econ': 'economics', 'econs': 'economics', 'business studies': 'business',
    'english lit': 'english literature', 'eng lit': 'english literature', 'english language': 'english',
    'psych': 'psychology', 'geog': 'geography', 'hist': 'history', 'compsci': 'computer science',
}

RELATED = {
    'mathematics':         {'further mathematics', 'statistics'},
    'further mathematics': {'mathematics'},
    'statistics':          {'mathematics'},
    'english':             {'english literature'},
    'english literature':  {'english'},
    'computer science':    {'python'},
    'python':              {'computer science'},
    'business':            {'economics'},
    'economics':           {'business'},
}

DAY_WORDS = {
    'weekday': ('weekday', 'weekdays', 'weeknight', 'weeknights', 'mon', 'tue', 'wed', 'thu', 'fri', 'after school'),
    'weekend': ('weekend', 'weekends', 'sat', 'sun'),
}
TIME_WORDS = {
    'morning':   ('morning', 'mornings', ' am'),
    'afternoon': ('afternoon', 'afternoons', 'after school', 'lunch'),
    'evening':   ('evening', 'evenings', 'night', 'nights', 'weeknight', 'weeknights', ' pm'),
}


def parse_subjects(text):
    """'Maths, Further Maths & Physics' → {'mathematics', 'further mathematics', 'physics'}"""
    parts = re.split(r'[,/;&]|\band\b', (text or '').lower())
    out = set()
    for part in parts:
        name = ' '.join(part.split()).strip(' .')
        if name:
            out.add(SUBJECT_ALIASES.get(name, name))
    return out


def parse_availability(text):
    """Free text → set of (day-kind, time-of-day) slots. Unknown parts widen the set."""
    t = f' {(text or "").lower()} '
    days = {d for d, words in DAY_WORDS.items() if any(w in t for w in words)}
    times = {p for p, words in TIME_WORDS.items() if any(w in t for w in words)}
    if not days and not times:
        return set()
    days = days or set(DAY_WORDS)
    times = times or set(TIME_WORDS)
    return {(d, p) for d in days for p in times}


def _slot_label(slots):
    days = sorted({d for d, _ in slots})
    times = [p for p in ('morning', 'afternoon', 'evening') if any(t == p for _, t in slots)]
    day = 'weekday' if days == ['weekday'] else 'weekend' if days == ['weekend'] else ''
    when = ' & '.join(f'{p}s' for p in times[:2])
    return ' '.join(x for x in (day, when) if x) or 'your times'


def smoothed_rating(avg, count, prior=4.3, weight=3):
    count = int(count or 0)
    return (prior * weight + float(avg or 0) * count) / (weight + count)


def score_tutor(learner, tutor):
    """Return (score 0–100, reasons[]) for one tutor against a learning profile.

    learner: {'subjects', 'level', 'budget', 'availability'}
    tutor:   {'subjects', 'levels', 'hourly_rate', 'availability',
              'rating', 'review_count', 'verified', 'sessions_done'}
    """
    reasons = []

    # Subjects (45)
    wanted = parse_subjects(learner.get('subjects'))
    taught = parse_subjects(tutor.get('subjects'))
    if wanted:
        hits, partial = [], []
        for s in wanted:
            if s in taught:
                hits.append(s)
            elif RELATED.get(s, set()) & taught:
                partial.append(s)
        subject_fit = (len(hits) + 0.5 * len(partial)) / len(wanted)
        if hits:
            reasons.append(('subject', f"Teaches {', '.join(h.title() for h in sorted(hits)[:2])}"))
    else:
        subject_fit = 0.5
    points = 45 * subject_fit

    # Level (15)
    level = learner.get('level')
    tutor_levels = {l.strip().lower() for l in (tutor.get('levels') or '').split(',') if l.strip()}
    if not level:
        points += 9
    elif tutor_levels:
        if level.lower() in tutor_levels:
            points += 15
            reasons.append(('level', f'Teaches {level}'))
        else:
            points += 3
    else:
        points += 12 if level in ('GCSE', 'A-level', 'IB') else 7

    # Budget (15)
    rate = float(tutor.get('hourly_rate') or 20)
    budget = learner.get('budget')
    if budget in (None, ''):
        points += 10
    else:
        budget = float(budget)
        if rate <= budget:
            points += 15
            reasons.append(('budget', f'£{rate:g}/hr — within your budget'))
        elif rate <= budget * 1.2:
            points += 7

    # Availability (10)
    want_slots = parse_availability(learner.get('availability'))
    have_slots = parse_availability(tutor.get('availability'))
    if not want_slots or not have_slots:
        points += 5
    else:
        overlap = want_slots & have_slots
        points += 10 * len(overlap) / len(want_slots)
        if overlap:
            reasons.append(('time', f'Free {_slot_label(overlap)}'))

    # Quality (15)
    count = int(tutor.get('review_count') or 0)
    rating = smoothed_rating(tutor.get('rating'), count)
    points += 8 * max(0.0, min(1.0, (rating - 3) / 2))
    if count and float(tutor.get('rating') or 0) >= 4.5:
        reasons.append(('rating', f"Rated {float(tutor['rating']):.1f} by {count} student{'s' if count > 1 else ''}"))
    if tutor.get('verified'):
        points += 4
        reasons.append(('verified', 'Verified university student'))
    points += min(3.0, math.log2(1 + int(tutor.get('sessions_done') or 0)))

    order = ['subject', 'budget', 'time', 'level', 'rating', 'verified']
    reasons.sort(key=lambda r: order.index(r[0]))
    return round(min(100, points)), [text for _, text in reasons[:3]]


def profile_complete(learner):
    return bool(learner and parse_subjects(learner.get('subjects')))
