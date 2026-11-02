"""Membership: the £5/month Explorer plan — the platform's only revenue (0% commission).

Stripe is the source of truth for paid plans: the checkout return gives access straight away,
and the webhook keeps it in sync afterwards (renewals, cancellations, failed payments). The
webhook also records per-session payments made through Checkout.
"""
import json
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, jwt_required

from ..config import Config
from ..db import current_user_id, get_db
from ..extensions import stripe, stripe_dict, stripe_enabled
from ..permissions import dev_shortcuts_allowed, membership_state
from .payments import mark_event_paid

bp = Blueprint('membership', __name__, url_prefix='/api')

PLAN = {
    'name':        Config.MEMBERSHIP_NAME,
    'price_pence': Config.MEMBERSHIP_PRICE_PENCE,
    'currency':    Config.MEMBERSHIP_CURRENCY,
    'interval':    'month',
    'includes':    ['forum', 'study_notes', 'study_rooms', 'classroom', 'graduation'],
}
BILLING_PERIOD = timedelta(days=31)  # provisional access until Stripe reports the paid period
GRACE          = timedelta(days=1)   # a renewal is charged shortly after the period ends
LIVE_STATUSES  = ('active', 'trialing')
ENDED_STATUSES = ('canceled', 'incomplete_expired')  # final: Stripe never revives these


# ── Helpers ───────────────────────────────────────────────────────────────────

def _iso(value):
    return value.isoformat() if value else None


def _from_timestamp(value):
    """Stripe timestamp → naive UTC datetime, like every other date in the database."""
    return datetime.fromtimestamp(int(value), timezone.utc).replace(tzinfo=None) if value else None


def _object_id(value):
    """An id field, which Stripe sends as a plain id or as an expanded object."""
    return value.get('id') if isinstance(value, dict) else value


def _metadata_user_id(obj):
    try:
        return int((obj.get('metadata') or {}).get('user_id'))
    except (TypeError, ValueError):
        return None


def _period_end(subscription):
    """A subscription's current period end (it moved onto the items in Stripe API 2025-03-31)."""
    items = (subscription.get('items') or {}).get('data') or []
    ends  = [item.get('current_period_end') for item in items] + [subscription.get('current_period_end')]
    ends  = [end for end in ends if end]
    return _from_timestamp(max(ends)) if ends else None


def _grant(cur, user_id, period_end=None, since=None):
    """Explorer access through a paid Stripe period (+ grace), or a provisional month from
    `since` (default now) when the period isn't known yet. Access only ever moves forward, so a
    replayed or late Stripe event can't cut it short."""
    expires = period_end + GRACE if period_end else (since or datetime.utcnow()) + BILLING_PERIOD
    cur.execute("""
        UPDATE users
        SET is_premium = 1,
            premium_expires_at = COALESCE(GREATEST(premium_expires_at, %s), %s),
            premium_period_end = COALESCE(GREATEST(premium_period_end, %s), %s, premium_period_end)
        WHERE id_user = %s
    """, (expires, expires, period_end, period_end, user_id))


def _locked_user(cur, user_id=None, subscription_id=None):
    """The user a Stripe object belongs to — named in its metadata, else the one with the
    subscription on file — with the row locked, as Stripe may deliver events concurrently."""
    columns = "id_user, stripe_subscription_id, stripe_subscription_status, premium_cancel_at_period_end"
    if user_id:
        cur.execute(f"SELECT {columns} FROM users WHERE id_user = %s FOR UPDATE", (user_id,))
    elif subscription_id:
        cur.execute(f"SELECT {columns} FROM users WHERE stripe_subscription_id = %s FOR UPDATE",
                    (subscription_id,))
    else:
        return None
    row = cur.fetchone()
    return dict(zip(('id', 'subscription_id', 'status', 'canceling'), row)) if row else None


def _tracks(user, subscription_id):
    """Whether a subscription's events may change the user: it's the one on file and hasn't
    ended, or it takes over from one that has."""
    if user['subscription_id'] == subscription_id:
        return user['status'] not in ENDED_STATUSES
    return user['subscription_id'] is None or user['status'] in ENDED_STATUSES


