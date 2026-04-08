from jugaad_data.nse import NSELive
from datetime import datetime, date
import yfinance as yf
import requests
import json
import time
import math

_nse         = None
_nse_session = None
_vix_history = []
_iv_history  = {}

def get_nse():
    global _nse
    if _nse is None:
        _nse = NSELive()
    return _nse

def get_nse_session():
    global _nse_session
    if _nse_session is None:
        _nse_session = requests.Session()
        _nse_session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
            'Referer':    'https://www.nseindia.com/',
        })
        try:
            _nse_session.get('https://www.nseindia.com/option-chain', timeout=10)
        except:
            pass
    return _nse_session

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

def fetch_vix():
    nse = get_nse()
    try:
        data = nse.live_index('INDIA VIX')
        meta = data.get('metadata', {})
        last = safe_float(meta.get('last', 0))
        return {
            'last':       round(last, 2),
            'change':     round(safe_float(meta.get('change', 0)), 2),
            'pct_change': round(safe_float(meta.get('percChange', 0)), 2),
            'high':       round(safe_float(meta.get('high', 0)), 2),
            'low':        round(safe_float(meta.get('low', 0)), 2),
            'prev_close': round(safe_float(meta.get('previousClose', 0)), 2),
            'is_up':      safe_float(meta.get('change', 0)) >= 0,
            'timestamp':  datetime.now().strftime('%H:%M'),
        }
    except Exception as e:
        print(f"  [nse_market] VIX error: {e}")
        return None

def save_vix_snapshot(vix_val):
    today = date.today().isoformat()
    global _vix_history
    if _vix_history and _vix_history[0].get('date') != today:
        _vix_history = []
    _vix_history.append({
        'date':  today,
        'time':  datetime.now().strftime('%H:%M'),
        'value': vix_val,
    })
    if len(_vix_history) > 130:
        _vix_history = _vix_history[-130:]

def get_vix_history():
    today = date.today().isoformat()
    return [h for h in _vix_history if h.get('date') == today]

def get_latest_vix():
    """Return most recent cached VIX — no live fetch, no session conflict."""
    today = date.today().isoformat()
    hist  = [h for h in _vix_history if h.get('date') == today]
    return hist[-1]['value'] if hist else 0

def save_iv_snapshot(symbol, atm_ce_iv, atm_pe_iv, atm_ce_ltp=0, atm_pe_ltp=0, spot_price=0, vix=0):
    today = date.today().isoformat()
    if symbol not in _iv_history:
        _iv_history[symbol] = []
    hist = _iv_history[symbol]
    if hist and hist[0].get('date') != today:
        _iv_history[symbol] = []
        hist = _iv_history[symbol]
    spread       = round(atm_ce_iv - atm_pe_iv, 2) if atm_ce_iv > 0 and atm_pe_iv > 0 else None
    ce_vix_ratio = round(atm_ce_iv / vix, 3) if vix > 0 and atm_ce_iv > 0 else None
    pe_vix_ratio = round(atm_pe_iv / vix, 3) if vix > 0 and atm_pe_iv > 0 else None
    hist.append({
        'date':         today,
        'time':         datetime.now().strftime('%H:%M'),
        'ce_iv':        atm_ce_iv,
        'pe_iv':        atm_pe_iv,
        'avg_iv':       round((atm_ce_iv + atm_pe_iv) / 2, 2),
        'ce_ltp':       atm_ce_ltp,
        'pe_ltp':       atm_pe_ltp,
        'spot':         spot_price,
        'vix':          round(vix, 2) if vix > 0 else None,
        'spread':       spread,
        'ce_vix_ratio': ce_vix_ratio,
        'pe_vix_ratio': pe_vix_ratio,
    })
    if len(hist) > 130:  # 9:15–3:30 = 125 snaps at 3-min intervals
        _iv_history[symbol] = hist[-130:]

def get_iv_history(symbol):
    today = date.today().isoformat()
    return [h for h in _iv_history.get(symbol, []) if h.get('date') == today]

_pcr_intraday = {}

def save_pcr_intraday(symbol, pcr, ce_coi, pe_coi):
    today = date.today().isoformat()
    if symbol not in _pcr_intraday:
        _pcr_intraday[symbol] = {'date': today, 'snapshots': []}
    bucket = _pcr_intraday[symbol]
    if bucket['date'] != today:
        _pcr_intraday[symbol] = {'date': today, 'snapshots': []}
        bucket = _pcr_intraday[symbol]
    diff   = pe_coi - ce_coi
    signal = 'BUY' if pcr > 1.2 else 'SELL' if pcr < 0.8 else 'NEUTRAL'
    bucket['snapshots'].append({
        'time':   datetime.now().strftime('%H:%M'),
        'pcr':    round(pcr, 2),
        'diff':   diff,
        'ce_coi': ce_coi,
        'pe_coi': pe_coi,
        'signal': signal,
    })
    if len(bucket['snapshots']) > 200:
        bucket['snapshots'] = bucket['snapshots'][-200:]

