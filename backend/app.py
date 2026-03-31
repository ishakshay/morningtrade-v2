from dotenv import load_dotenv
load_dotenv()


from flask import Flask, jsonify, request, redirect
from flask_cors import CORS
from flask_sock import Sock
import threading
import json
import time
import math
import cache

from screeners import intraday_booster, nr7, top_movers, momentum_spike, indices, sector_scope
from screeners.base import SYMBOLS, COUNTRY_LABELS
from screeners.market_session import run as get_all_sessions
from screeners.nse_options import fetch_option_chain as fetch_options, get_pcr_history, get_full_chain
from screeners.nse_futures_dashboard import fetch_dashboard as fetch_futures_dashboard
from screeners.nse_market import get_market_overview
from screeners.news_feed import fetch_all_feeds, get_cached_news, get_nse_announcements
from screeners.nse_futures import poll_futures_sentiment, update_latest, get_latest
from screeners.nse_gamma import compute_gamma_blast

_news_items_cache = {'data': [], 'ts': 0}
NEWS_CACHE_TTL    = 300  # 5 minutes

def refresh_news():
    while True:
        try:
            print("\n--- Refreshing news ---")
            items    = fetch_all_feeds()
            nse_ann  = get_nse_announcements()
            all_news = (nse_ann + items)[:50]
            global _news_items_cache
            _news_items_cache = {'data': all_news, 'ts': time.time()}
            print(f"  [news] {len(all_news)} items fetched")
        except Exception as e:
            print(f"  [news] refresh error: {e}")
        time.sleep(300)

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

@app.route('/api/news')
def get_news():
    region = request.args.get('region', 'ALL')

    if time.time() - _news_items_cache['ts'] < NEWS_CACHE_TTL and _news_items_cache['data']:
        all_news = list(_news_items_cache['data'])
    else:
        items    = fetch_all_feeds()
        nse      = get_nse_announcements()
        all_news = (nse + items)[:80]

    if region != 'ALL':
        all_news = [n for n in all_news if n.get('region') == region]

    return jsonify(sanitize(all_news))


sock = Sock(app)

SCREENERS      = [intraday_booster, nr7, top_movers, momentum_spike, sector_scope]
COUNTRIES      = list(SYMBOLS.keys())
_options_cache    = {}
_market_cache     = {}
_gamma_cache      = {}
_prev_pcr_3strike = {}

def sanitize(obj):
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return 0
        return obj
    if isinstance(obj, dict):
        return {k: sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize(i) for i in obj]
    return obj

def safe_json(data):
    return json.dumps(sanitize(data))

def refresh_futures():
    symbols = ['NIFTY', 'BANKNIFTY']
    while True:
        print("\n--- Refreshing futures sentiment ---")
        for symbol in symbols:
            try:
                payload = poll_futures_sentiment(symbol)
                if payload:
                    update_latest(symbol, payload)
                    print(f"  [futures] {symbol} signal:{payload['signal']} conf:{payload['confidence']} basis:{payload['basis']}")
            except Exception as e:
                print(f"  [futures] {symbol} failed: {e}")
        time.sleep(60)

def refresh_futures_dashboard():
    symbols = ['NIFTY', 'BANKNIFTY']
    while True:
        for symbol in symbols:
            try:
                options_data = _options_cache.get(symbol)
                fetch_futures_dashboard(symbol, options_data)
            except Exception as e:
                print(f"  [futures_dashboard] {symbol} failed: {e}")
        time.sleep(180)

def refresh_market_overview():
    while True:
        print("\n--- Refreshing market overview ---")
        try:
            result = get_market_overview()
            if result:
                _market_cache.update(result)
        except Exception as e:
            print(f"  [market_overview] failed: {e}")
        time.sleep(180)

