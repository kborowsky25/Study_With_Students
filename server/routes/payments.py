"""Payments: families pay the tutor's price plus a visible booking fee (the platform's only
revenue); tutors keep 100% of their price."""
import json

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..config import Config
from ..db import current_user_id, get_db
from ..extensions import stripe, stripe_dict, stripe_enabled
from .events import EVENT_COLUMNS, EVENT_JOINS, fetch_event, real_session_sql

bp = Blueprint('payments', __name__, url_prefix='/api')


def _pence(value):
    return int(round(float(value or 0) * 100))


def _line_item(name, pence):
    return {'quantity': 1, 'price_data': {'currency': 'gbp', 'unit_amount': pence, 'product_data': {'name': name}}}


def mark_event_paid(cur, event_id, student_user_id):
    """Record a Stripe-verified payment for a session (idempotent; the Stripe webhook uses it too).

    Returns False if the session doesn't exist or isn't that student's.
    """
    cur.execute("""
        SELECT e.status FROM events e
        JOIN student_profiles sp ON sp.id_student = e.student_id
        WHERE e.id_event = %s AND sp.id_user = %s
        FOR UPDATE
    """, (event_id, student_user_id))
    row = cur.fetchone()
    if not row:
        return False
    if row[0] != 'paid':
        cur.execute("UPDATE events SET status = 'paid' WHERE id_event = %s", (event_id,))
    return True


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
            WHERE {owner} = %s AND {real_session_sql()}
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
    if ev['status'] == 'paid':
        return jsonify({'error': 'This session is already paid'}), 409
    if ev['status'] != 'confirmed':
        return jsonify({'error': 'Sessions can be paid once the tutor has confirmed them'}), 400

    amount_pence = _pence(ev['amount'])
    if amount_pence < 50:
        return jsonify({'error': 'Amount too small for card payment (minimum £0.50)'}), 400
    # The tutor's price and the booking fee are separate lines, so the fee is visible at checkout.
    # Sessions booked before the fee existed have booking_fee 0 and are charged without one.
    line_items = [_line_item(f"{ev['title']} with {ev['tutor_name']}", amount_pence)]
    fee_pence  = _pence(ev.get('booking_fee'))
    if fee_pence:
        line_items.append(_line_item('Booking fee', fee_pence))

    metadata = {'event_id': str(event_id), 'user_id': str(uid)}
    try:
        session = stripe.checkout.Session.create(
            mode='payment',
            line_items=line_items,
            success_url=f'{Config.FRONTEND_URL}/payments?event_id={event_id}&session_id={{CHECKOUT_SESSION_ID}}',
            cancel_url=f'{Config.FRONTEND_URL}/payments?canceled=1',
            client_reference_id=str(uid),
            metadata=metadata,
            payment_intent_data={'metadata': metadata},
        )
    except stripe.error.StripeError as e:
        print(f'[stripe] payment checkout for event {event_id} failed: {e}', flush=True)
        return jsonify({'error': 'Could not start the payment — please try again'}), 502
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

    try:
        session = stripe_dict(stripe.checkout.Session.retrieve(str(session_id)))
    except stripe.error.StripeError:
        return jsonify({'error': 'Checkout session not found'}), 400

    uid  = current_user_id()
    meta = session.get('metadata') or {}
    if (session.get('mode') != 'payment' or meta.get('event_id') != str(event_id)
            or meta.get('user_id') != str(uid)):
        return jsonify({'error': 'This payment belongs to another session'}), 403
    if session.get('payment_status') != 'paid':
        return jsonify({'error': 'Payment not completed'}), 402

    conn = get_db(); cur = conn.cursor()
    try:
        if not mark_event_paid(cur, event_id, uid):
            return jsonify({'error': 'Session not found'}), 404
        conn.commit()
        return jsonify({'message': 'Payment recorded'})
    finally:
        cur.close(); conn.close()


# ── Stripe webhook ────────────────────────────────────────────────────────────

PAID_EVENTS = ('checkout.session.completed', 'checkout.session.async_payment_succeeded')


@bp.route('/payments/webhook', methods=['POST'])
def stripe_webhook():
    """Stripe → API. No JWT: authenticated by the Stripe-Signature header.

    Marks a session paid when its Checkout completes, even if the family never comes back to
    the site (and for payment methods that settle later). Stripe retries deliveries, so this is
    idempotent.
    """
    if stripe is None or not Config.STRIPE_WEBHOOK_SECRET:
        return jsonify({'error': 'Webhooks are not configured'}), 503

    payload = request.get_data()  # the signature covers these exact bytes
    try:
        stripe.WebhookSignature.verify_header(
            payload, request.headers.get('Stripe-Signature'), Config.STRIPE_WEBHOOK_SECRET,
            tolerance=stripe.Webhook.DEFAULT_TOLERANCE,  # rejects replays of old deliveries
        )
        event = json.loads(payload)
    except (stripe.error.SignatureVerificationError, ValueError):
        return jsonify({'error': 'Invalid signature'}), 400

    result = 'ignored'
    if event.get('type') in PAID_EVENTS:
        result = _record_checkout((event.get('data') or {}).get('object') or {})
    print(f"[stripe] {event.get('id')} {event.get('type')}: {result}", flush=True)
    return jsonify({'received': True, 'result': result})


def _record_checkout(session):
    metadata = session.get('metadata') or {}
    if session.get('mode') != 'payment' or not metadata.get('event_id'):
        return 'ignored'
    if session.get('payment_status') != 'paid':
        return 'ignored: not paid yet'  # delayed methods confirm with async_payment_succeeded
    try:
        event_id, user_id = int(metadata['event_id']), int(metadata.get('user_id'))
    except (TypeError, ValueError):
        return 'ignored: no session in metadata'

    conn = get_db(); cur = conn.cursor()
    try:
        paid = mark_event_paid(cur, event_id, user_id)
        conn.commit()  # an exception rolls back and answers 500, so Stripe retries
    finally:
        cur.close(); conn.close()
    return 'session paid' if paid else 'ignored: unknown session'
