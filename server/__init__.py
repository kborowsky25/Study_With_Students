"""Study With Students — Flask REST API (JWT auth, JSON only)."""
import traceback

from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException

from .config import Config
from .db import get_db
from .extensions import cors, jwt
from .json import ApiJSONProvider
from .routes import BLUEPRINTS
from .schema import ensure_schema


def create_app(config=Config):
    app = Flask(__name__)
    app.config.from_object(config)
    app.json = ApiJSONProvider(app)

    jwt.init_app(app)
    cors.init_app(app, origins=[config.FRONTEND_URL], supports_credentials=True)

    for bp in BLUEPRINTS:
        app.register_blueprint(bp)

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
