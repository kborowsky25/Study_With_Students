"""Messages: direct conversations between users, with read receipts."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..db import current_user_id, get_db

bp = Blueprint('messages', __name__, url_prefix='/api')

MAX_MESSAGE_LENGTH = 4000


@bp.route('/messages', methods=['GET'])
@jwt_required()
def get_conversations():
    """One row per conversation partner, with the latest message and unread count."""
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT t.partner_id AS user_id, u.name,
                   m.message AS last_message, m.message_timestamp AS last_ts,
                   m.id_sender = %s AS last_from_me,
                   (SELECT COUNT(*) FROM messages um
                     WHERE um.id_sender = t.partner_id AND um.id_receiver = %s
                       AND um.read_at IS NULL) AS unread
            FROM (
                SELECT IF(id_sender = %s, id_receiver, id_sender) AS partner_id,
                       MAX(id_message) AS last_id
                FROM messages
                WHERE id_sender = %s OR id_receiver = %s
                GROUP BY partner_id
            ) t
            JOIN messages m ON m.id_message = t.last_id
            JOIN users    u ON u.id_user    = t.partner_id
            ORDER BY m.id_message DESC
        """, (uid, uid, uid, uid, uid))
        convos = cur.fetchall()
        for c in convos:
            c['last_from_me'] = bool(c['last_from_me'])
        return jsonify({'conversations': convos})
    finally:
        cur.close(); conn.close()


@bp.route('/messages/unread-count', methods=['GET'])
@jwt_required()
def unread_count():
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute(
            "SELECT COUNT(*) FROM messages WHERE id_receiver = %s AND read_at IS NULL",
            (current_user_id(),),
        )
        return jsonify({'unread': cur.fetchone()[0]})
    finally:
        cur.close(); conn.close()


@bp.route('/messages/<int:other_user_id>', methods=['GET'])
@jwt_required()
def get_messages(other_user_id):
    """Full thread with one user; opening it marks their messages as read."""
    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "UPDATE messages SET read_at = NOW() "
            "WHERE id_sender = %s AND id_receiver = %s AND read_at IS NULL",
            (other_user_id, uid),
        )
        conn.commit()
        cur.execute("""
            SELECT id_message, id_sender, id_receiver, message, message_timestamp, read_at
            FROM messages
            WHERE (id_sender = %s AND id_receiver = %s)
               OR (id_sender = %s AND id_receiver = %s)
            ORDER BY id_message ASC
        """, (uid, other_user_id, other_user_id, uid))
        return jsonify({'messages': cur.fetchall()})
    finally:
        cur.close(); conn.close()


@bp.route('/messages', methods=['POST'])
@jwt_required()
def send_message():
    uid         = current_user_id()
    data        = request.get_json(silent=True) or {}
    receiver_id = data.get('receiver_id')
    message     = (data.get('message') or '').strip()

    if not receiver_id or not message:
        return jsonify({'error': 'receiver_id and message required'}), 400
    if int(receiver_id) == uid:
        return jsonify({'error': "You can't message yourself"}), 400
    if len(message) > MAX_MESSAGE_LENGTH:
        return jsonify({'error': f'Messages are limited to {MAX_MESSAGE_LENGTH} characters'}), 400

    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id_user FROM users WHERE id_user = %s", (receiver_id,))
        if not cur.fetchone():
            return jsonify({'error': 'User not found'}), 404
        cur.execute(
            "INSERT INTO messages (id_sender, id_receiver, message) VALUES (%s, %s, %s)",
            (uid, receiver_id, message),
        )
        conn.commit()
        cur.execute("""
            SELECT id_message, id_sender, id_receiver, message, message_timestamp, read_at
            FROM messages WHERE id_message = %s
        """, (cur.lastrowid,))
        return jsonify({'message': 'Sent', 'data': cur.fetchone()}), 201
    finally:
        cur.close(); conn.close()
