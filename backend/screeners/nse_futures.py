from jugaad_data.nse import NSELive
from datetime import datetime, date
import math

_nse             = None
_snapshots       = {}   # { 'NIFTY': {'date': ..., 'data': [...]} }
MAX_SNAPSHOTS    = 120  # 2 hours at 60s interval

# ─── NSE singleton ────────────────────────────────────────────────────────────

def get_nse():
    global _nse
    if _nse is None:
        _nse = NSELive()
    return _nse

# ─── Helpers ──────────────────────────────────────────────────────────────────

def safe_float(val, default=0):
    try:
        result = float(val)
        if math.isnan(result) or math.isinf(result):
            return default
        return result
    except:
        return default

def safe_int(val, default=0):
    try:
        return int(float(val))
    except:
        return default

# ─── Snapshot store ───────────────────────────────────────────────────────────

def _get_bucket(symbol):
    today = date.today().isoformat()
    if symbol not in _snapshots or _snapshots[symbol]['date'] != today:
        _snapshots[symbol] = {'date': today, 'data': []}
    return _snapshots[symbol]['data']

def _save_snapshot(symbol, snap):
    bucket = _get_bucket(symbol)
    bucket.append(snap)
    if len(bucket) > MAX_SNAPSHOTS:
        _snapshots[symbol]['data'] = bucket[-MAX_SNAPSHOTS:]

def get_snapshots(symbol):
    today = date.today().isoformat()
    if symbol not in _snapshots or _snapshots[symbol]['date'] != today:
        return []
    return list(_snapshots[symbol]['data'])

# ─── Raw data fetch ───────────────────────────────────────────────────────────

def fetch_futures_raw(symbol):
    nse = get_nse()
    try:
        index_name = 'NIFTY 50' if symbol == 'NIFTY' else 'NIFTY BANK'

        # Spot price
        idx_data = nse.live_index(index_name)
        meta     = idx_data.get('metadata', {})
        spot_ltp = safe_float(meta.get('last', 0))
        if spot_ltp == 0:
            return None

        # Futures LTP — try live_quote on the futures symbol
        fut_ltp = 0
        try:
            fut_symbol = 'NIFTY' if symbol == 'NIFTY' else 'BANKNIFTY'
            fut_quote  = nse.live_quote(fut_symbol)
            fut_ltp    = safe_float(fut_quote.get('lastPrice', 0))
        except:
            fut_ltp = 0

        # Fallback to spot if futures quote unavailable
        if fut_ltp == 0:
            fut_ltp = spot_ltp

        # OI + volume from ATM area of option chain
        oi     = 0
        volume = 0
        try:
            chain_data = nse.equities_option_chain(symbol)
            if chain_data and 'records' in chain_data:
                all_data = chain_data['records'].get('data', [])
                for d in all_data[:10]:
                    ce      = d.get('CE', {})
                    pe      = d.get('PE', {})
                    oi     += safe_int(ce.get('openInterest',      0)) + safe_int(pe.get('openInterest',      0))
                    volume += safe_int(ce.get('totalTradedVolume', 0)) + safe_int(pe.get('totalTradedVolume', 0))
        except:
            pass

        return {
            'ltp':      round(fut_ltp,  2),
            'oi':       oi,
            'volume':   volume,
            'spot_ltp': round(spot_ltp, 2),
        }

    except Exception as e:
        print(f"  [nse_futures] fetch error {symbol}: {e}")
        global _nse
        _nse = None
        return None

# ─── Delta calculations ────────────────────────────────────────────────────────

def _calc_deltas(curr, prev):
    if prev is None:
        return None

    d_price  = curr['ltp']      - prev['ltp']
    d_oi     = curr['oi']       - prev['oi']
    d_vol    = curr['volume']   - prev['volume']
    d_basis  = (curr['ltp'] - curr['spot_ltp']) - (prev['ltp'] - prev['spot_ltp'])

    return {
        'd_price': round(d_price, 2),
        'd_oi':    d_oi,
        'd_vol':   d_vol,
        'd_basis': round(d_basis, 2),
    }

# ─── Primary signal ────────────────────────────────────────────────────────────

