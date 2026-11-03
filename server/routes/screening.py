"""Tutor screening: university email verification and proof upload."""
import os
from datetime import UTC, datetime

from flask import Blueprint, jsonify, request, send_from_directory
from flask_jwt_extended import jwt_required

from ..config import upload_dir
from ..db import current_user_id, get_db
from ..permissions import check_admin, dev_shortcuts_allowed
from ..ratelimit import json_field, jwt_user, rate_limit
from ..services.email import SEND_FAILED, mail_configured, send_verification_email
from ..services.uploads import UploadError, read_upload
from ..services.verification import issue_code, redeem_code

bp = Blueprint('screening', __name__, url_prefix='/api')

# ── Tutor screening ───────────────────────────────────────────────────────────

ALLOWED_PROOF_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}
MAX_PROOF_BYTES = 10 * 1024 * 1024  # 10 MB (Vercel itself caps request bodies at 4.5 MB)


@bp.route('/tutor-screening/send-uni-code', methods=['POST'])
@jwt_required()
@rate_limit(3, per=600, key=jwt_user)
@rate_limit(3, per=600, key=json_field('uni_email'))  # per address — no inbox flooding
def screening_send_uni_code():
    uid  = current_user_id()
    data = request.get_json(silent=True) or {}
    uni_email = str(data.get('uni_email') or '').strip().lower()
    if not uni_email or len(uni_email) > 254 or '@' not in uni_email or any(c.isspace() for c in uni_email):
        return jsonify({'error': 'A valid university email is required'}), 400

    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("SELECT id_tutor FROM tutor_profiles WHERE id_user = %s", (uid,))
        if not cur.fetchone():
            return jsonify({'error': 'Create your tutor profile first'}), 400

        # A new address has to be verified again (the flag is reset before uni_email changes)
        cur.execute("""
            UPDATE tutor_profiles
            SET uni_email_verified = IF(uni_email <=> %s, uni_email_verified, 0),
                uni_email = %s
            WHERE id_user = %s
        """, (uni_email, uni_email, uid))
        code = issue_code(cur, uni_email)
        conn.commit()
    finally:
        cur.close(); conn.close()

    try:
        send_verification_email(uni_email, code)
    except Exception as e:
        print(f'[WARN] Uni email send failed: {e!r}', flush=True)
        return jsonify({'error': SEND_FAILED}), 503

    payload = {'message': 'Verification code sent to your university email'}
    if dev_shortcuts_allowed() and not mail_configured():
        payload['dev_code'] = code  # local debug runs without SMTP only
    return jsonify(payload), 200


@bp.route('/tutor-screening/verify-uni-email', methods=['POST'])
@jwt_required()
@rate_limit(10, per=600, key=jwt_user)  # each code also dies after 5 wrong guesses
def screening_verify_uni_email():
    uid  = current_user_id()
    data = request.get_json(silent=True) or {}
    uni_email = str(data.get('uni_email') or '').strip().lower()
    code      = str(data.get('code') or '').strip()
    if not uni_email or not code:
        return jsonify({'error': 'Email and code required'}), 400

    conn = get_db(); cur = conn.cursor()
    try:
        error = redeem_code(cur, uni_email, code)
        if error:
            conn.commit()  # keep the failed attempt
            return jsonify({'error': error}), 400

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
    try:
        data, ext = read_upload(f, ALLOWED_PROOF_EXTENSIONS, MAX_PROOF_BYTES)
    except UploadError as e:
        return jsonify({'error': str(e)}), 400

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
        filename = f'{id_tutor}_{int(datetime.now(UTC).timestamp())}.{ext}'
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
    """Serve uploaded proof documents — admin-only, never cached."""
    if not check_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    response = send_from_directory(upload_dir('tutor-proofs'), filename, max_age=0)
    response.headers['Cache-Control'] = 'private, no-store'
    return response
