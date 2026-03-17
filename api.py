"""
Study With Students — Flask REST API
JWT-authenticated, CORS-enabled, returns JSON only.
Run: python -m flask --app api run --debug
"""
import os
import traceback
import smtplib
import random
import uuid as uuid_lib
from datetime import timedelta, datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required,
    get_jwt_identity, get_jwt,
)
import mysql.connector
from mysql.connector import Error
try:
    import stripe
    stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')
except ImportError:
    stripe = None

app = Flask(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
app.config['SECRET_KEY']                   = os.environ.get('SECRET_KEY', 'dev-secret-change-me')
app.config['JWT_SECRET_KEY']               = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-change-me')
app.config['JWT_ACCESS_TOKEN_EXPIRES']     = timedelta(days=7)

jwt  = JWTManager(app)
CORS(app, origins=['http://localhost:5173'], supports_credentials=True)

# ── Global error handler — returns JSON for ALL unhandled exceptions ──────────
@app.errorhandler(Exception)
def handle_exception(e):
    traceback.print_exc()           # prints full stack trace to Flask terminal
    return jsonify({'error': str(e)}), 500

# ── DB ────────────────────────────────────────────────────────────────────────
DB_CONFIG = {
    'host':     os.environ.get('DB_HOST',     'localhost'),
    'database': os.environ.get('DB_NAME',     'users_tutoring'),
    'user':     os.environ.get('DB_USER',     'root'),
    'password': os.environ.get('DB_PASSWORD', 'Kikidi25'),
}

def get_db():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except Error as e:
        raise RuntimeError(f'DB connection failed: {e}')

def current_user_id():
    return int(get_jwt_identity())

def is_tutor_user(user_id):
    conn = get_db()
    cur  = conn.cursor()
    cur.execute("SELECT id_tutor FROM tutor_profiles WHERE id_user = %s", (user_id,))
    result = cur.fetchone() is not None
    cur.close(); conn.close()
    return result

# ── DB Migrations ─────────────────────────────────────────────────────────────

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), 'uploads', 'tutor-proofs')

