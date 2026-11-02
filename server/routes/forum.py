"""Forum: categories, threads and replies (free for every logged-in user)."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..db import current_user_id, get_db
from ..ratelimit import jwt_user, rate_limit

bp = Blueprint('forum', __name__, url_prefix='/api')

MAX_TITLE_LENGTH   = 200
MAX_CONTENT_LENGTH = 10000  # forum_threads/forum_posts.content is a TEXT column

AUTHOR = """
    u.name AS author_name,
    EXISTS(SELECT 1 FROM tutor_profiles t WHERE t.id_user = u.id_user
           AND t.screening_status = 'approved') AS author_is_tutor
"""


def _bools(rows, *keys):
    for row in rows:
        for key in keys:
            row[key] = bool(row.get(key))
    return rows


@bp.route('/forum/categories', methods=['GET'])
@jwt_required()
def forum_categories():
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT c.id, c.name, c.description, c.icon,
                   COUNT(DISTINCT t.id) AS thread_count,
                   COUNT(p.id)          AS post_count,
                   GREATEST(COALESCE(MAX(t.created_at), '1970-01-01'),
                            COALESCE(MAX(p.created_at), '1970-01-01')) AS last_activity
            FROM forum_categories c
            LEFT JOIN forum_threads t ON t.category_id = c.id
            LEFT JOIN forum_posts   p ON p.thread_id   = t.id
            GROUP BY c.id
            ORDER BY c.id
        """)
        categories = cur.fetchall()
        for c in categories:
            if str(c['last_activity']).startswith('1970'):
                c['last_activity'] = None
        return jsonify({'categories': categories})
    finally:
        cur.close(); conn.close()


@bp.route('/forum/recent', methods=['GET'])
@jwt_required()
def recent_threads():
    """Latest active threads across every category (dashboard feed)."""
    limit = min(max(request.args.get('limit', 5, type=int), 1), 20)
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute(f"""
            SELECT ft.id, ft.title, ft.created_at, ft.category_id, c.name AS category_name,
                   {AUTHOR},
                   COUNT(fp.id) AS post_count,
                   COALESCE(MAX(fp.created_at), ft.created_at) AS last_activity
            FROM forum_threads ft
            JOIN users u            ON u.id_user = ft.user_id
            JOIN forum_categories c ON c.id      = ft.category_id
            LEFT JOIN forum_posts fp ON fp.thread_id = ft.id
            GROUP BY ft.id
            ORDER BY last_activity DESC
            LIMIT %s
        """, (limit,))
        return jsonify({'threads': _bools(cur.fetchall(), 'author_is_tutor')})
    finally:
        cur.close(); conn.close()


@bp.route('/forum/categories/<int:cat_id>', methods=['GET'])
@jwt_required()
def forum_category(cat_id):
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id, name, description, icon FROM forum_categories WHERE id = %s", (cat_id,))
        category = cur.fetchone()
        if not category:
            return jsonify({'error': 'Category not found'}), 404

        cur.execute(f"""
            SELECT ft.id, ft.title, ft.content, ft.created_at, ft.user_id, {AUTHOR},
                   COUNT(fp.id) AS post_count,
                   COALESCE(MAX(fp.created_at), ft.created_at) AS last_activity
            FROM forum_threads ft
            JOIN users u ON u.id_user = ft.user_id
            LEFT JOIN forum_posts fp ON fp.thread_id = ft.id
            WHERE ft.category_id = %s
            GROUP BY ft.id
            ORDER BY last_activity DESC
        """, (cat_id,))
        return jsonify({'category': category, 'threads': _bools(cur.fetchall(), 'author_is_tutor')})
    finally:
        cur.close(); conn.close()


