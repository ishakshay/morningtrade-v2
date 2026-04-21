"""
MTF Intraday Scanner — Flask routes
Place in screeners/mtf_scanner_route.py

Usage in app.py:
    from screeners.mtf_scanner_route import register_scanner_routes
    register_scanner_routes(app, sanitize)

Requires: yfinance pandas numpy (already in your venv)
"""

import math
import warnings
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, time, timezone, timedelta
warnings.filterwarnings('ignore')

try:
    import yfinance as yf
    import pandas as pd
    import numpy as np
    _DEPS_OK = True
except ImportError:
    _DEPS_OK = False


# ─── Full NSE F&O universe (~182 stocks, April 2026) ─────────────────────────

NSE_FO_STOCKS = [
    # Nifty 50
    'ADANIENT', 'ADANIPORTS', 'APOLLOHOSP', 'ASIANPAINT', 'AXISBANK',
    'BAJAJFINSV', 'BAJFINANCE', 'BPCL', 'BHARTIARTL', 'BRITANNIA',
    'CIPLA', 'COALINDIA', 'DIVISLAB', 'DRREDDY', 'EICHERMOT',
    'GRASIM', 'HCLTECH', 'HDFCBANK', 'HDFCLIFE', 'HEROMOTOCO',
    'HINDALCO', 'HINDUNILVR', 'ICICIBANK', 'ITC', 'INDUSINDBK',
    'INFY', 'JSWSTEEL', 'KOTAKBANK', 'LT', 'LTIM',
    'MARUTI', 'NESTLEIND', 'NTPC', 'ONGC', 'POWERGRID',
    'RELIANCE', 'SBILIFE', 'SHRIRAMFIN', 'SBIN', 'SUNPHARMA',
    'TCS', 'TATACONSUM', 'TATAMOTORS', 'TATASTEEL', 'TECHM',
    'TITAN', 'ULTRACEMCO', 'WIPRO',
    # Nifty Next 50 + active F&O midcaps
    'ABB', 'ABCAPITAL', 'ABFRL', 'ACC', 'ALKEM',
    'AMBUJACEM', 'APLAPOLLO', 'ASTRAL', 'AUROPHARMA', 'BALKRISIND',
    'BANDHANBNK', 'BANKBARODA', 'BATAINDIA', 'BEL', 'BERGEPAINT',
    'BIOCON', 'BOSCHLTD', 'CANBK', 'CHOLAFIN', 'COLPAL',
    'CONCOR', 'COROMANDEL', 'CROMPTON', 'DABUR', 'DALBHARAT',
    'DEEPAKNTR', 'DELTACORP', 'DMART', 'ESCORTS', 'EXIDEIND',
    'FEDERALBNK', 'GAIL', 'GLENMARK', 'GMRINFRA', 'GODREJCP',
    'GODREJPROP', 'GRANULES', 'GSPL', 'HAVELLS', 'IDFCFIRSTB',
    'IEX', 'IPCALAB', 'INDHOTEL', 'INDUSTOWER', 'IRCTC',
    'JINDALSTEL', 'JUBLFOOD', 'KAJARIACER', 'KANSAINER', 'LICHSGFIN',
    'LALPATHLAB', 'LAURUSLABS', 'LUPIN', 'MGL', 'MFSL',
    'MOTHERSON', 'MPHASIS', 'MRF', 'MUTHOOTFIN', 'NATIONALUM',
    'NAVINFLUOR', 'NAUKRI', 'NMDC', 'OBEROIRLTY', 'OFSS',
    'PAGEIND', 'PEL', 'PERSISTENT', 'PETRONET', 'PFC',
    'PIDILITIND', 'PIIND', 'PNB', 'POLYCAB', 'RAMCOCEM',
    'RECLTD', 'SAIL', 'SCHAEFFLER', 'SRF', 'SIEMENS',
    'SUNTV', 'SUPREMEIND', 'SYNGENE', 'TATACOMM', 'TATAELXSI',
    'TATAPOWER', 'TATACHEM', 'TORNTPHARM', 'TORNTPOWER', 'TRENT',
    'TRIDENT', 'UBL', 'UNIONBANK', 'UPL', 'VEDL',
    'VOLTAS', 'ZEEL', 'ZOMATO', 'ZYDUSLIFE',
]

SCAN_WORKERS    = 10     # parallel fetch threads — safe for yfinance rate limits
BOS_LOOKBACK    = 20
MIN_FVG_GAP_PCT = 0.005
MIN_RALLY_PCT   = 0.008
MAX_VOL_RATIO   = 0.9
SL_BUFFER       = 0.003
TP1_R           = 2.0
TP2_R           = 3.0
IST             = timezone(timedelta(hours=5, minutes=30))


