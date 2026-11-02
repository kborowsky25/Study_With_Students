"""Classrooms: scheduled group classes students can enrol in."""
import re
from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..db import current_user_id, get_db

bp = Blueprint('classrooms', __name__, url_prefix='/api')

MAX_CLASS_SIZE = 20  # classes stay small
MAX_TITLE_LENGTH, MAX_SUBJECT_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_LINK_LENGTH = 255, 100, 2000, 500


def _parse_dt(value):
    try:
        return datetime.fromisoformat(str(value).replace('Z', '')[:19])
    except (TypeError, ValueError):
        return None


# ── Classrooms ────────────────────────────────────────────────────────────────

def _classrooms_missing(e):
    return '1146' in str(e) or "doesn't exist" in str(e).lower()


@bp.route('/classrooms', methods=['GET'])
@jwt_required()
def get_classrooms():
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        try:
            cur.execute("""
                SELECT c.id, c.title, c.subject, c.description,
                       c.capacity, c.start_time, c.end_time, c.zoom_link,
                       u.name AS tutor_name, tp.id_user AS tutor_user_id,
                       COUNT(DISTINCT ce.student_id) AS enrolled_count
                FROM classrooms c
                JOIN tutor_profiles tp ON tp.id_tutor = c.tutor_id
                JOIN users u ON u.id_user = tp.id_user
                LEFT JOIN classroom_enrollments ce ON ce.classroom_id = c.id
                GROUP BY c.id
                ORDER BY c.start_time ASC
            """)
            classrooms = cur.fetchall()
        except Exception as e:
            if _classrooms_missing(e):
                return jsonify({'classrooms': []})
            raise

        # Mark which classrooms the current user is enrolled in
        sp_cur = conn.cursor()
        sp_cur.execute("SELECT id_student FROM student_profiles WHERE id_user = %s", (uid,))
        sp_row = sp_cur.fetchone(); sp_cur.close()
        student_id = sp_row[0] if sp_row else None

        enrolled_ids = set()
        if student_id:
            e_cur = conn.cursor()
            e_cur.execute("SELECT classroom_id FROM classroom_enrollments WHERE student_id = %s", (student_id,))
            enrolled_ids = {r[0] for r in e_cur.fetchall()}
            e_cur.close()

        for c in classrooms:
            c['enrolled'] = c['id'] in enrolled_ids
            # Seats are limited: only the host and enrolled students get the meeting link
            if not c['enrolled'] and c['tutor_user_id'] != uid:
                c['zoom_link'] = None
            for key in ('start_time', 'end_time'):
                if c.get(key) and hasattr(c[key], 'isoformat'):
                    c[key] = c[key].isoformat()
        return jsonify({'classrooms': classrooms})
    finally:
        cur.close(); conn.close()