def get_pcr_intraday(symbol, interval_mins=3):
    today  = date.today().isoformat()
    bucket = _pcr_intraday.get(symbol, {})
    if bucket.get('date') != today:
        return []
    snaps = bucket.get('snapshots', [])
    if interval_mins <= 3:
        return list(reversed(snaps[-30:]))
    step     = interval_mins // 3
    filtered = snaps[::step]
    return list(reversed(filtered[-30:]))

def fetch_crude():
    try:
        ticker = yf.Ticker('CL=F')
        hist   = ticker.history(period='2d', interval='1d')
        if hist.empty:
            return None
        last = round(safe_float(hist['Close'].iloc[-1]), 2)
        prev = round(safe_float(hist['Close'].iloc[-2]), 2) if len(hist) > 1 else last
        chg  = round(last - prev, 2)
        return {
            'last':       last,
            'change':     chg,
            'pct_change': round((chg / prev) * 100, 2) if prev > 0 else 0,
            'is_up':      chg >= 0,
            'unit':       'USD/bbl',
        }
    except Exception as e:
        print(f"  [nse_market] Crude error: {e}")
        return None

def fetch_index_intraday(symbol, yf_symbol):
    try:
        ticker = yf.Ticker(yf_symbol)
        hist   = ticker.history(period='1d', interval='5m')
        if hist.empty:
            return []
        closes = [round(safe_float(c), 2) for c in hist['Close'].tolist()]
        times  = [str(t)[-14:-9] for t in hist.index.tolist()]
        return [{'time': times[i], 'close': closes[i]} for i in range(len(closes))]
    except Exception as e:
        print(f"  [nse_market] intraday chart error {symbol}: {e}")
        return []

def fetch_usdinr():
    try:
        ticker = yf.Ticker('INR=X')
        hist   = ticker.history(period='2d', interval='1d')
        if hist.empty:
            return None
        last = round(safe_float(hist['Close'].iloc[-1]), 2)
        prev = round(safe_float(hist['Close'].iloc[-2]), 2) if len(hist) > 1 else last
        chg  = round(last - prev, 4)
        return {
            'last':       last,
            'prev':       prev,
            'change':     round(chg, 2),
            'pct_change': round((chg / prev) * 100, 2) if prev > 0 else 0,
            'is_up':      chg >= 0,
        }
    except Exception as e:
        print(f"  [nse_market] USDINR error: {e}")
        return None

def fetch_market_breadth():
    session = get_nse_session()
    try:
        r = session.get('https://www.nseindia.com/api/allIndices', timeout=10)
        if r.status_code != 200:
            return None
        d = json.loads(r.text)
        advances  = safe_int(d.get('advances', 0))
        declines  = safe_int(d.get('declines', 0))
        unchanged = safe_int(d.get('unchanged', 0))
        total     = advances + declines + unchanged or 1
        return {
            'advances':   advances,
            'declines':   declines,
            'unchanged':  unchanged,
            'total':      total,
            'adv_pct':    round((advances / total) * 100, 1),
            'dec_pct':    round((declines / total) * 100, 1),
            'ad_ratio':   round(advances / declines, 2) if declines > 0 else 0,
            'breadth':    'Bullish' if advances > declines * 2 else 'Bearish' if declines > advances * 2 else 'Neutral',
        }
    except Exception as e:
        print(f"  [nse_market] breadth error: {e}")
        global _nse_session
        _nse_session = None
        return None

def fetch_nifty500_breadth():
    nse = get_nse()
    try:
        data      = nse.live_index('NIFTY 500')
        advance   = data.get('advance', {})
        advances  = safe_int(advance.get('advances', 0))
        declines  = safe_int(advance.get('declines', 0))
        unchanged = safe_int(advance.get('unchanged', 0))
        total     = advances + declines + unchanged or 1
        return {
            'advances':  advances,
            'declines':  declines,
            'unchanged': unchanged,
            'total':     total,
            'adv_pct':   round((advances / total) * 100, 1),
            'dec_pct':   round((declines / total) * 100, 1),
            'ad_ratio':  round(advances / declines, 2) if declines > 0 else 0,
            'breadth':   'Bullish' if advances > declines * 2 else 'Bearish' if declines > advances * 2 else 'Neutral',
            'index':     'NIFTY 500',
        }
    except Exception as e:
        print(f"  [nse_market] nifty500 breadth error: {e}")
        return None

