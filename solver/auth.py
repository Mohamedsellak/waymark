"""Supabase access check and per-user rate limit for the solver endpoints.

The browser sends the user's Supabase access token. We forward it to the
`has_solver_access()` database function: PostgREST verifies the token's
signature and expiry, and the function returns true for signed-in users.
No JWT secret has to live in this service.
"""
import hashlib
import os
import threading
import time
from collections import deque
from functools import wraps

import requests
from flask import g, jsonify, request

SUPABASE_URL = os.environ.get("SUPABASE_URL", "http://127.0.0.1:54321").rstrip("/")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
RATE_LIMIT = int(os.environ.get("SOLVES_PER_MINUTE", "20"))
ACCESS_TTL = 60  # seconds a verified token is trusted without asking Supabase again

_lock = threading.Lock()
_verified: dict[str, float] = {}
_history: dict[str, deque] = {}


def _check_supabase(header):
    res = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/has_solver_access",
        headers={"apikey": SUPABASE_ANON_KEY, "Authorization": header},
        json={},
        timeout=5,
    )
    if res.status_code in (401, 403):
        return 401
    if not res.ok:
        return 503
    return 200 if res.json() is True else 403


def _rate_limited(key):
    now = time.monotonic()
    with _lock:
        q = _history.setdefault(key, deque())
        while q and now - q[0] > 60:
            q.popleft()
        if len(q) >= RATE_LIMIT:
            return True
        q.append(now)
        return False


def require_solver_access(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer ") or len(header) < 20:
            return jsonify({"error": "Sign in to use the solver."}), 401

        key = hashlib.sha256(header.encode()).hexdigest()
        now = time.monotonic()
        with _lock:
            trusted = _verified.get(key, 0) > now

        if not trusted:
            try:
                status = _check_supabase(header)
            except requests.RequestException:
                status = 503
            if status == 401:
                return jsonify({"error": "Your session has expired. Sign in again."}), 401
            if status == 403:
                return jsonify({"error": "Your account can't use the solver."}), 403
            if status != 200:
                return jsonify({"error": "Sign-in service unavailable. Try again in a moment."}), 503
            with _lock:
                _verified[key] = now + ACCESS_TTL
                if len(_verified) > 10_000:
                    _verified.clear()

        if _rate_limited(key):
            return jsonify({"error": f"Too many solves. You can run {RATE_LIMIT} per minute."}), 429

        g.user_key = key
        return view(*args, **kwargs)

    return wrapper
