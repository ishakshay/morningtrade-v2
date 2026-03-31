from jugaad_data.nse import NSELive
from datetime import datetime, date
import math

_nse              = None
_intraday_history = {}
_vwap_state       = {}

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

def update_vwap(symbol, price, total_vol_today):
    global _vwap_state
    today = date.today().isoformat()
    if symbol not in _vwap_state or _vwap_state[symbol]['date'] != today:
        _vwap_state[symbol] = {'date': today, 'cum_pv': 0.0, 'cum_vol': 0, 'last_vol': 0}
    state     = _vwap_state[symbol]
    vol_delta = total_vol_today - state['last_vol']
    if vol_delta > 0:
        state['cum_pv']  += price * vol_delta
        state['cum_vol'] += vol_delta
    state['last_vol'] = total_vol_today
    if state['cum_vol'] > 0:
        return round(state['cum_pv'] / state['cum_vol'], 2)
    return round(price, 2)

def save_intraday_snapshot(symbol, call_vol, put_vol, pcr, fut_ltp, fut_vwap, pcr_coi=0):
    global _intraday_history
    today   = date.today().isoformat()
    now_str = datetime.now().strftime('%H%M')
    if symbol not in _intraday_history:
        _intraday_history[symbol] = {'date': today, 'snapshots': []}
    if _intraday_history[symbol]['date'] != today:
        _intraday_history[symbol] = {'date': today, 'snapshots': []}
    diff = put_vol - call_vol
    if diff > 0 and pcr > 1.2:
        opt_signal = 'BUY'
    elif diff < 0 and pcr < 0.8:
        opt_signal = 'SELL'
    else:
        opt_signal = 'NEUTRAL'
    if fut_ltp and fut_vwap:
        if fut_ltp > fut_vwap:
            vwap_signal = 'BUY'
        elif fut_ltp < fut_vwap:
            vwap_signal = 'SELL'
        else:
            vwap_signal = 'NEUTRAL'
    else:
        vwap_signal = 'NEUTRAL'
    snap = {
        'time':        now_str,
        'call_vol':    call_vol,
        'put_vol':     put_vol,
        'diff':        diff,
        'pcr':         round(pcr, 2),
        'pcr_coi':     round(pcr_coi, 2) if pcr_coi else 0,
        'opt_signal':  opt_signal,
        'vwap':        fut_vwap,
        'price':       fut_ltp,
        'vwap_signal': vwap_signal,
    }
    snaps = _intraday_history[symbol]['snapshots']
    if snaps and snaps[-1]['time'] == now_str:
        snaps[-1] = snap
    else:
        snaps.append(snap)
    if len(snaps) > 100:
        _intraday_history[symbol]['snapshots'] = snaps[-100:]

def get_intraday_history(symbol):
    today = date.today().isoformat()
    if symbol not in _intraday_history:
        return []
    if _intraday_history[symbol]['date'] != today:
        return []
    return list(reversed(_intraday_history[symbol]['snapshots']))