PRICE_THRESHOLD = 5     # pts — smaller than this is "flat"
OI_THRESHOLD_PCT = 0.05 # % — smaller OI change is "flat"

def _classify_signal(d_price, d_oi, curr_oi):
    price_flat = abs(d_price) < PRICE_THRESHOLD
    oi_flat    = curr_oi > 0 and (abs(d_oi) / curr_oi * 100) < OI_THRESHOLD_PCT

    if price_flat and oi_flat:
        return 'Neutral'
    if price_flat and not oi_flat:
        return 'Absorption'   # price not moving but big OI change → both sides fighting
    if d_price > 0 and d_oi > 0:
        return 'Long Buildup'
    if d_price > 0 and d_oi < 0:
        return 'Short Covering'
    if d_price < 0 and d_oi > 0:
        return 'Short Buildup'
    if d_price < 0 and d_oi < 0:
        return 'Long Unwinding'
    return 'Neutral'

# ─── Confidence scoring ────────────────────────────────────────────────────────

def _confidence_score(d_oi, d_vol, d_basis, signal, history, curr_oi, avg_oi_delta, avg_vol_delta):
    score = 0

    # 1. OI magnitude (35 pts)
    if avg_oi_delta > 0:
        oi_ratio = min(abs(d_oi) / avg_oi_delta, 3.0)   # cap at 3×
    else:
        oi_ratio = 0
    score += oi_ratio * (35 / 3.0)

    # 2. Volume confirmation (25 pts)
    if avg_vol_delta > 0:
        vol_ratio = min(abs(d_vol) / avg_vol_delta, 3.0)
    else:
        vol_ratio = 0
    score += vol_ratio * (25 / 3.0)

    # 3. Basis alignment (20 pts)
    if signal == 'Long Buildup'   and d_basis > 0:  score += 20
    if signal == 'Short Buildup'  and d_basis < 0:  score += 20
    if signal == 'Short Covering' and d_basis > 0:  score += 10
    if signal == 'Long Unwinding' and d_basis < 0:  score += 10

    # 4. Consistency — last 3 snapshots same signal (20 pts)
    recent_signals = [s['signal'] for s in history[-3:]] if len(history) >= 3 else []
    if recent_signals and all(s == signal for s in recent_signals):
        score += 20
    elif recent_signals and recent_signals[-1] == signal:
        score += 10

    return min(round(score), 100)

# ─── Trend context (last N snapshots majority) ────────────────────────────────

def _trend_context(history, window=10):
    recent = history[-window:] if len(history) >= window else history
    if not recent:
        return {'label': 'No Data', 'strength': 0, 'window': window, 'counts': {}}

    counts = {}
    for snap in recent:
        sig = snap['signal']
        counts[sig] = counts.get(sig, 0) + 1

    dominant     = max(counts, key=counts.get)
    dom_count    = counts[dominant]
    strength_pct = round((dom_count / len(recent)) * 100)

    # Map to macro label
    bullish_signals = {'Long Buildup', 'Short Covering'}
    bearish_signals = {'Short Buildup', 'Long Unwinding'}

    if dominant in bullish_signals and strength_pct >= 50:
        label = 'Bullish'
    elif dominant in bearish_signals and strength_pct >= 50:
        label = 'Bearish'
    else:
        label = 'Choppy'

    return {
        'label':    label,
        'dominant': dominant,
        'strength': strength_pct,
        'window':   len(recent),
        'counts':   counts,
    }

# ─── Basis intelligence ────────────────────────────────────────────────────────

# Fair value ≈ 20 pts on a normal day (simplified constant; ideally Spot×r×T)
FAIR_BASIS      = 20
BASIS_OVERHEAT  = 50   # futures too rich — squeeze risk
BASIS_DISCOUNT  = 0    # futures in discount — panic or hedge
RAPID_EXPAND    = 8    # basis moved > 8 pts in one tick → institutional buying
RAPID_COLLAPSE  = -8   # basis moved < -8 pts → institutional selling