@bp.route('/forum/categories/<int:cat_id>/threads', methods=['POST'])
@jwt_required()
@rate_limit(5, per=600, key=jwt_user)
def create_thread(cat_id):
    data    = request.get_json(silent=True) or {}
    title   = str(data.get('title') or '').strip()
    content = str(data.get('content') or '').strip()
    if not title or not content:
        return jsonify({'error': 'Title and content are required'}), 400
    if len(title) > MAX_TITLE_LENGTH:
        return jsonify({'error': f'Titles are limited to {MAX_TITLE_LENGTH} characters'}), 400
    if len(content) > MAX_CONTENT_LENGTH:
        return jsonify({'error': f'Posts are limited to {MAX_CONTENT_LENGTH:,} characters'}), 400

    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM forum_categories WHERE id = %s", (cat_id,))
        if not cur.fetchone():
            return jsonify({'error': 'Category not found'}), 404
        cur.execute(
            "INSERT INTO forum_threads (category_id, user_id, title, content) VALUES (%s, %s, %s, %s)",
            (cat_id, current_user_id(), title, content),
        )
        conn.commit()
        return jsonify({'thread': {'id': cur.lastrowid}}), 201
    finally:
        cur.close(); conn.close()


@bp.route('/forum/threads/<int:thread_id>', methods=['GET'])
@jwt_required()
def get_thread(thread_id):
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute(f"""
            SELECT ft.id, ft.title, ft.content, ft.created_at, ft.user_id, ft.category_id,
                   c.name AS category_name, {AUTHOR}
            FROM forum_threads ft
            JOIN users u            ON u.id_user = ft.user_id
            JOIN forum_categories c ON c.id      = ft.category_id
            WHERE ft.id = %s
        """, (thread_id,))
        thread = cur.fetchone()
        if not thread:
            return jsonify({'error': 'Thread not found'}), 404
        thread['author_is_tutor'] = bool(thread['author_is_tutor'])

        cur.execute(f"""
            SELECT fp.id, fp.content, fp.created_at, fp.user_id, {AUTHOR}
            FROM forum_posts fp
            JOIN users u ON u.id_user = fp.user_id
            WHERE fp.thread_id = %s
            ORDER BY fp.created_at ASC, fp.id ASC
        """, (thread_id,))
        return jsonify({'thread': thread, 'posts': _bools(cur.fetchall(), 'author_is_tutor')})
    finally:
        cur.close(); conn.close()


@bp.route('/forum/threads/<int:thread_id>', methods=['DELETE'])
@jwt_required()
def delete_thread(thread_id):
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("SELECT user_id FROM forum_threads WHERE id = %s", (thread_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Thread not found'}), 404
        if row[0] != current_user_id():
            return jsonify({'error': 'You can only delete your own threads'}), 403
        cur.execute("DELETE FROM forum_posts WHERE thread_id = %s", (thread_id,))
        cur.execute("DELETE FROM forum_threads WHERE id = %s", (thread_id,))
        conn.commit()
        return jsonify({'message': 'Thread deleted'})
    finally:
        cur.close(); conn.close()


@bp.route('/forum/threads/<int:thread_id>/posts', methods=['POST'])
@jwt_required()
@rate_limit(20, per=600, key=jwt_user)
def create_post(thread_id):
    content = str((request.get_json(silent=True) or {}).get('content') or '').strip()
    if not content:
        return jsonify({'error': 'Reply cannot be empty'}), 400
    if len(content) > MAX_CONTENT_LENGTH:
        return jsonify({'error': f'Replies are limited to {MAX_CONTENT_LENGTH:,} characters'}), 400

    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM forum_threads WHERE id = %s", (thread_id,))
        if not cur.fetchone():
            return jsonify({'error': 'Thread not found'}), 404
        cur.execute(
            "INSERT INTO forum_posts (thread_id, user_id, content) VALUES (%s, %s, %s)",
            (thread_id, current_user_id(), content),
        )
        conn.commit()
        return jsonify({'post': {'id': cur.lastrowid}}), 201
    finally:
        cur.close(); conn.close()


@bp.route('/forum/posts/<int:post_id>', methods=['DELETE'])
@jwt_required()
def delete_post(post_id):
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("SELECT user_id FROM forum_posts WHERE id = %s", (post_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Reply not found'}), 404
        if row[0] != current_user_id():
            return jsonify({'error': 'You can only delete your own replies'}), 403
        cur.execute("DELETE FROM forum_posts WHERE id = %s", (post_id,))
        conn.commit()
        return jsonify({'message': 'Reply deleted'})
    finally:
        cur.close(); conn.close()
