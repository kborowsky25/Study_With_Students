"""Tutor background checks: an enhanced DBS certificate (England & Wales) before booking.

Tutors submit a DBS certificate they already hold; an admin checks it, ideally with the
free DBS Update Service status check (certificate number, surname, date of birth and the
tutor's consent), then verifies or rejects it. See docs/SAFEGUARDING.md.

The certificate number, date of birth and scan are shown to admins only, and are deleted
once a check is reviewed — only the last four digits of the number are kept.

Reused elsewhere:
    dbs_verified_sql('tp')          SQL condition: tutor has a verified, in-date check
    tutor_dbs_verified(cur, id)     the same for one tutor_profiles.id_tutor (booking rule)
    dbs_required_error(own=False)   403 body when a tutor can't be booked yet
"""
import os
import re
import secrets
from datetime import UTC, date, datetime

from flask import Blueprint, jsonify, request, send_from_directory
from flask_jwt_extended import get_jwt, jwt_required, verify_jwt_in_request
from mysql.connector import IntegrityError

from ..config import upload_dir
from ..db import current_user_id, get_db
from ..permissions import check_admin
from ..referrals import reward_tutor_approval

bp = Blueprint('background', __name__, url_prefix='/api')

DOC_DIR = 'background-checks'

CHECK_TYPES = ('enhanced_barred', 'enhanced', 'standard', 'basic')
ACCEPTED_TYPES = ('enhanced_barred', 'enhanced')
STATUSES = ('pending', 'verified', 'rejected', 'expired')

ENHANCED_ONLY = ("We can only accept an enhanced DBS check (ideally with the children's barred list), "
                 'as most of our students are under 18.')
NO_PROFILE = {'error': 'Create your tutor profile first', 'code': 'no_tutor_profile'}

# Uploads: extension → (mimetype, leading bytes of a real file of that type)
DOC_TYPES = {
    'pdf':  ('application/pdf', b'%PDF'),
    'png':  ('image/png', b'\x89PNG\r\n\x1a\n'),
    'jpg':  ('image/jpeg', b'\xff\xd8\xff'),
    'jpeg': ('image/jpeg', b'\xff\xd8\xff'),
}
MAX_DOC_BYTES = 10 * 1024 * 1024  # 10 MB

UPDATE_SERVICE_RECHECK_YEARS = 1  # status check again a year after verifying
CERTIFICATE_RECHECK_YEARS    = 3  # otherwise a certificate counts for 3 years from issue


# ── Shared with tutor listings and the booking rule ───────────────────────────

_SQL_REF = re.compile(r'[A-Za-z_]\w*(\.[A-Za-z_]\w*)?', re.ASCII)


def dbs_verified_sql(ref='tp'):
    """SQL condition: the tutor has a verified check whose recheck date hasn't passed.

    `ref` is a tutor_profiles alias ('tp' → tp.id_tutor) or a column holding a tutor id
    ('e.tutor_id'). It's code, never user input. Usable as a column or a filter:

        SELECT ..., {dbs_verified_sql('tp')} AS dbs_verified FROM tutor_profiles tp ...
        ... WHERE {dbs_verified_sql('e.tutor_id')}
    """
    if not _SQL_REF.fullmatch(ref):
        raise ValueError(f'Not a SQL alias or column: {ref!r}')
    column = ref if '.' in ref else f'{ref}.id_tutor'
    return (
        "EXISTS (SELECT 1 FROM background_checks dbs_bc"
        f" WHERE dbs_bc.tutor_id = {column}"
        " AND dbs_bc.status = 'verified' AND dbs_bc.recheck_due >= UTC_DATE())"
    )


def tutor_dbs_verified(cur, tutor_id):
    """True when tutor_profiles.id_tutor `tutor_id` has a verified, in-date check."""
    cur.execute(
        "SELECT 1 FROM background_checks WHERE tutor_id = %s"
        " AND status = 'verified' AND recheck_due >= UTC_DATE() LIMIT 1",
        (tutor_id,),
    )
    return cur.fetchone() is not None


