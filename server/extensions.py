"""Third-party integrations shared across blueprints."""
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from .config import Config

jwt  = JWTManager()
cors = CORS()

try:
    import stripe
    stripe.api_key = Config.STRIPE_SECRET_KEY
except ImportError:  # Stripe is optional in local development
    stripe = None


def stripe_enabled():
    return stripe is not None and bool(stripe.api_key)
