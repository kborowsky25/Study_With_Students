"""Tutor screening: university email verification and proof upload."""
import os
import random
from datetime import datetime, timedelta

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import jwt_required

from ..config import upload_dir
from ..permissions import check_admin
from ..services.email import mail_configured, send_verification_email
from ..db import current_user_id, get_db

bp = Blueprint('screening', __name__, url_prefix='/api')

# ── Tutor screening ───────────────────────────────────────────────────────────

ALLOWED_PROOF_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}
MAX_PROOF_BYTES = 10 * 1024 * 1024  # 10 MB

def _allowed_proof(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_PROOF_EXTENSIONS

@bp.route('/tutor-screening/send-uni-code', methods=['POST'])
@jwt_required()
def screening_send_uni_code():
    uid  = current_user_id()
    data = request.get_json(silent=True) or {}
    uni_email = (data.get('uni_email') or '').strip().lower()
    if not uni_email:
        return jsonify({'error': 'University email required'}), 400

    conn = get_db(); cur = conn.cursor()
    try:
        # Ensure tutor profile exists
        cur.execute("SELECT id_tutor FROM tutor_profiles WHERE id_user = %s", (uid,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Create your tutor profile first'}), 400

        # Save uni_email to profile
        cur.execute("UPDATE tutor_profiles SET uni_email = %s WHERE id_user = %s", (uni_email, uid))

        # Generate + store OTP (reuse email_verifications table)
        code    = ''.join(random.choices('0123456789', k=6))
        expires = datetime.utcnow() + timedelta(minutes=10)
        cur.execute("DELETE FROM email_verifications WHERE email = %s", (uni_email,))
        cur.execute(
            "INSERT INTO email_verifications (email, code, expires_at) VALUES (%s, %s, %s)",
            (uni_email, code, expires)
        )
        conn.commit()
    finally:
        cur.close(); conn.close()

    try:
        send_verification_email(uni_email, code)
    except Exception as e:
        print(f'[WARN] Uni email send failed: {e}', flush=True)

    payload = {'message': 'Verification code sent to your university email'}
    if current_app.debug and not mail_configured():
        payload['dev_code'] = code  # local development only — no SMTP configured
    return jsonify(payload), 200


@bp.route('/tutor-screening/verify-uni-email', methods=['POST'])
@jwt_required()
def screening_verify_uni_email():
    uid  = current_user_id()
    data = request.get_json(silent=True) or {}
    uni_email = (data.get('uni_email') or '').strip().lower()
    code      = (data.get('code')      or '').strip()
    if not uni_email or not code:
        return jsonify({'error': 'Email and code required'}), 400

    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("""
            SELECT id, expires_at, used
            FROM email_verifications
            WHERE email = %s AND code = %s
            ORDER BY id DESC LIMIT 1
        """, (uni_email, code))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Invalid code'}), 400
        ver_id, expires_at, used = row
        if used:
            return jsonify({'error': 'Code already used'}), 400
        if datetime.utcnow() > expires_at:
            return jsonify({'error': 'Code expired — please request a new one'}), 400

        cur.execute("UPDATE email_verifications SET used = 1 WHERE id = %s", (ver_id,))
        cur.execute(
            "UPDATE tutor_profiles SET uni_email_verified = 1, uni_email = %s WHERE id_user = %s",
            (uni_email, uid)
        )
        conn.commit()
    finally:
        cur.close(); conn.close()

    return jsonify({'message': 'University email verified'}), 200


@bp.route('/tutor-screening/upload-proof', methods=['POST'])
@jwt_required()
def screening_upload_proof():
    uid = current_user_id()

    if 'proof' not in request.files:
        return jsonify({'error': 'No file attached'}), 400
    f = request.files['proof']
    if not f.filename:
        return jsonify({'error': 'No file selected'}), 400
    if not _allowed_proof(f.filename):
        return jsonify({'error': 'Only PNG, JPG, and PDF are accepted'}), 400

    # Read & size-check before writing
    data = f.read()
    if len(data) > MAX_PROOF_BYTES:
        return jsonify({'error': 'File exceeds 10 MB limit'}), 400

    # Check uni email was verified
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute(
            "SELECT id_tutor, uni_email_verified FROM tutor_profiles WHERE id_user = %s", (uid,)
        )
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Tutor profile not found'}), 400
        id_tutor, verified = row
        if not verified:
            return jsonify({'error': 'Please verify your university email first'}), 400

        # Save file
        ext      = f.filename.rsplit('.', 1)[1].lower()
        filename = f'{id_tutor}_{int(datetime.utcnow().timestamp())}.{ext}'
        with open(os.path.join(upload_dir('tutor-proofs'), filename), 'wb') as fh:
            fh.write(data)

        cur.execute(
            "UPDATE tutor_profiles SET proof_doc_path = %s, screening_status = 'pending' WHERE id_tutor = %s",
            (filename, id_tutor)
        )
        conn.commit()
    finally:
        cur.close(); conn.close()

    return jsonify({'message': 'Documents submitted for review'}), 200


@bp.route('/tutor-screening/status', methods=['GET'])
@jwt_required()
def screening_status():
    uid = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT screening_status, screening_notes, uni_email, uni_email_verified
            FROM tutor_profiles WHERE id_user = %s
        """, (uid,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Tutor profile not found'}), 404
        return jsonify(row), 200
    finally:
        cur.close(); conn.close()


@bp.route('/uploads/tutor-proofs/<path:filename>', methods=['GET'])
def serve_tutor_proof(filename):
    """Serve uploaded proof documents — admin-only."""
    if not check_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    from flask import send_from_directory
    return send_from_directory(upload_dir('tutor-proofs'), filename)
