from screeners.base import get_sectors, fetch_daily, base_stock_info

SCREENER_ID = 'sector_scope'

def run(country='PL'):
    sectors = get_sectors(country)
    results = {}

    for sector_name, symbols in sectors.items():
        sector_stocks = []
        total_pct     = 0
        count         = 0

        for symbol in symbols:
            try:
                hist, info = fetch_daily(symbol, period='5d')
                if hist is None or len(hist) < 2:
                    continue
                base = base_stock_info(symbol, hist, info)
                if not base:
                    continue
                sector_stocks.append({**base, 'country': country, 'sector': sector_name})
                total_pct += base['percent_change']
                count     += 1
            except Exception as e:
                print(f"  [sector_scope] error {symbol}: {e}")

        if count > 0:
            avg_change  = round(total_pct / count, 2)
            up_stocks   = [s for s in sector_stocks if s['percent_change'] >= 0]
            down_stocks = [s for s in sector_stocks if s['percent_change'] < 0]
            results[sector_name] = {
                'name':        sector_name,
                'avg_change':  avg_change,
                'stock_count': count,
                'up_count':    len(up_stocks),
                'down_count':  len(down_stocks),
                'stocks':      sorted(sector_stocks, key=lambda x: x['percent_change'], reverse=True),
            }

    sorted_results = dict(sorted(results.items(), key=lambda x: x[1]['avg_change'], reverse=True))
    print(f"  [sector_scope][{country}] {len(sorted_results)} sectors")
    return sorted_results