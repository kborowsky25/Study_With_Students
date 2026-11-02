"""WSGI entrypoint — Vercel serves this as the /api function; locally:
    .venv/bin/python -m flask --app api/index.py run --debug --port 5001
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import create_app  # noqa: E402

app = create_app()