def _run_migrations():
    """Auto-apply schema additions. Safe to run multiple times."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    conn = get_db(); cur = conn.cursor()

    # Check which columns already exist in tutor_profiles
    cur.execute("""
        SELECT COLUMN_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tutor_profiles'
    """)
    existing = {row[0] for row in cur.fetchall()}

    pending = [
        ("screening_status", "VARCHAR(20) NOT NULL DEFAULT 'none'"),
        ("uni_email",         "VARCHAR(255) NULL"),
        ("uni_email_verified","TINYINT(1) NOT NULL DEFAULT 0"),
        ("proof_doc_path",    "VARCHAR(500) NULL"),
        ("screening_notes",   "TEXT NULL"),
        ("avatar_path",       "VARCHAR(500) NULL"),
    ]
    for col, defn in pending:
        if col not in existing:
            try:
                cur.execute(f"ALTER TABLE tutor_profiles ADD COLUMN {col} {defn}")
                print(f'[MIGRATION] Added column tutor_profiles.{col}', flush=True)
            except Exception as e:
                print(f'[MIGRATION] Skipped {col}: {e}', flush=True)

    # Fix age column: was accidentally created as DATE, must be INT
    try:
        cur.execute("""
            SELECT DATA_TYPE FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tutor_profiles' AND COLUMN_NAME = 'age'
        """)
        row = cur.fetchone()
        if row and row[0].upper() not in ('INT', 'TINYINT', 'SMALLINT', 'MEDIUMINT', 'BIGINT'):
            cur.execute("ALTER TABLE tutor_profiles MODIFY COLUMN age INT NULL")
            print('[MIGRATION] Fixed tutor_profiles.age column type → INT', flush=True)
    except Exception as e:
        print(f'[MIGRATION] age column fix skipped: {e}', flush=True)

    # Sync: tutors already approved via the old `status` column → mark screening_status approved too
    try:
        cur.execute("""
            UPDATE tutor_profiles
            SET screening_status = 'approved'
            WHERE status = 'approved' AND (screening_status IS NULL OR screening_status = 'none')
        """)
        if cur.rowcount:
            print(f'[MIGRATION] Synced {cur.rowcount} pre-existing approved tutor(s) to screening_status=approved', flush=True)
    except Exception as e:
        print(f'[MIGRATION] Sync skipped: {e}', flush=True)

    conn.commit()
    cur.close(); conn.close()

try:
    with app.app_context():
        _run_migrations()
except Exception as _me:
    print(f'[MIGRATION ERROR] {_me}', flush=True)

# ── Email verification helpers ────────────────────────────────────────────────
#
# Required DB migration (run once):
#   CREATE TABLE IF NOT EXISTS email_verifications (
#     id         INT AUTO_INCREMENT PRIMARY KEY,
#     email      VARCHAR(255) NOT NULL,
#     code       VARCHAR(6)   NOT NULL,
#     expires_at DATETIME     NOT NULL,
#     used       BOOLEAN      DEFAULT FALSE,
#     created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
#     INDEX idx_ev_email (email)
#   );
#
# Tutor status migration (run once):
#   ALTER TABLE tutor_profiles
#     ADD COLUMN IF NOT EXISTS status ENUM('pending','approved','rejected') DEFAULT 'pending';

def send_verification_email(to_email, code):
    """Send 6-digit code via SMTP, or print to terminal in dev mode."""
    MAIL_SERVER   = os.environ.get('MAIL_SERVER',   '')
    MAIL_PORT     = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME', '')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD', '')

    if not MAIL_SERVER or not MAIL_USERNAME:
        # Dev mode — code visible in the Flask terminal
        print(f'\n📧 [DEV EMAIL] To: {to_email} | Verification code: {code}\n', flush=True)
        return

    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
      <h2 style="color:#1b263b;margin-bottom:8px;">Your StudyWithStudents code</h2>
      <p style="color:#666;margin-bottom:24px;">Enter this code to verify your email and create your account.</p>
      <div style="background:#f4f6fb;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
        <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#ff725e;">{code}</span>
      </div>
      <p style="color:#999;font-size:13px;">This code expires in 10 minutes. Didn't request this? Ignore this email.</p>
    </div>
    """
    msg = MIMEMultipart('alternative')
    msg['Subject'] = f'{code} — your StudyWithStudents verification code'
    msg['From']    = MAIL_USERNAME
    msg['To']      = to_email
    msg.attach(MIMEText(html, 'html'))

    with smtplib.SMTP(MAIL_SERVER, MAIL_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(MAIL_USERNAME, MAIL_PASSWORD)
        server.sendmail(MAIL_USERNAME, to_email, msg.as_string())


@app.route('/api/auth/send-verification', methods=['POST'])
def send_verification():
    data  = request.get_json(silent=True) or {}
    email = data.get('email', '').strip().lower()
    if not email:
        return jsonify({'error': 'Email required'}), 400

    conn = get_db(); cur = conn.cursor()
    try:
        # Reject if already registered
        cur.execute("SELECT id_user FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            return jsonify({'error': 'Email already registered'}), 409

        code    = ''.join(random.choices('0123456789', k=6))
        expires = datetime.utcnow() + timedelta(minutes=10)

        # Clear old codes for this email, insert new
        cur.execute("DELETE FROM email_verifications WHERE email = %s", (email,))
        cur.execute(
            "INSERT INTO email_verifications (email, code, expires_at) VALUES (%s, %s, %s)",
            (email, code, expires)
        )
        conn.commit()
    finally:
        cur.close(); conn.close()

    try:
        send_verification_email(email, code)
    except Exception as e:
        print(f'[WARN] Email send failed: {e}', flush=True)
        # Still succeed — in dev mode the code was already printed to terminal

    return jsonify({'message': 'Verification code sent'}), 200


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.route('/api/auth/register', methods=['POST'])
def register():
    data              = request.get_json(silent=True) or {}
    name              = data.get('name', '').strip()
    email             = data.get('email', '').strip().lower()
    password          = data.get('password', '')
    verification_code = data.get('verification_code', '').strip()

    if not name or not email or not password:
        return jsonify({'error': 'All fields required'}), 400
    if not verification_code:
        return jsonify({'error': 'Verification code required'}), 400

    conn = None
    try:
        conn = get_db()
        cur  = conn.cursor()

        # Verify OTP code
        cur.execute("""
            SELECT id, expires_at, used
            FROM email_verifications
            WHERE email = %s AND code = %s
            ORDER BY id DESC LIMIT 1
        """, (email, verification_code))
        ver_row = cur.fetchone()
        if not ver_row:
            return jsonify({'error': 'Invalid verification code'}), 400
        ver_id, expires_at, used = ver_row
        if used:
            return jsonify({'error': 'Verification code already used'}), 400
        if datetime.utcnow() > expires_at:
            return jsonify({'error': 'Verification code expired — please request a new one'}), 400

        # Mark code used before inserting user (prevents race)
        cur.execute("UPDATE email_verifications SET used = 1 WHERE id = %s", (ver_id,))

        cur.execute("SELECT id_user FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            return jsonify({'error': 'Email already registered'}), 409

        cur.execute(
            "INSERT INTO users (name, email, password) VALUES (%s, %s, %s)",
            (name, email, password)
        )
        user_id = cur.lastrowid

        # Create a student profile automatically
        cur.execute("INSERT INTO student_profiles (id_user) VALUES (%s)", (user_id,))
        conn.commit()
        cur.close(); conn.close()
        return jsonify({'message': 'Account created'}), 201

    except Exception as e:
        if conn:
            try: conn.rollback()
            except: pass
            try: conn.close()
            except: pass
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    data     = request.get_json()
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')

    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute(
            "SELECT id_user, name, email FROM users WHERE email = %s AND password = %s",
            (email, password)
        )
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Invalid email or password'}), 401

        user_id, name, user_email = row

        cur.execute("SELECT id_tutor FROM tutor_profiles WHERE id_user = %s", (user_id,))
        is_tutor = cur.fetchone() is not None

        # Defensive: is_premium column may not exist yet (pending migration)
        try:
            cur.execute("SELECT is_premium FROM users WHERE id_user = %s", (user_id,))
            prem_row   = cur.fetchone()
            is_premium = bool(prem_row[0]) if prem_row else False
        except Exception:
            is_premium = False

        # screening_status for tutor gate
        screening_status = None
        if is_tutor:
            try:
                cur.execute("SELECT screening_status FROM tutor_profiles WHERE id_user = %s", (user_id,))
                ss_row = cur.fetchone()
                screening_status = ss_row[0] if ss_row else 'none'
            except Exception:
                screening_status = 'none'

        is_admin = (user_email.lower() == SUPER_ADMIN_EMAIL)
        token = create_access_token(
            identity=str(user_id),
            additional_claims={
                'name': name, 'email': user_email, 'is_tutor': is_tutor,
                'is_premium': is_premium, 'screening_status': screening_status,
                'is_admin': is_admin,
            },
        )
        return jsonify({
            'access_token': token,
            'user': {
                'id': user_id, 'name': name, 'email': user_email,
                'is_tutor': is_tutor, 'is_premium': is_premium,
                'screening_status': screening_status, 'is_admin': is_admin,
            },
        })
    finally:
        cur.close(); conn.close()


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def me():
    claims = get_jwt()
    uid    = current_user_id()
    # Fetch live screening_status from DB (JWT may be stale after admin approval)
    screening_status = None
    is_tutor = claims.get('is_tutor', False)
    if is_tutor:
        try:
            conn = get_db(); cur = conn.cursor()
            cur.execute("SELECT screening_status FROM tutor_profiles WHERE id_user = %s", (uid,))
            row = cur.fetchone()
            screening_status = row[0] if row else 'none'
            cur.close(); conn.close()
        except Exception:
            screening_status = claims.get('screening_status')
    email = claims.get('email', '')
    return jsonify({
        'user': {
            'id':               uid,
            'name':             claims.get('name'),
            'email':            email,
            'is_tutor':         is_tutor,
            'is_premium':       claims.get('is_premium', False),
            'screening_status': screening_status,
            'is_admin':         email.lower() == SUPER_ADMIN_EMAIL,
        }
    })

# ── Tutor avatar upload ───────────────────────────────────────────────────────

AVATAR_DIR = os.path.join(os.path.dirname(__file__), 'uploads', 'tutor-avatars')
os.makedirs(AVATAR_DIR, exist_ok=True)

@app.route('/api/tutor-profile/avatar', methods=['POST'])
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


@app.route('/api/uploads/tutor-avatars/<path:filename>', methods=['GET'])
def serve_tutor_avatar(filename):
    """Serve tutor avatar images — public."""
    from flask import send_from_directory
    return send_from_directory(AVATAR_DIR, filename)


# ── Tutors ────────────────────────────────────────────────────────────────────

@app.route('/api/tutors', methods=['GET'])
@jwt_required()
def get_tutors():
    university = request.args.get('university', '')
    subject    = request.args.get('subject', '')

    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        # Only show approved tutors (status column may not exist yet — handled by fallback)
        query  = """
            SELECT tp.id_tutor, tp.id_user, u.name, tp.age, tp.university,
                   tp.course, tp.about_me, tp.subjects, tp.availability
            FROM tutor_profiles tp
            JOIN users u ON u.id_user = tp.id_user
            WHERE (tp.status IS NULL OR tp.status = 'approved')
        """
        params = []
        if university:
            query += " AND tp.university LIKE %s"
            params.append(f'%{university}%')
        if subject:
            query += " AND tp.subjects LIKE %s"
            params.append(f'%{subject}%')

        try:
            cur.execute(query, params)
            tutors = cur.fetchall()
        except Exception:
            # subjects / availability / status columns may not exist yet — retry with base columns only
            conn.rollback()
            fallback = """
                SELECT tp.id_tutor, tp.id_user, u.name, tp.age, tp.university,
                       tp.course, tp.about_me, '' AS subjects, '' AS availability
                FROM tutor_profiles tp
                JOIN users u ON u.id_user = tp.id_user
                WHERE 1=1
            """
            fb_params = []
            if university:
                fallback  += " AND tp.university LIKE %s"
                fb_params.append(f'%{university}%')
            cur.execute(fallback, fb_params)
            tutors = cur.fetchall()

        return jsonify({'tutors': tutors})
    finally:
        cur.close(); conn.close()


@app.route('/api/tutors/<int:tutor_id>', methods=['GET'])
@jwt_required()
def get_tutor(tutor_id):
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT tp.id_tutor, tp.id_user, u.name, tp.age, tp.university,
                   tp.course, tp.about_me, tp.subjects, tp.availability,
                   COALESCE(tp.linkedin_url, '') AS linkedin_url,
                   tp.avatar_path
            FROM tutor_profiles tp
            JOIN users u ON u.id_user = tp.id_user
            WHERE tp.id_tutor = %s
        """, (tutor_id,))
        tutor = cur.fetchone()
        if not tutor:
            return jsonify({'error': 'Tutor not found'}), 404

        if tutor.get('avatar_path'):
            tutor['avatar_url'] = f'/api/uploads/tutor-avatars/{tutor["avatar_path"]}'

        cur.execute(
            "SELECT liked FROM liked_tutors WHERE id_user = %s AND id_tutor = %s",
            (uid, tutor_id)
        )
        liked_row = cur.fetchone()
        liked = bool(liked_row and liked_row['liked'])

        return jsonify({'tutor': tutor, 'liked': liked})
    finally:
        cur.close(); conn.close()


@app.route('/api/tutors/<int:tutor_id>/like', methods=['POST'])
@jwt_required()
def like_tutor(tutor_id):
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute(
            "SELECT liked FROM liked_tutors WHERE id_user = %s AND id_tutor = %s",
            (uid, tutor_id)
        )
        row = cur.fetchone()
        if row:
            new_liked = not row[0]
            cur.execute(
                "UPDATE liked_tutors SET liked = %s WHERE id_user = %s AND id_tutor = %s",
                (new_liked, uid, tutor_id)
            )
        else:
            new_liked = True
            cur.execute(
                "INSERT INTO liked_tutors (id_user, id_tutor, liked) VALUES (%s, %s, 1)",
                (uid, tutor_id)
            )
        conn.commit()
        return jsonify({'liked': new_liked})
    finally:
        cur.close(); conn.close()


@app.route('/api/liked-tutors', methods=['GET'])
@jwt_required()
def liked_tutors():
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        try:
            cur.execute("""
                SELECT tp.id_tutor, tp.id_user, u.name, tp.age, tp.university,
                       tp.course, tp.about_me, tp.subjects, tp.availability
                FROM liked_tutors lt
                JOIN tutor_profiles tp ON tp.id_tutor = lt.id_tutor
                JOIN users u ON u.id_user = tp.id_user
                WHERE lt.id_user = %s AND lt.liked = 1
            """, (uid,))
        except Exception:
            conn.rollback()
            cur.execute("""
                SELECT tp.id_tutor, tp.id_user, u.name, tp.age, tp.university,
                       tp.course, tp.about_me, '' AS subjects, '' AS availability
                FROM liked_tutors lt
                JOIN tutor_profiles tp ON tp.id_tutor = lt.id_tutor
                JOIN users u ON u.id_user = tp.id_user
                WHERE lt.id_user = %s AND lt.liked = 1
            """, (uid,))
        return jsonify({'tutors': cur.fetchall()})
    finally:
        cur.close(); conn.close()


@app.route('/api/tutors/<int:tutor_id>/activate', methods=['POST'])
@jwt_required()
def activate_tutor(tutor_id):
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor()
    try:
        # Get or auto-create student profile (handles legacy users)
        cur.execute("SELECT id_student FROM student_profiles WHERE id_user = %s", (uid,))
        row = cur.fetchone()
        if not row:
            cur.execute("INSERT INTO student_profiles (id_user) VALUES (%s)", (uid,))
            conn.commit()
            student_id = cur.lastrowid
        else:
            student_id = row[0]

        # Check not already active
        cur.execute(
            "SELECT 1 FROM active_tutors WHERE id_user = %s AND id_tutor = %s",
            (uid, tutor_id)
        )
        if cur.fetchone():
            return jsonify({'error': 'Already in your active tutors'}), 409

        # INSERT all three columns — the table requires id_user, id_student, and id_tutor
        cur.execute(
            "INSERT INTO active_tutors (id_user, id_student, id_tutor) VALUES (%s, %s, %s)",
            (uid, student_id, tutor_id)
        )
        conn.commit()
        return jsonify({'message': 'Tutor activated'})
    finally:
        cur.close(); conn.close()


@app.route('/api/tutors/<int:tutor_id>/activate', methods=['DELETE'])
@jwt_required()
def deactivate_tutor(tutor_id):
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute(
            "DELETE FROM active_tutors WHERE id_user = %s AND id_tutor = %s",
            (uid, tutor_id)
        )
        conn.commit()
        return jsonify({'message': 'Tutor removed'})
    finally:
        cur.close(); conn.close()


@app.route('/api/active-tutors', methods=['GET'])
@jwt_required()
def active_tutors():
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        # Query by id_user — always present since we INSERT it
        try:
            cur.execute("""
                SELECT tp.id_tutor, tp.id_user, u.name, tp.age, tp.university,
                       tp.course, tp.about_me, tp.subjects, tp.availability
                FROM active_tutors at2
                JOIN tutor_profiles tp ON tp.id_tutor = at2.id_tutor
                JOIN users u ON u.id_user = tp.id_user
                WHERE at2.id_user = %s
            """, (uid,))
        except Exception:
            conn.rollback()
            cur.execute("""
                SELECT tp.id_tutor, tp.id_user, u.name, tp.age, tp.university,
                       tp.course, tp.about_me, '' AS subjects, '' AS availability
                FROM active_tutors at2
                JOIN tutor_profiles tp ON tp.id_tutor = at2.id_tutor
                JOIN users u ON u.id_user = tp.id_user
                WHERE at2.id_user = %s
            """, (uid,))
        return jsonify({'tutors': cur.fetchall()})
    finally:
        cur.close(); conn.close()

# ── Tutor profile (self) ──────────────────────────────────────────────────────

@app.route('/api/tutor-profile', methods=['GET'])
@jwt_required()
def get_tutor_profile():
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM tutor_profiles WHERE id_user = %s", (uid,))
        profile = cur.fetchone()
        if profile and profile.get('avatar_path'):
            profile['avatar_url'] = f'/api/uploads/tutor-avatars/{profile["avatar_path"]}'
        return jsonify({'profile': profile})
    finally:
        cur.close(); conn.close()


@app.route('/api/tutor-profile', methods=['POST'])
@jwt_required()
def save_tutor_profile():
    uid  = current_user_id()
    data = request.get_json()
    age          = data.get('age')
    university   = data.get('university', '')
    course       = data.get('course', '')
    about_me     = data.get('about_me', '')
    subjects     = data.get('subjects', '')
    availability = data.get('availability', '')
    linkedin_url = data.get('linkedin_url', '')

    conn = get_db(); cur = conn.cursor()
    try:
        # Ensure linkedin_url column exists (graceful migration)
        try:
            cur.execute("ALTER TABLE tutor_profiles ADD COLUMN linkedin_url VARCHAR(500) NULL")
            conn.commit()
        except Exception:
            conn.rollback()

        cur.execute("SELECT id_tutor FROM tutor_profiles WHERE id_user = %s", (uid,))
        exists = cur.fetchone()
        if exists:
            try:
                cur.execute("""
                    UPDATE tutor_profiles
                    SET age=%s, university=%s, course=%s, about_me=%s, subjects=%s, availability=%s, linkedin_url=%s
                    WHERE id_user=%s
                """, (age, university, course, about_me, subjects, availability, linkedin_url, uid))
            except Exception:
                conn.rollback()
                cur.execute("""
                    UPDATE tutor_profiles
                    SET age=%s, university=%s, course=%s, about_me=%s, subjects=%s, availability=%s
                    WHERE id_user=%s
                """, (age, university, course, about_me, subjects, availability, uid))
        else:
            # First time creating — set status='pending' for admin review
            try:
                cur.execute("""
                    INSERT INTO tutor_profiles
                        (id_user, age, university, course, about_me, subjects, availability, linkedin_url, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'pending')
                """, (uid, age, university, course, about_me, subjects, availability, linkedin_url))
            except Exception:
                # status or linkedin_url column may not exist yet — insert without them
                conn.rollback()
                cur.execute("""
                    INSERT INTO tutor_profiles (id_user, age, university, course, about_me, subjects, availability)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (uid, age, university, course, about_me, subjects, availability))
        conn.commit()

        # Return current status so frontend can show review banner
        try:
            cur.execute("SELECT status FROM tutor_profiles WHERE id_user = %s", (uid,))
            status_row = cur.fetchone()
            profile_status = status_row[0] if status_row else None
        except Exception:
            profile_status = None

        return jsonify({'message': 'Profile saved', 'status': profile_status, 'is_new': not exists})
    finally:
        cur.close(); conn.close()

# ── Active students ───────────────────────────────────────────────────────────

@app.route('/api/active-students', methods=['GET'])
@jwt_required()
def active_students():
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id_tutor FROM tutor_profiles WHERE id_user = %s", (uid,))
        row = cur.fetchone()
        if not row:
            return jsonify({'students': []})
        cur.execute("""
            SELECT sp.id_student, u.name, u.email
            FROM active_students ast2
            JOIN student_profiles sp ON sp.id_student = ast2.id_student
            JOIN users u ON u.id_user = sp.id_user
            WHERE ast2.id_tutor = %s
        """, (row['id_tutor'],))
        return jsonify({'students': cur.fetchall()})
    finally:
        cur.close(); conn.close()


@app.route('/api/active-students', methods=['POST'])
@jwt_required()
def add_active_student():
    uid        = current_user_id()
    student_id = request.get_json().get('student_id')
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("SELECT id_tutor FROM tutor_profiles WHERE id_user = %s", (uid,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Tutor profile not found'}), 404
        cur.execute(
            "INSERT IGNORE INTO active_students (id_tutor, id_student) VALUES (%s, %s)",
            (row[0], student_id)
        )
        conn.commit()
        return jsonify({'message': 'Student added'})
    finally:
        cur.close(); conn.close()

# ── Tutor invite/request system ───────────────────────────────────────────────
#
# Required DB migration (run once):
#   CREATE TABLE IF NOT EXISTS tutor_requests (
#     id         INT AUTO_INCREMENT PRIMARY KEY,
#     student_id INT NOT NULL,
#     tutor_id   INT NOT NULL,
#     status     ENUM('pending','accepted','declined') DEFAULT 'pending',
#     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
#     UNIQUE KEY uniq_sr   (student_id, tutor_id),
#     INDEX idx_tr_tutor   (tutor_id),
#     INDEX idx_tr_student (student_id)
#   );

@app.route('/api/tutors/<int:tutor_id>/request', methods=['POST'])
@jwt_required()
def send_tutor_request(tutor_id):
    """Student sends an invite to a tutor (pending until tutor accepts)."""
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor()
    try:
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


@app.route('/api/tutor-requests/sent', methods=['GET'])
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


@app.route('/api/tutor-requests/received', methods=['GET'])
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


@app.route('/api/tutor-requests/<int:request_id>', methods=['PATCH'])
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

# ── Events / Sessions ─────────────────────────────────────────────────────────

@app.route('/api/events', methods=['GET'])
@jwt_required()
def get_events():
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        # Defensive: 'amount' column may not exist yet — retry without it if query fails
        try:
            cur.execute("""
                SELECT e.id_event, e.title, e.description, e.start_time, e.end_time,
                       e.status, e.amount, e.tutor_id, e.student_id,
                       u_t.name AS tutor_name, u_s.name AS student_name
                FROM events e
                LEFT JOIN tutor_profiles tp ON tp.id_tutor = e.tutor_id
                LEFT JOIN users u_t ON u_t.id_user = tp.id_user
                LEFT JOIN student_profiles sp ON sp.id_student = e.student_id
                LEFT JOIN users u_s ON u_s.id_user = sp.id_user
                WHERE tp.id_user = %s OR sp.id_user = %s
                ORDER BY e.start_time ASC
            """, (uid, uid))
        except Exception:
            conn.rollback()
            cur.execute("""
                SELECT e.id_event, e.title, e.description, e.start_time, e.end_time,
                       e.status, 0 AS amount, e.tutor_id, e.student_id,
                       u_t.name AS tutor_name, u_s.name AS student_name
                FROM events e
                LEFT JOIN tutor_profiles tp ON tp.id_tutor = e.tutor_id
                LEFT JOIN users u_t ON u_t.id_user = tp.id_user
                LEFT JOIN student_profiles sp ON sp.id_student = e.student_id
                LEFT JOIN users u_s ON u_s.id_user = sp.id_user
                WHERE tp.id_user = %s OR sp.id_user = %s
                ORDER BY e.start_time ASC
            """, (uid, uid))
        events = cur.fetchall()
        # Convert datetimes to strings
        for ev in events:
            for key in ('start_time', 'end_time'):
                if ev.get(key) and hasattr(ev[key], 'isoformat'):
                    ev[key] = ev[key].isoformat()
        return jsonify({'events': events})
    finally:
        cur.close(); conn.close()


@app.route('/api/events', methods=['POST'])
@jwt_required()
def create_event():
    uid  = current_user_id()
    data = request.get_json()
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("SELECT id_tutor FROM tutor_profiles WHERE id_user = %s", (uid,))
        tutor_row = cur.fetchone()
        tutor_id  = tutor_row[0] if tutor_row else None

        cur.execute("SELECT id_student FROM student_profiles WHERE id_user = %s", (uid,))
        student_row = cur.fetchone()
        student_id  = student_row[0] if student_row else None

        cur.execute("""
            INSERT INTO events (user_id, tutor_id, student_id, title, description, start_time, end_time, status, amount)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending', %s)
        """, (uid, tutor_id or data.get('tutor_id'), student_id or data.get('student_id'),
              data.get('title'), data.get('description'), data.get('start_time'),
              data.get('end_time'), data.get('amount')))
        conn.commit()
        return jsonify({'event': {'id_event': cur.lastrowid}}), 201
    finally:
        cur.close(); conn.close()


@app.route('/api/events/<int:event_id>/status', methods=['PUT'])
@jwt_required()
def update_event_status(event_id):
    status = request.get_json().get('status')
    if status not in ('pending', 'confirmed', 'canceled', 'paid'):
        return jsonify({'error': 'Invalid status'}), 400

    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("UPDATE events SET status = %s WHERE id_event = %s", (status, event_id))
        conn.commit()
        return jsonify({'message': 'Status updated'})
    finally:
        cur.close(); conn.close()

# ── Messages ──────────────────────────────────────────────────────────────────

@app.route('/api/messages', methods=['GET'])
@jwt_required()
def get_conversations():
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT
                CASE WHEN m.id_sender = %s THEN m.id_receiver ELSE m.id_sender END AS user_id,
                u.name,
                MAX(m.message)           AS last_message,
                MAX(m.message_timestamp) AS last_ts
            FROM messages m
            JOIN users u ON u.id_user = CASE WHEN m.id_sender = %s THEN m.id_receiver ELSE m.id_sender END
            WHERE m.id_sender = %s OR m.id_receiver = %s
            GROUP BY user_id, u.name
            ORDER BY last_ts DESC
        """, (uid, uid, uid, uid))
        convos = cur.fetchall()
        for c in convos:
            if c.get('last_ts') and hasattr(c['last_ts'], 'isoformat'):
                c['last_ts'] = c['last_ts'].isoformat()
            c['unread'] = 0  # unread tracking placeholder
        return jsonify({'conversations': convos})
    finally:
        cur.close(); conn.close()


@app.route('/api/messages/<int:other_user_id>', methods=['GET'])
@jwt_required()
def get_messages(other_user_id):
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT id_message, id_sender, id_receiver, message, message_timestamp
            FROM messages
            WHERE (id_sender = %s AND id_receiver = %s)
               OR (id_sender = %s AND id_receiver = %s)
            ORDER BY message_timestamp ASC
        """, (uid, other_user_id, other_user_id, uid))
        msgs = cur.fetchall()
        for m in msgs:
            if m.get('message_timestamp') and hasattr(m['message_timestamp'], 'isoformat'):
                m['message_timestamp'] = m['message_timestamp'].isoformat()
        return jsonify({'messages': msgs})
    finally:
        cur.close(); conn.close()


@app.route('/api/messages', methods=['POST'])
@jwt_required()
def send_message():
    uid         = current_user_id()
    data        = request.get_json()
    receiver_id = data.get('receiver_id')
    message     = data.get('message', '').strip()

    if not receiver_id or not message:
        return jsonify({'error': 'receiver_id and message required'}), 400

    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO messages (id_sender, id_receiver, message) VALUES (%s, %s, %s)",
            (uid, receiver_id, message)
        )
        conn.commit()
        return jsonify({'message': 'Sent'}), 201
    finally:
        cur.close(); conn.close()

# ── Forum ─────────────────────────────────────────────────────────────────────

@app.route('/api/forum/categories', methods=['GET'])
@jwt_required()
def forum_categories():
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id, name, description FROM forum_categories")
        return jsonify({'categories': cur.fetchall()})
    finally:
        cur.close(); conn.close()


@app.route('/api/forum/categories/<int:cat_id>', methods=['GET'])
@jwt_required()
def forum_category(cat_id):
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id, name, description FROM forum_categories WHERE id = %s", (cat_id,))
        category = cur.fetchone()
        if not category:
            return jsonify({'error': 'Not found'}), 404

        cur.execute("""
            SELECT ft.id, ft.title, ft.content, ft.created_at, u.name AS author_name,
                   COUNT(fp.id) AS post_count
            FROM forum_threads ft
            JOIN users u ON u.id_user = ft.user_id
            LEFT JOIN forum_posts fp ON fp.thread_id = ft.id
            WHERE ft.category_id = %s
            GROUP BY ft.id, ft.title, ft.content, ft.created_at, u.name
            ORDER BY ft.created_at DESC
        """, (cat_id,))
        threads = cur.fetchall()
        for t in threads:
            if t.get('created_at') and hasattr(t['created_at'], 'isoformat'):
                t['created_at'] = t['created_at'].isoformat()
        return jsonify({'category': category, 'threads': threads})
    finally:
        cur.close(); conn.close()


@app.route('/api/forum/categories/<int:cat_id>/threads', methods=['POST'])
@jwt_required()
def create_thread(cat_id):
    uid  = current_user_id()
    data = request.get_json()
    title   = data.get('title', '').strip()
    content = data.get('content', '').strip()
    if not title or not content:
        return jsonify({'error': 'title and content required'}), 400

    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO forum_threads (category_id, user_id, title, content) VALUES (%s, %s, %s, %s)",
            (cat_id, uid, title, content)
        )
        conn.commit()
        return jsonify({'thread': {'id': cur.lastrowid}}), 201
    finally:
        cur.close(); conn.close()


@app.route('/api/forum/threads/<int:thread_id>', methods=['GET'])
@jwt_required()
def get_thread(thread_id):
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT ft.id, ft.title, ft.content, ft.created_at, u.name AS author_name, ft.user_id
            FROM forum_threads ft
            JOIN users u ON u.id_user = ft.user_id
            WHERE ft.id = %s
        """, (thread_id,))
        thread = cur.fetchone()
        if not thread:
            return jsonify({'error': 'Not found'}), 404
        if thread.get('created_at') and hasattr(thread['created_at'], 'isoformat'):
            thread['created_at'] = thread['created_at'].isoformat()

        cur.execute("""
            SELECT fp.id, fp.content, fp.created_at, u.name AS author_name, fp.user_id
            FROM forum_posts fp
            JOIN users u ON u.id_user = fp.user_id
            WHERE fp.thread_id = %s
            ORDER BY fp.created_at ASC
        """, (thread_id,))
        posts = cur.fetchall()
        for p in posts:
            if p.get('created_at') and hasattr(p['created_at'], 'isoformat'):
                p['created_at'] = p['created_at'].isoformat()

        return jsonify({'thread': thread, 'posts': posts})
    finally:
        cur.close(); conn.close()


@app.route('/api/forum/threads/<int:thread_id>/posts', methods=['POST'])
@jwt_required()
def create_post(thread_id):
    uid     = current_user_id()
    content = request.get_json().get('content', '').strip()
    if not content:
        return jsonify({'error': 'content required'}), 400

    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO forum_posts (thread_id, user_id, content) VALUES (%s, %s, %s)",
            (thread_id, uid, content)
        )
        conn.commit()
        return jsonify({'post': {'id': cur.lastrowid}}), 201
    finally:
        cur.close(); conn.close()

# ── Study Rooms ───────────────────────────────────────────────────────────────

@app.route('/api/study-rooms', methods=['GET'])
@jwt_required()
def get_study_rooms():
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        try:
            cur.execute("""
                SELECT sr.id, sr.subject, sr.description, sr.start_time, sr.end_time,
                       sr.zoom_link, u.name AS tutor_name, tp.id_user AS creator_user_id
                FROM study_rooms sr
                JOIN tutor_profiles tp ON tp.id_tutor = sr.tutor_id
                JOIN users u ON u.id_user = tp.id_user
                ORDER BY sr.start_time ASC
            """)
            rooms = cur.fetchall()
        except Exception:
            # study_rooms table may not exist yet
            rooms = []
        for r in rooms:
            for key in ('start_time', 'end_time'):
                if r.get(key) and hasattr(r[key], 'isoformat'):
                    r[key] = r[key].isoformat()
        return jsonify({'rooms': rooms})
    finally:
        cur.close(); conn.close()


@app.route('/api/study-rooms', methods=['POST'])
@jwt_required()
def create_study_room():
    uid  = current_user_id()
    data = request.get_json()
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("SELECT id_tutor FROM tutor_profiles WHERE id_user = %s", (uid,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Tutor profile required'}), 403

        cur.execute("""
            INSERT INTO study_rooms (tutor_id, subject, description, start_time, end_time, zoom_link)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (row[0], data.get('subject'), data.get('description'),
              data.get('start_time'), data.get('end_time'), data.get('zoom_link')))
        conn.commit()
        return jsonify({'room': {'id': cur.lastrowid}}), 201
    finally:
        cur.close(); conn.close()