@bp.route('/classrooms', methods=['POST'])
@jwt_required()
def create_classroom():
    uid   = current_user_id()
    data  = request.get_json(silent=True) or {}
    title       = str(data.get('title') or '').strip()
    subject     = str(data.get('subject') or '').strip()
    description = str(data.get('description') or '').strip()
    start       = _parse_dt(data.get('start_time'))
    end         = _parse_dt(data.get('end_time'))
    link        = str(data.get('zoom_link') or '').strip()
    try:
        capacity = int(data.get('capacity') or MAX_CLASS_SIZE)
    except (TypeError, ValueError):
        capacity = MAX_CLASS_SIZE
    capacity = max(1, min(MAX_CLASS_SIZE, capacity))

    if not title:
        return jsonify({'error': 'Give the class a title'}), 400
    if (len(title) > MAX_TITLE_LENGTH or len(subject) > MAX_SUBJECT_LENGTH
            or len(description) > MAX_DESCRIPTION_LENGTH):
        return jsonify({'error': f'Titles are limited to {MAX_TITLE_LENGTH} characters, subjects to '
                                 f'{MAX_SUBJECT_LENGTH} and descriptions to {MAX_DESCRIPTION_LENGTH:,}'}), 400
    if not start or not end or end <= start:
        return jsonify({'error': 'Choose a valid start and end time'}), 400
    if end <= datetime.now():
        return jsonify({'error': 'That time has already passed'}), 400
    if link and (len(link) > MAX_LINK_LENGTH or not re.match(r'https://[^/\s]+\S*$', link, re.IGNORECASE)):
        return jsonify({'error': 'The meeting link must start with https://'}), 400

    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("SELECT id_tutor, screening_status FROM tutor_profiles WHERE id_user = %s", (uid,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Tutor profile required'}), 403
        if row[1] != 'approved':
            return jsonify({'error': 'Only verified tutors can host classes'}), 403

        cur.execute("""
            INSERT INTO classrooms (tutor_id, title, subject, description, capacity, start_time, end_time, zoom_link)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (row[0], title, subject or None, description or None,
              capacity, start, end, link or None))
        conn.commit()
        return jsonify({'classroom': {'id': cur.lastrowid}}), 201
    except Exception as e:
        if _classrooms_missing(e):
            return jsonify({'error': 'Run the classrooms DB migration first'}), 503
        raise
    finally:
        cur.close(); conn.close()


@bp.route('/classrooms/mine', methods=['GET'])
@jwt_required()
def get_my_classrooms():
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id_tutor FROM tutor_profiles WHERE id_user = %s", (uid,))
        row = cur.fetchone()
        if not row:
            return jsonify({'classrooms': []})
        try:
            cur.execute("""
                SELECT c.id, c.title, c.subject, c.description,
                       c.capacity, c.start_time, c.end_time, c.zoom_link,
                       COUNT(DISTINCT ce.student_id) AS enrolled_count
                FROM classrooms c
                LEFT JOIN classroom_enrollments ce ON ce.classroom_id = c.id
                WHERE c.tutor_id = %s
                GROUP BY c.id
                ORDER BY c.start_time ASC
            """, (row['id_tutor'],))
            classrooms = cur.fetchall()
        except Exception as e:
            if _classrooms_missing(e):
                return jsonify({'classrooms': []})
            raise
        for c in classrooms:
            for key in ('start_time', 'end_time'):
                if c.get(key) and hasattr(c[key], 'isoformat'):
                    c[key] = c[key].isoformat()
        return jsonify({'classrooms': classrooms})
    finally:
        cur.close(); conn.close()


@bp.route('/classrooms/<int:classroom_id>/enroll', methods=['POST'])
@jwt_required()
def enroll_classroom(classroom_id):
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("SELECT id_student FROM student_profiles WHERE id_user = %s", (uid,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Student profile required'}), 403
        student_id = row[0]

        # Lock the class so two students can't both take the last seat
        cur.execute("SELECT capacity FROM classrooms WHERE id = %s FOR UPDATE", (classroom_id,))
        c = cur.fetchone()
        if not c:
            return jsonify({'error': 'Classroom not found'}), 404

        cur.execute("SELECT COUNT(*) FROM classroom_enrollments WHERE classroom_id = %s", (classroom_id,))
        if cur.fetchone()[0] >= c[0]:
            return jsonify({'error': f'Classroom is full ({c[0]} max)'}), 409

        cur.execute(
            "INSERT IGNORE INTO classroom_enrollments (classroom_id, student_id) VALUES (%s, %s)",
            (classroom_id, student_id)
        )
        conn.commit()
        return jsonify({'message': 'Enrolled'})
    except Exception as e:
        if _classrooms_missing(e):
            return jsonify({'error': 'Run the classrooms DB migration first'}), 503
        raise
    finally:
        cur.close(); conn.close()


@bp.route('/classrooms/<int:classroom_id>/enroll', methods=['DELETE'])
@jwt_required()
def unenroll_classroom(classroom_id):
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("SELECT id_student FROM student_profiles WHERE id_user = %s", (uid,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Not found'}), 404
        cur.execute(
            "DELETE FROM classroom_enrollments WHERE classroom_id = %s AND student_id = %s",
            (classroom_id, row[0])
        )
        conn.commit()
        return jsonify({'message': 'Unenrolled'})
    finally:
        cur.close(); conn.close()


@bp.route('/classrooms/<int:classroom_id>/students', methods=['GET'])
@jwt_required()
def get_classroom_students(classroom_id):
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT c.id FROM classrooms c
            JOIN tutor_profiles tp ON tp.id_tutor = c.tutor_id
            WHERE c.id = %s AND tp.id_user = %s
        """, (classroom_id, uid))
        if not cur.fetchone():
            return jsonify({'error': 'Not authorised'}), 403
        try:
            cur.execute("""
                SELECT u.id_user, u.name, u.email
                FROM classroom_enrollments ce
                JOIN student_profiles sp ON sp.id_student = ce.student_id
                JOIN users u ON u.id_user = sp.id_user
                WHERE ce.classroom_id = %s
            """, (classroom_id,))
            return jsonify({'students': cur.fetchall()})
        except Exception as e:
            if _classrooms_missing(e):
                return jsonify({'students': []})
            raise
    finally:
        cur.close(); conn.close()
