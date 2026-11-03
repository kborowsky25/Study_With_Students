"""Payments: families pay the tutor's price plus a visible booking fee (the platform's only
revenue); tutors keep 100% of their price. The student pays, or one of their linked parents
(server/family.py); either way only a checkout Stripe confirms marks a session paid.

A session has one Stripe checkout at a time (events.checkout_session_id), so a child and a
parent can't both pay for it: see create_checkout_session().
"""
import json
import math
import time

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..config import Config
from ..db import current_user_id, get_db
from ..extensions import stripe, stripe_dict, stripe_enabled
from ..family import is_linked_parent
from ..referrals import release_credit, reward_first_payment, take_back_reward
from ..scheduling import local_now
from ..suspensions import is_suspended
from .events import EVENT_COLUMNS, EVENT_JOINS, fetch_event, is_room_copy, real_session_sql

bp = Blueprint('payments', __name__, url_prefix='/api')

CHECKOUT_MINUTES = 35  # a checkout expires on its own after this (Stripe allows 30 minutes to 24 hours)
CHECKOUT_HOLD = 5      # minutes someone else's open checkout is left alone, in case they're paying


def _pence(value):
    return int(round(float(value or 0) * 100))


def _line_item(name, pence, description=None):
    product = {'name': name, **({'description': description} if description else {})}
    return {'quantity': 1, 'price_data': {'currency': 'gbp', 'unit_amount': pence, 'product_data': product}}


def mark_event_paid(cur, event_id, student_user_id, payment_intent=None):
    """Record a Stripe-verified payment for a session (idempotent; the Stripe webhook uses it too).
    A family's first payment earns whoever invited them a reward (server/referrals.py). The
    PaymentIntent is kept, so a refund can find the session.

    Returns False if the session doesn't exist or isn't that student's.
    """
    cur.execute("""
        SELECT e.status, e.cancel_type FROM events e
        JOIN student_profiles sp ON sp.id_student = e.student_id
        WHERE e.id_event = %s AND sp.id_user = %s
        FOR UPDATE
    """, (event_id, student_user_id))
    row = cur.fetchone()
    if not row:
        return False
    status, cancel_type = row
    if status != 'paid' and cancel_type != 'refunded':  # not a late copy of a payment refunded since
        cur.execute("UPDATE events SET status = 'paid' WHERE id_event = %s", (event_id,))
        reward_first_payment(cur, student_user_id, event_id)
    if payment_intent:
        cur.execute("UPDATE events SET stripe_payment_intent = COALESCE(stripe_payment_intent, %s) WHERE id_event = %s",
                    (payment_intent, event_id))
    return True


def mark_event_refunded(cur, event_id, student_user_id):
    """Record a full Stripe refund of a paid session (idempotent; Stripe retries the webhook).
    The session counts as cancelled from then on (cancel_type 'refunded'): the invite credit it
    used goes back to the family, and a reward the payment earned their inviter is taken back.

    Returns False unless it's that student's paid session.
    """
    cur.execute("""
        SELECT e.status FROM events e
        JOIN student_profiles sp ON sp.id_student = e.student_id
        WHERE e.id_event = %s AND sp.id_user = %s
        FOR UPDATE
    """, (event_id, student_user_id))
    row = cur.fetchone()
    if not row or row[0] != 'paid':
        return False
    cur.execute("""
        UPDATE events
        SET status = 'canceled', cancel_type = 'refunded', canceled_at = %s, canceled_by = NULL,
            cancel_requested_at = NULL, proposed_start = NULL, proposed_end = NULL, proposed_by = NULL
        WHERE id_event = %s
    """, (local_now(), event_id))
    release_credit(cur, event_id)
    take_back_reward(cur, student_user_id)
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


