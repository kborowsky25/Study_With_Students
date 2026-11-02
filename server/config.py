"""Runtime configuration, read once from the environment (and `.env` if present)."""
import os
from datetime import timedelta

from dotenv import load_dotenv

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(ROOT_DIR, '.env'))


def _env(key, default=''):
    return os.environ.get(key, default)


class Config:
    SECRET_KEY               = _env('SECRET_KEY', 'dev-secret-change-me')
    JWT_SECRET_KEY           = _env('JWT_SECRET_KEY', 'dev-jwt-secret-change-me')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
    MAX_CONTENT_LENGTH       = 25 * 1024 * 1024  # 25 MB uploads

    FRONTEND_URL = _env('FRONTEND_URL', 'http://localhost:5173')

    # Database (hosted MySQL providers usually need TLS: set DB_SSL_CA to a CA bundle path)
    DB = {
        'host':     _env('DB_HOST', 'localhost'),
        'port':     int(_env('DB_PORT', '3306')),
        'database': _env('DB_NAME', 'users_tutoring'),
        'user':     _env('DB_USER', 'root'),
        'password': _env('DB_PASSWORD', ''),
        'connection_timeout': 10,
        **({'ssl_ca': _env('DB_SSL_CA'), 'ssl_verify_cert': True} if _env('DB_SSL_CA') else {}),
    }

    # Admin
    SUPER_ADMIN_EMAIL = _env('SUPER_ADMIN_EMAIL', '').lower()
    ADMIN_SECRET      = _env('ADMIN_SECRET', '')

    # Mail (unset → codes are printed to the terminal and returned in debug mode)
    MAIL_SERVER   = _env('MAIL_SERVER')
    MAIL_PORT     = int(_env('MAIL_PORT', '587'))
    MAIL_USERNAME = _env('MAIL_USERNAME')
    MAIL_PASSWORD = _env('MAIL_PASSWORD')

    # Stripe
    STRIPE_SECRET_KEY = _env('STRIPE_SECRET_KEY')
    STRIPE_PRICE_ID   = _env('STRIPE_PRICE_ID')  # optional; falls back to inline £5/month price

    # Explorer plan — the only way the platform makes money (0% commission on sessions)
    MEMBERSHIP_NAME        = 'Explorer'
    MEMBERSHIP_PRICE_PENCE = 500
    MEMBERSHIP_CURRENCY    = 'gbp'

    # Serverless filesystems are read-only except /tmp (files there don't persist —
    # production should move uploads to object storage).
    UPLOAD_ROOT = _env('UPLOAD_ROOT') or (
        '/tmp/uploads' if _env('VERCEL') else os.path.join(ROOT_DIR, 'uploads')
    )


def upload_dir(name):
    """Absolute path to an uploads sub-folder, created on first use."""
    path = os.path.join(Config.UPLOAD_ROOT, name)
    os.makedirs(path, exist_ok=True)
    return path