@app.route('/api/study-rooms/<int:room_id>/calendar', methods=['POST'])
@jwt_required()
def save_room_to_calendar(room_id):
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM study_rooms WHERE id = %s", (room_id,))
        room = cur.fetchone()
        if not room:
            return jsonify({'error': 'Room not found'}), 404

        cur.execute("SELECT id_student FROM student_profiles WHERE id_user = %s", (uid,))
        sp = cur.fetchone()
        student_id = sp['id_student'] if sp else None

        cur.execute("""
            INSERT INTO events (user_id, tutor_id, student_id, title, description, start_time, end_time, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'confirmed')
        """, (uid, room['tutor_id'], student_id,
              f"Study Room: {room['subject']}", room['description'],
              room['start_time'], room['end_time']))
        conn.commit()
        return jsonify({'message': 'Added to calendar'})
    finally:
        cur.close(); conn.close()

# ── Payments ──────────────────────────────────────────────────────────────────

@app.route('/api/payments', methods=['GET'])
@jwt_required()
def get_payments():
    uid  = current_user_id()
    role = request.args.get('role', 'student')   # 'student' | 'tutor'
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        if role == 'tutor':
            # Earnings: sessions where this user is the tutor
            try:
                cur.execute("""
                    SELECT e.id_event, e.title, e.start_time, e.end_time,
                           e.status, e.amount, u_s.name AS student_name
                    FROM events e
                    LEFT JOIN tutor_profiles tp ON tp.id_tutor = e.tutor_id
                    LEFT JOIN student_profiles sp ON sp.id_student = e.student_id
                    LEFT JOIN users u_s ON u_s.id_user = sp.id_user
                    WHERE tp.id_user = %s
                    ORDER BY e.start_time DESC
                """, (uid,))
            except Exception:
                conn.rollback()
                cur.execute("""
                    SELECT e.id_event, e.title, e.start_time, e.end_time,
                           e.status, 0 AS amount, u_s.name AS student_name
                    FROM events e
                    LEFT JOIN tutor_profiles tp ON tp.id_tutor = e.tutor_id
                    LEFT JOIN student_profiles sp ON sp.id_student = e.student_id
                    LEFT JOIN users u_s ON u_s.id_user = sp.id_user
                    WHERE tp.id_user = %s
                    ORDER BY e.start_time DESC
                """, (uid,))
        else:
            # Payments: sessions where this user is the student
            try:
                cur.execute("""
                    SELECT e.id_event, e.title, e.start_time, e.end_time,
                           e.status, e.amount, u_t.name AS tutor_name
                    FROM events e
                    LEFT JOIN tutor_profiles tp ON tp.id_tutor = e.tutor_id
                    LEFT JOIN users u_t ON u_t.id_user = tp.id_user
                    LEFT JOIN student_profiles sp ON sp.id_student = e.student_id
                    WHERE sp.id_user = %s
                    ORDER BY e.start_time DESC
                """, (uid,))
            except Exception:
                conn.rollback()
                cur.execute("""
                    SELECT e.id_event, e.title, e.start_time, e.end_time,
                           e.status, 0 AS amount, u_t.name AS tutor_name
                    FROM events e
                    LEFT JOIN tutor_profiles tp ON tp.id_tutor = e.tutor_id
                    LEFT JOIN users u_t ON u_t.id_user = tp.id_user
                    LEFT JOIN student_profiles sp ON sp.id_student = e.student_id
                    WHERE sp.id_user = %s
                    ORDER BY e.start_time DESC
                """, (uid,))
        events = cur.fetchall()
        for ev in events:
            for key in ('start_time', 'end_time'):
                if ev.get(key) and hasattr(ev[key], 'isoformat'):
                    ev[key] = ev[key].isoformat()
        return jsonify({'events': events})
    finally:
        cur.close(); conn.close()


