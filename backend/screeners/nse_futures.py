from jugaad_data.nse import NSELive
from datetime import datetime, date
import math

_nse    = None
_latest = {}

def get_nse():
    global _nse
    if _nse is None:
        _nse = NSELive()
    return _nse

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

def update_latest(symbol, payload):
    _latest[symbol] = payload

def get_latest(symbol):
    return _latest.get(symbol)

def poll_futures_sentiment(symbol):
    nse = get_nse()
    try:
        index_name = 'NIFTY 50' if symbol == 'NIFTY' else 'NIFTY BANK'
        spot_data  = nse.live_index(index_name)
        spot_meta  = spot_data.get('metadata', {})
        spot_price = safe_float(spot_meta.get('last', 0))

        futures_symbol = 'NIFTYFUT' if symbol == 'NIFTY' else 'BANKNIFTYFUT'
        try:
            fut_data = nse.live_quote(futures_symbol)
            fut_meta = fut_data.get('metadata', {}) if isinstance(fut_data, dict) else {}
            fut_ltp  = safe_float(fut_meta.get('lastPrice', spot_price))
            fut_oi   = safe_int(fut_meta.get('openInterest', 0))
            fut_vol  = safe_int(fut_meta.get('totalTradedVolume', 0))
            fut_chg  = safe_float(fut_meta.get('change', 0))
            fut_pct  = safe_float(fut_meta.get('pChange', 0))
        except Exception as e:
            print(f"  [nse_futures] quote fallback {symbol}: {e}")
            fut_ltp = spot_price
            fut_oi  = 0
            fut_vol = 0
            fut_chg = 0
            fut_pct = 0

        basis = round(fut_ltp - spot_price, 2)

        prev = _latest.get(symbol, {})
        prev_ltp = prev.get('fut_ltp', fut_ltp)
        prev_oi  = prev.get('fut_oi',  fut_oi)

        price_up = fut_ltp >= prev_ltp
        oi_up    = fut_oi  >= prev_oi

        if price_up and oi_up:
            signal = 'Long Buildup'
        elif not price_up and oi_up:
            signal = 'Short Buildup'
        elif price_up and not oi_up:
            signal = 'Short Covering'
        else:
            signal = 'Long Unwinding'

        confidence = min(100, abs(fut_pct) * 20 + (50 if fut_vol > 100000 else 20))

        return {
            'symbol':     symbol,
            'spot_price': round(spot_price, 2),
            'fut_ltp':    round(fut_ltp, 2),
            'fut_oi':     fut_oi,
            'fut_vol':    fut_vol,
            'fut_chg':    round(fut_chg, 2),
            'fut_pct':    round(fut_pct, 2),
            'basis':      basis,
            'signal':     signal,
            'confidence': round(confidence, 1),
            'timestamp':  datetime.now().strftime('%H:%M:%S'),
        }

    except Exception as e:
        print(f"  [nse_futures] poll error {symbol}: {e}")
        global _nse
        _nse = None
        return None