def fetch_futures_data(symbol):
    nse = get_nse()
    try:
        index_name = 'NIFTY 50' if symbol == 'NIFTY' else 'NIFTY BANK'
        spot_data  = nse.live_index(index_name)
        spot_meta  = spot_data.get('metadata', {})
        spot_price = safe_float(spot_meta.get('last', 0))

        fut_ltp  = spot_price
        fut_high = safe_float(spot_meta.get('high', spot_price))
        fut_low  = safe_float(spot_meta.get('low', spot_price))
        fut_open = safe_float(spot_meta.get('open', spot_price))
        fut_vol  = 0
        fut_vwap = 0
        fut_chg  = safe_float(spot_meta.get('change', 0))
        fut_pct  = safe_float(spot_meta.get('percChange', 0))

        try:
            fno_data  = nse.stock_quote_fno(symbol)
            contracts = fno_data.get('data', [])
            fut_contract = None
            for c in contracts:
                if c.get('instrumentType') == 'FUTIDX':
                    fut_contract = c
                    break
            if fut_contract:
                fut_ltp  = safe_float(fut_contract.get('lastPrice',  fut_ltp))
                fut_high = safe_float(fut_contract.get('highPrice',  fut_high))
                fut_low  = safe_float(fut_contract.get('lowPrice',   fut_low))
                fut_open = safe_float(fut_contract.get('openPrice',  fut_open))
                fut_vol  = safe_int(fut_contract.get('totalTradedVolume', 0))
                turnover = safe_float(fut_contract.get('totalTurnover', 0))
                fut_chg  = safe_float(fut_contract.get('change',  fut_chg))
                fut_pct  = safe_float(fut_contract.get('pchange', fut_pct))
                lot_size = 65 if symbol == 'NIFTY' else 30
                if fut_vol > 0 and turnover > 0:
                    fut_vwap = round(turnover / (fut_vol * lot_size), 2)
        except Exception as e:
            print(f"  [futures_dashboard] stock_quote_fno failed for {symbol}: {e}")

        if fut_vwap == 0:
            fut_vwap = update_vwap(symbol, fut_ltp,
                                   safe_int(spot_meta.get('totalTradedVolume', 0)))

        fut_vs_vwap = round(fut_ltp - fut_vwap, 2)

        if fut_ltp > fut_vwap:
            fut_signal        = 'BUY'
            fut_signal_color  = '#4ade80'
            fut_signal_reason = 'Futures above VWAP - bullish intraday bias'
        elif fut_ltp < fut_vwap:
            fut_signal        = 'SELL'
            fut_signal_color  = '#f87171'
            fut_signal_reason = 'Futures below VWAP - bearish intraday bias'
        else:
            fut_signal        = 'NEUTRAL'
            fut_signal_color  = '#f59e0b'
            fut_signal_reason = 'Futures at VWAP - no clear bias'

        return {
            'spot_price':        round(spot_price, 2),
            'fut_ltp':           round(fut_ltp, 2),
            'fut_high':          round(fut_high, 2),
            'fut_low':           round(fut_low, 2),
            'fut_open':          round(fut_open, 2),
            'fut_vwap':          fut_vwap,
            'fut_vs_vwap':       fut_vs_vwap,
            'fut_vol':           fut_vol,
            'fut_oi':            0,
            'fut_chg':           round(fut_chg, 2),
            'fut_pct':           round(fut_pct, 2),
            'fut_signal':        fut_signal,
            'fut_signal_color':  fut_signal_color,
            'fut_signal_reason': fut_signal_reason,
        }

    except Exception as e:
        print(f"  [futures_dashboard] fetch error {symbol}: {e}")
        global _nse
        _nse = None
        return None

