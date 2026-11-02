"""Membership: the £5/month Explorer plan — the platform's only revenue (0% commission)."""
from datetime import datetime, timedelta

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt, jwt_required

from ..config import Config
from ..db import current_user_id, get_db
from ..extensions import stripe, stripe_enabled
from ..permissions import membership_state

bp = Blueprint('membership', __name__, url_prefix='/api')

PLAN = {
    'name':        Config.MEMBERSHIP_NAME,
    'price_pence': Config.MEMBERSHIP_PRICE_PENCE,
    'currency':    Config.MEMBERSHIP_CURRENCY,
    'interval':    'month',
    'includes':    ['forum', 'study_notes', 'study_rooms', 'classroom', 'graduation'],
}
BILLING_PERIOD = timedelta(days=31)


def _activate(cur, user_id, subscription_id=None, customer_id=None):
    cur.execute("""
        UPDATE users
        SET is_premium = 1,
            premium_expires_at = %s,
            stripe_subscription_id = COALESCE(%s, stripe_subscription_id),
            stripe_customer_id     = COALESCE(%s, stripe_customer_id)
        WHERE id_user = %s
    """, (datetime.utcnow() + BILLING_PERIOD, subscription_id, customer_id, user_id))


def _status_payload(cur, user_id):
    is_premium, verified_tutor = membership_state(cur, user_id)
    cur.execute("SELECT premium_expires_at, stripe_subscription_id FROM users WHERE id_user = %s", (user_id,))
    expires_at, subscription_id = cur.fetchone() or (None, None)
    return {
        'is_premium':     is_premium,
        'has_access':     is_premium or verified_tutor,
        'verified_tutor': verified_tutor,
        'expires_at':     expires_at.isoformat() if (is_premium and expires_at) else None,
        'managed_by':     'stripe' if subscription_id else ('demo' if is_premium else None),
        'plan':           PLAN,
        'stripe_enabled': stripe_enabled(),
    }


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

    try:
        session = stripe.checkout.Session.create(
            ui_mode='embedded',
            mode='subscription',
            line_items=[line_item],
            return_url=f'{Config.FRONTEND_URL}/membership?session_id={{CHECKOUT_SESSION_ID}}',
            customer_email=get_jwt().get('email'),
            metadata={'user_id': current_user_id()},
        )
        return jsonify({'client_secret': session.client_secret})
    except stripe.error.StripeError as e:
        return jsonify({'error': str(e.user_message or e)}), 400


@bp.route('/membership/checkout-success', methods=['GET'])
@jwt_required()
def checkout_success():
    if not stripe_enabled():
        return jsonify({'error': 'Payments are not configured'}), 503
    session_id = request.args.get('session_id', '')
    if not session_id:
        return jsonify({'error': 'session_id required'}), 400

    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except stripe.error.StripeError as e:
        return jsonify({'error': str(e)}), 400

    uid = current_user_id()
    if str(session.metadata.get('user_id')) != str(uid):
        return jsonify({'error': 'This checkout belongs to another account'}), 403
    if session.status != 'complete':
        return jsonify({'error': 'Payment not completed'}), 402

    conn = get_db(); cur = conn.cursor()
    try:
        _activate(cur, uid, subscription_id=session.subscription, customer_id=session.customer)
        conn.commit()
        return jsonify({'message': 'Membership activated', **_status_payload(cur, uid)})
    finally:
        cur.close(); conn.close()


@bp.route('/membership/demo-activate', methods=['POST'])
@jwt_required()
def demo_activate():
    """Local development only: activate Explorer without Stripe."""
    if stripe_enabled() or not current_app.debug:
        return jsonify({'error': 'Demo activation is only available in local development'}), 403
    uid = current_user_id()
    conn = get_db(); cur = conn.cursor()
    try:
        _activate(cur, uid)
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
        cur.execute("SELECT stripe_subscription_id FROM users WHERE id_user = %s", (uid,))
        row = cur.fetchone()
        subscription_id = row[0] if row else None

        if subscription_id and stripe_enabled():
            stripe.Subscription.modify(subscription_id, cancel_at_period_end=True)
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
