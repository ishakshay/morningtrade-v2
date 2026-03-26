from screeners.base import get_symbols, fetch_daily, fetch_intraday, base_stock_info, MARKET_HOURS_UTC
from datetime import datetime
import session_store

SCREENER_ID = 'intraday_booster'

def is_market_open(country):
    now = datetime.utcnow()
    if now.weekday() >= 5:
        return False
    hours = MARKET_HOURS_UTC.get(country, {'open': 8, 'close': 16})
    return hours['open'] <= now.hour < hours['close']

def run(country='PL'):
    results_5min  = []
    results_15min = []
    symbols       = get_symbols(country)

    if not is_market_open(country):
        print(f"  [intraday_booster] market closed for {country}, returning stored")
        return session_store.get_orb(country)

    for symbol in symbols:
        try:
            hist, info = fetch_daily(symbol)
            if hist is None or len(hist) < 2:
                continue
            base = base_stock_info(symbol, hist, info)
            if not base:
                continue
            intraday = fetch_intraday(symbol)
            if intraday is None or len(intraday) < 1:
                continue

            avg_volume     = base['avg_volume_50']
            current_price  = float(intraday.iloc[-1]['Close'])
            open_price     = float(intraday.iloc[0]['Open'])
            current_volume = int(intraday['Volume'].sum())
            r_factor       = round(current_volume / avg_volume, 2) if avg_volume > 0 else 0
            vol_ok         = r_factor >= 1.5

            orb5_high  = float(intraday.iloc[0]['High'])
            orb5_low   = float(intraday.iloc[0]['Low'])
            orb15_high = float(intraday.iloc[:3]['High'].max()) if len(intraday) >= 3 else None
            orb15_low  = float(intraday.iloc[:3]['Low'].min())  if len(intraday) >= 3 else None

            if not vol_ok:
                continue

            orb5_bull = current_price > orb5_high
            orb5_bear = current_price < orb5_low

            if orb5_bull or orb5_bear:
                direction = 'bullish' if orb5_bull else 'bearish'
                results_5min.append({
                    **base,
                    'screener':       SCREENER_ID,
                    'country':        country,
                    'direction':      direction,
                    'orb_high':       round(orb5_high, 2),
                    'orb_low':        round(orb5_low, 2),
                    'current_price':  round(current_price, 2),
                    'open_price':     round(open_price, 2),
                    'current_volume': current_volume,
                    'r_factor':       r_factor,
                    'timeframe':      '5min',
                })

            if orb15_high and orb15_low:
                orb15_bull = current_price > orb15_high
                orb15_bear = current_price < orb15_low
                if orb15_bull or orb15_bear:
                    direction = 'bullish' if orb15_bull else 'bearish'
                    results_15min.append({
                        **base,
                        'screener':       SCREENER_ID,
                        'country':        country,
                        'direction':      direction,
                        'orb_high':       round(orb15_high, 2),
                        'orb_low':        round(orb15_low, 2),
                        'current_price':  round(current_price, 2),
                        'open_price':     round(open_price, 2),
                        'current_volume': current_volume,
                        'r_factor':       r_factor,
                        'timeframe':      '15min',
                    })

        except Exception as e:
            print(f"  [intraday_booster] error {symbol}: {e}")

    session_store.save_orb(country, results_5min, results_15min)
    result = session_store.get_orb(country)
    print(f"  [intraday_booster][{country}] 5min:{len(result['orb5'])} 15min:{len(result['orb15'])}")
    return result