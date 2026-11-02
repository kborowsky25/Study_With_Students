"""Tutors: directory, likes, profiles, avatars, active students and invite requests."""
import os

from flask import Blueprint, jsonify, request, send_from_directory
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename

from ..config import upload_dir
from ..db import current_user_id, get_db

bp = Blueprint('tutors', __name__, url_prefix='/api')

# ── Tutor avatar upload ───────────────────────────────────────────────────────

AVATAR_DIR = upload_dir('tutor-avatars')

@bp.route('/tutor-profile/avatar', methods=['POST'])
@jwt_required()
def upload_tutor_avatar():
    uid = current_user_id()
    if 'avatar' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    f = request.files['avatar']
    if not f.filename:
        return jsonify({'error': 'No file selected'}), 400
    ext = f.filename.rsplit('.', 1)[-1].lower()
    if ext not in ('png', 'jpg', 'jpeg', 'webp'):
        return jsonify({'error': 'Only PNG, JPG, JPEG, WEBP allowed'}), 400
    if f.content_length and f.content_length > 5 * 1024 * 1024:
        return jsonify({'error': 'File too large (max 5 MB)'}), 400

    filename = secure_filename(f'avatar_{uid}.{ext}')
    f.save(os.path.join(AVATAR_DIR, filename))

    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("UPDATE tutor_profiles SET avatar_path = %s WHERE id_user = %s", (filename, uid))
        conn.commit()
        return jsonify({'avatar_url': f'/api/uploads/tutor-avatars/{filename}'}), 200
    finally:
        cur.close(); conn.close()


@bp.route('/uploads/tutor-avatars/<path:filename>', methods=['GET'])
def serve_tutor_avatar(filename):
    """Serve tutor avatar images — public."""
    return send_from_directory(AVATAR_DIR, filename)


# ── Tutors ────────────────────────────────────────────────────────────────────

TUTOR_COLUMNS = """
    tp.id_tutor, tp.id_user, u.name, tp.age, tp.university, tp.course,
    tp.about_me, tp.subjects, tp.levels, tp.availability, tp.hourly_rate, tp.avatar_path,
    tp.screening_status = 'approved' AS verified,
    rv.rating, COALESCE(rv.review_count, 0) AS review_count,
    COALESCE(ev.sessions_done, 0) AS sessions_done
"""

# FROM clause shared by every tutor listing: profile, name, rating and experience
TUTOR_JOINS = """
    FROM tutor_profiles tp
    JOIN users u ON u.id_user = tp.id_user
    LEFT JOIN (SELECT tutor_id, ROUND(AVG(rating), 2) AS rating, COUNT(*) AS review_count
               FROM reviews GROUP BY tutor_id) rv ON rv.tutor_id = tp.id_tutor
    LEFT JOIN (SELECT tutor_id, COUNT(*) AS sessions_done FROM events
               WHERE (status = 'paid' OR (status = 'confirmed' AND end_time < NOW()))
                 AND kind <> 'room' AND LEFT(COALESCE(title, ''), 12) <> 'Study Room: '
               GROUP BY tutor_id) ev ON ev.tutor_id = tp.id_tutor
"""

SORTS = {
    'rating':     lambda t: (-(t.get('rating') or 0), -t['review_count'], t['name']),
    'price_low':  lambda t: (float(t.get('hourly_rate') or 0), t['name']),
    'price_high': lambda t: (-float(t.get('hourly_rate') or 0), t['name']),
    'name':       lambda t: t['name'].lower(),
}


def decorate_tutors(tutors):
    for t in tutors:
        t['verified']   = bool(t.get('verified'))
        t['rating']     = float(t['rating']) if t.get('rating') is not None else None
        t['avatar_url'] = f"/api/uploads/tutor-avatars/{t['avatar_path']}" if t.get('avatar_path') else None
    return tutors


def _tutor_id_for(cur, user_id):
    cur.execute("SELECT id_tutor FROM tutor_profiles WHERE id_user = %s LIMIT 1", (user_id,))
    row = cur.fetchone()
    if not row:
        return None
    return row['id_tutor'] if isinstance(row, dict) else row[0]