@app.route('/api/payments/setup', methods=['POST'])
@jwt_required()
def setup_payment():
    # Legacy stub kept for compatibility
    return jsonify({'message': 'Use /api/payments/checkout/<event_id> instead'})


@app.route('/api/payments/checkout/<int:event_id>', methods=['POST'])
@jwt_required()
def create_checkout_session(event_id):
    """Create a Stripe Checkout Session for a confirmed session."""
    if stripe is None or not stripe.api_key:
        return jsonify({'error': 'Stripe is not configured. Set STRIPE_SECRET_KEY in environment.'}), 503

    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT e.id_event, e.title, e.amount, e.status,
                   sp.id_user AS student_user_id
            FROM events e
            LEFT JOIN student_profiles sp ON sp.id_student = e.student_id
            WHERE e.id_event = %s
        """, (event_id,))
        ev = cur.fetchone()
        if not ev:
            return jsonify({'error': 'Event not found'}), 404
        if ev['student_user_id'] != uid:
            return jsonify({'error': 'Not authorised'}), 403
        if ev['status'] not in ('confirmed', 'pending'):
            return jsonify({'error': 'Session is not payable (must be confirmed or pending)'}), 400

        amount_pence = int(float(ev['amount'] or 0) * 100)
        if amount_pence < 50:
            return jsonify({'error': 'Amount too small for Stripe (minimum £0.50)'}), 400

        frontend_base = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'gbp',
                    'unit_amount': amount_pence,
                    'product_data': {'name': ev['title']},
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f'{frontend_base}/payments?success=1&event_id={event_id}',
            cancel_url=f'{frontend_base}/payments?canceled=1',
            metadata={'event_id': str(event_id), 'user_id': str(uid)},
        )
        return jsonify({'url': session.url})
    finally:
        cur.close(); conn.close()


@app.route('/api/payments/verify/<int:event_id>', methods=['POST'])
@jwt_required()
def verify_payment(event_id):
    """Mark an event as paid after successful Stripe checkout redirect."""
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT e.id_event, sp.id_user AS student_user_id
            FROM events e
            LEFT JOIN student_profiles sp ON sp.id_student = e.student_id
            WHERE e.id_event = %s
        """, (event_id,))
        ev = cur.fetchone()
        if not ev or ev['student_user_id'] != uid:
            return jsonify({'error': 'Not authorised'}), 403

        cur2 = conn.cursor()
        cur2.execute("UPDATE events SET status = 'paid' WHERE id_event = %s", (event_id,))
        conn.commit()
        cur2.close()
        return jsonify({'message': 'Payment recorded'})
    finally:
        cur.close(); conn.close()


