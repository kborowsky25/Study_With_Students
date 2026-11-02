"""Scheduled jobs, called by an outside scheduler (.github/workflows/reminders.yml).

Protected by the CRON_SECRET setting, sent as `Authorization: Bearer <secret>` (the header
Vercel Cron uses) or `X-Cron-Secret: <secret>`.
"""
import hmac
import os

from flask import Blueprint, jsonify, request

from ..config import Config
from ..services.reminders import send_due_reminders

# Mounted under /api by the events blueprint
bp = Blueprint('cron', __name__)


def _secret():
    return getattr(Config, 'CRON_SECRET', '') or os.environ.get('CRON_SECRET', '')


def _authorised(secret):
    given = request.headers.get('X-Cron-Secret') or request.headers.get('Authorization', '').removeprefix('Bearer ')
    return hmac.compare_digest(given.strip().encode(), secret.encode())


@bp.route('/cron/reminders', methods=['POST'])
def run_reminders():
    """Email reminders 24 hours and 1 hour before confirmed sessions. Safe to call as often as
    you like: each email is sent once. `?dry_run=1` lists what's due without sending."""
    secret = _secret()
    if not secret:
        return jsonify({'error': 'Reminders are off: set CRON_SECRET'}), 503
    if not _authorised(secret):
        return jsonify({'error': 'Not allowed'}), 401
    return jsonify(send_due_reminders(dry_run=request.args.get('dry_run') == '1'))
