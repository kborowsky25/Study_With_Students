"""Learning profile (what a student needs) and tutor recommendations from the matching model."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..db import current_user_id, get_db
from ..matching import LEVELS, profile_complete, score_tutor, slots_from_hours
from .tutors import TUTOR_COLUMNS, TUTOR_JOINS, decorate_tutors

bp = Blueprint('learning', __name__, url_prefix='/api')

PROFILE_FIELDS = ('subjects', 'level', 'budget', 'availability', 'goals')


def load_learning_profile(cur, user_id):
    cur.execute(
        "SELECT subjects, level, budget, availability, goals FROM student_profiles WHERE id_user = %s LIMIT 1",
        (user_id,),
    )
    row = cur.fetchone()
    if not row:
        return {k: None for k in PROFILE_FIELDS}
    return dict(zip(PROFILE_FIELDS, row, strict=True)) if not isinstance(row, dict) else row


def attach_weekly_hours(cur, tutors):
    """Give each tutor the slots their structured weekly hours cover (see matching.slots_from_hours)."""
    ids = [t['id_tutor'] for t in tutors]
    if not ids:
        return tutors
    cur.execute(
        f"SELECT tutor_id, weekday, start_time, end_time FROM tutor_availability "
        f"WHERE tutor_id IN ({', '.join(['%s'] * len(ids))})",
        ids,
    )
    hours = {}
    columns = ('tutor_id', 'weekday', 'start_time', 'end_time')
    for row in cur.fetchall():
        r = row if isinstance(row, dict) else dict(zip(columns, row, strict=True))
        hours.setdefault(r['tutor_id'], []).append((r['weekday'], r['start_time'], r['end_time']))
    for t in tutors:
        if t['id_tutor'] in hours:
            t['hours_slots'] = slots_from_hours(hours[t['id_tutor']])
    return tutors


def rank_tutors(learner, tutors, cur=None):
    """Attach match + reasons to each tutor and sort best first."""
    if cur is not None:
        attach_weekly_hours(cur, tutors)
    for t in tutors:
        t['match'], t['reasons'] = score_tutor(learner, t)
        t.pop('hours_slots', None)  # internal; sets aren't JSON
    tutors.sort(key=lambda t: (-t['match'], -(t.get('rating') or 0), t['name']))
    return tutors


@bp.route('/learning-profile', methods=['GET'])
@jwt_required()
def get_learning_profile():
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        profile = load_learning_profile(cur, current_user_id())
        return jsonify({'profile': profile, 'complete': profile_complete(profile), 'levels': LEVELS})
    finally:
        cur.close(); conn.close()


@bp.route('/learning-profile', methods=['PUT'])
@jwt_required()
def save_learning_profile():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({'error': 'Send the profile as a JSON object'}), 400
    values = {}
    if 'subjects' in data:
        values['subjects'] = str(data.get('subjects') or '').strip()[:255] or None
    if 'level' in data:
        level = data.get('level') or None
        if level and level not in LEVELS:
            return jsonify({'error': 'Unknown level'}), 400
        values['level'] = level
    if 'budget' in data:
        budget = data.get('budget')
        if budget in (None, ''):
            values['budget'] = None
        else:
            try:
                values['budget'] = round(float(budget), 2)
            except (TypeError, ValueError):
                return jsonify({'error': 'Budget must be a number'}), 400
            if not 5 <= values['budget'] <= 200:
                return jsonify({'error': 'Budget must be between £5 and £200 an hour'}), 400
    if 'availability' in data:
        values['availability'] = str(data.get('availability') or '').strip()[:255] or None
    if 'goals' in data:
        values['goals'] = str(data.get('goals') or '').strip()[:1000] or None

    uid = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id_student FROM student_profiles WHERE id_user = %s LIMIT 1", (uid,))
        if not cur.fetchone():
            cur.execute("INSERT INTO student_profiles (id_user) VALUES (%s)", (uid,))
        if values:
            assignments = ', '.join(f'{k} = %s' for k in values)
            cur.execute(f"UPDATE student_profiles SET {assignments} WHERE id_user = %s", (*values.values(), uid))
        conn.commit()
        profile = load_learning_profile(cur, uid)
        return jsonify({'profile': profile, 'complete': profile_complete(profile)})
    finally:
        cur.close(); conn.close()


@bp.route('/tutors/recommended', methods=['GET'])
@jwt_required()
def recommended_tutors():
    """Best-matching tutors the student isn't already working with."""
    uid = current_user_id()
    limit = min(max(request.args.get('limit', 6, type=int), 1), 24)
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        learner = load_learning_profile(cur, uid)
        cur.execute(f"""
            SELECT {TUTOR_COLUMNS}
            {TUTOR_JOINS}
            WHERE u.name <> '' AND COALESCE(tp.university, '') <> ''
              AND tp.screening_status <> 'rejected' AND u.suspended_at IS NULL
              AND tp.id_user <> %s
              AND tp.id_tutor NOT IN (SELECT id_tutor FROM active_tutors WHERE id_user = %s)
        """, (uid, uid))
        tutors = rank_tutors(learner, decorate_tutors(cur.fetchall()), cur)
        return jsonify({'tutors': tutors[:limit], 'profile_complete': profile_complete(learner)})
    finally:
        cur.close(); conn.close()
