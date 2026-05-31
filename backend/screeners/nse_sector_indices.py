"""
nse_sector_indices.py  —  place in project root alongside app.py

Data strategy:
  - Previous days (4 days):  yfinance 1-min OHLC  (15-min delay fine for history)
  - Today live candles:       NSE equity_stockIndices API  (real-time, no delay)
  - Refresh cadence:          every 60 seconds

Blueprint:  sector_indices_bp  -> GET /api/sector-indices
Function:   start_sector_polling(interval_seconds=60)
"""

import math
import time
import threading
import datetime
import pytz
import requests
import yfinance as yf
from flask import Blueprint, jsonify

IST = pytz.timezone('Asia/Kolkata')

SECTORS = {
    'BANKNIFTY': { 'yf': '^NSEBANK',             'nse': 'NIFTY BANK'        },
    'CNXIT':     { 'yf': '^CNXIT',               'nse': 'NIFTY IT'          },
    'OILGAS':    { 'yf': 'NIFTY_OIL_AND_GAS.NS', 'nse': 'NIFTY OIL AND GAS'},
    'AUTO':      { 'yf': '^CNXAUTO',             'nse': 'NIFTY AUTO'        },
    'PHARMA':    { 'yf': '^CNXPHARMA',           'nse': 'NIFTY PHARMA'      },
    'METAL':     { 'yf': '^CNXMETAL',            'nse': 'NIFTY METAL'       },
}

# Today's live candles are 1-min buckets (built from 60-second polls)
LIVE_CANDLE_MINS = 1

_candle_store = {k: [] for k in SECTORS}
_last_quote   = {k: {} for k in SECTORS}
_store_lock   = threading.Lock()
_nse_session  = None
_session_lock = threading.Lock()

sector_indices_bp = Blueprint('sector_indices', __name__)

def _sanitize(obj):
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return 0
        return obj
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize(i) for i in obj]
    return obj

def _ist_now():
    return datetime.datetime.now(IST)

def _market_open():
    now = _ist_now()
    if now.weekday() >= 5:
        return False
    mins = now.hour * 60 + now.minute
    return 9 * 60 + 15 <= mins < 15 * 60 + 30

def _today_str():
    return _ist_now().strftime('%Y-%m-%d')

# ── NSE session ───────────────────────────────────────────────────────────────
def _get_nse_session():
    global _nse_session
    with _session_lock:
        if _nse_session is None:
            s = requests.Session()
            s.headers.update({
                'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                                   'AppleWebKit/537.36 (KHTML, like Gecko) '
                                   'Chrome/120.0.0.0 Safari/537.36',
                'Accept':          'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer':         'https://www.nseindia.com/',
            })
            try:
                s.get('https://www.nseindia.com', timeout=10)
            except Exception:
                pass
            _nse_session = s
        return _nse_session

def _reset_nse_session():
    global _nse_session
    with _session_lock:
        _nse_session = None

# ── Historical candles via yfinance (previous days, 1-min) ────────────────────
def _load_history_yf(sector_key):
    """
    Load last 4 completed trading days of 1-min OHLC from yfinance.
    yfinance supports interval='1m' for up to 7 days of history.
    Skips today — today's candles come from live NSE quotes every 60s.
    """
    yf_sym = SECTORS[sector_key]['yf']
    today  = _today_str()
    try:
        ticker = yf.Ticker(yf_sym)
        # '1m' interval, '5d' period — gives full 1-min bars for last 5 trading days
        df = ticker.history(period='5d', interval='1m', auto_adjust=True)
        if df is None or df.empty:
            print(f'  [sector_indices] yf: no 1m history for {sector_key}, trying 5m fallback')
            # Fallback to 5m if 1m unavailable for this symbol
            df = ticker.history(period='5d', interval='5m', auto_adjust=True)
            if df is None or df.empty:
                return []

        candles = []
        for ts, row in df.iterrows():
            if hasattr(ts, 'tz_convert'):
                ist_ts = ts.tz_convert(IST)
            else:
                ist_ts = ts.replace(tzinfo=pytz.utc).astimezone(IST)

            date_str = ist_ts.strftime('%Y-%m-%d')
            if date_str == today:
                continue   # today's candles come from live NSE
            if ist_ts.weekday() >= 5:
                continue
            mins = ist_ts.hour * 60 + ist_ts.minute
            if mins < 9 * 60 + 15 or mins > 15 * 60 + 30:
                continue

            candles.append({
                'time':   '{:02d}:{:02d}'.format(ist_ts.hour, ist_ts.minute),
                'date':   date_str,
                'open':   round(float(row['Open']),  2),
                'high':   round(float(row['High']),  2),
                'low':    round(float(row['Low']),   2),
                'close':  round(float(row['Close']), 2),
                'volume': int(row['Volume']) if row['Volume'] == row['Volume'] else 1,
            })

        print(f'  [sector_indices] yf 1m history {sector_key}: {len(candles)} candles')
        return candles

    except Exception as e:
        print(f'  [sector_indices] yf error {sector_key}: {e}')
        return []

