from screeners.base import get_symbols, fetch_daily, base_stock_info

SCREENER_ID = 'top_movers'
TOP_N = 5

def run(country='PL'):
    all_stocks = []
    symbols    = get_symbols(country)

    for symbol in symbols:
        try:
            hist, info = fetch_daily(symbol, period='5d')
            if hist is None or len(hist) < 2:
                continue
            base = base_stock_info(symbol, hist, info)
            if not base:
                continue
            all_stocks.append({**base, 'screener': SCREENER_ID, 'country': country})
        except Exception as e:
            print(f"  [top_movers] error {symbol}: {e}")

    sorted_stocks = sorted(all_stocks, key=lambda x: x['percent_change'], reverse=True)
    gainers = sorted_stocks[:TOP_N]
    losers  = sorted_stocks[-TOP_N:][::-1]

    for s in gainers:
        s['direction'] = 'bullish'
    for s in losers:
        s['direction'] = 'bearish'

    print(f"  [top_movers][{country}] {len(gainers)} gainers, {len(losers)} losers")
    return {'gainers': gainers, 'losers': losers}