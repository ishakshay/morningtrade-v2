from jugaad_data.nse import NSELive
from datetime import datetime, timezone, timedelta
IST = timezone(timedelta(hours=5, minutes=30))

_nse = None

def get_nse():
    global _nse
    if _nse is None:
        _nse = NSELive()
    return _nse

def get_index_jugaad(index_name):
    try:
        nse = get_nse()
        data = nse.all_indices()
        for item in data.get('data', []):
            if item.get('index') == index_name or item.get('indexSymbol') == index_name:
                return item
    except Exception as e:
        print(f'  [jugaad] {index_name} error: {e}')
    return None

def fetch_nifty_jugaad():
    item = get_index_jugaad('NIFTY 50')
    if not item:
        return None
    return {
        'index': 'NIFTY 50',
        'last': float(item.get('last', 0)),
        'change': float(item.get('variation', 0)),
        'pct_change': float(item.get('percentChange', 0)),
        'open': float(item.get('open', 0)),
        'high': float(item.get('high', 0)),
        'low': float(item.get('low', 0)),
        'prev_close': float(item.get('previousClose', 0)),
        'advances': int(item.get('advances', 0)),
        'declines': int(item.get('declines', 0)),
        'unchanged': int(item.get('unchanged', 0)),
        'total': int(item.get('advances', 0)) + int(item.get('declines', 0)) + int(item.get('unchanged', 0)),
        'is_open': True,
        'is_up': float(item.get('variation', 0)) >= 0,
        'timestamp': datetime.now(IST).strftime('%H:%M:%S'),
        'ad_ratio': round(int(item.get('advances', 0)) / max(int(item.get('declines', 1)), 1), 2),
    }

def fetch_banknifty_jugaad():
    item = get_index_jugaad('NIFTY BANK')
    if not item:
        return None
    return {
        'index': 'NIFTY BANK',
        'last': float(item.get('last', 0)),
        'change': float(item.get('variation', 0)),
        'pct_change': float(item.get('percentChange', 0)),
        'open': float(item.get('open', 0)),
        'high': float(item.get('high', 0)),
        'low': float(item.get('low', 0)),
        'prev_close': float(item.get('previousClose', 0)),
        'advances': int(item.get('advances', 0)),
        'declines': int(item.get('declines', 0)),
        'unchanged': int(item.get('unchanged', 0)),
        'total': int(item.get('advances', 0)) + int(item.get('declines', 0)) + int(item.get('unchanged', 0)),
        'is_open': True,
        'is_up': float(item.get('variation', 0)) >= 0,
        'timestamp': datetime.now(IST).strftime('%H:%M:%S'),
        'ad_ratio': round(int(item.get('advances', 0)) / max(int(item.get('declines', 1)), 1), 2),
    }

def fetch_vix_jugaad():
    item = get_index_jugaad('INDIA VIX')
    if not item:
        return None
    return {
        'last': float(item.get('last', 0)),
        'change': float(item.get('variation', 0)),
        'pct_change': float(item.get('percentChange', 0)),
    }

def fetch_breadth_jugaad():
    try:
        nse = get_nse()
        data = nse.all_indices()
        for item in data.get('data', []):
            if item.get('index') == 'NIFTY 500':
                return {
                    'advances': int(item.get('advances', 0)),
                    'declines': int(item.get('declines', 0)),
                    'unchanged': int(item.get('unchanged', 0)),
                }
    except Exception as e:
        print(f'  [jugaad] breadth error: {e}')
    return None