def _existing_checkout(cur, checkout_id, ev, uid):
    """What to do about the session's last checkout before starting a new one, as (outcome, detail):
    'yours' (its link), 'paid' (the student it paid for), 'processing', 'busy' (who's paying and
    the minutes left before it can be replaced) or 'free'. Someone else's checkout that has waited
    long enough is expired here, so it can't be paid as well."""
    try:
        old = stripe_dict(stripe.checkout.Session.retrieve(checkout_id))
    except stripe.error.StripeError:
        return 'free', None  # Stripe doesn't know it (e.g. the test-mode data was reset)
    meta = old.get('metadata') or {}
    if meta.get('event_id') != str(ev['id_event']):
        return 'free', None
    if old.get('status') == 'open':
        if meta.get('user_id') == str(uid):
            return 'yours', old.get('url')
        waited = (time.time() - (old.get('created') or 0)) / 60
        if waited < CHECKOUT_HOLD:
            cur.execute("SELECT name FROM users WHERE id_user = %s", (meta.get('user_id'),))
            payer = (cur.fetchall() or [{'name': ''}])[0]['name']
            return 'busy', (payer, max(1, math.ceil(CHECKOUT_HOLD - waited)))
        try:
            stripe.checkout.Session.expire(checkout_id)
            return 'free', None
        except stripe.error.StripeError:  # it can't be expired: most likely it was just paid
            old = stripe_dict(stripe.checkout.Session.retrieve(checkout_id))
    if old.get('status') == 'complete':
        if old.get('payment_status') == 'paid':
            return 'paid', _student_in(meta)
        return 'processing', None  # a payment method that settles later (the webhook records it)
    if old.get('status') == 'open':  # couldn't expire it and it isn't finished either
        return 'busy', ('Someone', CHECKOUT_HOLD)
    return 'free', None


def _first(name):
    parts = (name or '').split()
    return parts[0] if parts else 'Someone'


@bp.route('/payments/checkout/<int:event_id>', methods=['POST'])
@jwt_required()
def create_checkout_session(event_id):
    """Start paying for a session: its student, or one of their linked parents.

    One checkout at a time: asking again gives you back your own open checkout. Someone else's
    open checkout is left alone for CHECKOUT_HOLD minutes (they may be paying), then expired
    before yours starts; one that went through meanwhile is recorded instead. Requests for the
    same session take turns (the row is locked), so two people can't start one each.
    """
    if not stripe_enabled():
        return jsonify({'error': 'Card payments are not configured yet', 'code': 'stripe_not_configured'}), 503

    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT checkout_session_id FROM events WHERE id_event = %s FOR UPDATE", (event_id,))
        locked = cur.fetchall()
        ev = fetch_event(cur, event_id) if locked else None
        if not ev:
            return jsonify({'error': 'Session not found'}), 404
        by_parent = ev['student_user_id'] != uid and is_linked_parent(cur, uid, ev['student_user_id'])
        if ev['student_user_id'] != uid and not by_parent:
            return jsonify({'error': 'Not your session'}), 403
        if is_room_copy(ev):  # older calendar copies of study rooms were stored with a price
            return jsonify({'error': 'Study rooms are free: there is nothing to pay'}), 400
        if ev['status'] == 'paid':
            return jsonify({'error': 'This session is already paid', 'code': 'already_paid'}), 409
        if ev['status'] != 'confirmed':
            return jsonify({'error': 'Sessions can be paid once the tutor has confirmed them'}), 400
        if is_suspended(cur, ev['tutor_user_id']):
            return jsonify({'error': 'This session can’t be paid while the tutor’s account is suspended',
                            'code': 'tutor_suspended'}), 409

        amount_pence = _pence(ev['amount'])
        if amount_pence < 50:
            return jsonify({'error': 'Amount too small for card payment (minimum £0.50)'}), 400

        if locked[0]['checkout_session_id']:
            outcome, detail = _existing_checkout(cur, locked[0]['checkout_session_id'], ev, uid)
            if outcome == 'yours':
                return jsonify({'url': detail})
            if outcome == 'paid':
                plain = conn.cursor()  # mark_event_paid reads rows as tuples
                try:
                    mark_event_paid(plain, event_id, detail)
                finally:
                    plain.close()
                conn.commit()
                return jsonify({'error': 'This session has just been paid', 'code': 'already_paid'}), 409
            if outcome == 'processing':
                return jsonify({'error': 'A payment for this session is already going through',
                                'code': 'payment_processing'}), 409
            if outcome == 'busy':
                payer, minutes = detail
                return jsonify({
                    'error': f'{_first(payer)} is paying for this session right now. If it doesn’t go through, '
                             f'you can pay in {minutes} minute{"" if minutes == 1 else "s"}.',
                    'code':  'payment_in_progress',
                }), 409

        # The tutor's price and the booking fee are separate lines, so the fee is visible at checkout.
        # Sessions booked before the fee existed have booking_fee 0 and are charged without one, and
        # so are sessions an invite credit paid the fee of: no £0 line, a note on the session instead.
        waived = float(ev.get('fee_waived') or 0)
        note = f'Booking fee of £{waived:.2f} waived with an invite credit' if waived else None
        line_items = [_line_item(f"{ev['title']} with {ev['tutor_name']}", amount_pence, note)]
        fee_pence  = _pence(ev.get('booking_fee'))
        if fee_pence:
            line_items.append(_line_item('Booking fee', fee_pence))

        # user_id is who pays; a parent paying for their child also records the child
        metadata = {'event_id': str(event_id), 'user_id': str(uid)}
        page = '/payments'
        if by_parent:
            metadata['student_user_id'] = str(ev['student_user_id'])
            page = '/hub/parent'
        try:
            session = stripe.checkout.Session.create(
                mode='payment',
                line_items=line_items,
                success_url=f'{Config.FRONTEND_URL}{page}?event_id={event_id}&session_id={{CHECKOUT_SESSION_ID}}',
                cancel_url=f'{Config.FRONTEND_URL}{page}?canceled=1',
                client_reference_id=str(uid),
                metadata=metadata,
                payment_intent_data={'metadata': metadata},
                expires_at=int(time.time()) + CHECKOUT_MINUTES * 60,
            )
        except stripe.error.StripeError as e:
            print(f'[stripe] payment checkout for event {event_id} failed: {e}', flush=True)
            return jsonify({'error': 'Could not start the payment — please try again'}), 502
        cur.execute("UPDATE events SET checkout_session_id = %s WHERE id_event = %s", (session.id, event_id))
        conn.commit()
        return jsonify({'url': session.url})
    finally:
        cur.close(); conn.close()


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
        if not mark_event_paid(cur, event_id, _student_in(meta), session.get('payment_intent')):
            return jsonify({'error': 'Session not found'}), 404
        conn.commit()
        return jsonify({'message': 'Payment recorded'})
    finally:
        cur.close(); conn.close()


