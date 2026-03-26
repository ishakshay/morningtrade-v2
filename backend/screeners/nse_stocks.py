import requests
import json
from screeners.base import safe_float

HEADERS = {
    'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    'Accept':          '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer':         'https://www.nseindia.com/',
    'Connection':      'keep-alive',
}

SESSION = None

def get_session():
    global SESSION
    if SESSION is None:
        SESSION = requests.Session()
        SESSION.headers.update(HEADERS)
        try:
            SESSION.get('https://www.nseindia.com', timeout=10)
        except Exception as e:
            print(f"  [nse_stocks] session init error: {e}")
    return SESSION

def fetch_nifty50_quotes():
    session = get_session()
    try:
        url  = 'https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050'
        resp = session.get(url, timeout=15)
        if resp.status_code != 200:
            return None
        return resp.json()
    except Exception as e:
        print(f"  [nse_stocks] fetch error: {e}")
        return None

def get_nifty50_stocks():
    data = fetch_nifty50_quotes()
    if not data or 'data' not in data:
        return []

    results = []
    for item in data['data']:
        try:
            symbol     = item.get('symbol', '')
            if not symbol or symbol == 'NIFTY 50':
                continue
            price      = safe_float(item.get('lastPrice', 0))
            prev_close = safe_float(item.get('previousClose', 0))
            if price == 0 or prev_close == 0:
                continue
            pct_change = round(((price - prev_close) / prev_close) * 100, 2)
            results.append({
                'symbol':         symbol + '.NS',
                'name':           item.get('meta', {}).get('companyName', symbol) if isinstance(item.get('meta'), dict) else symbol,
                'price':          round(price, 2),
                'prev_close':     round(prev_close, 2),
                'percent_change': pct_change,
                'currency':       'INR',
                'volume':         int(safe_float(item.get('totalTradedVolume', 0))),
                'avg_volume_50':  int(safe_float(item.get('totalTradedVolume', 0))),
                'day_high':       round(safe_float(item.get('dayHigh', price)), 2),
                'day_low':        round(safe_float(item.get('dayLow', price)), 2),
                'country':        'IN',
            })
        except Exception as e:
            print(f"  [nse_stocks] parse error {item.get('symbol','?')}: {e}")

    print(f"  [nse_stocks] {len(results)} Nifty 50 stocks loaded")
    return results