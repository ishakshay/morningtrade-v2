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
from screeners.nse_options import run as fetch_options, get_pcr_history
from screeners.nse_market import get_market_overview

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])
sock = Sock(app)

SCREENERS       = [intraday_booster, nr7, top_movers, momentum_spike, sector_scope]
COUNTRIES       = list(SYMBOLS.keys())
_options_cache  = {}
_market_cache   = {}

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
    symbols = ['NIFTY', 'BANKNIFTY', 'SENSEX']
    while True:
        print("\n--- Refreshing options ---")
        for symbol in symbols:
            try:
                result = fetch_options(symbol)
                if result:
                    _options_cache[symbol] = result
                    print(f"  [options] {symbol} done — PCR: {result.get('pcr_total')}")
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
    if symbol not in ['NIFTY', 'BANKNIFTY', 'SENSEX']:
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

@app.route('/api/options/pcr-history')
def get_pcr_history_route():
    symbol = request.args.get('symbol', 'NIFTY').upper()
    return jsonify(sanitize(get_pcr_history(symbol)))

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
    app.run(port=3001, debug=False)