def dbs_required_error(own=False):
    """Body for a 403 when a booking needs a verified check. `own`: the tutor is booking."""
    message = ('You can take bookings once your DBS check is verified' if own
               else "This tutor can't take bookings until their DBS check is verified")
    return {'error': message, 'code': 'dbs_required'}


# ── Helpers ───────────────────────────────────────────────────────────────────

_COLUMNS = """
    bc.id, bc.tutor_id, bc.check_type, bc.certificate_number, bc.certificate_last4,
    bc.issue_date, bc.legal_name, bc.date_of_birth, bc.on_update_service, bc.document_path,
    bc.consent_at, bc.status, bc.reviewer_note, bc.reviewed_by, bc.submitted_at,
    bc.reviewed_at, bc.verified_at, bc.recheck_due
"""

# Pending: oldest first. Verified: next recheck first. Otherwise: latest first.
_ORDER = {
    'pending':  'bc.submitted_at ASC',
    'verified': 'bc.recheck_due ASC',
}


def _today():
    return datetime.now(UTC).replace(tzinfo=None).date()  # SQL compares with UTC_DATE()


def _add_years(day, years):
    try:
        return day.replace(year=day.year + years)
    except ValueError:  # 29 February
        return day.replace(year=day.year + years, day=28)


def _age_on(born, day):
    return day.year - born.year - ((day.month, day.day) < (born.month, born.day))


def _parse_date(value):
    try:
        return date.fromisoformat(str(value or '').strip())
    except ValueError:
        return None


def _flag(value):
    return str(value).strip().lower() in ('1', 'true', 'on', 'yes')


def _json():
    body = request.get_json(silent=True)
    return body if isinstance(body, dict) else {}


def _tutor_id(cur, user_id):
    cur.execute("SELECT id_tutor FROM tutor_profiles WHERE id_user = %s LIMIT 1", (user_id,))
    row = cur.fetchone()
    return row['id_tutor'] if row else None


def _expire_overdue(cur, tutor_id=None):
    """Verified checks whose recheck date has passed become expired."""
    sql = "UPDATE background_checks SET status = 'expired' WHERE status = 'verified' AND recheck_due < UTC_DATE()"
    if tutor_id is None:
        cur.execute(sql)
    else:
        cur.execute(sql + " AND tutor_id = %s", (tutor_id,))


def _fetch(cur, where, value, lock=False):
    """One check. `where` is a fixed condition from this module, e.g. 'bc.id = %s'."""
    cur.execute(f"SELECT {_COLUMNS} FROM background_checks bc WHERE {where}{' FOR UPDATE' if lock else ''}", (value,))
    return cur.fetchone()


def _default_recheck(row):
    if row['on_update_service']:
        return _add_years(_today(), UPDATE_SERVICE_RECHECK_YEARS)
    return _add_years(row['issue_date'], CERTIFICATE_RECHECK_YEARS)


def _in_date(row):
    return row['status'] == 'verified' and row['recheck_due'] is not None and row['recheck_due'] >= _today()


def _for_tutor(row):
    """A tutor's own check: never the certificate number, date of birth or file."""
    return {
        'status':                    row['status'],
        'check_type':                row['check_type'],
        'certificate_number_masked': '•' * 8 + row['certificate_last4'],
        'issue_date':                row['issue_date'],
        'legal_name':                row['legal_name'],
        'on_update_service':         bool(row['on_update_service']),
        'has_document':              bool(row['document_path']),
        'reviewer_note':             row['reviewer_note'],
        'submitted_at':              row['submitted_at'],
        'verified_at':               row['verified_at'],
        'recheck_due':               row['recheck_due'],
        'in_date':                   _in_date(row),
    }


def _for_admin(row):
    check = {k: v for k, v in row.items() if k != 'document_path'}
    check['on_update_service'] = bool(row['on_update_service'])
    check['has_document'] = bool(row['document_path'])
    check['in_date'] = _in_date(row)
    if row['status'] == 'pending':
        check['recheck_due_default'] = _default_recheck(row)
    return check


def _reviewer():
    """The super-admin's email, or 'admin key' when the X-Admin-Secret header was used."""
    try:
        verify_jwt_in_request(optional=True)
        return get_jwt().get('email') or 'admin key'
    except Exception:
        return 'admin key'