@bp.route('/tutors', methods=['GET'])
@jwt_required()
def get_tutors():
    """Directory of tutors with a complete profile.

    `sort`: match (default when the student has a learning profile), rating, price_low, price_high, name.
    """
    from ..matching import profile_complete
    from .learning import load_learning_profile, rank_tutors

    university = request.args.get('university', '').strip()
    subject    = request.args.get('subject', '').strip()
    sort       = request.args.get('sort', '')

    query = f"""
        SELECT {TUTOR_COLUMNS}
        {TUTOR_JOINS}
        WHERE u.name <> '' AND COALESCE(tp.university, '') <> '' AND tp.screening_status <> 'rejected'
    """
    params = []
    if university:
        query += " AND tp.university LIKE %s"
        params.append(f'%{university}%')
    if subject:
        query += " AND (tp.subjects LIKE %s OR u.name LIKE %s)"
        params += [f'%{subject}%', f'%{subject}%']

    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute(query, params)
        tutors = decorate_tutors(cur.fetchall())
        learner = load_learning_profile(cur, current_user_id())
        if profile_complete(learner):
            rank_tutors(learner, tutors)          # adds match + reasons, best first
        if sort in SORTS:
            tutors.sort(key=SORTS[sort])
        elif not profile_complete(learner):
            tutors.sort(key=lambda t: (not t['verified'], -(t.get('rating') or 0), t['name']))
        return jsonify({'tutors': tutors, 'matched': profile_complete(learner)})
    finally:
        cur.close(); conn.close()


@bp.route('/tutors/<int:tutor_id>', methods=['GET'])
@jwt_required()
def get_tutor(tutor_id):
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute(f"""
            SELECT {TUTOR_COLUMNS}, COALESCE(tp.linkedin_url, '') AS linkedin_url
            {TUTOR_JOINS}
            WHERE tp.id_tutor = %s
        """, (tutor_id,))
        tutor = cur.fetchone()
        if not tutor:
            return jsonify({'error': 'Tutor not found'}), 404
        decorate_tutors([tutor])

        cur.execute("SELECT liked FROM liked_tutors WHERE id_user = %s AND id_tutor = %s", (uid, tutor_id))
        liked_row = cur.fetchone()

        cur.execute("SELECT 1 FROM active_tutors WHERE id_user = %s AND id_tutor = %s", (uid, tutor_id))
        connected = cur.fetchone() is not None

        cur.execute("""
            SELECT tr.status FROM tutor_requests tr
            JOIN student_profiles sp ON sp.id_student = tr.student_id
            WHERE sp.id_user = %s AND tr.tutor_id = %s
            ORDER BY tr.id DESC LIMIT 1
        """, (uid, tutor_id))
        request_row = cur.fetchone()

        return jsonify({
            'tutor':          tutor,
            'liked':          bool(liked_row and liked_row['liked']),
            'connected':      connected,
            'request_status': request_row['status'] if request_row else None,
        })
    finally:
        cur.close(); conn.close()


@bp.route('/tutors/<int:tutor_id>/like', methods=['POST'])
@jwt_required()
def like_tutor(tutor_id):
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("SELECT liked FROM liked_tutors WHERE id_user = %s AND id_tutor = %s", (uid, tutor_id))
        row = cur.fetchone()
        liked = not row[0] if row else True
        cur.execute("""
            INSERT INTO liked_tutors (id_user, id_tutor, liked) VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE liked = VALUES(liked)
        """, (uid, tutor_id, liked))
        conn.commit()
        return jsonify({'liked': liked})
    finally:
        cur.close(); conn.close()


@bp.route('/liked-tutors', methods=['GET'])
@jwt_required()
def liked_tutors():
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute(f"""
            SELECT {TUTOR_COLUMNS}
            {TUTOR_JOINS}
            JOIN liked_tutors lt ON lt.id_tutor = tp.id_tutor
            WHERE lt.id_user = %s AND lt.liked = 1
        """, (current_user_id(),))
        return jsonify({'tutors': decorate_tutors(cur.fetchall())})
    finally:
        cur.close(); conn.close()


@bp.route('/active-tutors', methods=['GET'])
@jwt_required()
def active_tutors():
    """Tutors who accepted this student's request."""
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute(f"""
            SELECT DISTINCT {TUTOR_COLUMNS}
            {TUTOR_JOINS}
            JOIN active_tutors at2 ON at2.id_tutor = tp.id_tutor
            WHERE at2.id_user = %s
        """, (current_user_id(),))
        return jsonify({'tutors': decorate_tutors(cur.fetchall())})
    finally:
        cur.close(); conn.close()


@bp.route('/tutors/<int:tutor_id>/activate', methods=['DELETE'])
@jwt_required()
def deactivate_tutor(tutor_id):
    """Student ends a tutoring connection (they can request again later)."""
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("SELECT id_student FROM active_tutors WHERE id_user = %s AND id_tutor = %s", (uid, tutor_id))
        student_ids = [r[0] for r in cur.fetchall()]
        cur.execute("DELETE FROM active_tutors WHERE id_user = %s AND id_tutor = %s", (uid, tutor_id))
        for sid in student_ids:
            cur.execute("DELETE FROM active_students WHERE id_tutor = %s AND id_student = %s", (tutor_id, sid))
            cur.execute("DELETE FROM tutor_requests WHERE tutor_id = %s AND student_id = %s", (tutor_id, sid))
        conn.commit()
        return jsonify({'message': 'Tutor removed'})
    finally:
        cur.close(); conn.close()


