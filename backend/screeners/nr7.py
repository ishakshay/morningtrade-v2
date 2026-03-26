from screeners.base import get_symbols, fetch_daily, base_stock_info

SCREENER_ID = 'nr7'

def run(country='PL'):
    results = []
    symbols = get_symbols(country)

    for symbol in symbols:
        try:
            hist, info = fetch_daily(symbol, period='30d')
            if hist is None or len(hist) < 7:
                continue
            base = base_stock_info(symbol, hist, info)
            if not base:
                continue

            ranges       = hist['High'] - hist['Low']
            today_range  = float(ranges.iloc[-1])
            prior_ranges = ranges.iloc[-7:-1]

            if today_range >= float(prior_ranges.min()):
                continue

            open_today  = float(hist['Open'].iloc[-1])
            close_today = float(hist['Close'].iloc[-1])
            direction   = 'bullish' if close_today > open_today else 'bearish'

            results.append({
                **base,
                'screener':    SCREENER_ID,
                'country':     country,
                'direction':   direction,
                'nr7_range':   round(today_range, 2),
                'prior_min':   round(float(prior_ranges.min()), 2),
                'open_today':  round(open_today, 2),
                'close_today': round(close_today, 2),
            })
        except Exception as e:
            print(f"  [nr7] error {symbol}: {e}")

    print(f"  [nr7][{country}] {len(results)} stocks qualify")
    return results