# ─── Data helpers ─────────────────────────────────────────────────────────────

def _fetch(symbol, interval, period='60d'):
    try:
        df = yf.download(f'{symbol}.NS', interval=interval, period=period,
                         auto_adjust=True, progress=False)
        if df.empty:
            return None
        df.columns = [c.lower() for c in df.columns]
        df.index   = pd.to_datetime(df.index, utc=True)
        return df[['open', 'high', 'low', 'close', 'volume']].dropna()
    except Exception:
        return None


def _ema(series, n):
    return series.ewm(span=n, adjust=False).mean()


def _add_emas(df):
    df = df.copy()
    for n in [9, 20, 50, 200]:
        df[f'ema{n}'] = _ema(df['close'], n)
    return df


def _avg_vol(df, n=20):
    return df['volume'].rolling(n).mean()


def _detect_fvgs(df, min_gap, tf):
    fvgs   = []
    highs  = df['high'].values
    lows   = df['low'].values
    closes = df['close'].values
    times  = df.index
    for i in range(2, len(df)):
        ref = closes[i]
        if lows[i] > highs[i - 2]:
            gap = (lows[i] - highs[i - 2]) / ref
            if gap >= min_gap:
                fvgs.append({'dir': 'BULL', 'bottom': highs[i - 2], 'top': lows[i],
                             'gap_pct': round(gap * 100, 3), 'bar_idx': i,
                             'timestamp': str(times[i]), 'tf': tf})
        if highs[i] < lows[i - 2]:
            gap = (lows[i - 2] - highs[i]) / ref
            if gap >= min_gap:
                fvgs.append({'dir': 'BEAR', 'bottom': highs[i], 'top': lows[i - 2],
                             'gap_pct': round(gap * 100, 3), 'bar_idx': i,
                             'timestamp': str(times[i]), 'tf': tf})
    return fvgs


def _detect_bos(df, lookback=BOS_LOOKBACK):
    events = []
    for i in range(lookback + 1, len(df)):
        sh = df['high'].iloc[max(0, i - lookback):i].max()
        sl = df['low'].iloc[max(0, i - lookback):i].min()
        pc = df['close'].iloc[i - 1]
        cc = df['close'].iloc[i]
        if pc <= sh and cc > sh:
            events.append({'idx': i, 'dir': 'BULL', 'level': sh, 'time': str(df.index[i])})
        if pc >= sl and cc < sl:
            events.append({'idx': i, 'dir': 'BEAR', 'level': sl, 'time': str(df.index[i])})
    return events


def _daily_bias(df_daily):
    if df_daily is None or len(df_daily) < 52:
        return {'bias': 'NEUTRAL', 'pdh': None, 'pdl': None}
    df   = _add_emas(df_daily)
    last = df.iloc[-1]
    prev = df.iloc[-2]
    bull = last['ema20'] > last['ema50'] > last['ema200']
    bear = last['ema20'] < last['ema50'] < last['ema200']
    return {
        'bias':   'BULL' if bull else ('BEAR' if bear else 'NEUTRAL'),
        'pdh':    round(float(prev['high']), 2),
        'pdl':    round(float(prev['low']),  2),
        'close':  round(float(last['close']),  2),
        'ema20':  round(float(last['ema20']),  2),
        'ema50':  round(float(last['ema50']),  2),
        'ema200': round(float(last['ema200']), 2),
    }


def _confirm_15m(fvg, direction, df_15m):
    if df_15m is None or len(df_15m) < 20:
        return False
    df      = _add_emas(df_15m)
    recent  = df.iloc[-30:]
    avg_v15 = recent['volume'].rolling(10).mean()
    for i in range(10, len(recent)):
        bar   = recent.iloc[i]
        close = bar['close']
        high  = bar['high']
        low   = bar['low']
        body  = abs(close - bar['open'])
        rng   = high - low
        near  = (
            (direction == 'BULL' and fvg['bottom'] * 0.98 <= low  <= fvg['top'] * 1.02) or
            (direction == 'BEAR' and fvg['bottom'] * 0.98 <= high <= fvg['top'] * 1.02)
        )
        if not near:
            continue
        sl = recent.iloc[max(0, i - 10):i]
        if direction == 'BULL' and close <= sl['high'].max():
            continue
        if direction == 'BEAR' and close >= sl['low'].min():
            continue
        lw   = bar['open'] - low  if close > bar['open'] else close - low
        uw   = high - bar['open'] if close > bar['open'] else high - close
        good = (
            (direction == 'BULL' and (lw > body * 1.5 or (close > bar['open'] and body > rng * 0.6))) or
            (direction == 'BEAR' and (uw > body * 1.5 or (close < bar['open'] and body > rng * 0.6)))
        )
        if not good:
            continue
        av = avg_v15.iloc[i - 1] if i > 0 else None
        if av and bar['volume'] > av * 1.2:
            return True
    return False


