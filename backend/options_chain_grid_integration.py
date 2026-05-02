# Options Chain Grid Integration for MorningTrade

from flask import jsonify, request
from datetime import datetime, timezone, timedelta

# Storage for grid snapshots
_grid_snapshots = {
    'NIFTY': {'CE': [], 'PE': []},
    'BANKNIFTY': {'CE': [], 'PE': []}
}

MAX_SNAPSHOTS = 180

def sanitize(data):
    return data

def get_atm_strike(symbol, current_price):
    step = 50 if symbol == 'NIFTY' else 100
    return round(current_price / step) * step

def store_grid_snapshot(symbol, options_data):
    try:
        ist = timezone(timedelta(hours=5, minutes=30))
        timestamp = datetime.now(ist)
        
        if not options_data:
            return
        
        full_chain = options_data.get('full_chain', [])
        spot_price = options_data.get('spot_price', 0)
        atm_strike = options_data.get('atm_strike', 0)
        
        if not full_chain:
            print(f"  [grid] {symbol} - no full_chain data")
            return
        
        snapshot = {
            'timestamp': timestamp.isoformat(),
            'spot_price': spot_price,
            'atm_strike': atm_strike,
            'chain': full_chain
        }
        
        for option_type in ['CE', 'PE']:
            _grid_snapshots[symbol][option_type].append(snapshot)
            
            if len(_grid_snapshots[symbol][option_type]) > MAX_SNAPSHOTS:
                _grid_snapshots[symbol][option_type].pop(0)
        
        print(f"  [grid] {symbol} snapshot stored - {len(_grid_snapshots[symbol]['CE'])} total")
        return True
        
    except Exception as e:
        print(f"  [grid] {symbol} snapshot failed: {e}")
        return False

def get_filtered_snapshots(symbol, option_type, interval_minutes):
    try:
        all_snapshots = _grid_snapshots[symbol][option_type]
        
        if not all_snapshots:
            return []
        
        if interval_minutes == 3:
            return all_snapshots
        
        filtered = []
        last_timestamp = None
        
        for snapshot in all_snapshots:
            snapshot_time = datetime.fromisoformat(snapshot['timestamp'])
            
            if last_timestamp is None:
                filtered.append(snapshot)
                last_timestamp = snapshot_time
            else:
                time_diff = (snapshot_time - last_timestamp).total_seconds() / 60
                if time_diff >= interval_minutes:
                    filtered.append(snapshot)
                    last_timestamp = snapshot_time
        
        return filtered
        
    except Exception as e:
        print(f"  [grid] Error filtering snapshots: {e}")
        return []

def build_grid_data(snapshots, atm_strike, strike_range, data_type, option_type, symbol):
    try:
        step = 50 if symbol == 'NIFTY' else 100
        
        strikes = []
        for i in range(-strike_range, strike_range + 1):
            strikes.append(atm_strike + (i * step))
        
        grid_data = []
        timestamps = []
        
        for snapshot in snapshots:
            timestamps.append(snapshot['timestamp'])
        
        for strike in strikes:
            strike_row = []
            
            for snapshot in snapshots:
                chain = snapshot.get('chain', [])
                
                value = None
                for record in chain:
                    if record.get('strike') == strike:
                        if option_type == 'CE':
                            if data_type == 'OI':
                                value = record.get('ce_oi', 0)
                            elif data_type == 'OI Change':
                                value = record.get('ce_chg_oi', 0)
                            elif data_type == 'Volume':
                                value = record.get('ce_vol', 0)
                        else:
                            if data_type == 'OI':
                                value = record.get('pe_oi', 0)
                            elif data_type == 'OI Change':
                                value = record.get('pe_chg_oi', 0)
                            elif data_type == 'Volume':
                                value = record.get('pe_vol', 0)
                        break
                
                strike_row.append(value if value is not None else 0)
            
            grid_data.append(strike_row)
        
        return {
            'strikes': strikes,
            'timestamps': timestamps,
            'grid_data': grid_data
        }
        
    except Exception as e:
        print(f"  [grid] Error building grid data: {e}")
        import traceback
        traceback.print_exc()
        return {
            'strikes': [],
            'timestamps': [],
            'grid_data': []
        }

def get_options_chain_grid():
    try:
        symbol = request.args.get('symbol', 'NIFTY')
        interval = int(request.args.get('interval', 3))
        data_type = request.args.get('data_type', 'OI')
        option_type = request.args.get('option_type', 'CE')
        strike_range = int(request.args.get('strike_range', 10))
        
        snapshots = get_filtered_snapshots(symbol, option_type, interval)
        
        if not snapshots:
            return jsonify(sanitize({
                'success': False,
                'message': f'No snapshot data available yet. Current count: {len(_grid_snapshots[symbol][option_type])}',
                'atm_strike': None,
                'strikes': [],
                'timestamps': [],
                'grid_data': [],
                'last_update': None
            }))
        
        latest_snapshot = snapshots[-1]
        atm_strike = latest_snapshot.get('atm_strike', 0)
        spot_price = latest_snapshot.get('spot_price', 0)
        
        grid_result = build_grid_data(snapshots, atm_strike, strike_range, data_type, option_type, symbol)
        
        ist = timezone(timedelta(hours=5, minutes=30))
        
        return jsonify(sanitize({
            'success': True,
            'symbol': symbol,
            'option_type': option_type,
            'data_type': data_type,
            'interval': interval,
            'atm_strike': atm_strike,
            'spot_price': spot_price,
            'strikes': grid_result['strikes'],
            'timestamps': grid_result['timestamps'],
            'grid_data': grid_result['grid_data'],
            'last_update': datetime.now(ist).strftime('%Y-%m-%d %H:%M:%S'),
            'total_snapshots': len(snapshots)
        }))
        
    except Exception as e:
        print(f"  [grid] API error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify(sanitize({
            'success': False,
            'error': str(e),
            'strikes': [],
            'timestamps': [],
            'grid_data': []
        })), 500

def get_grid_info():
    try:
        info = {}
        for symbol in _grid_snapshots:
            info[symbol] = {}
            for option_type in _grid_snapshots[symbol]:
                snapshots = _grid_snapshots[symbol][option_type]
                info[symbol][option_type] = {
                    'count': len(snapshots),
                    'oldest': snapshots[0]['timestamp'] if snapshots else None,
                    'newest': snapshots[-1]['timestamp'] if snapshots else None
                }
        
        return jsonify(sanitize({
            'success': True,
            'snapshots_info': info,
            'max_snapshots': MAX_SNAPSHOTS
        }))
        
    except Exception as e:
        print(f"  [grid] Info error: {e}")
        return jsonify(sanitize({
            'success': False,
            'error': str(e)
        })), 500

def init_grid_routes(app):
    app.route('/api/options-chain-grid', methods=['GET'])(get_options_chain_grid)
    app.route('/api/grid-snapshots-info', methods=['GET'])(get_grid_info)
    print("  [grid] Routes registered: /api/options-chain-grid, /api/grid-snapshots-info")