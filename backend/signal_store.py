import threading
from datetime import datetime, date

store = {}
lock  = threading.Lock()

def _today():
    return date.today().isoformat()

def _key(country, screener_id, symbol, timeframe=None):
    if timeframe:
        return f"{country}:{screener_id}:{symbol}:{timeframe}"
    return f"{country}:{screener_id}:{symbol}"

def save(country, screener_id, results, timeframe_key=None):
    today = _today()
    with lock:
        if country not in store:
            store[country] = {}
        if screener_id not in store[country]:
            store[country][screener_id] = {'date': today, 'signals': {}}

        bucket = store[country][screener_id]

        if bucket.get('date') != today:
            bucket['date']    = today
            bucket['signals'] = {}

        items = results if isinstance(results, list) else []

        for item in items:
            symbol    = item.get('symbol', '')
            timeframe = item.get('timeframe', timeframe_key or '')
            key       = _key(country, screener_id, symbol, timeframe)

            if key in bucket['signals']:
                existing = bucket['signals'][key]
                item['detected_at'] = existing['detected_at']
            else:
                item['detected_at'] = datetime.now().strftime('%H:%M')

            bucket['signals'][key] = item

def get(country, screener_id, today_only=True):
    today = _today()
    with lock:
        bucket = store.get(country, {}).get(screener_id, {})
        if today_only and bucket.get('date') != today:
            return []
        return list(bucket.get('signals', {}).values())

def save_orb(country, orb5_results, orb15_results):
    today = _today()
    with lock:
        if country not in store:
            store[country] = {}
        if 'intraday_booster' not in store[country]:
            store[country]['intraday_booster'] = {'date': today, 'orb5': {}, 'orb15': {}}

        bucket = store[country]['intraday_booster']

        if bucket.get('date') != today:
            bucket['date'] = today
            bucket['orb5'] = {}
            bucket['orb15'] = {}

        for item in orb5_results:
            key = item['symbol']
            if key in bucket['orb5']:
                item['detected_at'] = bucket['orb5'][key]['detected_at']
            else:
                item['detected_at'] = datetime.now().strftime('%H:%M')
            bucket['orb5'][key] = item

        for item in orb15_results:
            key = item['symbol']
            if key in bucket['orb15']:
                item['detected_at'] = bucket['orb15'][key]['detected_at']
            else:
                item['detected_at'] = datetime.now().strftime('%H:%M')
            bucket['orb15'][key] = item

def get_orb(country):
    today = _today()
    with lock:
        bucket = store.get(country, {}).get('intraday_booster', {})
        if bucket.get('date') != today:
            return {'orb5': [], 'orb15': []}
        orb5  = sorted(bucket.get('orb5',  {}).values(), key=lambda x: x.get('r_factor', 0), reverse=True)
        orb15 = sorted(bucket.get('orb15', {}).values(), key=lambda x: x.get('r_factor', 0), reverse=True)
        return {'orb5': list(orb5), 'orb15': list(orb15)}