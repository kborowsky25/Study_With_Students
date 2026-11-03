"""Third-party integrations shared across blueprints."""
from flask import jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from .config import Config
from .suspensions import MESSAGE as SUSPENDED_MESSAGE
from .suspensions import token_suspended

jwt  = JWTManager()
cors = CORS()

try:
    import stripe
    stripe.api_key = Config.STRIPE_SECRET_KEY
except ImportError:  # Stripe is optional in local development
    stripe = None


def stripe_enabled():
    return stripe is not None and bool(stripe.api_key)


def stripe_dict(obj):
    """A Stripe API object as plain dicts (current stripe-python objects have no .get())."""
    return obj.to_dict() if hasattr(obj, 'to_dict') else dict(obj)


# Every token problem is a 401 {error}, so the frontend signs the user out — including
# tokens signed with a JWT_SECRET_KEY that has since been rotated (the default is a 422).
@jwt.unauthorized_loader
def _missing_token(reason):
    return jsonify({'error': 'Please log in'}), 401


@jwt.invalid_token_loader
def _invalid_token(reason):
    return jsonify({'error': 'Your session is no longer valid — please log in again'}), 401


@jwt.expired_token_loader
def _expired_token(header, payload):
    return jsonify({'error': 'Your session has expired — please log in again'}), 401


# A suspended account's tokens stop working at once (server/suspensions.py)
@jwt.token_in_blocklist_loader
def _suspended(header, payload):
    return token_suspended(payload.get('sub'))


@jwt.revoked_token_loader
def _revoked_token(header, payload):
    return jsonify({'error': SUSPENDED_MESSAGE, 'code': 'suspended'}), 401