# ── Users / Search ────────────────────────────────────────────────────────────

@app.route('/api/users/search', methods=['GET'])
@jwt_required()
def search_users():
    """Search users by name or email (for starting new message conversations)."""
    q    = request.args.get('q', '').strip()
    uid  = current_user_id()
    if len(q) < 2:
        return jsonify({'users': []})
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            """SELECT id_user, name, email
               FROM users
               WHERE (name LIKE %s OR email LIKE %s)
                 AND id_user != %s
               LIMIT 12""",
            (f'%{q}%', f'%{q}%', uid)
        )
        users = cur.fetchall()
        return jsonify({'users': users})
    finally:
        cur.close(); conn.close()


@app.route('/api/users/<int:user_id>/profile', methods=['GET'])
@jwt_required()
def get_user_profile(user_id):
    """Public profile for any user: basic info + activity stats + student bio."""
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT u.id_user, u.name, u.email,
                   u.created_at,
                   sp.education_level, sp.school_name, sp.study_year, sp.bio
            FROM users u
            LEFT JOIN student_profiles sp ON sp.id_user = u.id_user
            WHERE u.id_user = %s
        """, (user_id,))
        user = cur.fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Serialize datetime
        if user.get('created_at') and hasattr(user['created_at'], 'isoformat'):
            user['created_at'] = user['created_at'].isoformat()

        # Activity stats
        stats = {}
        try:
            cur.execute("SELECT COUNT(*) AS cnt FROM forum_posts WHERE user_id = %s", (user_id,))
            stats['forum_posts'] = (cur.fetchone() or {}).get('cnt', 0)
        except Exception:
            stats['forum_posts'] = 0
        try:
            cur.execute("SELECT COUNT(*) AS cnt FROM events WHERE student_id = %s", (user_id,))
            stats['sessions'] = (cur.fetchone() or {}).get('cnt', 0)
        except Exception:
            stats['sessions'] = 0
        try:
            cur.execute("SELECT COUNT(*) AS cnt FROM events WHERE student_id = %s AND status = 'confirmed'", (user_id,))
            stats['confirmed_sessions'] = (cur.fetchone() or {}).get('cnt', 0)
        except Exception:
            stats['confirmed_sessions'] = 0

        user['stats'] = stats
        user.pop('email', None)   # don't expose email publicly
        return jsonify({'user': user})
    finally:
        cur.close(); conn.close()


@app.route('/api/users/me/student-bio', methods=['PUT'])
@jwt_required()
def update_student_bio():
    """Let a student update their public bio fields."""
    uid  = current_user_id()
    data = request.get_json()
    allowed = ('education_level', 'school_name', 'study_year', 'bio')
    conn = get_db(); cur = conn.cursor()
    try:
        # Ensure student_profiles row exists
        cur.execute("SELECT id_student FROM student_profiles WHERE id_user = %s", (uid,))
        if not cur.fetchone():
            cur.execute("INSERT INTO student_profiles (id_user) VALUES (%s)", (uid,))
            conn.commit()
        # Add columns if they don't exist (graceful migration)
        for col in ('education_level VARCHAR(100)', 'school_name VARCHAR(200)', 'study_year VARCHAR(50)', 'bio TEXT'):
            col_name = col.split()[0]
            try:
                cur.execute(f"ALTER TABLE student_profiles ADD COLUMN {col}")
                conn.commit()
            except Exception:
                pass  # already exists
        # Build update
        fields = {k: v for k, v in data.items() if k in allowed}
        if not fields:
            return jsonify({'message': 'nothing to update'}), 200
        set_clause = ', '.join(f"{k} = %s" for k in fields)
        cur.execute(f"UPDATE student_profiles SET {set_clause} WHERE id_user = %s",
                    (*fields.values(), uid))
        conn.commit()
        return jsonify({'message': 'updated'})
    finally:
        cur.close(); conn.close()


# ── Membership ────────────────────────────────────────────────────────────────

@app.route('/api/membership/upgrade', methods=['POST'])
@jwt_required()
def upgrade_membership():
    """Upgrade the current user to Explorer (premium) plan (simulation stub)."""
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        # Check if is_premium column exists; add it if missing (one-time migration)
        cur.execute("""
            SELECT COUNT(*) AS cnt
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
              AND table_name   = 'users'
              AND column_name  = 'is_premium'
        """)
        if cur.fetchone()['cnt'] == 0:
            cur.execute(
                "ALTER TABLE users ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT FALSE"
            )
            conn.commit()

        cur.execute("UPDATE users SET is_premium = TRUE WHERE id_user = %s", (uid,))
        conn.commit()

        cur.execute(
            "SELECT id_user AS id, name, email, is_premium FROM users WHERE id_user = %s",
            (uid,)
        )
        user = cur.fetchone()
        return jsonify({'message': 'Upgraded to Explorer Plan!', 'user': user})
    except Exception as e:
        try: conn.rollback()
        except Exception: pass
        return jsonify({'message': str(e)}), 500
    finally:
        cur.close(); conn.close()


@app.route('/api/membership/status', methods=['GET'])
@jwt_required()
def membership_status():
    """Return current premium status for the logged-in user."""
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT COUNT(*) AS cnt
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
              AND table_name   = 'users'
              AND column_name  = 'is_premium'
        """)
        if cur.fetchone()['cnt'] == 0:
            return jsonify({'is_premium': False})
        cur.execute("SELECT is_premium FROM users WHERE id_user = %s", (uid,))
        row = cur.fetchone()
        return jsonify({'is_premium': bool(row and row.get('is_premium'))})
    except Exception:
        return jsonify({'is_premium': False})
    finally:
        cur.close(); conn.close()