def refresh_options():
    symbols = ['NIFTY', 'BANKNIFTY']
    while True:
        print("\n--- Refreshing options ---")
        for symbol in symbols:
            try:
                result = fetch_options(symbol)
                if result:
                    _options_cache[symbol] = result
                    print(f"  [options] {symbol} done — PCR: {result.get('pcr_total')}")
                    try:
                        fut_payload = get_latest(symbol)
                        prev_pcr    = _prev_pcr_3strike.get(symbol)
                        gamma       = compute_gamma_blast(result, fut_payload, prev_pcr)
                        if gamma:
                            _gamma_cache[symbol]      = gamma
                            _prev_pcr_3strike[symbol] = result.get('pcr_3strike', 0)
                            print(f"  [gamma] {symbol} rating:{gamma['rating']} score:{gamma['score']} dir:{gamma['direction']}")
                    except Exception as e:
                        print(f"  [gamma] {symbol} failed: {e}")
            except Exception as e:
                print(f"  [options] {symbol} failed: {e}")
        time.sleep(180)

def refresh_indices():
    while True:
        print("\n--- Refreshing indices ---")
        try:
            result  = indices.run()
            cache.update_indices(result)
            payload = safe_json({'type': 'indices', 'data': result})
            cache.broadcast(payload)
            print(f"--- Indices done: {len(result)} ---")
        except Exception as e:
            print(f"  [indices] failed: {e}")
        time.sleep(60)

def refresh_stocks():
    from screeners.base import fetch_daily, base_stock_info, get_symbols
    from screeners.nse_stocks import get_nifty50_stocks
    while True:
        for country in COUNTRIES:
            print(f"\n--- Refreshing stocks [{country}] ---")
            if country == 'IN':
                try:
                    results = get_nifty50_stocks()
                    cache.update_stocks('IN', results)
                    print(f"--- NSE stocks done: {len(results)} ---")
                except Exception as e:
                    print(f"  [stocks] NSE error: {e}")
            else:
                results = []
                for symbol in get_symbols(country):
                    try:
                        hist, info = fetch_daily(symbol)
                        if hist is not None and len(hist) >= 2:
                            base = base_stock_info(symbol, hist, info)
                            if base:
                                base['country'] = country
                                results.append(base)
                    except Exception as e:
                        print(f"  [stocks] error {symbol}: {e}")
                cache.update_stocks(country, results)
                print(f"--- Stocks done [{country}]: {len(results)} ---")
        time.sleep(180)

def refresh_loop():
    while True:
        for country in COUNTRIES:
            print(f"\n--- Running screeners [{country}] ---")
            all_results = {}
            for screener in SCREENERS:
                try:
                    print(f"  Running {screener.SCREENER_ID}...")
                    results = screener.run(country=country)
                    all_results[screener.SCREENER_ID] = results
                except Exception as e:
                    print(f"  [app] {screener.SCREENER_ID} failed: {e}")
                    all_results[screener.SCREENER_ID] = []
            cache.update(country, all_results)
            payload = safe_json({
                'type':    'update',
                'country': country,
                'data':    all_results,
            })
            cache.broadcast(payload)
            print(f"--- Screeners done [{country}] ---")
        print("Sleeping 60s...")
        time.sleep(60)

@app.route('/api/indices')
def get_indices():
    return jsonify(sanitize(cache.get_indices()))

@app.route('/api/stocks')
def get_stocks():
    country = request.args.get('country', 'PL')
    return jsonify(sanitize(cache.get_stocks(country)))

@app.route('/api/stocks/wig30')
def get_wig30():
    return jsonify(sanitize(cache.get_stocks('PL')))

@app.route('/api/screeners')
def get_screeners():
    country = request.args.get('country', 'PL')
    return jsonify(sanitize(cache.get(country)))

@app.route('/api/sector-scope')
def get_sector_scope():
    country = request.args.get('country', 'PL')
    data    = cache.get(country)
    return jsonify(sanitize(data.get('sector_scope', {})))

@app.route('/api/sessions')
def get_sessions():
    return jsonify(sanitize(get_all_sessions()))

@app.route('/api/market-overview')
def get_market_overview_route():
    if not _market_cache:
        try:
            result = get_market_overview()
            _market_cache.update(result)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    return jsonify(sanitize(_market_cache))

