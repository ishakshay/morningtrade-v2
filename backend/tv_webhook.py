"""
TradingView webhook receiver for MorningTrade.

Drop this module into your backend (typically alongside existing Flask routes
in app.py or a routes blueprint). Wire it up like:

    from tv_webhook import register_tv_webhook
    register_tv_webhook(app)

Environment:
    TV_WEBHOOK_SECRET  — must match the secret you set in the Pine Script
                         "Webhook Secret" input. Backend rejects messages
                         missing or with a wrong secret.

Endpoints registered:
    POST /api/tv/webhook   — receives JSON from TradingView alerts
    GET  /api/tv/events    — returns the last N events (frontend polls this)
    GET  /api/tv/health    — quick health check

The store is in-memory. Events older than 4 hours are auto-pruned. Capped at
500 events. If the backend restarts, the buffer clears — that's fine for a
real-time dashboard, since the Pine script will keep firing on new bars.
"""

import os
import json
import time
import logging
from collections import deque
from threading import Lock

from flask import request, jsonify

log = logging.getLogger(__name__)

# ─── Configuration ────────────────────────────────────────────────────────────

EVENT_BUFFER_MAX = 500            # max events kept in memory
EVENT_TTL_SEC    = 4 * 3600       # auto-prune after 4 hours

# ─── In-memory event store ────────────────────────────────────────────────────

_events = deque(maxlen=EVENT_BUFFER_MAX)
_events_lock = Lock()
_event_id_counter = 0


def _now_ms():
    return int(time.time() * 1000)


def _prune_old(now_ms):
    """Remove events older than EVENT_TTL_SEC. Called inline before reads/writes."""
    cutoff = now_ms - EVENT_TTL_SEC * 1000
    while _events and _events[0]["received_ms"] < cutoff:
        _events.popleft()


def _validate_payload(data):
    """Sanity-check the parsed JSON before storing. Returns (ok, error_str)."""
    if not isinstance(data, dict):
        return False, "payload must be an object"
    required = {"secret", "ts", "event_type", "strike", "side", "sig",
                "z", "delta_pct", "ltp", "spot", "atm", "bias_pct"}
    missing = required - set(data.keys())
    if missing:
        return False, f"missing required keys: {sorted(missing)}"
    if data.get("event_type") not in ("strike", "bias"):
        return False, f"event_type must be 'strike' or 'bias', got {data.get('event_type')!r}"
    if data.get("side") not in ("CE", "PE", ""):
        return False, f"side must be 'CE' or 'PE', got {data.get('side')!r}"
    return True, None


# ─── Route handlers ───────────────────────────────────────────────────────────

def _handle_webhook():
    """POST /api/tv/webhook — accept JSON from TradingView."""
    expected_secret = os.environ.get("TV_WEBHOOK_SECRET")
    if not expected_secret:
        log.error("TV_WEBHOOK_SECRET env var not set — rejecting all webhooks")
        return jsonify({"ok": False, "error": "server not configured"}), 503

    # TradingView sends raw JSON in body. Parse defensively — if Pine string
    # construction has any escaping bugs, we want a clear error log.
    raw = request.get_data(as_text=True) or ""
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        log.warning("TV webhook: bad JSON: %s — body: %s", e, raw[:500])
        return jsonify({"ok": False, "error": "invalid JSON"}), 400

    # Verify shared secret. Constant-time compare not strictly needed for a
    # local-only webhook but doesn't hurt.
    sent_secret = str(data.get("secret", ""))
    if not _secrets_equal(sent_secret, expected_secret):
        log.warning("TV webhook: bad secret from %s", request.remote_addr)
        return jsonify({"ok": False, "error": "unauthorized"}), 401

    ok, err = _validate_payload(data)
    if not ok:
        log.warning("TV webhook: invalid payload: %s", err)
        return jsonify({"ok": False, "error": err}), 400

    # Strip secret before storing so it never leaks via /api/tv/events
    data.pop("secret", None)

    global _event_id_counter
    with _events_lock:
        _event_id_counter += 1
        now_ms = _now_ms()
        _prune_old(now_ms)
        event = {
            "id":          _event_id_counter,
            "received_ms": now_ms,
            **data,
        }
        _events.append(event)

    log.info(
        "TV event #%d %s %s%s sig=%s z=%.2f bias=%.1f",
        event["id"], data.get("event_type"), data.get("strike"),
        data.get("side"), data.get("sig"), float(data.get("z", 0)),
        float(data.get("bias_pct", 0)),
    )
    return jsonify({"ok": True, "id": event["id"]}), 200


def _handle_events():
    """GET /api/tv/events?since=<id> — return events newer than `since`."""
    try:
        since_id = int(request.args.get("since", "0"))
    except ValueError:
        since_id = 0
    limit = min(int(request.args.get("limit", "100")), EVENT_BUFFER_MAX)

    with _events_lock:
        _prune_old(_now_ms())
        items = [e for e in _events if e["id"] > since_id][-limit:]
        latest_id = _events[-1]["id"] if _events else 0
        total = len(_events)

    return jsonify({
        "ok":         True,
        "events":     items,
        "latest_id":  latest_id,
        "total":      total,
        "server_ms":  _now_ms(),
    })


def _handle_health():
    """GET /api/tv/health — quick check the receiver is configured."""
    configured = bool(os.environ.get("TV_WEBHOOK_SECRET"))
    with _events_lock:
        total = len(_events)
        latest = _events[-1]["received_ms"] if _events else None
    return jsonify({
        "ok":         True,
        "configured": configured,
        "buffer":     total,
        "latest_ms":  latest,
        "server_ms":  _now_ms(),
    })


def _secrets_equal(a, b):
    """Constant-time string compare. Avoids leaking length differences."""
    if len(a) != len(b):
        return False
    diff = 0
    for x, y in zip(a, b):
        diff |= ord(x) ^ ord(y)
    return diff == 0


# ─── Wire it up ───────────────────────────────────────────────────────────────

def register_tv_webhook(app):
    """Register routes on the given Flask app."""
    app.add_url_rule("/api/tv/webhook", view_func=_handle_webhook, methods=["POST"])
    app.add_url_rule("/api/tv/events",  view_func=_handle_events,  methods=["GET"])
    app.add_url_rule("/api/tv/health",  view_func=_handle_health,  methods=["GET"])
    log.info("TV webhook routes registered")