# ── Tutor profile (self) ──────────────────────────────────────────────────────

PROFILE_FIELDS = (
    'age', 'university', 'course', 'about_me', 'subjects', 'levels',
    'availability', 'linkedin_url', 'hourly_rate',
)


@bp.route('/tutor-profile', methods=['GET'])
@jwt_required()
def get_tutor_profile():
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM tutor_profiles WHERE id_user = %s LIMIT 1", (current_user_id(),))
        profile = cur.fetchone()
        if profile and profile.get('avatar_path'):
            profile['avatar_url'] = f"/api/uploads/tutor-avatars/{profile['avatar_path']}"
        return jsonify({'profile': profile})
    finally:
        cur.close(); conn.close()


@bp.route('/tutor-profile', methods=['POST'])
@jwt_required()
def save_tutor_profile():
    uid  = current_user_id()
    data = request.get_json(silent=True) or {}
    values = {k: data.get(k) for k in PROFILE_FIELDS if k in data}

    if 'hourly_rate' in values:
        try:
            values['hourly_rate'] = round(float(values['hourly_rate']), 2)
        except (TypeError, ValueError):
            return jsonify({'error': 'Hourly rate must be a number'}), 400
        if not 5 <= values['hourly_rate'] <= 200:
            return jsonify({'error': 'Hourly rate must be between £5 and £200'}), 400
    if values.get('age') in ('', None):
        values['age'] = None

    conn = get_db(); cur = conn.cursor()
    try:
        tutor_id = _tutor_id_for(cur, uid)
        if tutor_id:
            if values:
                assignments = ', '.join(f'{k} = %s' for k in values)
                cur.execute(f"UPDATE tutor_profiles SET {assignments} WHERE id_tutor = %s",
                            (*values.values(), tutor_id))
        else:
            columns = ['id_user', *values]
            cur.execute(
                f"INSERT INTO tutor_profiles ({', '.join(columns)}) VALUES ({', '.join(['%s'] * len(columns))})",
                (uid, *values.values()),
            )
        conn.commit()

        cur.execute("SELECT screening_status FROM tutor_profiles WHERE id_user = %s LIMIT 1", (uid,))
        return jsonify({'message': 'Profile saved', 'status': cur.fetchone()[0], 'is_new': tutor_id is None})
    finally:
        cur.close(); conn.close()


# ── Active students ───────────────────────────────────────────────────────────

@bp.route('/active-students', methods=['GET'])
@jwt_required()
def active_students():
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        tutor_id = _tutor_id_for(cur, current_user_id())
        if not tutor_id:
            return jsonify({'students': []})
        cur.execute("""
            SELECT DISTINCT sp.id_student, sp.id_user AS user_id, u.name, u.email
            FROM active_students ast2
            JOIN student_profiles sp ON sp.id_student = ast2.id_student
            JOIN users u ON u.id_user = sp.id_user
            WHERE ast2.id_tutor = %s
        """, (tutor_id,))
        return jsonify({'students': cur.fetchall()})
    finally:
        cur.close(); conn.close()


# ── Tutor invite/request system ───────────────────────────────────────────────
#

@bp.route('/tutors/<int:tutor_id>/request', methods=['POST'])
@jwt_required()
def send_tutor_request(tutor_id):
    """Student sends an invite to a tutor (pending until tutor accepts)."""
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("SELECT id_user FROM tutor_profiles WHERE id_tutor = %s", (tutor_id,))
        tutor = cur.fetchone()
        if not tutor:
            return jsonify({'error': 'Tutor not found'}), 404
        if tutor[0] == uid:
            return jsonify({'error': "You can't send a request to yourself"}), 400

        # Get or auto-create student profile
        cur.execute("SELECT id_student FROM student_profiles WHERE id_user = %s", (uid,))
        row = cur.fetchone()
        if not row:
            cur.execute("INSERT INTO student_profiles (id_user) VALUES (%s)", (uid,))
            conn.commit()
            student_id = cur.lastrowid
        else:
            student_id = row[0]

        # Check for existing request
        cur.execute(
            "SELECT id, status FROM tutor_requests WHERE student_id = %s AND tutor_id = %s",
            (student_id, tutor_id)
        )
        existing = cur.fetchone()
        if existing:
            existing_status = existing[1]
            if existing_status == 'pending':
                return jsonify({'error': 'Request already sent'}), 409
            if existing_status == 'accepted':
                return jsonify({'error': 'Already an active tutor'}), 409
            # Declined — allow re-request by resetting to pending
            cur.execute(
                "UPDATE tutor_requests SET status = 'pending', created_at = NOW() WHERE id = %s",
                (existing[0],)
            )
            conn.commit()
            return jsonify({'message': 'Request re-sent', 'request_id': existing[0]})

        cur.execute(
            "INSERT INTO tutor_requests (student_id, tutor_id, status) VALUES (%s, %s, 'pending')",
            (student_id, tutor_id)
        )
        conn.commit()
        return jsonify({'message': 'Request sent', 'request_id': cur.lastrowid})
    finally:
        cur.close(); conn.close()