@app.route('/api/options')
def get_options():
    symbol = request.args.get('symbol', 'NIFTY').upper()
    if symbol not in ['NIFTY', 'BANKNIFTY']:
        return jsonify({'error': 'Invalid symbol'}), 400
    data = _options_cache.get(symbol)
    if not data:
        try:
            data = fetch_options(symbol)
            if data:
                _options_cache[symbol] = data
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    return jsonify(sanitize(data or {}))

@app.route('/api/option-chain')
def get_option_chain_full():
    symbol = request.args.get('symbol', 'NIFTY').upper()
    if symbol not in ['NIFTY', 'BANKNIFTY']:
        return jsonify({'error': 'Invalid symbol'}), 400
    data = get_full_chain(symbol)
    if not data:
        try:
            result = fetch_options(symbol)
            if result:
                _options_cache[symbol] = result
                data = get_full_chain(symbol)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    return jsonify(sanitize(data or {}))

@app.route('/api/gamma-blast')
def get_gamma_blast():
    symbol = request.args.get('symbol', 'NIFTY').upper()
    if symbol not in ['NIFTY', 'BANKNIFTY']:
        return jsonify({'error': 'Invalid symbol'}), 400
    data = _gamma_cache.get(symbol)
    if not data:
        options = _options_cache.get(symbol)
        if options:
            try:
                fut  = get_latest(symbol)
                data = compute_gamma_blast(options, fut, _prev_pcr_3strike.get(symbol))
                if data:
                    _gamma_cache[symbol] = data
            except Exception as e:
                return jsonify({'error': str(e)}), 500
    return jsonify(sanitize(data or {}))

@app.route('/api/futures-sentiment')
def get_futures_sentiment():
    symbol = request.args.get('symbol', 'NIFTY').upper()
    if symbol not in ['NIFTY', 'BANKNIFTY']:
        return jsonify({'error': 'Invalid symbol'}), 400
    data = get_latest(symbol)
    if not data:
        try:
            data = poll_futures_sentiment(symbol)
            if data:
                update_latest(symbol, data)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    return jsonify(sanitize(data or {}))

@app.route('/api/options/pcr-history')
def get_pcr_history_route():
    symbol = request.args.get('symbol', 'NIFTY').upper()
    return jsonify(sanitize(get_pcr_history(symbol)))

@app.route('/api/futures-dashboard')
def get_futures_dashboard():
    symbol = request.args.get('symbol', 'NIFTY').upper()
    if symbol not in ['NIFTY', 'BANKNIFTY']:
        return jsonify({'error': 'Invalid symbol'}), 400
    options_data = _options_cache.get(symbol)
    result = fetch_futures_dashboard(symbol, options_data)
    return jsonify(sanitize(result or {}))

@app.route('/api/countries')
def get_countries():
    return jsonify([
        {'code': code, 'label': COUNTRY_LABELS[code]}
        for code in COUNTRIES
    ])

@sock.route('/ws')
def websocket(ws):
    cache.add_client(ws)
    print(f"Client connected")
    all_data = cache.get()
    for country, data in all_data.items():
        if data:
            ws.send(safe_json({
                'type':    'update',
                'country': country,
                'data':    data,
            }))
    idx_data = cache.get_indices()
    if idx_data:
        ws.send(safe_json({'type': 'indices', 'data': idx_data}))
    try:
        while True:
            msg = ws.receive(timeout=30)
            if msg is None:
                break
    except Exception:
        pass
    finally:
        cache.remove_client(ws)
        print(f"Client disconnected")

if __name__ == '__main__':
    t1 = threading.Thread(target=refresh_stocks,          daemon=True)
    t1.start()
    t2 = threading.Thread(target=refresh_loop,            daemon=True)
    t2.start()
    t3 = threading.Thread(target=refresh_indices,         daemon=True)
    t3.start()
    t4 = threading.Thread(target=refresh_options,         daemon=True)
    t4.start()
    t5 = threading.Thread(target=refresh_market_overview, daemon=True)
    t5.start()
    t_futures = threading.Thread(target=refresh_futures,  daemon=True)
    t_futures.start()
    t_news = threading.Thread(target=refresh_news,        daemon=True)
    t_news.start()
    t_fd = threading.Thread(target=refresh_futures_dashboard, daemon=True)
    t_fd.start()
    app.run(port=3001, debug=False)