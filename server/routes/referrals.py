"""Invite friends: my invite link, my booking-fee credits and the people who joined with it.

The rules (codes, credits, rewards and their limits) live in server/referrals.py.
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..db import current_user_id, get_db
from ..ratelimit import rate_limit
from ..referrals import (
    FAMILY_REFERRAL_XP,
    MAX_EARNED_CREDITS,
    TUTOR_REFERRAL_XP,
    available_credits,
    ensure_code,
    find_referrer,
    first_name,
    short_name,
)
from ..scheduling import local_now
from .background import dbs_verified_sql

bp = Blueprint('referrals', __name__, url_prefix='/api')


@bp.route('/referrals/lookup', methods=['GET'])
@rate_limit(60, per=600)  # per IP: enough for shared school networks, far too few to guess codes
def lookup_invite():
    """Who sent an invite link (`?code=`), for the sign-up page: their first name only."""
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        referrer = find_referrer(cur, request.args.get('code'))
    finally:
        cur.close(); conn.close()
    if not referrer:
        return jsonify({'error': 'This invite link isn’t valid'}), 404
    return jsonify({'first_name': first_name(referrer['name'])})


def _stage(row):
    """How far an invited person has got: joined → paid / approved → rewarded."""
    if row['tutor_at'] or (row['family_at'] and row['family_xp']):
        return 'xp'         # an invited tutor was approved, or a tutor's family paid: XP earned
    if row['family_at']:
        return 'credit'     # the family's first session was paid: credit earned
    if row['paid']:
        return 'paid'       # paid, but past the cap on earned credits
    if row['approved']:
        return 'approved'   # an approved tutor, invited by someone who doesn't tutor
    return 'joined'


@bp.route('/referrals', methods=['GET'])
@jwt_required()
def my_referrals():
    """My code (made on first visit), credits, rewards and the people who joined with my link.

    Invited people show as "Sam L." with their stage; nothing else about them is shared.
    """
    uid = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        code = ensure_code(cur, uid)
        conn.commit()
        cur.execute(f"""
            SELECT u.id_user, u.name, u.created_at,
                   EXISTS (SELECT 1 FROM tutor_profiles tp WHERE tp.id_user = u.id_user) AS tutor,
                   EXISTS (SELECT 1 FROM tutor_profiles tp WHERE tp.id_user = u.id_user
                           AND tp.screening_status = 'approved' AND {dbs_verified_sql('tp')}) AS approved,
                   EXISTS (SELECT 1 FROM events e JOIN student_profiles sp ON sp.id_student = e.student_id
                           WHERE sp.id_user = u.id_user AND e.status = 'paid' AND e.amount > 0) AS paid,
                   family.created_at AS family_at, family.xp AS family_xp, tutor.created_at AS tutor_at
            FROM users u
            LEFT JOIN referral_rewards family
                   ON family.kind = 'family' AND family.referred_id = u.id_user AND family.user_id = u.referred_by
            LEFT JOIN referral_rewards tutor
                   ON tutor.kind = 'tutor' AND tutor.referred_id = u.id_user AND tutor.user_id = u.referred_by
            WHERE u.referred_by = %s
            ORDER BY u.id_user DESC
        """, (uid,))
        invited = [{
            'id':          row['id_user'],
            'name':        short_name(row['name']),
            'joined_at':   row['created_at'],
            'tutor':       bool(row['tutor']),
            'stage':       _stage(row),
            'rewarded_at': row['tutor_at'] or row['family_at'],
        } for row in cur.fetchall()]

        cur.execute("""
            SELECT COALESCE(SUM(kind = 'family' AND xp = 0), 0) AS earned, COALESCE(SUM(xp), 0) AS xp
            FROM referral_rewards WHERE user_id = %s
        """, (uid,))
        totals = cur.fetchall()[0]
        cur.execute("SELECT id_tutor FROM tutor_profiles WHERE id_user = %s LIMIT 1", (uid,))
        tutor = bool(cur.fetchall())
        return jsonify({
            'code':          code,
            'tutor':         tutor,  # tutors earn XP for families too, not credits
            'credits':       available_credits(cur, uid, local_now()),
            'earned':        int(totals['earned']),
            'cap':           MAX_EARNED_CREDITS,
            'xp':            int(totals['xp']),
            'xp_per_family': FAMILY_REFERRAL_XP,
            'xp_per_tutor':  TUTOR_REFERRAL_XP,
            'invited':       invited,
        })
    finally:
        cur.close(); conn.close()
