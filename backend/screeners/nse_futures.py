from jugaad_data.nse import NSELive
from datetime import datetime, date
import math

_nse     = None
_latest  = {}
_history = {}

# ── Signal metadata ────────────────────────────────────────────────────────────

SIGNAL_META = {
    'Long Buildup':   {'emoji': '🟢', 'color': '#4ade80'},
    'Short Buildup':  {'emoji': '🔴', 'color': '#f87171'},
    'Short Covering': {'emoji': '🔵', 'color': '#60a5fa'},
    'Long Unwinding': {'emoji': '🟡', 'color': '#f59e0b'},
    'Absorption':     {'emoji': '🟣', 'color': '#a78bfa'},
    'Neutral':        {'emoji': '⚪', 'color': '#64748b'},
}

OPTIONS_IMPLICATION = {
    'Long Buildup':   {'action': 'Favour Call buying / Put selling',            'avoid': 'Avoid naked Put buying'},
    'Short Buildup':  {'action': 'Favour Put buying / Call selling',            'avoid': 'Avoid naked Call buying'},
    'Short Covering': {'action': 'Rally likely short-lived — book CE profits early', 'avoid': None},
    'Long Unwinding': {'action': 'Weakness ahead — reduce longs, consider PE', 'avoid': None},
    'Absorption':     {'action': 'Wait for breakout confirmation before entry', 'avoid': None},
    'Neutral':        {'action': 'No clear edge — stay light',                  'avoid': None},
}

# ── Helpers ────────────────────────────────────────────────────────────────────

def get_nse():
    global _nse
    if _nse is None:
        _nse = NSELive()
    return _nse

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

def update_latest(symbol, payload):
    _latest[symbol] = payload

def get_latest(symbol):
    return _latest.get(symbol)

# ── Main poll ──────────────────────────────────────────────────────────────────

