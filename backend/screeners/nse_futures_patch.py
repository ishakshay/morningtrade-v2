# Replace the TOP of nse_futures.py (lines 1-53) with this.
# Everything from line 54 onwards (poll_futures_sentiment logic) stays identical.

import requests
import math
from datetime import datetime

_session  = None
_latest   = {}
_history  = {}

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

def _get_session():
    global _session
    if _session is None:
        _session = requests.Session()
        _session.headers.update({
            'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                               'AppleWebKit/537.36 (KHTML, like Gecko) '
                               'Chrome/120.0.0.0 Safari/537.36',
            'Accept':          'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer':         'https://www.nseindia.com/',
        })
        try:
            _session.get('https://www.nseindia.com', timeout=10)
        except Exception:
            pass
    return _session

def _reset_session():
    global _session
    _session = None

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

def _fetch_futures_data(symbol):
    """
    Fetch spot price and near-month futures data from NSE.
    Uses equity_stockIndices for spot and quote for futures.
    Returns (spot_price, fut_ltp, fut_oi, fut_vol, fut_chg, fut_pct)
    """
    index_name = 'NIFTY 50' if symbol == 'NIFTY' else 'NIFTY BANK'
    fut_symbol = 'NIFTY' if symbol == 'NIFTY' else 'BANKNIFTY'

    s = _get_session()

    # Spot price from equity_stockIndices
    spot_price = 0
    try:
        url = 'https://www.nseindia.com/api/allIndices', timeout=8)
        r = s.get(url, timeout=8)
        if r.status_code == 403:
            _reset_session()
            s = _get_session()
            r = s.get(url, timeout=8)
        if r.status_code == 200:
            data = r.json()
            records = data.get('data', [])
            for rec in records:
                sym = (rec.get('indexSymbol') or rec.get('index') or '').upper()
                if sym == index_name.upper():
                    spot_price = safe_float(rec.get('last') or rec.get('lastPrice') or rec.get('indexVal'))
                    break
            if not spot_price and records:
                spot_price = safe_float(records[0].get('last') or records[0].get('lastPrice'))
    except Exception as e:
        print(f'  [nse_futures] spot fetch error: {e}')

    # Futures data from option chain (underlying future)
    fut_ltp = spot_price
    fut_oi  = 0
    fut_vol = 0
    fut_chg = 0
    fut_pct = 0
    try:
        url = f'https://www.nseindia.com/api/quote-derivative?symbol={fut_symbol}'
        r = s.get(url, timeout=8)
        if r.status_code == 403:
            _reset_session()
            s = _get_session()
            r = s.get(url, timeout=8)
        if r.status_code == 200:
            data = r.json()
            # Find near-month futures (instrumentType=FUTIDX)
            stocks = data.get('stocks', [])
            futures = [x for x in stocks
                      if x.get('metadata', {}).get('instrumentType') == 'FUTIDX']
            if futures:
                # Sort by expiry to get nearest
                futures.sort(key=lambda x: x.get('metadata', {}).get('expiryDate', ''))
                meta = futures[0].get('metadata', {})
                fut_ltp = safe_float(meta.get('lastPrice', spot_price))
                fut_oi  = safe_int(meta.get('openInterest', 0))
                fut_vol = safe_int(meta.get('totalTradedVolume', 0) or
                                   meta.get('numberOfContractsTraded', 0))
                fut_chg = safe_float(meta.get('change', 0))
                fut_pct = safe_float(meta.get('pChange', 0))
    except Exception as e:
        print(f'  [nse_futures] futures fetch error: {e}')
        fut_ltp = spot_price

    return spot_price, fut_ltp, fut_oi, fut_vol, fut_chg, fut_pct


# ── Main poll ──────────────────────────────────────────────────────────────────

def poll_futures_sentiment(symbol):
    try:
        spot_price, fut_ltp, fut_oi, fut_vol, fut_chg, fut_pct = _fetch_futures_data(symbol)

        if not spot_price:
            return None

        basis = round(fut_ltp - spot_price, 2)

        # ── Deltas vs previous tick ──
        prev     = _latest.get(symbol, {})
        prev_ltp = prev.get('ltp', fut_ltp)
        prev_oi  = prev.get('fut_oi', fut_oi)

        d_price = round(fut_ltp - prev_ltp, 2)
        d_oi    = fut_oi - prev_oi

        price_up = fut_ltp >= prev_ltp
        oi_up    = fut_oi  >= prev_oi

        price_thresh = 0.05
        oi_thresh    = 500

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

        # ── Confidence score ──
        oi_score    = min(35, abs(d_oi) / 1000 * 3)
        vol_score   = 25 if fut_vol > 100000 else (fut_vol / 100000) * 25
        basis_ok    = (
            (signal in ('Long Buildup', 'Short Covering') and basis > 0) or
            (signal in ('Short Buildup', 'Long Unwinding') and basis < 0)
        )
        basis_score = 20 if basis_ok else 0

        hist  = _history.get(symbol, [])
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

        # ── Trend ──
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

        return {
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
            'fut_ltp':      round(fut_ltp, 2),
            'fut_oi':       fut_oi,
            'fut_vol':      fut_vol,
            'fut_chg':      round(fut_chg, 2),
            'fut_pct':      round(fut_pct, 2),
            'spot_price':   round(spot_price, 2),
        }

    except Exception as e:
        print(f'  [nse_futures] poll error {symbol}: {e}')
        _reset_session()
        return None