@bp.route('/tutor-requests/sent', methods=['GET'])
@jwt_required()
def get_sent_requests():
    """Student sees all their sent tutor requests with statuses."""
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id_student FROM student_profiles WHERE id_user = %s", (uid,))
        row = cur.fetchone()
        if not row:
            return jsonify({'requests': []})
        student_id = row['id_student']
        cur.execute("""
            SELECT tr.id, tr.tutor_id, tr.status, tr.created_at,
                   u.name AS tutor_name, tp.university, tp.subjects
            FROM tutor_requests tr
            JOIN tutor_profiles tp ON tp.id_tutor = tr.tutor_id
            JOIN users u ON u.id_user = tp.id_user
            WHERE tr.student_id = %s
            ORDER BY tr.created_at DESC
        """, (student_id,))
        return jsonify({'requests': cur.fetchall()})
    finally:
        cur.close(); conn.close()


@bp.route('/tutor-requests/received', methods=['GET'])
@jwt_required()
def get_received_requests():
    """Tutor sees incoming pending student requests."""
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id_tutor FROM tutor_profiles WHERE id_user = %s", (uid,))
        row = cur.fetchone()
        if not row:
            return jsonify({'requests': []})
        tutor_id = row['id_tutor']
        cur.execute("""
            SELECT tr.id, tr.student_id, tr.status, tr.created_at,
                   u.name AS student_name, u.email AS student_email
            FROM tutor_requests tr
            JOIN student_profiles sp ON sp.id_student = tr.student_id
            JOIN users u ON u.id_user = sp.id_user
            WHERE tr.tutor_id = %s AND tr.status = 'pending'
            ORDER BY tr.created_at DESC
        """, (tutor_id,))
        return jsonify({'requests': cur.fetchall()})
    finally:
        cur.close(); conn.close()


@bp.route('/tutor-requests/<int:request_id>', methods=['PATCH'])
@jwt_required()
def respond_tutor_request(request_id):
    """Tutor accepts or declines a student invite.
    On accept: automatically adds to active_tutors (student side) and active_students (tutor side).
    """
    uid    = current_user_id()
    action = request.get_json().get('action')  # 'accepted' or 'declined'
    if action not in ('accepted', 'declined'):
        return jsonify({'error': 'Invalid action — must be accepted or declined'}), 400

    conn = get_db(); cur = conn.cursor()
    try:
        # Verify this tutor owns the request
        cur.execute("SELECT id_tutor FROM tutor_profiles WHERE id_user = %s", (uid,))
        tp_row = cur.fetchone()
        if not tp_row:
            return jsonify({'error': 'Tutor profile not found'}), 404
        tutor_id = tp_row[0]

        cur.execute(
            "SELECT id, student_id FROM tutor_requests WHERE id = %s AND tutor_id = %s AND status = 'pending'",
            (request_id, tutor_id)
        )
        req = cur.fetchone()
        if not req:
            return jsonify({'error': 'Pending request not found'}), 404
        student_id = req[1]

        # Update request status
        cur.execute("UPDATE tutor_requests SET status = %s WHERE id = %s", (action, request_id))

        if action == 'accepted':
            # Resolve the student's user_id
            cur.execute("SELECT id_user FROM student_profiles WHERE id_student = %s", (student_id,))
            sp_row = cur.fetchone()
            if sp_row:
                student_user_id = sp_row[0]
                # Add to active_tutors (student sees this tutor in My Tutors)
                cur.execute(
                    "SELECT 1 FROM active_tutors WHERE id_user = %s AND id_tutor = %s",
                    (student_user_id, tutor_id)
                )
                if not cur.fetchone():
                    cur.execute(
                        "INSERT INTO active_tutors (id_user, id_student, id_tutor) VALUES (%s, %s, %s)",
                        (student_user_id, student_id, tutor_id)
                    )
            # Add to active_students (tutor sees this student in Active Students)
            cur.execute(
                "INSERT IGNORE INTO active_students (id_tutor, id_student) VALUES (%s, %s)",
                (tutor_id, student_id)
            )

        conn.commit()
        return jsonify({'message': f'Request {action}'})
    finally:
        cur.close(); conn.close()