def poll_futures_sentiment(symbol):
    nse = get_nse()
    try:
        # ── Spot price ──
        index_name = 'NIFTY 50' if symbol == 'NIFTY' else 'NIFTY BANK'
        spot_data  = nse.live_index(index_name)
        spot_meta  = spot_data.get('metadata', {})
        spot_price = safe_float(spot_meta.get('last', 0))

        # ── Futures quote ──
        futures_symbol = 'NIFTYFUT' if symbol == 'NIFTY' else 'BANKNIFTYFUT'
        try:
            fut_data = nse.live_quote(futures_symbol)
            fut_meta = fut_data.get('metadata', {}) if isinstance(fut_data, dict) else {}
            fut_ltp  = safe_float(fut_meta.get('lastPrice', spot_price))
            fut_oi   = safe_int(fut_meta.get('openInterest', 0))
            fut_vol  = safe_int(fut_meta.get('totalTradedVolume', 0))
            fut_chg  = safe_float(fut_meta.get('change', 0))
            fut_pct  = safe_float(fut_meta.get('pChange', 0))
        except Exception as e:
            print(f"  [nse_futures] quote fallback {symbol}: {e}")
            fut_ltp = spot_price
            fut_oi  = 0
            fut_vol = 0
            fut_chg = 0
            fut_pct = 0

        basis = round(fut_ltp - spot_price, 2)

        # ── Deltas vs previous tick ──
        prev     = _latest.get(symbol, {})
        prev_ltp = prev.get('ltp', fut_ltp)
        prev_oi  = prev.get('fut_oi', fut_oi)

        d_price = round(fut_ltp - prev_ltp, 2)
        d_oi    = fut_oi - prev_oi

        price_up = fut_ltp >= prev_ltp
        oi_up    = fut_oi  >= prev_oi

        # ── Signal classification ──
        price_thresh = 0.05   # ignore sub-5p noise
        oi_thresh    = 500    # ignore tiny OI changes

        price_moved = abs(d_price) >= price_thresh
        oi_moved    = abs(d_oi)    >= oi_thresh

        if price_up and oi_up and (price_moved or oi_moved):
            signal = 'Long Buildup'
        elif not price_up and oi_up and (price_moved or oi_moved):
            signal = 'Short Buildup'
        elif price_up and not oi_up and price_moved:
            signal = 'Short Covering'
        elif not price_up and not oi_up and price_moved:
            signal = 'Long Unwinding'
        elif not price_moved and oi_moved:
            signal = 'Absorption'
        else:
            signal = 'Neutral'

        meta = SIGNAL_META.get(signal, SIGNAL_META['Neutral'])

        # ── Confidence score (4 components) ──
        # 35% — OI magnitude
        oi_score = min(35, abs(d_oi) / 1000 * 3)

        # 25% — Volume confirmation
        vol_score = 25 if fut_vol > 100000 else (fut_vol / 100000) * 25

        # 20% — Basis alignment
        basis_ok = (
            (signal in ('Long Buildup', 'Short Covering') and basis > 0) or
            (signal in ('Short Buildup', 'Long Unwinding') and basis < 0)
        )
        basis_score = 20 if basis_ok else 0

        # 20% — Consistency (last 3 ticks same signal)
        hist = _history.get(symbol, [])
        last3 = [h['signal'] for h in hist[-3:]]
        if len(last3) == 3 and all(s == signal for s in last3):
            consistency_score = 20
        elif len(last3) >= 2 and last3[-1] == signal:
            consistency_score = 10
        else:
            consistency_score = 0

        confidence = round(min(100, oi_score + vol_score + basis_score + consistency_score), 1)

        # ── Basis intelligence ──
        basis_notes = []
        if abs(basis) < 5:
            basis_notes.append('Futures near par — neutral positioning')
        elif basis > 0:
            basis_notes.append(f'Futures at +{basis} premium — bullish carry')
            if basis > 50:
                basis_notes.append('Large premium may attract arbitrage selling')
        else:
            basis_notes.append(f'Futures at {basis} discount — bearish carry')

        # ── Trend (last 10 ticks) ──
        trend       = {}
        trend_color = '#f59e0b'
        if len(hist) >= 5:
            recent    = [h['signal'] for h in hist[-10:]]
            bull_sigs = ('Long Buildup', 'Short Covering')
            bear_sigs = ('Short Buildup', 'Long Unwinding')
            bull_cnt  = sum(1 for s in recent if s in bull_sigs)
            bear_cnt  = sum(1 for s in recent if s in bear_sigs)
            total     = len(recent)
            if bull_cnt / total >= 0.6:
                trend       = {'label': 'Bullish',  'strength': round(bull_cnt / total * 100), 'window': total}
                trend_color = '#4ade80'
            elif bear_cnt / total >= 0.6:
                trend       = {'label': 'Bearish',  'strength': round(bear_cnt / total * 100), 'window': total}
                trend_color = '#f87171'
            else:
                trend       = {'label': 'Sideways', 'strength': 0, 'window': total}
                trend_color = '#f59e0b'

        # ── Alerts ──
        alerts = []
        if confidence >= 80:
            alerts.append({'msg': 'High conviction signal', 'color': meta['color']})
        if abs(basis) > 80:
            alerts.append({'msg': f'Extreme basis: {basis}', 'color': '#f59e0b'})
        if len(last3) == 3 and all(s == signal for s in last3):
            alerts.append({'msg': f'{signal} confirmed 3 ticks', 'color': meta['color']})

        # ── Append to history ──
        snap = {
            'time':         datetime.now().strftime('%H:%M:%S'),
            'signal':       signal,
            'signal_emoji': meta['emoji'],
            'signal_color': meta['color'],
            'confidence':   confidence,
            'ltp':          round(fut_ltp, 2),
            'spot_ltp':     round(spot_price, 2),
            'basis':        basis,
            'd_price':      d_price,
            'd_oi':         d_oi,
            'd_vol':        fut_vol,
        }
        if symbol not in _history:
            _history[symbol] = []
        _history[symbol].append(snap)
        if len(_history[symbol]) > 200:
            _history[symbol] = _history[symbol][-200:]

        # ── Return payload ──
        return {
            # Frontend display fields
            'symbol':       symbol,
            'ltp':          round(fut_ltp, 2),
            'spot_ltp':     round(spot_price, 2),
            'basis':        basis,
            'd_price':      d_price,
            'd_oi':         d_oi,
            'signal':       signal,
            'signal_emoji': meta['emoji'],
            'signal_color': meta['color'],
            'confidence':   confidence,
            'timestamp':    datetime.now().strftime('%H:%M:%S'),
            'trend':        trend,
            'trend_color':  trend_color,
            'alerts':       alerts,
            'options':      OPTIONS_IMPLICATION.get(signal, {}),
            'basis_intel':  {'notes': basis_notes},
            'history':      _history.get(symbol, []),
            # Raw fields kept for futures dashboard
            'fut_ltp':      round(fut_ltp, 2),
            'fut_oi':       fut_oi,
            'fut_vol':      fut_vol,
            'fut_chg':      round(fut_chg, 2),
            'fut_pct':      round(fut_pct, 2),
            'spot_price':   round(spot_price, 2),
        }

    except Exception as e:
        print(f"  [nse_futures] poll error {symbol}: {e}")
        global _nse
        _nse = None
        return None