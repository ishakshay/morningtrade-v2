from datetime import datetime, timezone, timedelta

SCREENER_ID = 'market_session'

SESSIONS = {
    'PL': {
        'name':       'Poland',
        'exchange':   'Warsaw Stock Exchange (GPW)',
        'index':      'WIG30',
        'timezone':   'CET/CEST',
        'utc_offset': 1,
        'dst_offset': 1,
        'open_utc':   8,
        'close_utc':  16,
        'open_local':  '09:00',
        'close_local': '17:00',
        'currency':   'PLN',
        'flag':       '🇵🇱',
    },
    'DE': {
        'name':       'Germany',
        'exchange':   'XETRA (Frankfurt)',
        'index':      'DAX30',
        'timezone':   'CET/CEST',
        'utc_offset': 1,
        'dst_offset': 1,
        'open_utc':   7,
        'close_utc':  17,
        'open_local':  '08:00',
        'close_local': '18:00',
        'currency':   'EUR',
        'flag':       '🇩🇪',
    },
    'IN': {
        'name':       'India',
        'exchange':   'National Stock Exchange (NSE)',
        'index':      'Nifty 50',
        'timezone':   'IST',
        'utc_offset': 5,
        'dst_offset': 0,
        'open_utc':   3,
        'close_utc':  10,
        'open_local':  '09:15',
        'close_local': '15:30',
        'currency':   'INR',
        'flag':       '🇮🇳',
    },
}

def get_local_time(utc_offset, dst_offset):
    offset = timedelta(hours=utc_offset + dst_offset)
    tz     = timezone(offset)
    return datetime.now(tz).strftime('%H:%M')

def get_session_status(country):
    session = SESSIONS.get(country)
    if not session:
        return None

    now     = datetime.utcnow()
    is_wknd = now.weekday() >= 5
    hour    = now.hour + now.minute / 60

    is_open    = not is_wknd and session['open_utc'] <= hour < session['close_utc']
    local_time = get_local_time(session['utc_offset'], session['dst_offset'])

    minutes_to_open  = None
    minutes_to_close = None

    if not is_wknd:
        if is_open:
            mins = (session['close_utc'] - hour) * 60
            minutes_to_close = int(mins)
        else:
            if hour < session['open_utc']:
                mins = (session['open_utc'] - hour) * 60
                minutes_to_open = int(mins)

    return {
        **session,
        'is_open':           is_open,
        'is_weekend':        is_wknd,
        'local_time':        local_time,
        'minutes_to_open':   minutes_to_open,
        'minutes_to_close':  minutes_to_close,
    }

def run(country='PL'):
    results = {}
    for code in SESSIONS:
        results[code] = get_session_status(code)
    return results