# ── Live NSE quote ────────────────────────────────────────────────────────────
def _fetch_nse_live(sector_key):
    nse_name = SECTORS[sector_key]['nse']
    url = ('https://www.nseindia.com/api/equity_stockIndices?index='
           + nse_name.replace(' ', '%20'))
    try:
        s = _get_nse_session()
        r = s.get(url, timeout=8)
        if r.status_code == 403:
            _reset_nse_session()
            s = _get_nse_session()
            r = s.get(url, timeout=8)
        if r.status_code != 200:
            return None

        data    = r.json()
        records = data.get('data', [])
        rec     = None
        for x in records:
            sym = (x.get('indexSymbol') or x.get('index') or '').upper()
            if sym == nse_name.upper():
                rec = x
                break
        if rec is None and records:
            rec = records[0]
        if not rec:
            return None

        last       = float(rec.get('last') or rec.get('lastPrice') or rec.get('indexVal') or 0)
        open_      = float(rec.get('open')    or last)
        high       = float(rec.get('dayHigh') or rec.get('high') or last)
        low        = float(rec.get('dayLow')  or rec.get('low')  or last)
        prev_close = float(rec.get('previousClose') or rec.get('prevClose') or last)
        chg        = last - prev_close
        pct        = round(chg / prev_close * 100, 2) if prev_close else 0.0

        return {
            'last':       last,
            'open':       open_,
            'high':       high,
            'low':        low,
            'prev_close': prev_close,
            'change':     round(chg, 2),
            'pct_change': pct,
            'is_up':      chg >= 0,
        }
    except Exception as e:
        print(f'  [sector_indices] nse live error {sector_key}: {e}')
        return None

# ── Append live quote into 1-min candles ─────────────────────────────────────
def _append_live_candle(sector_key, quote):
    """
    Build today's 1-min candles from 60-second NSE polls.
    Each poll either opens a new 1-min candle or updates the current one.
    """
    if not quote or not quote.get('last'):
        return
    now     = _ist_now()
    # 1-min bucket: use exact minute (no rounding needed)
    t_label = '{:02d}:{:02d}'.format(now.hour, now.minute)
    today   = now.strftime('%Y-%m-%d')
    price   = quote['last']

    with _store_lock:
        store = _candle_store[sector_key]
        if (store
                and store[-1]['time'] == t_label
                and store[-1].get('date') == today):
            # Update current 1-min candle
            c = store[-1]
            c['high']   = max(c['high'],  price)
            c['low']    = min(c['low'],   price)
            c['close']  = price
            c['volume'] += 1
        else:
            # New 1-min candle — open = prev close for gap-free chart
            prev_close = store[-1]['close'] if store else quote.get('prev_close', price)
            store.append({
                'time':   t_label,
                'date':   today,
                'open':   prev_close,
                'high':   max(prev_close, price),
                'low':    min(prev_close, price),
                'close':  price,
                'volume': 1,
            })
        # Cap: 4 prev days 5-min (~300 bars) + today 1-min (375 bars) = ~675 max
        _candle_store[sector_key] = store[-800:]

# ── Init one sector ───────────────────────────────────────────────────────────
def _init_sector(sector_key):
    hist = _load_history_yf(sector_key)
    with _store_lock:
        if hist:
            _candle_store[sector_key] = hist

    q = _fetch_nse_live(sector_key)
    if q:
        with _store_lock:
            _last_quote[sector_key] = q
        if _market_open():
            _append_live_candle(sector_key, q)

# ── Refresh (called every 60s) ────────────────────────────────────────────────
def refresh_all_sectors():
    for key in SECTORS:
        try:
            q = _fetch_nse_live(key)
            if q:
                with _store_lock:
                    _last_quote[key] = q
                if _market_open():
                    _append_live_candle(key, q)
        except Exception as e:
            print(f'  [sector_indices] refresh error {key}: {e}')

# ── API endpoint ──────────────────────────────────────────────────────────────
@sector_indices_bp.route('/api/sector-indices')
def api_sector_indices():
    result = {}
    with _store_lock:
        for key in SECTORS:
            q = dict(_last_quote[key]) if _last_quote[key] else {}
            q['candles'] = list(_candle_store[key])
            result[key]  = q
    return jsonify(_sanitize(result))

# ── Background thread ─────────────────────────────────────────────────────────
_bg_thread = None

def start_sector_polling(interval_seconds=60):
    global _bg_thread
    if _bg_thread and _bg_thread.is_alive():
        return

    def _loop():
        print('\n[sector_indices] init — loading 1-min yfinance history + live NSE quotes...')
        for key in SECTORS:
            try:
                _init_sector(key)
            except Exception as e:
                print(f'  [sector_indices] init error {key}: {e}')
            time.sleep(0.4)
        print('[sector_indices] init complete\n')

        while True:
            time.sleep(interval_seconds)
            try:
                refresh_all_sectors()
            except Exception as e:
                print(f'  [sector_indices] poll error: {e}')

    _bg_thread = threading.Thread(
        target=_loop, daemon=True, name='sector-indices-poll'
    )
    _bg_thread.start()
    print(f'[sector_indices] polling started ({interval_seconds}s interval)')