@app.route('/api/membership/downgrade', methods=['POST'])
@jwt_required()
def downgrade_membership():
    """Remove premium status (cancel subscription stub)."""
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE users SET is_premium = FALSE WHERE id_user = %s",
            (uid,)
        )
        conn.commit()
        return jsonify({'message': 'Subscription cancelled'})
    except Exception as e:
        return jsonify({'message': f'DB error: {e}'}), 500
    finally:
        cur.close(); conn.close()


# ── Auth refresh ──────────────────────────────────────────────────────────────

@app.route('/api/auth/refresh', methods=['POST'])
@jwt_required()
def refresh_auth_token():
    """Issue a new JWT with fresh claims from DB (call after membership change)."""
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("SELECT name, email FROM users WHERE id_user = %s", (uid,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'User not found'}), 404
        name, email = row

        cur.execute("SELECT id_tutor FROM tutor_profiles WHERE id_user = %s", (uid,))
        is_tutor = cur.fetchone() is not None

        try:
            cur.execute("SELECT is_premium FROM users WHERE id_user = %s", (uid,))
            prem_row   = cur.fetchone()
            is_premium = bool(prem_row[0]) if prem_row else False
        except Exception:
            is_premium = False

        token = create_access_token(
            identity=str(uid),
            additional_claims={'name': name, 'email': email, 'is_tutor': is_tutor, 'is_premium': is_premium},
        )
        return jsonify({
            'access_token': token,
            'user': {'id': uid, 'name': name, 'email': email, 'is_tutor': is_tutor, 'is_premium': is_premium},
        })
    finally:
        cur.close(); conn.close()

