"""Runtime configuration, read once from the environment (and `.env` if present)."""
import os
from datetime import timedelta

from dotenv import load_dotenv

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(ROOT_DIR, '.env'))


def _env(key, default=''):
    return os.environ.get(key, default)


# Vercel sets VERCEL=1 on every deployment and VERCEL_ENV to production, preview or development.
ON_VERCEL     = bool(_env('VERCEL'))
IS_PRODUCTION = _env('VERCEL_ENV') == 'production' or _env('FLASK_ENV') == 'production'

DEV_SECRET_KEY     = 'dev-secret-change-me'
DEV_JWT_SECRET_KEY = 'dev-jwt-secret-change-me'
PLACEHOLDER_SECRETS = {'', 'change-me', DEV_SECRET_KEY, DEV_JWT_SECRET_KEY}
MIN_SECRET_LENGTH   = 32


class Config:
    SECRET_KEY               = _env('SECRET_KEY', DEV_SECRET_KEY)
    JWT_SECRET_KEY           = _env('JWT_SECRET_KEY', DEV_JWT_SECRET_KEY)
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
    STRIPE_SECRET_KEY     = _env('STRIPE_SECRET_KEY')
    STRIPE_WEBHOOK_SECRET = _env('STRIPE_WEBHOOK_SECRET')  # whsec_… of the /api/payments/webhook endpoint

    # The platform's only revenue: families pay a visible booking fee on top of each session,
    # and tutors keep 100% of their price
    BOOKING_FEE_PERCENT = 5

    # Serverless filesystems are read-only except /tmp (files there don't persist —
    # production should move uploads to object storage).
    UPLOAD_ROOT = _env('UPLOAD_ROOT') or (
        '/tmp/uploads' if _env('VERCEL') else os.path.join(ROOT_DIR, 'uploads')
    )


def production_problems(config, debug):
    """Settings that make a production deploy unsafe — the app refuses to start on any."""
    problems = []
    for name in ('SECRET_KEY', 'JWT_SECRET_KEY'):
        value = getattr(config, name) or ''
        if value in PLACEHOLDER_SECRETS or len(value) < MIN_SECRET_LENGTH:
            problems.append(f'{name} is missing, a placeholder or shorter than {MIN_SECRET_LENGTH} characters')
    if config.ADMIN_SECRET and len(config.ADMIN_SECRET) < MIN_SECRET_LENGTH:
        problems.append(f'ADMIN_SECRET must be empty or at least {MIN_SECRET_LENGTH} characters')
    if debug:
        problems.append('debug mode (FLASK_DEBUG) must be off')
    if not config.FRONTEND_URL.startswith('https://'):
        problems.append('FRONTEND_URL must be the https:// address of the site')
    return problems


def upload_dir(name):
    """Absolute path to an uploads sub-folder, created on first use."""
    path = os.path.join(Config.UPLOAD_ROOT, name)
    os.makedirs(path, exist_ok=True)
    return path