def _find_5m_entry(fvg, direction, df_5m):
    if df_5m is None or len(df_5m) < 20:
        return None
    df    = _add_emas(df_5m)
    micro = _detect_fvgs(df, 0.001, '5M')
    recent_micro = [f for f in micro if f['dir'] == direction and f['bar_idx'] >= len(df) - 20]
    if recent_micro:
        f = recent_micro[-1]
        return f['top'] if direction == 'BULL' else f['bottom']
    last = df.iloc[-1]
    ema9 = last['ema9']
    if abs(last['close'] - ema9) / ema9 < 0.003:
        return round(float(ema9), 2)
    return None


def _grade(setup, bias):
    s  = 0
    if bias['bias'] == setup['direction']:           s += 2
    gp = setup['fvg_gap_pct']
    s += 3 if gp >= 1.5 else (2 if gp >= 1.0 else (1 if gp >= 0.5 else 0))
    rp = setup['rally_pct']
    s += 2 if rp >= 1.5 else (1 if rp >= 0.8 else 0)
    vr = setup['vol_ratio']
    s += 2 if vr <= 0.6 else (1 if vr <= 0.9 else 0)
    if setup.get('confirmed_15m'):                   s += 2
    if setup.get('entry_5m'):                        s += 1
    if s >= 10: return 'A+'
    if s >= 7:  return 'A'
    if s >= 5:  return 'B'
    return 'C'


# ─── Core scan (one symbol) ───────────────────────────────────────────────────

def _scan_symbol(symbol, trade_date):
    df_daily = _fetch(symbol, '1d', '365d')
    df_1h    = _fetch(symbol, '1h', '60d')
    df_15m   = _fetch(symbol, '15m', '30d')
    df_5m    = _fetch(symbol, '5m',  '7d')

    if df_daily is None or df_1h is None:
        return []

    bias    = _daily_bias(df_daily)
    df      = _add_emas(df_1h)
    avg_v   = _avg_vol(df)
    bos_evs = _detect_bos(df, BOS_LOOKBACK)
    all_fvg = _detect_fvgs(df, MIN_FVG_GAP_PCT, '1H')
    cutoff  = len(df) - 50
    rec_fvg = [f for f in all_fvg if f['bar_idx'] >= cutoff]

    setups = []
    for bos in bos_evs[-10:]:
        b_idx = bos['idx']
        b_dir = bos['dir']

        if bias['bias'] != 'NEUTRAL' and bias['bias'] != b_dir:
            continue

        cand = [f for f in rec_fvg if f['dir'] == b_dir and b_idx - 5 <= f['bar_idx'] <= b_idx]
        if not cand:
            continue
        fvg = cand[-1]

        rs = max(0, fvg['bar_idx'] - 5)
        if b_dir == 'BULL':
            rl        = df['low'].iloc[rs:fvg['bar_idx']].min()
            rh        = df['high'].iloc[fvg['bar_idx']]
            rally_pct = float((rh - rl) / rl) if rl > 0 else 0
        else:
            rh        = df['high'].iloc[rs:fvg['bar_idx']].max()
            rl        = df['low'].iloc[fvg['bar_idx']]
            rally_pct = float((rh - rl) / rh) if rh > 0 else 0
        if rally_pct < MIN_RALLY_PCT:
            continue

        e20 = float(df['ema20'].iloc[b_idx])
        e50 = float(df['ema50'].iloc[b_idx])
        if b_dir == 'BULL' and e20 <= e50: continue
        if b_dir == 'BEAR' and e20 >= e50: continue

        for j in range(b_idx + 1, min(b_idx + 30, len(df))):
            bar     = df.iloc[j]
            touched = False
            if b_dir == 'BULL' and fvg['bottom'] * 0.97 <= bar['low'] <= fvg['top']:  touched = True
            if b_dir == 'BEAR' and fvg['bottom'] <= bar['high'] <= fvg['top'] * 1.03: touched = True
            if not touched:
                continue

            app_vol   = df['volume'].iloc[max(0, j - 3):j].mean()
            base_vol  = avg_v.iloc[j]
            vol_ratio = float(app_vol / base_vol) if base_vol > 0 else 1.0
            if vol_ratio > MAX_VOL_RATIO:
                continue

            if b_dir == 'BULL':
                entry   = fvg['top']
                sl_wide = fvg['bottom'] * (1 - SL_BUFFER)
                risk    = entry - sl_wide
                tp1 = entry + risk * TP1_R
                tp2 = entry + risk * TP2_R
                tp3 = bias.get('pdh')
            else:
                entry   = fvg['bottom']
                sl_wide = fvg['top'] * (1 + SL_BUFFER)
                risk    = sl_wide - entry
                tp1 = entry - risk * TP1_R
                tp2 = entry - risk * TP2_R
                tp3 = bias.get('pdl')

            conf_15m = _confirm_15m(fvg, b_dir, df_15m)
            entry_5m = _find_5m_entry(fvg, b_dir, df_5m) if conf_15m else None

            or_high = or_low = None
            if df_5m is not None:
                ist_off = pd.Timedelta('5h30m')
                td_bars = df_5m[df_5m.index.date == trade_date]
                or_bars = td_bars[(td_bars.index + ist_off).time.map(
                    lambda t: time(9, 15) <= t < time(9, 45))]
                if not or_bars.empty:
                    or_high = round(float(or_bars['high'].max()), 2)
                    or_low  = round(float(or_bars['low'].min()),  2)

            setup = {
                'symbol':        symbol,
                'direction':     b_dir,
                'timeframe':     '1H',
                'bos_time':      bos['time'],
                'fvg_bottom':    round(float(fvg['bottom']), 2),
                'fvg_top':       round(float(fvg['top']),    2),
                'fvg_gap_pct':   fvg['gap_pct'],
                'ema20':         round(e20, 2),
                'ema50':         round(e50, 2),
                'entry':         round(float(entry),   2),
                'sl_wide':       round(float(sl_wide), 2),
                'sl_medium':     round(float(sl_wide) * 0.999, 2),
                'sl_tight':      round(float(sl_wide) * 0.998, 2),
                'tp1':           round(float(tp1), 2),
                'tp2':           round(float(tp2), 2),
                'tp3':           round(float(tp3), 2) if tp3 else None,
                'rally_pct':     round(rally_pct * 100, 2),
                'vol_ratio':     round(vol_ratio, 2),
                'confirmed_15m': conf_15m,
                'entry_5m':      round(float(entry_5m), 2) if entry_5m else None,
                'daily_bias':    bias['bias'],
                'pdh':           bias.get('pdh'),
                'pdl':           bias.get('pdl'),
                'or_high':       or_high,
                'or_low':        or_low,
            }
            setup['grade'] = _grade(setup, bias)
            setups.append(setup)
            break

    return setups