def _validate(data):
    """Check a submission. Returns (fields, None) or (None, error body)."""
    check_type = str(data.get('check_type') or '').strip()
    if check_type not in CHECK_TYPES:
        return None, {'error': 'Choose the type of DBS check'}
    if check_type not in ACCEPTED_TYPES:
        return None, {'error': ENHANCED_ONLY, 'code': 'enhanced_required'}

    number = re.sub(r'[\s-]', '', str(data.get('certificate_number') or ''))
    if not re.fullmatch(r'\d{12}', number):
        return None, {'error': 'The certificate number is 12 digits'}

    today = _today()
    on_update_service = _flag(data.get('on_update_service'))
    issued = _parse_date(data.get('issue_date'))
    if not issued:
        return None, {'error': 'Enter the issue date'}
    if issued > today:
        return None, {'error': "The issue date can't be in the future"}
    if not on_update_service and _add_years(issued, CERTIFICATE_RECHECK_YEARS) <= today:
        return None, {'error': 'We need a certificate from the last 3 years, or one on the DBS Update Service'}

    legal_name = ' '.join(str(data.get('legal_name') or '').split())
    if not legal_name:
        return None, {'error': 'Enter your full name as it appears on the certificate'}
    if len(legal_name) > 255:
        return None, {'error': 'That name is too long'}

    born = _parse_date(data.get('date_of_birth'))
    if not born:
        return None, {'error': 'Enter your date of birth'}
    if _age_on(born, today) < 18:
        return None, {'error': 'Tutors need to be 18 or over'}
    if _age_on(born, today) > 100 or born >= issued:
        return None, {'error': 'Check your date of birth'}

    if not _flag(data.get('consent')):
        return None, {'error': 'Please confirm you consent to the check'}

    return {
        'check_type': check_type, 'certificate_number': number, 'issue_date': issued,
        'legal_name': legal_name, 'date_of_birth': born, 'on_update_service': on_update_service,
    }, None


def _read_document(upload):
    """Validate an uploaded scan. Returns ((ext, bytes), None) or (None, error)."""
    ext = upload.filename.rsplit('.', 1)[-1].lower() if '.' in upload.filename else ''
    if ext not in DOC_TYPES:
        return None, 'Upload a PDF, PNG or JPG'
    data = upload.read(MAX_DOC_BYTES + 1)
    if len(data) > MAX_DOC_BYTES:
        return None, 'The scan must be under 10 MB'
    if not data.startswith(DOC_TYPES[ext][1]):
        return None, "That file doesn't look like a PDF, PNG or JPG"
    return (ext, data), None


def _save_document(ext, data):
    """Write a scan under a random name, readable by the API user only."""
    name = f'{secrets.token_hex(16)}.{ext}'
    fd = os.open(os.path.join(upload_dir(DOC_DIR), name), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'wb') as fh:
        fh.write(data)
    return name


def _delete_document(name):
    if not name:
        return
    try:
        os.remove(os.path.join(upload_dir(DOC_DIR), name))
    except FileNotFoundError:
        pass


# ── Tutor ─────────────────────────────────────────────────────────────────────

@bp.route('/background-check', methods=['GET'])
@jwt_required()
def my_background_check():
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        tutor_id = _tutor_id(cur, current_user_id())
        if tutor_id is None:
            return jsonify(NO_PROFILE), 404
        _expire_overdue(cur, tutor_id)
        conn.commit()
        row = _fetch(cur, 'bc.tutor_id = %s', tutor_id)
        return jsonify({'check': _for_tutor(row) if row else None})
    finally:
        cur.close(); conn.close()


