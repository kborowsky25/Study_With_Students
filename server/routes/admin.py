"""Admin: tutor approval, screening queue, platform stats."""

from flask import Blueprint, jsonify, request

from ..db import get_db
from ..permissions import check_admin
from ..referrals import reward_tutor_approval

bp = Blueprint('admin', __name__, url_prefix='/api')

# Every endpoint needs the X-Admin-Secret header or a super-admin JWT (permissions.check_admin).
# Tutors are approved through the screening queue.


# ── Admin — screening queue ────────────────────────────────────────────────────

@bp.route('/admin/screening-queue', methods=['GET'])
def admin_screening_queue():
    if not check_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT tp.id_tutor, u.name, u.email,
                   tp.university, tp.course, tp.subjects,
                   tp.screening_status, tp.screening_notes,
                   tp.uni_email, tp.uni_email_verified,
                   tp.proof_doc_path
            FROM tutor_profiles tp
            JOIN users u ON u.id_user = tp.id_user
            ORDER BY tp.id_tutor DESC
        """)
        return jsonify({'queue': cur.fetchall()}), 200
    finally:
        cur.close(); conn.close()


@bp.route('/admin/screening/<int:tutor_id>/approve', methods=['POST'])
def admin_approve_screening(tutor_id):
    if not check_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE tutor_profiles SET screening_status = 'approved', screening_notes = NULL WHERE id_tutor = %s",
            (tutor_id,)
        )
        approved = cur.rowcount
        if approved:
            reward_tutor_approval(cur, tutor_id)  # XP for the tutor who invited them, once DBS is verified too
        conn.commit()
        if approved == 0:
            return jsonify({'error': 'Tutor not found'}), 404
        return jsonify({'message': f'Tutor {tutor_id} approved'}), 200
    finally:
        cur.close(); conn.close()


@bp.route('/admin/screening/<int:tutor_id>/reject', methods=['POST'])
def admin_reject_screening(tutor_id):
    if not check_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    data  = request.get_json(silent=True) or {}
    notes = (data.get('notes') or '').strip()
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE tutor_profiles SET screening_status = 'rejected', screening_notes = %s WHERE id_tutor = %s",
            (notes or None, tutor_id)
        )
        conn.commit()
        if cur.rowcount == 0:
            return jsonify({'error': 'Tutor not found'}), 404
        return jsonify({'message': f'Tutor {tutor_id} rejected'}), 200
    finally:
        cur.close(); conn.close()


# ── Admin — platform stats & user management ──────────────────────────────────

@bp.route('/admin/stats', methods=['GET'])
def admin_stats():
    if not check_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT
              (SELECT COUNT(*) FROM users)                                              AS total_users,
              (SELECT COUNT(*) FROM tutor_profiles)                                     AS total_tutors,
              (SELECT COUNT(*) FROM student_profiles)                                   AS total_students,
              (SELECT COUNT(*) FROM tutor_profiles WHERE screening_status = 'pending')  AS pending_screenings,
              (SELECT COUNT(*) FROM tutor_profiles WHERE screening_status = 'approved') AS approved_tutors,
              (SELECT COUNT(*) FROM events WHERE status <> 'canceled')                  AS total_sessions,
              (SELECT COUNT(*) FROM events WHERE status = 'paid')                       AS completed_sessions
        """)
        stats = {k: int(v or 0) for k, v in cur.fetchone().items()}

        # Booking fees on paid sessions are the platform's only revenue; tutors keep the rest
        cur.execute("""
            SELECT COALESCE(SUM(booking_fee), 0) AS booking_fee_revenue,
                   COALESCE(SUM(amount), 0)      AS tutor_earnings
            FROM events WHERE status = 'paid'
        """)
        stats.update(cur.fetchone())

        cur.execute("""
            SELECT DATE(created_at) AS day, COUNT(*) AS signups
            FROM users
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY day ASC
        """)
        stats['signups_last_30d'] = cur.fetchall()
        return jsonify({'stats': stats})
    finally:
        cur.close(); conn.close()


@bp.route('/admin/users', methods=['GET'])
def admin_users():
    if not check_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT u.id_user, u.name, u.email,
                   (SELECT COUNT(*) FROM tutor_profiles tp WHERE tp.id_user = u.id_user) AS is_tutor,
                   (SELECT tp.screening_status FROM tutor_profiles tp
                     WHERE tp.id_user = u.id_user LIMIT 1) AS screening_status
            FROM users u
            ORDER BY u.id_user DESC
            LIMIT 200
        """)
        rows = cur.fetchall()
        for r in rows:
            r['is_tutor'] = bool(r['is_tutor'])
        return jsonify({'users': rows}), 200
    finally:
        cur.close(); conn.close()


@bp.route('/admin/recent-events', methods=['GET'])
def admin_recent_events():
    if not check_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT e.id_event, e.title, e.status, e.start_time, e.end_time, e.amount, e.booking_fee, e.fee_waived,
                   s.name AS student_name, s.email AS student_email,
                   t.name AS tutor_name
            FROM events e
            JOIN student_profiles sp ON sp.id_student = e.student_id
            JOIN users s             ON s.id_user     = sp.id_user
            JOIN tutor_profiles tp   ON tp.id_tutor   = e.tutor_id
            JOIN users t             ON t.id_user     = tp.id_user
            ORDER BY e.start_time DESC
            LIMIT 50
        """)
        return jsonify({'events': cur.fetchall()})
    finally:
        cur.close(); conn.close()
