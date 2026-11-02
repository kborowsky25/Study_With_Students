"""Rate limits: an in-memory sliding window per endpoint and key (client IP, user, email…).

The counters live in this process's memory. On Vercel every serverless instance keeps its
own and loses them on a cold start, so these limits slow down brute force and spam rather
than enforce a global cap — move the counters to a shared store (e.g. Redis) for that.
"""
import math
import threading
import time
from collections import deque
from functools import wraps

from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity

from .config import ON_VERCEL

SWEEP_EVERY = 60  # seconds between purges of idle buckets

_hits    = {}  # bucket → deque of call times (oldest first)
_windows = {}  # bucket → window length in seconds
_lock    = threading.Lock()
_last_sweep = 0.0


def reset_limits():
    """Forget every counter (used between tests)."""
    global _last_sweep
    with _lock:
        _hits.clear()
        _windows.clear()
        _last_sweep = 0.0


# ── Keys ──────────────────────────────────────────────────────────────────────

def client_ip():
    """The caller's IP. Vercel's edge overwrites X-Forwarded-For, so it's only trusted there."""
    if ON_VERCEL:
        forwarded = request.headers.get('X-Forwarded-For', '')
        if forwarded:
            return forwarded.split(',')[0].strip()
    return request.remote_addr or 'unknown'


def jwt_user():
    """The JWT user — put the limit below @jwt_required."""
    return get_jwt_identity()


def json_field(name):
    """A field of the JSON body, e.g. the email being logged into."""
    def key():
        data  = request.get_json(silent=True)
        value = data.get(name) if isinstance(data, dict) else None
        return str(value).strip().lower()[:254] if value else None
    key.__name__ = f'json_{name}'
    return key


# ── Decorator ─────────────────────────────────────────────────────────────────

def rate_limit(limit, per, key=client_ip):
    """Allow `limit` calls per `per` seconds for each value of `key()`; beyond that → 429 {error}.

    Stack several for layered limits (e.g. per IP and per account). A key of None skips the check.
    """
    def decorator(fn):
        scope = f'{fn.__module__}.{fn.__name__}:{key.__name__}:{limit}/{per}'

        @wraps(fn)
        def wrapper(*args, **kwargs):
            value = key()
            if value is not None:
                wait = _hit(f'{scope}:{value}', limit, per)
                if wait:
                    response = jsonify({'error': f'Too many requests — please try again in {_duration(wait)}'})
                    response.status_code = 429
                    response.headers['Retry-After'] = str(wait)
                    return response
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def _hit(bucket, limit, per):
    """Record a call. Returns 0 if it's allowed, else the seconds until the next one is."""
    now = time.monotonic()
    with _lock:
        _sweep(now)
        hits = _hits.setdefault(bucket, deque())
        _windows[bucket] = per
        while hits and hits[0] <= now - per:
            hits.popleft()
        if len(hits) >= limit:
            return max(1, math.ceil(hits[0] + per - now))
        hits.append(now)
        return 0


def _sweep(now):
    """Drop buckets with no calls inside their window, so memory stays bounded."""
    global _last_sweep
    if now - _last_sweep < SWEEP_EVERY:
        return
    _last_sweep = now
    for bucket in [b for b, hits in _hits.items() if not hits or hits[-1] <= now - _windows[b]]:
        del _hits[bucket], _windows[bucket]


def _duration(seconds):
    """Rough wait for the error message; Retry-After carries the exact seconds."""
    if seconds < 60:
        return f'{seconds} second{"" if seconds == 1 else "s"}'
    minutes = math.ceil(seconds / 60)
    if minutes < 60:
        return f'{minutes} minute{"" if minutes == 1 else "s"}'
    hours = round(minutes / 60)
    return f'{hours} hour{"" if hours == 1 else "s"}'
