"""Study With Students — Flask REST API (JWT auth, JSON only)."""
import traceback

from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException

from .config import IS_PRODUCTION, Config, production_problems
from .db import get_db
from .extensions import cors, jwt
from .json import ApiJSONProvider
from .routes import BLUEPRINTS
from .schema import ensure_schema

# Sent with every API response; vercel.json sets the same ones on the static frontend.
SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options':        'DENY',
    'Referrer-Policy':        'strict-origin-when-cross-origin',
    'Permissions-Policy':     'accelerometer=(), camera=(), geolocation=(), gyroscope=(), '
                              'magnetometer=(), microphone=(), payment=(), usb=()',
}
# JSON is never rendered as a page, so it gets the strictest policy. Uploaded files are left
# without one: a CSP stops Chrome's built-in viewer from opening PDFs.
JSON_CSP = "default-src 'none'; frame-ancestors 'none'"


def create_app(config=Config):
    app = Flask(__name__)
    app.config.from_object(config)
    app.json = ApiJSONProvider(app)

    if IS_PRODUCTION:
        problems = production_problems(config, app.debug)
        if problems:
            raise RuntimeError('Refusing to start in production: ' + '; '.join(problems))
        if not config.STRIPE_WEBHOOK_SECRET:
            print('[config] STRIPE_WEBHOOK_SECRET is not set — a payment is only recorded '
                  'if the family comes back to the site after paying', flush=True)

    jwt.init_app(app)
    cors.init_app(app, origins=[config.FRONTEND_URL], supports_credentials=True)

    for bp in BLUEPRINTS:
        app.register_blueprint(bp)

    @app.after_request
    def security_headers(response):
        for name, value in SECURITY_HEADERS.items():
            response.headers.setdefault(name, value)
        if response.mimetype == 'application/json':
            response.headers.setdefault('Content-Security-Policy', JSON_CSP)
            response.headers.setdefault('Cache-Control', 'no-store')
        return response

    @app.errorhandler(Exception)
    def handle_exception(e):
        if isinstance(e, HTTPException):
            return jsonify({'error': e.description}), e.code
        traceback.print_exc()
        return jsonify({'error': 'Something went wrong on our side'}), 500

    @app.get('/api/health')
    def health():
        try:
            get_db().close()
            database = True
        except Exception:
            database = False
        return jsonify({'ok': database, 'database': database}), 200 if database else 503

    try:
        ensure_schema()
    except Exception as e:  # the API still boots so /api/health can report it
        print(f'[schema] bootstrap failed: {e}', flush=True)

    return app