def _link_subscription(cur, user, subscription_id, status, customer_id=None, canceling=None):
    """Put a subscription on file. Unless told, a new one starts without a pending cancellation."""
    if canceling is None:
        canceling = bool(user['canceling']) and user['subscription_id'] == subscription_id
    cur.execute("""
        UPDATE users
        SET stripe_subscription_id = %s, stripe_subscription_status = %s,
            premium_cancel_at_period_end = %s,
            stripe_customer_id = COALESCE(%s, stripe_customer_id)
        WHERE id_user = %s
    """, (subscription_id, status, canceling, customer_id, user['id']))


def _canceling(subscription):
    return bool(subscription.get('cancel_at_period_end') or subscription.get('cancel_at'))


def _status_payload(cur, user_id):
    is_premium, verified_tutor = membership_state(cur, user_id)
    cur.execute("""
        SELECT premium_expires_at, premium_period_end, stripe_subscription_id,
               stripe_subscription_status, premium_cancel_at_period_end
        FROM users WHERE id_user = %s
    """, (user_id,))
    expires_at, period_end, subscription_id, status, canceling = cur.fetchone() or (None,) * 5
    via_stripe = bool(subscription_id)
    paid_plan  = is_premium and via_stripe
    canceling  = paid_plan and bool(canceling)
    return {
        'is_premium':     is_premium,
        'has_access':     is_premium or verified_tutor,
        'verified_tutor': verified_tutor,
        'expires_at':     _iso(expires_at) if is_premium else None,
        'managed_by':     'stripe' if via_stripe else ('demo' if is_premium else None),
        # Stripe plans: the paid period and whether it renews or ends there
        'subscription_status':  status if via_stripe else None,
        'current_period_end':   _iso(period_end) if paid_plan else None,
        'cancel_at_period_end': canceling,
        'renews_at': _iso(period_end) if paid_plan and not canceling else None,
        'ends_at':   _iso(period_end or expires_at) if canceling
                     else (_iso(expires_at) if is_premium and not via_stripe else None),
        'plan':           PLAN,
        'stripe_enabled': stripe_enabled(),
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@bp.route('/membership/plan', methods=['GET'])
def membership_plan():
    return jsonify({'plan': PLAN, 'stripe_enabled': stripe_enabled()})


@bp.route('/membership/status', methods=['GET'])
@jwt_required()
def membership_status():
    conn = get_db(); cur = conn.cursor()
    try:
        return jsonify(_status_payload(cur, current_user_id()))
    finally:
        cur.close(); conn.close()


@bp.route('/membership/checkout-session', methods=['POST'])
@jwt_required()
def membership_checkout_session():
    if not stripe_enabled():
        return jsonify({'error': 'Payments are not configured', 'code': 'stripe_not_configured'}), 503

    uid  = current_user_id()
    conn = get_db(); cur = conn.cursor()
    try:
        is_premium, _ = membership_state(cur, uid)
        cur.execute("""
            SELECT stripe_customer_id, stripe_subscription_id, stripe_subscription_status
            FROM users WHERE id_user = %s
        """, (uid,))
        customer_id, subscription_id, status = cur.fetchone() or (None, None, None)
    finally:
        cur.close(); conn.close()
    if is_premium and subscription_id and status not in ENDED_STATUSES:
        return jsonify({'error': 'You already have an Explorer subscription'}), 409

    if Config.STRIPE_PRICE_ID:
        line_item = {'price': Config.STRIPE_PRICE_ID, 'quantity': 1}
    else:
        line_item = {
            'quantity': 1,
            'price_data': {
                'currency':     Config.MEMBERSHIP_CURRENCY,
                'unit_amount':  Config.MEMBERSHIP_PRICE_PENCE,
                'recurring':    {'interval': 'month'},
                'product_data': {'name': f'Study With Students — {Config.MEMBERSHIP_NAME} plan'},
            },
        }
    # One Stripe customer per user: reuse it when re-subscribing
    customer = {'customer': customer_id} if customer_id else {'customer_email': get_jwt().get('email')}

    try:
        session = stripe.checkout.Session.create(
            ui_mode='embedded',
            mode='subscription',
            line_items=[line_item],
            return_url=f'{Config.FRONTEND_URL}/membership?session_id={{CHECKOUT_SESSION_ID}}',
            client_reference_id=str(uid),
            metadata={'user_id': str(uid)},
            # The subscription (and so its invoices) names the user too, for the webhook
            subscription_data={'metadata': {'user_id': str(uid)}},
            **customer,
        )
        return jsonify({'client_secret': session.client_secret})
    except stripe.error.StripeError as e:
        print(f'[stripe] membership checkout for user {uid} failed: {e}', flush=True)
        return jsonify({'error': 'Could not start checkout — please try again'}), 502


@bp.route('/membership/checkout-success', methods=['GET'])
@jwt_required()
def checkout_success():
    """Back from Checkout: activate from Stripe's live subscription state, so replaying an old
    session can't extend access."""
    if not stripe_enabled():
        return jsonify({'error': 'Payments are not configured'}), 503
    session_id = request.args.get('session_id', '')
    if not session_id:
        return jsonify({'error': 'session_id required'}), 400

    try:
        session = stripe_dict(stripe.checkout.Session.retrieve(session_id, expand=['subscription']))
    except stripe.error.StripeError:
        return jsonify({'error': 'Checkout session not found'}), 400

    uid = current_user_id()
    if session.get('mode') != 'subscription' or _metadata_user_id(session) != uid:
        return jsonify({'error': 'This checkout belongs to another account'}), 403
    subscription = session.get('subscription')
    if session.get('status') != 'complete' or not isinstance(subscription, dict):
        return jsonify({'error': 'Payment not completed'}), 402
    if subscription.get('status') not in LIVE_STATUSES:
        return jsonify({'error': 'This subscription is no longer active'}), 402

    conn = get_db(); cur = conn.cursor()
    try:
        user = _locked_user(cur, uid)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        _link_subscription(cur, user, subscription['id'], subscription['status'],
                           _object_id(session.get('customer')), _canceling(subscription))
        _grant(cur, uid, _period_end(subscription))
        conn.commit()
        return jsonify({'message': 'Membership activated', **_status_payload(cur, uid)})
    finally:
        cur.close(); conn.close()


@bp.route('/membership/demo-activate', methods=['POST'])
@jwt_required()
def demo_activate():
    """Local development only: activate Explorer without Stripe."""
    if stripe_enabled() or not dev_shortcuts_allowed():
        return jsonify({'error': 'Demo activation is only available in local development'}), 403
    uid = current_user_id()
    conn = get_db(); cur = conn.cursor()
    try:
        _grant(cur, uid)
        conn.commit()
        return jsonify({'message': 'Explorer activated (demo)', **_status_payload(cur, uid)})
    finally:
        cur.close(); conn.close()


@bp.route('/membership/cancel', methods=['POST'])
@jwt_required()
def cancel_membership():
    """Stripe plans run to the end of the paid period; demo plans end immediately."""
    uid = current_user_id()
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("SELECT stripe_subscription_id, stripe_subscription_status FROM users WHERE id_user = %s",
                    (uid,))
        subscription_id, status = cur.fetchone() or (None, None)

        if subscription_id and status not in ENDED_STATUSES and stripe_enabled():
            try:
                stripe.Subscription.modify(subscription_id, cancel_at_period_end=True)
            except stripe.error.StripeError as e:
                print(f'[stripe] cancelling {subscription_id} failed: {e}', flush=True)
                return jsonify({'error': 'Could not cancel your plan — please try again'}), 502
            cur.execute("UPDATE users SET premium_cancel_at_period_end = 1 WHERE id_user = %s", (uid,))
            message = 'Your plan will end at the close of this billing period'
        else:
            cur.execute(
                "UPDATE users SET is_premium = 0, premium_expires_at = NULL WHERE id_user = %s",
                (uid,),
            )
            message = 'Membership cancelled'
        conn.commit()
        return jsonify({'message': message, **_status_payload(cur, uid)})
    finally:
        cur.close(); conn.close()


# ── Stripe webhook ────────────────────────────────────────────────────────────
# Stripe retries failed deliveries and doesn't promise their order, so every handler is
# idempotent: access only moves forward to a paid period's end, an ended subscription stays
# ended, and a subscription only affects the user it's on file for.

def _on_checkout_completed(cur, session):
    if session.get('mode') == 'payment':
        return _on_session_payment(cur, session)
    if session.get('mode') != 'subscription':
        return 'ignored'
    subscription_id = _object_id(session.get('subscription'))
    user = _locked_user(cur, _metadata_user_id(session), subscription_id)
    if not user or not subscription_id:
        return 'ignored: unknown user'
    if session.get('payment_status') not in ('paid', 'no_payment_required'):
        return 'ignored: not paid yet'
    if user['subscription_id'] == subscription_id and user['status'] in ENDED_STATUSES:
        return 'ignored: subscription has ended'
    _link_subscription(cur, user, subscription_id, 'active', _object_id(session.get('customer')))
    # Provisional month from the checkout itself, so a retried delivery grants nothing extra;
    # the invoice.paid event carries the exact period.
    _grant(cur, user['id'], since=_from_timestamp(session.get('created')))
    return 'activated'


def _on_session_payment(cur, session):
    """A tutoring session paid through Checkout (payments.py)."""
    if session.get('payment_status') != 'paid':
        return 'ignored: not paid yet'  # delayed methods confirm via async_payment_succeeded
    metadata = session.get('metadata') or {}
    try:
        event_id, user_id = int(metadata.get('event_id')), int(metadata.get('user_id'))
    except (TypeError, ValueError):
        return 'ignored: no session in metadata'
    return 'session paid' if mark_event_paid(cur, event_id, user_id) else 'ignored: unknown session'


def _on_invoice_paid(cur, invoice):
    # Since Stripe API 2025-03-31 the subscription sits under invoice.parent
    details = (invoice.get('parent') or {}).get('subscription_details') or invoice.get('subscription_details') or {}
    subscription_id = _object_id(details.get('subscription') or invoice.get('subscription'))
    if not subscription_id:
        return 'ignored: not a subscription invoice'
    user = _locked_user(cur, _metadata_user_id(details), subscription_id)
    if not user:
        return 'ignored: unknown subscription'
    if user['subscription_id'] == subscription_id and user['status'] in ENDED_STATUSES:
        return 'ignored: subscription has ended'
    if _tracks(user, subscription_id):
        _link_subscription(cur, user, subscription_id, 'active', _object_id(invoice.get('customer')))

    lines = (invoice.get('lines') or {}).get('data') or []
    ends  = [(line.get('period') or {}).get('end') for line in lines]
    ends  = [end for end in ends if end]
    _grant(cur, user['id'], _from_timestamp(max(ends)) if ends else None)
    return 'extended'


def _on_subscription_updated(cur, subscription):
    if subscription.get('status') in ENDED_STATUSES:
        return _on_subscription_deleted(cur, subscription)
    user = _locked_user(cur, _metadata_user_id(subscription), subscription['id'])
    if not user or not _tracks(user, subscription['id']):
        return 'ignored: not a current subscription'
    _link_subscription(cur, user, subscription['id'], subscription.get('status'),
                       _object_id(subscription.get('customer')), _canceling(subscription))
    return 'updated'


def _on_subscription_deleted(cur, subscription):
    user = _locked_user(cur, _metadata_user_id(subscription), subscription['id'])
    if not user or user['subscription_id'] != subscription['id']:
        return 'ignored: not the subscription on file'
    status = subscription.get('status')
    cur.execute("""
        UPDATE users
        SET is_premium = 0, premium_expires_at = UTC_TIMESTAMP(), premium_period_end = NULL,
            premium_cancel_at_period_end = 0, stripe_subscription_status = %s
        WHERE id_user = %s
    """, (status if status in ENDED_STATUSES else 'canceled', user['id']))
    return 'ended'


WEBHOOK_HANDLERS = {
    'checkout.session.completed':               _on_checkout_completed,
    'checkout.session.async_payment_succeeded': _on_checkout_completed,
    'invoice.paid':                             _on_invoice_paid,
    'customer.subscription.updated':            _on_subscription_updated,
    'customer.subscription.deleted':            _on_subscription_deleted,
}


@bp.route('/membership/webhook', methods=['POST'])
def stripe_webhook():
    """Stripe → API. No JWT: authenticated by the Stripe-Signature header."""
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

    handler = WEBHOOK_HANDLERS.get(event.get('type'))
    result  = 'ignored'
    if handler:
        conn = get_db(); cur = conn.cursor()
        try:
            result = handler(cur, (event.get('data') or {}).get('object') or {})
            conn.commit()  # an exception rolls back and answers 500, so Stripe retries
        finally:
            cur.close(); conn.close()
    print(f"[stripe] {event.get('id')} {event.get('type')}: {result}", flush=True)
    return jsonify({'received': True, 'result': result})
