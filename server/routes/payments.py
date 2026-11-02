"""Payments: students pay tutors per session. The platform takes 0% commission."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..config import Config
from ..db import current_user_id, get_db
from ..extensions import stripe, stripe_enabled
from .events import EVENT_COLUMNS, EVENT_JOINS, fetch_event

bp = Blueprint('payments', __name__, url_prefix='/api')


@bp.route('/payments', methods=['GET'])
@jwt_required()
def get_payments():
    """Sessions with money attached: `role=student` (what I pay) or `role=tutor` (what I earn)."""
    uid  = current_user_id()
    role = request.args.get('role', 'student')
    owner = 'tp.id_user' if role == 'tutor' else 'sp.id_user'
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute(f"""
            SELECT {EVENT_COLUMNS} {EVENT_JOINS}
            WHERE {owner} = %s
            ORDER BY e.start_time DESC
        """, (uid,))
        return jsonify({'events': cur.fetchall(), 'stripe_enabled': stripe_enabled()})
    finally:
        cur.close(); conn.close()


@bp.route('/payments/checkout/<int:event_id>', methods=['POST'])
@jwt_required()
def create_checkout_session(event_id):
    if not stripe_enabled():
        return jsonify({'error': 'Card payments are not configured yet', 'code': 'stripe_not_configured'}), 503

    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        ev = fetch_event(cur, event_id)
    finally:
        cur.close(); conn.close()

    if not ev:
        return jsonify({'error': 'Session not found'}), 404
    if ev['student_user_id'] != uid:
        return jsonify({'error': 'Not your session'}), 403
    if ev['status'] != 'confirmed':
        return jsonify({'error': 'Sessions can be paid once the tutor has confirmed them'}), 400

    amount_pence = int(round(float(ev['amount'] or 0) * 100))
    if amount_pence < 50:
        return jsonify({'error': 'Amount too small for card payment (minimum £0.50)'}), 400

    session = stripe.checkout.Session.create(
        mode='payment',
        line_items=[{
            'quantity': 1,
            'price_data': {
                'currency':     'gbp',
                'unit_amount':  amount_pence,
                'product_data': {'name': f"{ev['title']} with {ev['tutor_name']}"},
            },
        }],
        success_url=f'{Config.FRONTEND_URL}/payments?event_id={event_id}&session_id={{CHECKOUT_SESSION_ID}}',
        cancel_url=f'{Config.FRONTEND_URL}/payments?canceled=1',
        metadata={'event_id': str(event_id), 'user_id': str(uid)},
    )
    return jsonify({'url': session.url})


@bp.route('/payments/verify/<int:event_id>', methods=['POST'])
@jwt_required()
def verify_payment(event_id):
    """Mark a session paid only after Stripe confirms the checkout."""
    if not stripe_enabled():
        return jsonify({'error': 'Card payments are not configured yet'}), 503

    session_id = (request.get_json(silent=True) or {}).get('session_id') or request.args.get('session_id')
    if not session_id:
        return jsonify({'error': 'session_id required'}), 400

    session = stripe.checkout.Session.retrieve(session_id)
    uid = current_user_id()
    if session.metadata.get('event_id') != str(event_id) or session.metadata.get('user_id') != str(uid):
        return jsonify({'error': 'This payment belongs to another session'}), 403
    if session.payment_status != 'paid':
        return jsonify({'error': 'Payment not completed'}), 402

    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("UPDATE events SET status = 'paid' WHERE id_event = %s", (event_id,))
        conn.commit()
        return jsonify({'message': 'Payment recorded'})
    finally:
        cur.close(); conn.close()