def build_strike_rows(options_data, futures_info):
    if not options_data:
        return []
    chain   = options_data.get('chain', [])
    atm     = options_data.get('atm_strike', 0)
    fut_sig = futures_info.get('fut_signal', 'NEUTRAL') if futures_info else 'NEUTRAL'
    rows = []
    for r in chain:
        strike    = r.get('strike', 0)
        ce_vol    = r.get('ce_vol', 0)
        pe_vol    = r.get('pe_vol', 0)
        ce_chg_oi = r.get('ce_chg_oi', 0)
        pe_chg_oi = r.get('pe_chg_oi', 0)
        ce_ltp    = r.get('ce_ltp', 0)
        pe_ltp    = r.get('pe_ltp', 0)
        ce_iv     = r.get('ce_iv', 0)
        pe_iv     = r.get('pe_iv', 0)
        vol_diff    = pe_vol - ce_vol
        vol_total   = pe_vol + ce_vol or 1
        vol_dom_pct = round(abs(vol_diff) / vol_total * 100)
        pcr_coi = round(pe_chg_oi / ce_chg_oi, 2) if ce_chg_oi > 0 else (
                  0 if pe_chg_oi == 0 else 99.0)
        vol_bull = vol_diff > 0 and vol_dom_pct >= 10
        vol_bear = vol_diff < 0 and vol_dom_pct >= 10
        pcr_bull = pcr_coi > 1.2
        pcr_bear = pcr_coi < 0.8 and pcr_coi > 0
        bull_pts = (2 if vol_bull else 0) + (2 if pcr_bull else 0)
        bear_pts = (2 if vol_bear else 0) + (2 if pcr_bear else 0)
        if bull_pts > bear_pts and bull_pts >= 2:
            opt_signal       = 'BUY CALL'
            opt_signal_color = '#4ade80'
            opt_signal_bg    = 'rgba(74,222,128,0.12)'
        elif bear_pts > bull_pts and bear_pts >= 2:
            opt_signal       = 'BUY PUT'
            opt_signal_color = '#f87171'
            opt_signal_bg    = 'rgba(248,113,113,0.12)'
        else:
            opt_signal       = 'NEUTRAL'
            opt_signal_color = '#f59e0b'
            opt_signal_bg    = 'rgba(245,158,11,0.08)'
        if opt_signal == 'BUY CALL' and fut_sig == 'BUY':
            combined       = 'STRONG BUY'
            combined_color = '#4ade80'
        elif opt_signal == 'BUY PUT' and fut_sig == 'SELL':
            combined       = 'STRONG SELL'
            combined_color = '#f87171'
        elif opt_signal == 'BUY CALL' or fut_sig == 'BUY':
            combined       = 'MILD BUY'
            combined_color = '#86efac'
        elif opt_signal == 'BUY PUT' or fut_sig == 'SELL':
            combined       = 'MILD SELL'
            combined_color = '#fca5a5'
        else:
            combined       = 'NEUTRAL'
            combined_color = '#f59e0b'
        rows.append({
            'strike':           strike,
            'is_atm':           strike == atm,
            'ce_vol':           ce_vol,
            'pe_vol':           pe_vol,
            'vol_diff':         vol_diff,
            'vol_dom_pct':      vol_dom_pct,
            'ce_chg_oi':        ce_chg_oi,
            'pe_chg_oi':        pe_chg_oi,
            'pcr_coi':          pcr_coi,
            'ce_ltp':           ce_ltp,
            'pe_ltp':           pe_ltp,
            'ce_iv':            ce_iv,
            'pe_iv':            pe_iv,
            'opt_signal':       opt_signal,
            'opt_signal_color': opt_signal_color,
            'opt_signal_bg':    opt_signal_bg,
            'combined':         combined,
            'combined_color':   combined_color,
        })
    return sorted(rows, key=lambda x: x['strike'], reverse=True)

def fetch_dashboard(symbol, options_data):
    futures_info = fetch_futures_data(symbol)
    strike_rows  = build_strike_rows(options_data, futures_info)
    if options_data and futures_info:
        total_ce_coi = options_data.get('total_ce_coi', 0)
        total_pe_coi = options_data.get('total_pe_coi', 0)
        pcr_coi      = round(total_pe_coi / total_ce_coi, 2) if total_ce_coi > 0 else 0
        save_intraday_snapshot(
            symbol,
            options_data.get('total_ce_vol', 0),
            options_data.get('total_pe_vol', 0),
            options_data.get('pcr_total', 0),
            futures_info.get('fut_ltp', 0),
            futures_info.get('fut_vwap', 0),
            pcr_coi,
        )
    return {
        'symbol':           symbol,
        'timestamp':        datetime.now().strftime('%H:%M:%S'),
        'spot_price':       options_data.get('spot_price', 0) if options_data else 0,
        'atm_strike':       options_data.get('atm_strike', 0) if options_data else 0,
        'expiry':           options_data.get('expiry', '')     if options_data else '',
        'futures':          futures_info or {},
        'strikes':          strike_rows,
        'intraday_history': get_intraday_history(symbol),
    }