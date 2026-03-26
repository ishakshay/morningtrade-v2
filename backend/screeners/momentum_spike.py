from screeners.base import get_symbols, fetch_daily, fetch_intraday, base_stock_info, MARKET_HOURS_UTC
from datetime import datetime
import session_store

SCREENER_ID = 'momentum_spike'

def is_market_open(country):
    now = datetime.utcnow()
    if now.weekday() >= 5:
        return False
    hours = MARKET_HOURS_UTC.get(country, {'open': 8, 'close': 16})
    return hours['open'] <= now.hour < hours['close']

def format_candle_time(timestamp):
    try:
        if hasattr(timestamp, 'strftime'):
            return timestamp.strftime('%H:%M')
        return str(timestamp)
    except:
        return '--'

def detect_5min_spike(df):
    if df is None or len(df) < 12:
        return None
    recent  = df.iloc[-11:-1]
    current = df.iloc[-1]
    bodies       = (recent['Close'] - recent['Open']).abs()
    avg_body     = float(bodies.mean())
    avg_volume   = float(recent['Volume'].mean())
    curr_body    = abs(float(current['Close']) - float(current['Open']))
    curr_volume  = float(current['Volume'])
    curr_high    = float(current['High'])
    curr_low     = float(current['Low'])
    curr_close   = float(current['Close'])
    curr_open    = float(current['Open'])
    candle_range = curr_high - curr_low
    if avg_body == 0 or candle_range == 0:
        return None
    body_ratio   = curr_body / avg_body
    close_ratio  = (curr_close - curr_low) / candle_range
    volume_ratio = curr_volume / avg_volume if avg_volume > 0 else 0
    if not (body_ratio >= 2.0 and close_ratio >= 0.75 and volume_ratio >= 1.5):
        return None
    return {
        'timeframe':    '5min',
        'candle_time':  format_candle_time(df.index[-1]),
        'direction':    'bullish' if curr_close > curr_open else 'bearish',
        'body_ratio':   round(body_ratio, 2),
        'volume_ratio': round(volume_ratio, 2),
        'close_ratio':  round(close_ratio, 2),
        'candle_open':  round(curr_open, 2),
        'candle_close': round(curr_close, 2),
        'candle_high':  round(curr_high, 2),
        'candle_low':   round(curr_low, 2),
    }

def detect_10min_spike(df):
    if df is None or len(df) < 22:
        return None
    candles_10 = []
    for i in range(0, len(df) - 1, 2):
        c1 = df.iloc[i]
        c2 = df.iloc[i + 1]
        candles_10.append({
            'open':      float(c1['Open']),
            'close':     float(c2['Close']),
            'high':      max(float(c1['High']), float(c2['High'])),
            'low':       min(float(c1['Low']),  float(c2['Low'])),
            'volume':    float(c1['Volume']) + float(c2['Volume']),
            'timestamp': df.index[i + 1],
        })
    if len(candles_10) < 12:
        return None
    recent  = candles_10[-11:-1]
    current = candles_10[-1]
    bodies     = [abs(c['close'] - c['open']) for c in recent]
    volumes    = [c['volume'] for c in recent]
    avg_body   = sum(bodies) / len(bodies) if bodies else 0
    avg_volume = sum(volumes) / len(volumes) if volumes else 0
    curr_body    = abs(current['close'] - current['open'])
    candle_range = current['high'] - current['low']
    if avg_body == 0 or candle_range == 0:
        return None
    body_ratio   = curr_body / avg_body
    close_ratio  = (current['close'] - current['low']) / candle_range
    volume_ratio = current['volume'] / avg_volume if avg_volume > 0 else 0
    if not (body_ratio >= 1.75 and close_ratio >= 0.70 and volume_ratio >= 1.5):
        return None
    return {
        'timeframe':    '10min',
        'candle_time':  format_candle_time(current['timestamp']),
        'direction':    'bullish' if current['close'] > current['open'] else 'bearish',
        'body_ratio':   round(body_ratio, 2),
        'volume_ratio': round(volume_ratio, 2),
        'close_ratio':  round(close_ratio, 2),
        'candle_open':  round(current['open'], 2),
        'candle_close': round(current['close'], 2),
        'candle_high':  round(current['high'], 2),
        'candle_low':   round(current['low'], 2),
    }

def run(country='PL'):
    new_5min  = []
    new_10min = []
    symbols   = get_symbols(country)

    if not is_market_open(country):
        print(f"  [momentum_spike] market closed for {country}, returning stored")
        return {
            'spikes_5min':  session_store.get_signals(country, 'spike_5min'),
            'spikes_10min': session_store.get_signals(country, 'spike_10min'),
        }

    for symbol in symbols:
        try:
            hist, info = fetch_daily(symbol)
            if hist is None or len(hist) < 2:
                continue
            base = base_stock_info(symbol, hist, info)
            if not base:
                continue
            intraday = fetch_intraday(symbol)
            if intraday is None or len(intraday) < 12:
                continue

            spike5 = detect_5min_spike(intraday)
            if spike5:
                new_5min.append({
                    **base,
                    'screener':  SCREENER_ID,
                    'country':   country,
                    'direction': spike5['direction'],
                    'spike':     spike5,
                    'timeframe': '5min',
                })

            spike10 = detect_10min_spike(intraday)
            if spike10:
                new_10min.append({
                    **base,
                    'screener':  SCREENER_ID,
                    'country':   country,
                    'direction': spike10['direction'],
                    'spike':     spike10,
                    'timeframe': '10min',
                })

        except Exception as e:
            print(f"  [momentum_spike] error {symbol}: {e}")

    session_store.save_signals(country, 'spike_5min',  new_5min)
    session_store.save_signals(country, 'spike_10min', new_10min)

    result = {
        'spikes_5min':  session_store.get_signals(country, 'spike_5min'),
        'spikes_10min': session_store.get_signals(country, 'spike_10min'),
    }
    print(f"  [momentum_spike][{country}] 5min:{len(result['spikes_5min'])} 10min:{len(result['spikes_10min'])}")
    return result