def fetch_index_constituents(index_name, top_n=10):
    nse = get_nse()
    try:
        data  = nse.live_index(index_name)
        items = data.get('data', [])
        label = 'NIFTY 50' if '50' in index_name else 'NIFTY BANK'
        stocks = [i for i in items if i.get('symbol') != label and i.get('symbol') != index_name]
        total_ffmc = sum(safe_float(s.get('ffmc', 0)) for s in stocks)
        result = []
        for s in sorted(stocks, key=lambda x: safe_float(x.get('ffmc', 0)), reverse=True)[:top_n]:
            ffmc   = safe_float(s.get('ffmc', 0))
            weight = round((ffmc / total_ffmc) * 100, 2) if total_ffmc > 0 else 0
            pchg   = safe_float(s.get('pChange', 0))
            result.append({
                'symbol':     s.get('symbol', ''),
                'last_price': round(safe_float(s.get('lastPrice', 0)), 2),
                'pct_change': round(pchg, 2),
                'weight':     weight,
                'is_up':      pchg >= 0,
                'day_high':   round(safe_float(s.get('dayHigh', 0)), 2),
                'day_low':    round(safe_float(s.get('dayLow', 0)), 2),
            })
        return result
    except Exception as e:
        print(f"  [nse_market] constituents error {index_name}: {e}")
        return []

def fetch_index_data(index_name, key):
    nse = get_nse()
    try:
        data = nse.live_index(index_name)
        if not data:
            return None
        meta    = data.get('metadata', {})
        advance = data.get('advance', {})
        status  = data.get('marketStatus', {})
        last       = safe_float(meta.get('last', 0))
        prev_close = safe_float(meta.get('previousClose', 0))
        change     = safe_float(meta.get('change', 0))
        pct_change = safe_float(meta.get('percChange', 0))
        advances   = safe_int(advance.get('advances', 0))
        declines   = safe_int(advance.get('declines', 0))
        unchanged  = safe_int(advance.get('unchanged', 0))
        total      = advances + declines + unchanged or 1
        ad_ratio   = round(advances / declines, 2) if declines > 0 else 0
        is_open    = status.get('marketStatus', '').lower() not in ['closed', 'close']
        return {
            'index':      index_name,
            'last':       round(last, 2),
            'prev_close': round(prev_close, 2),
            'change':     round(change, 2),
            'pct_change': round(pct_change, 2),
            'high':       round(safe_float(meta.get('high', 0)), 2),
            'low':        round(safe_float(meta.get('low', 0)), 2),
            'open':       round(safe_float(meta.get('open', 0)), 2),
            'is_up':      change >= 0,
            'is_open':    is_open,
            'advances':   advances,
            'declines':   declines,
            'unchanged':  unchanged,
            'total':      total,
            'ad_ratio':   ad_ratio,
            'timestamp':  meta.get('timeVal', datetime.now().strftime('%H:%M:%S')),
        }
    except Exception as e:
        print(f"  [nse_market] fetch error {index_name}: {e}")
        global _nse
        _nse = None
        return None

def get_market_overview():
    result = {}

    for index_name, key in [('NIFTY 50', 'NIFTY'), ('NIFTY BANK', 'BANKNIFTY')]:
        try:
            data = fetch_index_data(index_name, key)
            if data:
                result[key] = data
                print(f"  [nse_market] {key}: {data['last']} ({'+' if data['is_up'] else ''}{data['pct_change']}%)")
        except Exception as e:
            print(f"  [nse_market] {key} error: {e}")

    try:
        vix = fetch_vix()
        if vix:
            save_vix_snapshot(vix['last'])
            vix['history'] = get_vix_history()
            result['VIX']  = vix
            print(f"  [nse_market] VIX: {vix['last']}")
    except Exception as e:
        print(f"  [nse_market] VIX error: {e}")

    try:
        usdinr = fetch_usdinr()
        if usdinr:
            result['USDINR'] = usdinr
            print(f"  [nse_market] USDINR: {usdinr['last']}")
    except Exception as e:
        print(f"  [nse_market] USDINR error: {e}")

    try:
        breadth = fetch_nifty500_breadth()
        if breadth:
            result['breadth'] = breadth
            print(f"  [nse_market] Breadth: A={breadth['advances']} D={breadth['declines']}")
    except Exception as e:
        print(f"  [nse_market] breadth error: {e}")

    try:
        nifty_stocks = fetch_index_constituents('NIFTY 50', top_n=12)
        result['nifty_constituents'] = nifty_stocks
    except Exception as e:
        print(f"  [nse_market] nifty constituents error: {e}")

    try:
        bank_stocks = fetch_index_constituents('NIFTY BANK', top_n=8)
        result['banknifty_constituents'] = bank_stocks
    except Exception as e:
        print(f"  [nse_market] banknifty constituents error: {e}")

    return result