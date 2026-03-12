"""
Study With Students — Flask REST API
JWT-authenticated, CORS-enabled, returns JSON only.
Run: python -m flask --app api run --debug
"""
import os
import traceback
from datetime import timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required,
    get_jwt_identity, get_jwt,
)
import mysql.connector
from mysql.connector import Error

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

# ── Auth ──────────────────────────────────────────────────────────────────────

@app.route('/api/auth/register', methods=['POST'])
def register():
    data     = request.get_json()
    name     = data.get('name', '').strip()
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not name or not email or not password:
        return jsonify({'error': 'All fields required'}), 400

    conn = None
    try:
        conn = get_db()
        cur  = conn.cursor()

        cur.execute("SELECT id_user FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            cur.close(); conn.close()
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
        import traceback; traceback.print_exc()   # prints real error to Flask console
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

        cur.execute("SELECT is_premium FROM users WHERE id_user = %s", (user_id,))
        prem_row   = cur.fetchone()
        is_premium = bool(prem_row[0]) if prem_row else False

        token = create_access_token(
            identity=str(user_id),
            additional_claims={'name': name, 'email': user_email, 'is_tutor': is_tutor, 'is_premium': is_premium},
        )
        return jsonify({
            'access_token': token,
            'user': {'id': user_id, 'name': name, 'email': user_email, 'is_tutor': is_tutor, 'is_premium': is_premium},
        })
    finally:
        cur.close(); conn.close()


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def me():
    claims = get_jwt()
    uid    = current_user_id()
    return jsonify({
        'user': {
            'id':         uid,
            'name':       claims.get('name'),
            'email':      claims.get('email'),
            'is_tutor':   claims.get('is_tutor',   False),
            'is_premium': claims.get('is_premium', False),
        }
    })

# ── Tutors ────────────────────────────────────────────────────────────────────

@app.route('/api/tutors', methods=['GET'])
@jwt_required()
def get_tutors():
    university = request.args.get('university', '')
    subject    = request.args.get('subject', '')

    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        query  = """
            SELECT tp.id_tutor, tp.id_user, u.name, tp.age, tp.university,
                   tp.course, tp.about_me, tp.subjects, tp.availability
            FROM tutor_profiles tp
            JOIN users u ON u.id_user = tp.id_user
            WHERE 1=1
        """
        params = []
        if university:
            query += " AND tp.university LIKE %s"
            params.append(f'%{university}%')
        if subject:
            query += " AND tp.subjects LIKE %s"
            params.append(f'%{subject}%')

        cur.execute(query, params)
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
                   tp.course, tp.about_me, tp.subjects, tp.availability
            FROM tutor_profiles tp
            JOIN users u ON u.id_user = tp.id_user
            WHERE tp.id_tutor = %s
        """, (tutor_id,))
        tutor = cur.fetchone()
        if not tutor:
            return jsonify({'error': 'Tutor not found'}), 404

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
        cur.execute("""
            SELECT tp.id_tutor, tp.id_user, u.name, tp.age, tp.university,
                   tp.course, tp.about_me, tp.subjects, tp.availability
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
        # Get student profile id
        cur.execute("SELECT id_student FROM student_profiles WHERE id_user = %s", (uid,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Student profile not found'}), 404
        student_id = row[0]

        # Check not already active
        cur.execute(
            "SELECT 1 FROM active_tutors WHERE id_student = %s AND id_tutor = %s",
            (student_id, tutor_id)
        )
        if cur.fetchone():
            return jsonify({'error': 'Already in your active tutors'}), 409

        cur.execute(
            "INSERT INTO active_tutors (id_student, id_tutor) VALUES (%s, %s)",
            (student_id, tutor_id)
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
        cur.execute("SELECT id_student FROM student_profiles WHERE id_user = %s", (uid,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Not found'}), 404
        cur.execute(
            "DELETE FROM active_tutors WHERE id_student = %s AND id_tutor = %s",
            (row[0], tutor_id)
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
        cur.execute("SELECT id_student FROM student_profiles WHERE id_user = %s", (uid,))
        row = cur.fetchone()
        if not row:
            return jsonify({'tutors': []})
        cur.execute("""
            SELECT tp.id_tutor, tp.id_user, u.name, tp.age, tp.university,
                   tp.course, tp.about_me, tp.subjects, tp.availability
            FROM active_tutors at2
            JOIN tutor_profiles tp ON tp.id_tutor = at2.id_tutor
            JOIN users u ON u.id_user = tp.id_user
            WHERE at2.id_student = %s
        """, (row['id_student'],))
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

    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("SELECT id_tutor FROM tutor_profiles WHERE id_user = %s", (uid,))
        exists = cur.fetchone()
        if exists:
            cur.execute("""
                UPDATE tutor_profiles
                SET age=%s, university=%s, course=%s, about_me=%s, subjects=%s, availability=%s
                WHERE id_user=%s
            """, (age, university, course, about_me, subjects, availability, uid))
        else:
            cur.execute("""
                INSERT INTO tutor_profiles (id_user, age, university, course, about_me, subjects, availability)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (uid, age, university, course, about_me, subjects, availability))
        conn.commit()
        return jsonify({'message': 'Profile saved'})
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

# ── Events / Sessions ─────────────────────────────────────────────────────────

@app.route('/api/events', methods=['GET'])
@jwt_required()
def get_events():
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
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
        cur.execute("""
            SELECT sr.id, sr.subject, sr.description, sr.start_time, sr.end_time,
                   sr.zoom_link, u.name AS tutor_name
            FROM study_rooms sr
            JOIN tutor_profiles tp ON tp.id_tutor = sr.tutor_id
            JOIN users u ON u.id_user = tp.id_user
            ORDER BY sr.start_time ASC
        """)
        rooms = cur.fetchall()
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
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT e.id_event, e.title, e.start_time, e.end_time,
                   e.status, e.amount, u.name AS tutor_name
            FROM events e
            LEFT JOIN tutor_profiles tp ON tp.id_tutor = e.tutor_id
            LEFT JOIN users u ON u.id_user = tp.id_user
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
    # Stripe integration placeholder — add stripe keys via env vars
    return jsonify({'message': 'Payment setup endpoint — configure Stripe keys in environment'})


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


# ── Membership ────────────────────────────────────────────────────────────────

@app.route('/api/membership/upgrade', methods=['POST'])
@jwt_required()
def upgrade_membership():
    """Upgrade the current user to Explorer (premium) plan.

    This is a stub — in production, verify a Stripe payment before
    setting is_premium.  For now it upgrades immediately (useful for testing).
    """
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE users SET is_premium = TRUE WHERE id_user = %s",
            (uid,)
        )
        conn.commit()
        return jsonify({'message': 'Upgraded to Explorer plan'})
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
    finally:
        cur.close(); conn.close()


# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    app.run(debug=True, port=5000)
