import json
import os
import threading
from datetime import datetime, date

STORE_FILE = os.path.join(os.path.dirname(__file__), 'signal_data.json')
lock       = threading.Lock()

def _today():
    return date.today().isoformat()

def _load():
    try:
        if os.path.exists(STORE_FILE):
            with open(STORE_FILE, 'r') as f:
                return json.load(f)
    except:
        pass
    return {}

def _save_file(data):
    try:
        with open(STORE_FILE, 'w') as f:
            json.dump(data, f)
    except Exception as e:
        print(f"  [session_store] save error: {e}")

def _now_str(country):
    from datetime import timezone, timedelta
    offsets = {'PL': 1, 'DE': 1, 'IN': 5}
    dst     = {'PL': 1, 'DE': 1, 'IN': 0}
    offset  = offsets.get(country, 0) + dst.get(country, 0)
    tz      = timezone(timedelta(hours=offset))
    return datetime.now(tz).strftime('%H:%M')

def save_orb(country, orb5_results, orb15_results):
    today = _today()
    with lock:
        data = _load()
        if country not in data:
            data[country] = {}
        if 'intraday_booster' not in data[country]:
            data[country]['intraday_booster'] = {'date': today, 'orb5': {}, 'orb15': {}}

        bucket = data[country]['intraday_booster']
        if bucket.get('date') != today:
            bucket['date']  = today
            bucket['orb5']  = {}
            bucket['orb15'] = {}

        for item in orb5_results:
            key = item['symbol']
            if key in bucket['orb5']:
                item['detected_at'] = bucket['orb5'][key]['detected_at']
            else:
                item['detected_at'] = _now_str(country)
            bucket['orb5'][key] = item

        for item in orb15_results:
            key = item['symbol']
            if key in bucket['orb15']:
                item['detected_at'] = bucket['orb15'][key]['detected_at']
            else:
                item['detected_at'] = _now_str(country)
            bucket['orb15'][key] = item

        _save_file(data)

def get_orb(country):
    today = _today()
    with lock:
        data   = _load()
        bucket = data.get(country, {}).get('intraday_booster', {})
        if bucket.get('date') != today:
            return {'orb5': [], 'orb15': []}
        orb5  = sorted(bucket.get('orb5',  {}).values(), key=lambda x: x.get('r_factor', 0), reverse=True)
        orb15 = sorted(bucket.get('orb15', {}).values(), key=lambda x: x.get('r_factor', 0), reverse=True)
        return {'orb5': list(orb5), 'orb15': list(orb15)}

def save_signals(country, screener_id, results):
    today = _today()
    with lock:
        data = _load()
        if country not in data:
            data[country] = {}
        if screener_id not in data[country]:
            data[country][screener_id] = {'date': today, 'signals': {}}

        bucket = data[country][screener_id]
        if bucket.get('date') != today:
            bucket['date']    = today
            bucket['signals'] = {}

        for item in results:
            symbol    = item.get('symbol', '')
            timeframe = item.get('timeframe', '')
            key       = symbol + ':' + timeframe

            if key in bucket['signals']:
                item['detected_at'] = bucket['signals'][key]['detected_at']
            else:
                item['detected_at'] = _now_str(country)

            bucket['signals'][key] = item

        _save_file(data)

def get_signals(country, screener_id):
    today = _today()
    with lock:
        data   = _load()
        bucket = data.get(country, {}).get(screener_id, {})
        if bucket.get('date') != today:
            return []
        return list(bucket.get('signals', {}).values())