@bp.route('/background-check', methods=['POST'])
@jwt_required()
def submit_background_check():
    """Multipart form: check_type, certificate_number, issue_date, legal_name, date_of_birth,
    on_update_service, consent, and an optional `document` (PDF, PNG or JPG)."""
    fields, error = _validate(request.form or _json())
    if error:
        return jsonify(error), 400

    document = None
    upload = request.files.get('document')
    if upload and upload.filename:
        document, error = _read_document(upload)
        if error:
            return jsonify({'error': error}), 400

    conn = get_db(); cur = conn.cursor(dictionary=True)
    saved = replaced = None
    try:
        tutor_id = _tutor_id(cur, current_user_id())
        if tutor_id is None:
            return jsonify(NO_PROFILE), 404
        _expire_overdue(cur, tutor_id)
        existing = _fetch(cur, 'bc.tutor_id = %s', tutor_id, lock=True)
        if existing and existing['status'] in ('pending', 'verified'):
            message = ('Your check is already in review' if existing['status'] == 'pending'
                       else 'Your check is already verified')
            return jsonify({'error': message}), 409

        saved = _save_document(*document) if document else None
        now = datetime.now(UTC).replace(tzinfo=None)
        values = (
            fields['check_type'], fields['certificate_number'], fields['certificate_number'][-4:],
            fields['issue_date'], fields['legal_name'], fields['date_of_birth'],
            fields['on_update_service'], saved, now, now,
        )
        if existing:
            replaced = existing['document_path']
            cur.execute("""
                UPDATE background_checks
                SET check_type = %s, certificate_number = %s, certificate_last4 = %s, issue_date = %s,
                    legal_name = %s, date_of_birth = %s, on_update_service = %s, document_path = %s,
                    consent_at = %s, submitted_at = %s, status = 'pending', reviewer_note = NULL,
                    reviewed_by = NULL, reviewed_at = NULL, verified_at = NULL, recheck_due = NULL
                WHERE id = %s
            """, values + (existing['id'],))
        else:
            cur.execute("""
                INSERT INTO background_checks
                    (check_type, certificate_number, certificate_last4, issue_date, legal_name,
                     date_of_birth, on_update_service, document_path, consent_at, submitted_at, tutor_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, values + (tutor_id,))
        conn.commit()
    except IntegrityError:  # a second submission raced this one
        _delete_document(saved)
        return jsonify({'error': 'Your check is already in review'}), 409
    except Exception:
        _delete_document(saved)
        raise
    else:
        row = _fetch(cur, 'bc.tutor_id = %s', tutor_id)
    finally:
        cur.close(); conn.close()

    _delete_document(replaced)
    return jsonify({'message': 'Submitted for review', 'check': _for_tutor(row)}), 201


# ── Admin ─────────────────────────────────────────────────────────────────────

@bp.route('/admin/background-checks', methods=['GET'])
def admin_background_checks():
    """Checks with full details. `status`: pending (default), verified, rejected, expired or all."""
    if not check_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    status = request.args.get('status', 'pending')
    if status not in STATUSES + ('all',):
        return jsonify({'error': 'Unknown status'}), 400

    query = f"""
        SELECT {_COLUMNS}, u.id_user AS tutor_user_id, u.name AS tutor_name, u.email AS tutor_email,
               tp.university, tp.screening_status
        FROM background_checks bc
        LEFT JOIN tutor_profiles tp ON tp.id_tutor = bc.tutor_id
        LEFT JOIN users u           ON u.id_user   = tp.id_user
    """
    params = ()
    if status != 'all':
        query += " WHERE bc.status = %s"
        params = (status,)
    query += f" ORDER BY {_ORDER.get(status, 'COALESCE(bc.reviewed_at, bc.submitted_at) DESC')}, bc.id"

    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        _expire_overdue(cur)
        conn.commit()
        cur.execute(query, params)
        checks = [_for_admin(row) for row in cur.fetchall()]
        cur.execute("SELECT status, COUNT(*) AS n FROM background_checks GROUP BY status")
        counts = dict.fromkeys(STATUSES, 0)
        counts.update({row['status']: row['n'] for row in cur.fetchall()})
        return jsonify({'checks': checks, 'counts': counts})
    finally:
        cur.close(); conn.close()


@bp.route('/admin/background-checks/<int:check_id>/verify', methods=['POST'])
def admin_verify_background_check(check_id):
    """Mark a pending check verified. Optional JSON `recheck_due` (YYYY-MM-DD) brings the
    recheck forward; the default is a year from today on the Update Service, otherwise
    3 years from the issue date. The number, date of birth and scan are then deleted."""
    if not check_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    data = _json()

    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        row = _fetch(cur, 'bc.id = %s', check_id, lock=True)
        if not row:
            return jsonify({'error': 'Check not found'}), 404
        if row['status'] != 'pending':
            return jsonify({'error': 'Only pending checks can be verified'}), 409
        if row['check_type'] not in ACCEPTED_TYPES:
            return jsonify({'error': ENHANCED_ONLY, 'code': 'enhanced_required'}), 400

        latest = _default_recheck(row)
        recheck_due = latest
        if data.get('recheck_due'):
            recheck_due = _parse_date(data['recheck_due'])
            if not recheck_due:
                return jsonify({'error': 'recheck_due must be a date (YYYY-MM-DD)'}), 400
            if recheck_due > latest:
                return jsonify({'error': f'The recheck can be {latest.day} {latest:%b %Y} at the latest'}), 400
        if recheck_due <= _today():
            return jsonify({'error': 'This certificate is too old to verify. Ask the tutor for a newer one.'}), 400

        now = datetime.now(UTC).replace(tzinfo=None)
        cur.execute("""
            UPDATE background_checks
            SET status = 'verified', verified_at = %s, reviewed_at = %s, reviewed_by = %s,
                recheck_due = %s, reviewer_note = NULL,
                certificate_number = NULL, date_of_birth = NULL, document_path = NULL
            WHERE id = %s
        """, (now, now, _reviewer(), recheck_due, check_id))
        reward_tutor_approval(cur, row['tutor_id'])  # XP for the tutor who invited them, once approved too
        conn.commit()
        updated = _fetch(cur, 'bc.id = %s', check_id)
    finally:
        cur.close(); conn.close()

    _delete_document(row['document_path'])
    return jsonify({'message': 'Check verified', 'check': _for_admin(updated)})


@bp.route('/admin/background-checks/<int:check_id>/reject', methods=['POST'])
def admin_reject_background_check(check_id):
    """Reject a pending check, or revoke a verified one. JSON `note` (shown to the tutor) is required."""
    if not check_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    note = str(_json().get('note') or '').strip()
    if not note:
        return jsonify({'error': 'Add a note for the tutor'}), 400
    if len(note) > 1000:
        return jsonify({'error': 'Keep the note under 1000 characters'}), 400

    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        row = _fetch(cur, 'bc.id = %s', check_id, lock=True)
        if not row:
            return jsonify({'error': 'Check not found'}), 404
        if row['status'] == 'rejected':
            return jsonify({'error': 'This check is already rejected'}), 409

        cur.execute("""
            UPDATE background_checks
            SET status = 'rejected', reviewer_note = %s, reviewed_at = %s, reviewed_by = %s,
                certificate_number = NULL, date_of_birth = NULL, document_path = NULL
            WHERE id = %s
        """, (note, datetime.now(UTC).replace(tzinfo=None), _reviewer(), check_id))
        conn.commit()
        updated = _fetch(cur, 'bc.id = %s', check_id)
    finally:
        cur.close(); conn.close()

    _delete_document(row['document_path'])
    return jsonify({'message': 'Check rejected', 'check': _for_admin(updated)})


@bp.route('/admin/background-checks/<int:check_id>/document', methods=['GET'])
def admin_background_check_document(check_id):
    """The uploaded scan of a pending check — admin-only, never cached."""
    if not check_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT document_path FROM background_checks WHERE id = %s", (check_id,))
        row = cur.fetchone()
    finally:
        cur.close(); conn.close()
    if not row:
        return jsonify({'error': 'Check not found'}), 404
    if not row['document_path']:
        return jsonify({'error': 'No scan on file'}), 404

    ext = row['document_path'].rsplit('.', 1)[-1]
    response = send_from_directory(
        upload_dir(DOC_DIR), row['document_path'],
        mimetype=DOC_TYPES[ext][0], download_name=f'dbs-certificate-{check_id}.{ext}', max_age=0,
    )
    response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response
