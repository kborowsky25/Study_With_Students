"""Study notes: shared learning materials (Explorer members and verified tutors)."""
import os
import uuid as uuid_lib

from flask import Blueprint, jsonify, request, send_from_directory

from ..config import upload_dir
from ..permissions import explorer_required
from ..db import current_user_id, get_db
from ..services.uploads import UploadError, display_name, read_upload

bp = Blueprint('notes', __name__, url_prefix='/api')

# ── Study Notes ───────────────────────────────────────────────────────────────

NOTES_UPLOAD_FOLDER = upload_dir('study-notes')
ALLOWED_NOTES_EXT = {'pdf', 'doc', 'docx', 'ppt', 'pptx', 'png', 'jpg', 'jpeg', 'txt', 'md'}
MAX_NOTE_BYTES = 10 * 1024 * 1024  # 10 MB (Vercel itself caps request bodies at 4.5 MB)
MAX_TITLE_LENGTH, MAX_SUBJECT_LENGTH, MAX_DESCRIPTION_LENGTH = 255, 100, 5000


@bp.route('/study-notes', methods=['GET'])
@explorer_required
def get_study_notes():
    uid = current_user_id()
    subject = request.args.get('subject', '').strip()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        q = """
            SELECT sn.id, sn.title, sn.subject, sn.description, sn.file_name,
                   sn.file_type, sn.is_public, sn.created_at, sn.user_id,
                   (sn.file_path IS NOT NULL) AS has_file,
                   u.name AS author_name,
                   (tp.id_tutor IS NOT NULL) AS is_tutor
            FROM study_notes sn
            JOIN users u ON u.id_user = sn.user_id
            LEFT JOIN tutor_profiles tp ON tp.id_user = sn.user_id
            WHERE (sn.is_public = 1 OR sn.user_id = %s)
        """
        params = [uid]
        if subject:
            q += " AND sn.subject = %s"
            params.append(subject)
        q += " ORDER BY sn.created_at DESC LIMIT 100"
        cur.execute(q, params)
        notes = cur.fetchall()
        for n in notes:
            if n.get('created_at') and hasattr(n['created_at'], 'isoformat'):
                n['created_at'] = n['created_at'].isoformat()
            n['is_tutor'] = bool(n.get('is_tutor'))
            n['has_file'] = bool(n.get('has_file'))
            n['is_mine']  = n['user_id'] == uid
        return jsonify({'notes': notes})
    finally:
        cur.close(); conn.close()


@bp.route('/study-notes', methods=['POST'])
@explorer_required
def create_study_note():
    uid = current_user_id()
    title       = request.form.get('title', '').strip()
    subject     = request.form.get('subject', '').strip()
    description = request.form.get('description', '').strip()
    is_public   = request.form.get('is_public', 'true').lower() != 'false'

    if not title:
        return jsonify({'error': 'title required'}), 400
    if (len(title) > MAX_TITLE_LENGTH or len(subject) > MAX_SUBJECT_LENGTH
            or len(description) > MAX_DESCRIPTION_LENGTH):
        return jsonify({'error': f'Titles are limited to {MAX_TITLE_LENGTH} characters, subjects to '
                                 f'{MAX_SUBJECT_LENGTH} and descriptions to {MAX_DESCRIPTION_LENGTH:,}'}), 400

    file_path, file_name, file_type = None, None, None
    f = request.files.get('file')
    if f and f.filename:
        try:
            data, ext = read_upload(f, ALLOWED_NOTES_EXT, MAX_NOTE_BYTES)
        except UploadError as e:
            return jsonify({'error': str(e)}), 400
        # Stored under a random name; the original is only offered as the download name
        file_path = f'{uuid_lib.uuid4().hex}.{ext}'
        with open(os.path.join(NOTES_UPLOAD_FOLDER, file_path), 'wb') as fh:
            fh.write(data)
        file_name = display_name(f.filename)
        file_type = ext

    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO study_notes (user_id, title, subject, description, file_path, file_name, file_type, is_public) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
            (uid, title, subject, description, file_path, file_name, file_type, is_public)
        )
        conn.commit()
        return jsonify({'note': {'id': cur.lastrowid}}), 201
    finally:
        cur.close(); conn.close()


@bp.route('/study-notes/<int:note_id>', methods=['DELETE'])
@explorer_required
def delete_study_note(note_id):
    uid = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT user_id, file_path FROM study_notes WHERE id = %s", (note_id,))
        note = cur.fetchone()
        if not note:
            return jsonify({'error': 'Not found'}), 404
        if note['user_id'] != uid:
            return jsonify({'error': 'Forbidden'}), 403
        if note['file_path']:
            try:
                os.remove(os.path.join(NOTES_UPLOAD_FOLDER, note['file_path']))
            except OSError:
                pass
        cur2 = conn.cursor()
        cur2.execute("DELETE FROM study_notes WHERE id = %s", (note_id,))
        conn.commit()
        cur2.close()
        return jsonify({'message': 'Deleted'})
    finally:
        cur.close(); conn.close()


@bp.route('/study-notes/<int:note_id>/file', methods=['GET'])
@explorer_required
def download_study_note(note_id):
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT user_id, is_public, file_path, file_name FROM study_notes WHERE id = %s", (note_id,))
        note = cur.fetchone()
    finally:
        cur.close(); conn.close()
    if not note or not note['file_path']:
        return jsonify({'error': 'File not found'}), 404
    if not note['is_public'] and note['user_id'] != current_user_id():
        return jsonify({'error': 'This note is private'}), 403
    return send_from_directory(NOTES_UPLOAD_FOLDER, note['file_path'],
                               as_attachment=True, download_name=note['file_name'] or note['file_path'])