# ── Classrooms ────────────────────────────────────────────────────────────────
# DB migration (run once):
#   CREATE TABLE classrooms (
#     id INT AUTO_INCREMENT PRIMARY KEY,
#     tutor_id INT NOT NULL, title VARCHAR(255) NOT NULL,
#     subject VARCHAR(100), description TEXT,
#     capacity INT DEFAULT 30,
#     start_time DATETIME, end_time DATETIME, zoom_link VARCHAR(500),
#     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
#   );
#   CREATE TABLE classroom_enrollments (
#     classroom_id INT NOT NULL, student_id INT NOT NULL,
#     PRIMARY KEY (classroom_id, student_id)
#   );

def _classrooms_missing(e):
    return '1146' in str(e) or "doesn't exist" in str(e).lower()


@app.route('/api/classrooms', methods=['GET'])
@jwt_required()
def get_classrooms():
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        try:
            cur.execute("""
                SELECT c.id, c.title, c.subject, c.description,
                       c.capacity, c.start_time, c.end_time, c.zoom_link,
                       u.name AS tutor_name,
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
            for key in ('start_time', 'end_time'):
                if c.get(key) and hasattr(c[key], 'isoformat'):
                    c[key] = c[key].isoformat()
        return jsonify({'classrooms': classrooms})
    finally:
        cur.close(); conn.close()


@app.route('/api/classrooms', methods=['POST'])
@jwt_required()
def create_classroom():
    uid  = current_user_id()
    data = request.get_json()
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("SELECT id_tutor FROM tutor_profiles WHERE id_user = %s", (uid,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Tutor profile required'}), 403

        cur.execute("""
            INSERT INTO classrooms (tutor_id, title, subject, description, capacity, start_time, end_time, zoom_link)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (row[0], data.get('title'), data.get('subject'), data.get('description'),
              data.get('capacity', 30), data.get('start_time'), data.get('end_time'), data.get('zoom_link')))
        conn.commit()
        return jsonify({'classroom': {'id': cur.lastrowid}}), 201
    except Exception as e:
        if _classrooms_missing(e):
            return jsonify({'error': 'Run the classrooms DB migration first'}), 503
        raise
    finally:
        cur.close(); conn.close()


@app.route('/api/classrooms/mine', methods=['GET'])
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


@app.route('/api/classrooms/<int:classroom_id>/enroll', methods=['POST'])
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

        cur.execute("SELECT capacity FROM classrooms WHERE id = %s", (classroom_id,))
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


@app.route('/api/classrooms/<int:classroom_id>/enroll', methods=['DELETE'])
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


@app.route('/api/classrooms/<int:classroom_id>/students', methods=['GET'])
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


# ── Tutor screening ───────────────────────────────────────────────────────────

ALLOWED_PROOF_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}
MAX_PROOF_BYTES = 10 * 1024 * 1024  # 10 MB

def _allowed_proof(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_PROOF_EXTENSIONS

@app.route('/api/tutor-screening/send-uni-code', methods=['POST'])
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

    return jsonify({'message': 'Verification code sent to your university email'}), 200


@app.route('/api/tutor-screening/verify-uni-email', methods=['POST'])
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


@app.route('/api/tutor-screening/upload-proof', methods=['POST'])
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
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        with open(os.path.join(UPLOAD_DIR, filename), 'wb') as fh:
            fh.write(data)

        cur.execute(
            "UPDATE tutor_profiles SET proof_doc_path = %s, screening_status = 'pending' WHERE id_tutor = %s",
            (filename, id_tutor)
        )
        conn.commit()
    finally:
        cur.close(); conn.close()

    return jsonify({'message': 'Documents submitted for review'}), 200


@app.route('/api/tutor-screening/status', methods=['GET'])
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


@app.route('/api/uploads/tutor-proofs/<path:filename>', methods=['GET'])
def serve_tutor_proof(filename):
    """Serve uploaded proof documents — admin-only."""
    if not _check_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    from flask import send_from_directory
    return send_from_directory(UPLOAD_DIR, filename)


# ── Admin — tutor approval ────────────────────────────────────────────────────
# Protected by X-Admin-Secret header. Set ADMIN_SECRET env var in production.

SUPER_ADMIN_EMAIL = 'kilianborowsky@gmail.com'

def _check_admin():
    # Accept either X-Admin-Secret header OR a JWT from the super-admin account
    secret = request.headers.get('X-Admin-Secret', '')
    if secret == os.environ.get('ADMIN_SECRET', 'dev-admin-secret'):
        return True
    try:
        from flask_jwt_extended import verify_jwt_in_request
        verify_jwt_in_request()
        claims = get_jwt()
        return claims.get('email', '').lower() == SUPER_ADMIN_EMAIL
    except Exception:
        return False

@app.route('/api/admin/tutors', methods=['GET'])
def admin_list_tutors():
    if not _check_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT tp.id_tutor, u.name, u.email, tp.university, tp.course,
                   tp.subjects, tp.status, tp.age
            FROM tutor_profiles tp
            JOIN users u ON u.id_user = tp.id_user
            ORDER BY tp.id_tutor DESC
        """)
        return jsonify({'tutors': cur.fetchall()})
    finally:
        cur.close(); conn.close()

@app.route('/api/admin/tutors/<int:tutor_id>/approve', methods=['POST'])
def admin_approve_tutor(tutor_id):
    if not _check_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("UPDATE tutor_profiles SET status = 'approved' WHERE id_tutor = %s", (tutor_id,))
        conn.commit()
        if cur.rowcount == 0:
            return jsonify({'error': 'Tutor not found'}), 404
        return jsonify({'message': f'Tutor {tutor_id} approved'})
    finally:
        cur.close(); conn.close()

@app.route('/api/admin/tutors/<int:tutor_id>/reject', methods=['POST'])
def admin_reject_tutor(tutor_id):
    if not _check_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("UPDATE tutor_profiles SET status = 'rejected' WHERE id_tutor = %s", (tutor_id,))
        conn.commit()
        if cur.rowcount == 0:
            return jsonify({'error': 'Tutor not found'}), 404
        return jsonify({'message': f'Tutor {tutor_id} rejected'})
    finally:
        cur.close(); conn.close()


# ── Admin — screening queue ────────────────────────────────────────────────────

@app.route('/api/admin/screening-queue', methods=['GET'])
def admin_screening_queue():
    if not _check_admin():
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


@app.route('/api/admin/screening/<int:tutor_id>/approve', methods=['POST'])
def admin_approve_screening(tutor_id):
    if not _check_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE tutor_profiles SET screening_status = 'approved', screening_notes = NULL WHERE id_tutor = %s",
            (tutor_id,)
        )
        conn.commit()
        if cur.rowcount == 0:
            return jsonify({'error': 'Tutor not found'}), 404
        return jsonify({'message': f'Tutor {tutor_id} approved'}), 200
    finally:
        cur.close(); conn.close()


@app.route('/api/admin/screening/<int:tutor_id>/reject', methods=['POST'])
def admin_reject_screening(tutor_id):
    if not _check_admin():
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

@app.route('/api/admin/stats', methods=['GET'])
def admin_stats():
    if not _check_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        stats = {}

        cur.execute("SELECT COUNT(*) AS total FROM users")
        stats['total_users'] = cur.fetchone()['total']

        cur.execute("SELECT COUNT(*) AS total FROM tutor_profiles")
        stats['total_tutors'] = cur.fetchone()['total']

        cur.execute("SELECT COUNT(*) AS total FROM student_profiles")
        stats['total_students'] = cur.fetchone()['total']

        cur.execute("SELECT COUNT(*) AS total FROM tutor_profiles WHERE screening_status = 'pending'")
        stats['pending_screenings'] = cur.fetchone()['total']

        cur.execute("SELECT COUNT(*) AS total FROM tutor_profiles WHERE screening_status = 'approved'")
        stats['approved_tutors'] = cur.fetchone()['total']

        try:
            cur.execute("SELECT COUNT(*) AS total FROM events")
            stats['total_sessions'] = cur.fetchone()['total']
            cur.execute("SELECT COUNT(*) AS total FROM events WHERE status = 'completed'")
            stats['completed_sessions'] = cur.fetchone()['total']
        except Exception:
            stats['total_sessions'] = 0
            stats['completed_sessions'] = 0

        try:
            cur.execute("SELECT COUNT(*) AS total FROM users WHERE is_premium = 1")
            stats['premium_users'] = cur.fetchone()['total']
        except Exception:
            stats['premium_users'] = 0

        try:
            cur.execute("""
                SELECT DATE(created_at) AS day, COUNT(*) AS signups
                FROM users
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY DATE(created_at)
                ORDER BY day ASC
            """)
            signups_rows = cur.fetchall()
            stats['signups_last_30d'] = [
                {'day': r['day'].isoformat() if hasattr(r['day'], 'isoformat') else str(r['day']), 'signups': r['signups']}
                for r in signups_rows
            ]
        except Exception:
            stats['signups_last_30d'] = []

        return jsonify({'stats': stats}), 200
    finally:
        cur.close(); conn.close()


@app.route('/api/admin/users', methods=['GET'])
def admin_users():
    if not _check_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT u.id_user, u.name, u.email,
                   COALESCE(u.is_premium, 0) AS is_premium,
                   (SELECT COUNT(*) FROM tutor_profiles tp WHERE tp.id_user = u.id_user) AS is_tutor,
                   (SELECT tp.screening_status FROM tutor_profiles tp WHERE tp.id_user = u.id_user LIMIT 1) AS screening_status
            FROM users u
            ORDER BY u.id_user DESC
            LIMIT 200
        """)
        rows = cur.fetchall()
        for r in rows:
            r['is_tutor'] = bool(r['is_tutor'])
            r['is_premium'] = bool(r['is_premium'])
        return jsonify({'users': rows}), 200
    finally:
        cur.close(); conn.close()


