from jugaad_data.nse import NSELive
from datetime import datetime, timezone, timedelta
IST = timezone(timedelta(hours=5, minutes=30))
import time

_nse = NSELive()
_indices_cache = {'data': None, 'ts': 0}
CACHE_TTL = 60

def safe_float(v):
    try: return float(v)
    except: return 0.0

def safe_int(v):
    try: return int(v)
    except: return 0

def _get_indices():
    now = time.time()
    if _indices_cache['data'] and now - _indices_cache['ts'] < CACHE_TTL:
        return _indices_cache['data']
    try:
        result = _nse.all_indices()
        _indices_cache['data'] = result
        _indices_cache['ts'] = now
        return result
    except Exception as e:
        print(f"  [jugaad] all_indices error: {e}")
        return _indices_cache['data'] or {'data': []}

def get_index_jugaad(index_name):
    indices = _get_indices()
    for item in (indices.get('data') or []):
        if item.get('index') == index_name:
            return item
    return {}

def fetch_index_data_jugaad(index_name):
    item = get_index_jugaad(index_name)
    if not item:
        return None
    last       = safe_float(item.get('last', 0))
    prev_close = safe_float(item.get('previousClose', 0))
    change     = safe_float(item.get('variation', 0))
    pct_change = safe_float(item.get('percentChange', 0))
    advances   = safe_int(item.get('advances', 0))
    declines   = safe_int(item.get('declines', 0))
    unchanged  = safe_int(item.get('unchanged', 0))
    total      = advances + declines + unchanged or 1
    ad_ratio   = round(advances / declines, 2) if declines > 0 else 0
    return {
        'index':      index_name,
        'last':       round(last, 2),
        'prev_close': round(prev_close, 2),
        'change':     round(change, 2),
        'pct_change': round(pct_change, 2),
        'high':       round(safe_float(item.get('high', 0)), 2),
        'low':        round(safe_float(item.get('low', 0)), 2),
        'open':       round(safe_float(item.get('open', 0)), 2),
        'is_up':      change >= 0,
        'is_open':    False,
        'advances':   advances,
        'declines':   declines,
        'unchanged':  unchanged,
        'total':      total,
        'ad_ratio':   ad_ratio,
        'timestamp':  datetime.now(IST).strftime('%H:%M:%S'),
    }

def fetch_vix_jugaad():
    item = get_index_jugaad('INDIA VIX')
    if not item:
        return None
    last   = safe_float(item.get('last', 0))
    prev   = safe_float(item.get('previousClose', 0))
    change = safe_float(item.get('variation', 0))
    pct    = safe_float(item.get('percentChange', 0))
    return {
        'last':       round(last, 2),
        'prev_close': round(prev, 2),
        'change':     round(change, 2),
        'pct_change': round(pct, 2),
        'is_up':      change >= 0,
    }

def fetch_breadth_jugaad():
    nifty500 = get_index_jugaad('NIFTY 500')
    if not nifty500:
        return None
    advances  = safe_int(nifty500.get('advances', 0))
    declines  = safe_int(nifty500.get('declines', 0))
    unchanged = safe_int(nifty500.get('unchanged', 0))
    total     = advances + declines + unchanged or 1
    return {
        'advances':  advances,
        'declines':  declines,
        'unchanged': unchanged,
        'total':     total,
        'adv_pct':   round(advances / total * 100, 1),
        'dec_pct':   round(declines / total * 100, 1),
    }

def get_all_indices_jugaad():
    indices = _get_indices()
    result = []
    for item in (indices.get('data') or []):
        last   = safe_float(item.get('last', 0))
        prev   = safe_float(item.get('previousClose', 0))
        change = safe_float(item.get('variation', 0))
        pct    = safe_float(item.get('percentChange', 0))
        result.append({
            'name':       item.get('index', ''),
            'last':       round(last, 2),
            'prev_close': round(prev, 2),
            'change':     round(change, 2),
            'pct_change': round(pct, 2),
            'is_up':      change >= 0,
            'high':       round(safe_float(item.get('high', 0)), 2),
            'low':        round(safe_float(item.get('low', 0)), 2),
        })
    return result