# ─── Parallel scan (all symbols) ──────────────────────────────────────────────

def _scan_parallel(symbols, trade_date, workers=SCAN_WORKERS):
    all_setups = []
    lock       = threading.Lock()

    def worker(sym):
        try:
            result = _scan_symbol(sym, trade_date)
            if result:
                with lock:
                    all_setups.extend(result)
            print(f'  [scanner] {sym}: {len(result)} setup(s)')
        except Exception as e:
            print(f'  [scanner] {sym} error: {e}')

    with ThreadPoolExecutor(max_workers=workers) as pool:
        pool.map(worker, symbols)

    return all_setups


# ─── Route registration ───────────────────────────────────────────────────────

def register_scanner_routes(app, sanitize):
    from flask import request, jsonify

    @app.route('/api/scanner/mtf')
    def mtf_scan():
        if not _DEPS_OK:
            return jsonify({'error': 'yfinance / pandas / numpy not installed'}), 500

        symbols_raw = request.args.get('symbols', '')
        symbols     = [s.strip().upper() for s in symbols_raw.split(',') if s.strip()] or NSE_FO_STOCKS

        date_raw = request.args.get('date', '')
        try:
            trade_date = date.fromisoformat(date_raw) if date_raw else date.today()
        except ValueError:
            trade_date = date.today()

        min_grade  = request.args.get('grade', 'B')
        grade_rank = {'A+': 4, 'A': 3, 'B': 2, 'C': 1}
        min_rank   = grade_rank.get(min_grade, 2)

        # Use parallel scan for full list, sequential for small custom lists
        if len(symbols) >= 10:
            all_setups = _scan_parallel(symbols, trade_date)
        else:
            all_setups = []
            for sym in symbols:
                try:
                    all_setups.extend(_scan_symbol(sym, trade_date))
                except Exception as e:
                    print(f'  [scanner] {sym} error: {e}')

        filtered = [s for s in all_setups if grade_rank.get(s['grade'], 0) >= min_rank]
        filtered.sort(
            key=lambda s: (grade_rank.get(s['grade'], 0), int(s['confirmed_15m'])),
            reverse=True,
        )

        return jsonify(sanitize({
            'date':         str(trade_date),
            'scanned':      len(symbols),
            'setups_found': len(filtered),
            'min_grade':    min_grade,
            'setups':       filtered,
        }))

    @app.route('/api/scanner/symbols')
    def scanner_symbols():
        return jsonify({'symbols': NSE_FO_STOCKS, 'count': len(NSE_FO_STOCKS)})