# ── Stripe webhook ────────────────────────────────────────────────────────────

PAID_EVENTS = ('checkout.session.completed', 'checkout.session.async_payment_succeeded')
REFUND_EVENT = 'charge.refunded'  # a refund from the Stripe Dashboard (or the API)


@bp.route('/payments/webhook', methods=['POST'])
def stripe_webhook():
    """Stripe → API. No JWT: authenticated by the Stripe-Signature header.

    Marks a session paid when its Checkout completes, even if the family never comes back to
    the site (and for payment methods that settle later), and cancels it when its payment is
    fully refunded. Stripe retries deliveries, so this is idempotent.
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
    obj = (event.get('data') or {}).get('object') or {}
    if event.get('type') in PAID_EVENTS:
        result = _record_checkout(obj)
    elif event.get('type') == REFUND_EVENT:
        result = _record_refund(obj)
    print(f"[stripe] {event.get('id')} {event.get('type')}: {result}", flush=True)
    return jsonify({'received': True, 'result': result})


def _student_in(metadata):
    """The student a checkout paid for: the payer, unless a parent paid for their child."""
    return int(metadata.get('student_user_id') or metadata.get('user_id'))


def _record_checkout(session):
    metadata = session.get('metadata') or {}
    if session.get('mode') != 'payment' or not metadata.get('event_id'):
        return 'ignored'
    if session.get('payment_status') != 'paid':
        return 'ignored: not paid yet'  # delayed methods confirm with async_payment_succeeded
    try:
        event_id, student_user_id = int(metadata['event_id']), _student_in(metadata)
    except (TypeError, ValueError):
        return 'ignored: no session in metadata'

    conn = get_db(); cur = conn.cursor()
    try:
        paid = mark_event_paid(cur, event_id, student_user_id, session.get('payment_intent'))
        conn.commit()  # an exception rolls back and answers 500, so Stripe retries
    finally:
        cur.close(); conn.close()
    return 'session paid' if paid else 'ignored: unknown session'


def _record_refund(charge):
    """Only a full refund changes anything; a partly refunded session stays paid. The session is
    found by its PaymentIntent, which is kept from when it was paid."""
    if not charge.get('refunded'):
        return 'ignored: partial refund'
    if not charge.get('payment_intent'):
        return 'ignored: no payment'

    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("""
            SELECT e.id_event, sp.id_user FROM events e
            JOIN student_profiles sp ON sp.id_student = e.student_id
            WHERE e.stripe_payment_intent = %s
        """, (charge['payment_intent'],))
        rows = cur.fetchall()
        refunded = bool(rows) and mark_event_refunded(cur, *rows[0])
        conn.commit()  # an exception rolls back and answers 500, so Stripe retries
    finally:
        cur.close(); conn.close()
    if not rows:
        return 'ignored: unknown payment'
    return 'session refunded' if refunded else 'ignored: not paid'