def _basis_intel(basis, d_basis):
    notes = []
    alert = None

    if basis > BASIS_OVERHEAT:
        notes.append('Futures overheated — long squeeze risk')
        alert = 'overheat'
    elif basis < BASIS_DISCOUNT:
        notes.append('Futures in discount — panic selling / hedging')
        alert = 'discount'
    elif basis > FAIR_BASIS:
        notes.append('Premium elevated — buyers aggressive')
    else:
        notes.append('Basis near fair value')

    if d_basis >= RAPID_EXPAND:
        notes.append('Basis expanding rapidly — institutional buying')
        alert = alert or 'rapid_expand'
    elif d_basis <= RAPID_COLLAPSE:
        notes.append('Basis collapsing rapidly — institutional selling')
        alert = alert or 'rapid_collapse'

    return {'basis': round(basis, 2), 'd_basis': round(d_basis, 2), 'notes': notes, 'alert': alert}

# ─── Options implication ───────────────────────────────────────────────────────

def _options_implication(signal, confidence, trend_label, basis):
    low = confidence < 40
    if signal == 'Long Buildup':
        action = 'Buy CE' if not low else 'Watch — low confidence'
        avoid  = 'Avoid naked PE sells'
    elif signal == 'Short Buildup':
        action = 'Buy PE' if not low else 'Watch — low confidence'
        avoid  = 'Avoid naked CE sells'
    elif signal == 'Short Covering':
        action = 'Avoid fresh CE buys — move may be short-lived'
        avoid  = 'Use spreads if bullish'
    elif signal == 'Long Unwinding':
        action = 'Avoid fresh PE buys — may stabilize'
        avoid  = 'Use spreads if bearish'
    elif signal == 'Absorption':
        action = 'Wait for breakout direction'
        avoid  = 'Avoid directional naked buys'
    else:
        action = 'No clear edge — stay flat'
        avoid  = ''

    # Override if trend disagrees
    if trend_label == 'Bearish' and signal in ('Long Buildup', 'Short Covering'):
        action = 'Counter-trend signal — use caution'
    if trend_label == 'Bullish' and signal in ('Short Buildup', 'Long Unwinding'):
        action = 'Counter-trend signal — use caution'

    return {'action': action, 'avoid': avoid}

# ─── Alert detection ───────────────────────────────────────────────────────────

def _detect_alerts(snap, history, avg_oi_delta):
    alerts = []

    # 1. Sudden OI spike
    if avg_oi_delta > 0 and abs(snap['d_oi']) > 2 * avg_oi_delta:
        alerts.append({'type': 'oi_spike', 'msg': 'Big OI spike — large player entering', 'color': '#f59e0b'})

    # 2. Consecutive same-direction signals
    last5 = [s['signal'] for s in history[-5:]]
    if len(last5) == 5 and len(set(last5)) == 1 and last5[0] not in ('Neutral', 'Absorption'):
        alerts.append({'type': 'sustained', 'msg': f'5 consecutive {last5[0]} — sustained move', 'color': '#60a5fa'})

    # 3. Signal flip
    if len(history) >= 2:
        prev_sig = history[-2]['signal']
        curr_sig = snap['signal']
        flips = {
            ('Long Buildup', 'Short Buildup'),
            ('Short Buildup', 'Long Buildup'),
            ('Long Buildup', 'Long Unwinding'),
            ('Short Buildup', 'Short Covering'),
        }
        if (prev_sig, curr_sig) in flips:
            alerts.append({'type': 'flip', 'msg': f'Signal flip: {prev_sig} → {curr_sig}', 'color': '#f87171'})

    # 4. Basis discount mid-session
    if snap['basis_intel']['alert'] == 'discount':
        alerts.append({'type': 'basis_discount', 'msg': 'Futures trading at discount — watch for reversal', 'color': '#f87171'})

    return alerts

# ─── Signal color / display helpers ───────────────────────────────────────────

def signal_color(signal):
    colors = {
        'Long Buildup':   '#4ade80',
        'Short Covering': '#60a5fa',
        'Short Buildup':  '#f87171',
        'Long Unwinding': '#f59e0b',
        'Absorption':     '#a78bfa',
        'Neutral':        '#64748b',
    }
    return colors.get(signal, '#64748b')