@app.route('/api/admin/recent-events', methods=['GET'])
def admin_recent_events():
    if not _check_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT e.id_event, e.title, e.status, e.start_time, e.end_time, e.amount,
                   s.name AS student_name, s.email AS student_email,
                   t.name AS tutor_name
            FROM events e
            JOIN users s ON s.id_user = e.student_id
            JOIN users t ON t.id_user = e.tutor_id
            ORDER BY e.start_time DESC
            LIMIT 50
        """)
        rows = cur.fetchall()
        for r in rows:
            for f in ('start_time', 'end_time'):
                if r.get(f) and hasattr(r[f], 'isoformat'):
                    r[f] = r[f].isoformat()
        return jsonify({'events': rows}), 200
    except Exception as e:
        return jsonify({'events': [], 'error': str(e)}), 200
    finally:
        cur.close(); conn.close()


# ── Stripe membership ──────────────────────────────────────────────────────────

@app.route('/api/membership/checkout-session', methods=['POST'])
@jwt_required()
def membership_checkout_session():
    if stripe is None:
        return jsonify({'error': 'Stripe not installed'}), 503
    if not stripe.api_key:
        return jsonify({'error': 'STRIPE_SECRET_KEY not configured'}), 503

    uid    = current_user_id()
    claims = get_jwt()

    PRICE_ID = os.environ.get('STRIPE_PRICE_ID', '')
    if not PRICE_ID:
        return jsonify({'error': 'STRIPE_PRICE_ID not configured'}), 503

    try:
        session = stripe.checkout.Session.create(
            ui_mode='embedded',
            mode='subscription',
            line_items=[{'price': PRICE_ID, 'quantity': 1}],
            return_url=f'{os.environ.get("FRONTEND_URL", "http://localhost:5173")}/membership?session_id={{CHECKOUT_SESSION_ID}}',
            customer_email=claims.get('email'),
            metadata={'user_id': uid},
        )
        return jsonify({'client_secret': session.client_secret}), 200
    except stripe.error.StripeError as e:
        return jsonify({'error': str(e.user_message or e)}), 400


@app.route('/api/membership/checkout-success', methods=['GET'])
@jwt_required()
def checkout_success():
    if stripe is None or not stripe.api_key:
        return jsonify({'error': 'Stripe not available'}), 503

    session_id = request.args.get('session_id', '')
    if not session_id:
        return jsonify({'error': 'session_id required'}), 400

    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except stripe.error.StripeError as e:
        return jsonify({'error': str(e)}), 400

    if session.payment_status != 'paid':
        return jsonify({'error': 'Payment not completed'}), 402

    uid = current_user_id()
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("UPDATE users SET is_premium = 1 WHERE id_user = %s", (uid,))
        conn.commit()
    finally:
        cur.close(); conn.close()

    return jsonify({'message': 'Membership activated', 'is_premium': True}), 200


# ── Study Notes ───────────────────────────────────────────────────────────────

NOTES_UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads', 'study-notes')
os.makedirs(NOTES_UPLOAD_FOLDER, exist_ok=True)
ALLOWED_NOTES_EXT = {'pdf', 'doc', 'docx', 'ppt', 'pptx', 'png', 'jpg', 'jpeg', 'txt', 'md'}


@app.route('/api/study-notes', methods=['GET'])
@jwt_required()
def get_study_notes():
    uid = current_user_id()
    subject = request.args.get('subject', '').strip()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        q = """
            SELECT sn.id, sn.title, sn.subject, sn.description, sn.file_name,
                   sn.file_type, sn.is_public, sn.created_at, sn.user_id,
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
            n['is_mine']  = n['user_id'] == uid
        return jsonify({'notes': notes})
    finally:
        cur.close(); conn.close()


@app.route('/api/study-notes', methods=['POST'])
@jwt_required()
def create_study_note():
    uid = current_user_id()
    title       = request.form.get('title', '').strip()
    subject     = request.form.get('subject', '').strip()
    description = request.form.get('description', '').strip()
    is_public   = request.form.get('is_public', 'true').lower() != 'false'

    if not title:
        return jsonify({'error': 'title required'}), 400

    file_path, file_name, file_type = None, None, None
    if 'file' in request.files:
        f = request.files['file']
        ext = f.filename.rsplit('.', 1)[-1].lower() if '.' in f.filename else ''
        if ext not in ALLOWED_NOTES_EXT:
            return jsonify({'error': 'File type not allowed'}), 400
        safe = secure_filename(f.filename)
        unique_name = f"{uuid_lib.uuid4().hex}_{safe}"
        f.save(os.path.join(NOTES_UPLOAD_FOLDER, unique_name))
        file_path = unique_name
        file_name = f.filename
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


@app.route('/api/study-notes/<int:note_id>', methods=['DELETE'])
@jwt_required()
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


@app.route('/api/uploads/study-notes/<path:filename>', methods=['GET'])
@jwt_required()
def serve_study_note_file(filename):
    return send_from_directory(NOTES_UPLOAD_FOLDER, filename)


# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    app.run(debug=True, port=5000)