def signal_emoji(signal):
    emojis = {
        'Long Buildup':   '🟢',
        'Short Covering': '🔵',
        'Short Buildup':  '🔴',
        'Long Unwinding': '🟡',
        'Absorption':     '🟣',
        'Neutral':        '⚪',
    }
    return emojis.get(signal, '⚪')

def trend_color(label):
    if label == 'Bullish': return '#4ade80'
    if label == 'Bearish': return '#f87171'
    return '#f59e0b'

# ─── Main poll function ────────────────────────────────────────────────────────

def poll_futures_sentiment(symbol):
    """
    Call this every 60s from a background thread.
    Fetches raw data, classifies signal, computes confidence,
    stores snapshot, and returns the full sentiment payload.
    """
    raw = fetch_futures_raw(symbol)
    if not raw:
        return None

    history = get_snapshots(symbol)
    prev    = history[-1] if history else None

    basis       = raw['ltp'] - raw['spot_ltp']
    deltas      = _calc_deltas(raw, prev) if prev else None

    # Rolling averages for normalisation
    if len(history) >= 3:
        avg_oi_delta  = sum(abs(s['d_oi'])  for s in history[-10:]) / min(len(history), 10)
        avg_vol_delta = sum(abs(s['d_vol']) for s in history[-10:]) / min(len(history), 10)
    else:
        avg_oi_delta  = 1
        avg_vol_delta = 1

    if deltas:
        signal     = _classify_signal(deltas['d_price'], deltas['d_oi'], raw['oi'])
        confidence = _confidence_score(
            deltas['d_oi'], deltas['d_vol'], deltas['d_basis'],
            signal, history, raw['oi'], avg_oi_delta, avg_vol_delta,
        )
        basis_intel = _basis_intel(basis, deltas['d_basis'])
    else:
        signal      = 'Neutral'
        confidence  = 0
        basis_intel = _basis_intel(basis, 0)
        deltas      = {'d_price': 0, 'd_oi': 0, 'd_vol': 0, 'd_basis': 0}

    trend_ctx   = _trend_context(history)
    options_imp = _options_implication(signal, confidence, trend_ctx['label'], basis)
    now_str     = datetime.now().strftime('%H:%M:%S')

    snap = {
        'time':        now_str,
        'ltp':         round(raw['ltp'],      2),
        'spot_ltp':    round(raw['spot_ltp'], 2),
        'oi':          raw['oi'],
        'volume':      raw['volume'],
        'basis':       round(basis, 2),
        'd_price':     deltas['d_price'],
        'd_oi':        deltas['d_oi'],
        'd_vol':       deltas['d_vol'],
        'd_basis':     deltas['d_basis'],
        'signal':      signal,
        'signal_color': signal_color(signal),
        'signal_emoji': signal_emoji(signal),
        'confidence':  confidence,
        'basis_intel': basis_intel,
    }

    _save_snapshot(symbol, snap)

    # After saving, re-fetch history for alert detection
    updated_history = get_snapshots(symbol)
    alerts = _detect_alerts(snap, updated_history[:-1], avg_oi_delta)

    return {
        'symbol':       symbol,
        'timestamp':    now_str,
        'ltp':          snap['ltp'],
        'spot_ltp':     snap['spot_ltp'],
        'oi':           snap['oi'],
        'volume':       snap['volume'],
        'basis':        snap['basis'],
        'd_price':      snap['d_price'],
        'd_oi':         snap['d_oi'],
        'd_vol':        snap['d_vol'],
        'signal':       signal,
        'signal_color': signal_color(signal),
        'signal_emoji': signal_emoji(signal),
        'confidence':   confidence,
        'trend':        trend_ctx,
        'trend_color':  trend_color(trend_ctx['label']),
        'basis_intel':  basis_intel,
        'options':      options_imp,
        'alerts':       alerts,
        'history':      updated_history[-30:],  # last 30 snaps for sparklines
    }

# ─── Get latest cached payload ────────────────────────────────────────────────

_latest = {}   # { 'NIFTY': payload, 'BANKNIFTY': payload }

def update_latest(symbol, payload):
    _latest[symbol] = payload

def get_latest(symbol):
    return _latest.get(symbol)