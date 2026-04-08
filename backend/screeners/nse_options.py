from jugaad_data.nse import NSELive
from datetime import datetime, date
import math

SCREENER_ID       = 'nse_options'
_nse              = None
_pcr_history      = {}
_prev_prices      = {}
_strike_pcr_hist  = {}
_full_chain_cache = {}

def get_nse():
    global _nse
    if _nse is None:
        _nse = NSELive()
    return _nse

def is_market_open():
    now  = datetime.utcnow()
    if now.weekday() >= 5:
        return False
    hour = now.hour + now.minute / 60
    return 3.75 <= hour <= 10.0

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

def save_strike_pcr_snapshot(symbol, five_strike_rows):
    global _strike_pcr_hist
    today   = date.today().isoformat()
    now_str = datetime.now().strftime('%H:%M')
    if symbol not in _strike_pcr_hist:
        _strike_pcr_hist[symbol] = {'date': today, 'snapshots': []}
    if _strike_pcr_hist[symbol]['date'] != today:
        _strike_pcr_hist[symbol] = {'date': today, 'snapshots': []}
    snapshot = {'time': now_str, 'strikes': {}}
    for row in five_strike_rows:
        strike = row.get('strike')
        if strike:
            ce_vol   = row.get('ce_vol') or 0
            pe_vol   = row.get('pe_vol') or 0
            vol_diff = pe_vol - ce_vol
            ce_oi    = row.get('ce_oi') or 0
            pe_oi    = row.get('pe_oi') or 0
            pcr_oi   = round(pe_oi / ce_oi, 2) if ce_oi > 0 else 0
            snapshot['strikes'][str(strike)] = {
                'pcr_oi':   pcr_oi,
                'pcr_coi':  round(row.get('pcr_coi') or 0, 2),
                'vol_diff': vol_diff,
                'ce_coi':   row.get('ce_chg_oi') or 0,
                'pe_coi':   row.get('pe_chg_oi') or 0,
            }
    _strike_pcr_hist[symbol]['snapshots'].append(snapshot)
    if len(_strike_pcr_hist[symbol]['snapshots']) > 130:
        _strike_pcr_hist[symbol]['snapshots'] = _strike_pcr_hist[symbol]['snapshots'][-130:]

def get_strike_pcr_history(symbol):
    today = date.today().isoformat()
    if symbol not in _strike_pcr_hist:
        return []
    if _strike_pcr_hist[symbol]['date'] != today:
        return []
    return _strike_pcr_hist[symbol]['snapshots']

def save_full_chain(symbol, payload):
    today = date.today().isoformat()
    _full_chain_cache[symbol] = {'date': today, 'data': payload}

def get_full_chain(symbol):
    today = date.today().isoformat()
    if symbol not in _full_chain_cache:
        return None
    if _full_chain_cache[symbol]['date'] != today:
        return None
    return _full_chain_cache[symbol]['data']

def fetch_option_chain(symbol):
    nse = get_nse()
    try:
        print(f"  [nse_options] fetching {symbol}...")
        data = nse.equities_option_chain(symbol)
        if not data or 'records' not in data:
            return None

        result = parse_option_chain(data, symbol)
        if result:
            save_pcr_snapshot(symbol, result['pcr_total'], result['pcr_atm'], result['pcr_5strike'])
            result['pcr_history'] = get_pcr_history(symbol)

            save_strike_pcr_snapshot(symbol, result.get('five_strike_rows', []))
            result['strike_pcr_history'] = get_strike_pcr_history(symbol)

            try:
                from screeners.nse_market import save_iv_snapshot, get_iv_history, get_latest_vix
                chain   = result.get('chain', [])
                atm     = result.get('atm_strike')
                atm_row = next((r for r in chain if r['strike'] == atm), None)
                if atm_row and atm_row.get('ce_iv', 0) > 0:
                    save_iv_snapshot(
                        symbol,
                        atm_row['ce_iv'],
                        atm_row['pe_iv'],
                        atm_row.get('ce_ltp', 0),
                        atm_row.get('pe_ltp', 0),
                        result.get('spot_price', 0),
                        get_latest_vix(),
                    )
                result['iv_history'] = get_iv_history(symbol)
            except Exception as e:
                print(f"  [nse_options] IV error: {e}")
                result['iv_history'] = []

            try:
                from screeners.nse_market import save_pcr_intraday, get_pcr_intraday
                save_pcr_intraday(symbol, result['pcr_3strike'], result.get('three_ce_coi', 0), result.get('three_pe_coi', 0))
                result['pcr_intraday_3m']  = get_pcr_intraday(symbol, 3)
                result['pcr_intraday_9m']  = get_pcr_intraday(symbol, 9)
                result['pcr_intraday_15m'] = get_pcr_intraday(symbol, 15)
            except Exception as e:
                print(f"  [nse_options] PCR intraday error: {e}")
                result['pcr_intraday_3m']  = []
                result['pcr_intraday_9m']  = []
                result['pcr_intraday_15m'] = []

            try:
                from screeners.options_greeks import get_top_strikes
                result['top_strikes'] = get_top_strikes(result, result.get('iv_history', []))
            except Exception as e:
                print(f"  [nse_options] greeks error: {e}")
                result['top_strikes'] = None

            full = result.get('full_chain_payload')
            if full:
                save_full_chain(symbol, full)
                del result['full_chain_payload']

            print(f"  [nse_options] {symbol} spot:{result['spot_price']} pcr_total:{result['pcr_total']} pcr_3s:{result['pcr_3strike']} S1:{result['support']} R1:{result['resistance']} iv:{len(result['iv_history'])}")

        return result

    except Exception as e:
        print(f"  [nse_options] fetch error {symbol}: {e}")
        global _nse
        _nse = None
        return None

def calculate_max_pain(pain_data, strikes):
    min_pain   = float('inf')
    max_pain_s = None
    for s in strikes:
        total_pain = 0
        for strike, oi in pain_data.items():
            ce_oi = oi.get('ce_oi', 0)
            pe_oi = oi.get('pe_oi', 0)
            if s > strike:
                total_pain += (s - strike) * ce_oi
            if s < strike:
                total_pain += (strike - s) * pe_oi
        if total_pain < min_pain:
            min_pain   = total_pain
            max_pain_s = s
    return max_pain_s

def get_buildup_signal(price_now, price_prev, oi_now, oi_prev):
    if price_prev is None or oi_prev is None:
        return None
    if price_now is None or oi_now is None:
        return None
    if price_now == 0 or price_prev == 0:
        return None
    price_change_pct = abs(price_now - price_prev) / price_prev * 100
    oi_change_pct    = abs(oi_now - oi_prev) / max(oi_prev, 1) * 100
    if price_change_pct < 0.5 and oi_change_pct < 1.0:
        return None
    price_up = price_now > price_prev
    oi_up    = oi_now   > oi_prev
    if price_up  and oi_up:        return 'Long Buildup'
    if not price_up and oi_up:     return 'Short Buildup'
    if price_up  and not oi_up:    return 'Short Covering'
    if not price_up and not oi_up: return 'Long Unwinding'
    return None

def buildup_color(signal):
    if signal == 'Long Buildup':   return '#4ade80'
    if signal == 'Short Buildup':  return '#f87171'
    if signal == 'Short Covering': return '#60a5fa'
    if signal == 'Long Unwinding': return '#f59e0b'
    return '#64748b'

def buildup_short(signal):
    if signal == 'Long Buildup':   return 'LB'
    if signal == 'Short Buildup':  return 'SB'
    if signal == 'Short Covering': return 'SC'
    if signal == 'Long Unwinding': return 'LU'
    return '—'

def save_pcr_snapshot(symbol, pcr_total, pcr_atm, pcr_5strike):
    today = date.today().isoformat()
    if symbol not in _pcr_history:
        _pcr_history[symbol] = {'date': today, 'snapshots': []}
    if _pcr_history[symbol]['date'] != today:
        _pcr_history[symbol] = {'date': today, 'snapshots': []}
    _pcr_history[symbol]['snapshots'].append({
        'time':        datetime.now().strftime('%H:%M'),
        'pcr':         round(pcr_total,   2),
        'pcr_atm':     round(pcr_atm,     2),
        'pcr_5strike': round(pcr_5strike, 2),
    })
    if len(_pcr_history[symbol]['snapshots']) > 130:
        _pcr_history[symbol]['snapshots'] = _pcr_history[symbol]['snapshots'][-130:]

def get_pcr_history(symbol):
    today = date.today().isoformat()
    if symbol not in _pcr_history:
        return []
    if _pcr_history[symbol]['date'] != today:
        return []
    return _pcr_history[symbol]['snapshots']

def sentiment_label(pcr):
    if pcr > 1.2: return 'Bullish'
    if pcr < 0.8: return 'Bearish'
    return 'Neutral'

def parse_option_chain(data, symbol):
    if not data or 'records' not in data:
        return None

    records      = data['records']
    spot_price   = safe_float(records.get('underlyingValue', 0))
    expiry_dates = records.get('expiryDates', [])

    if not expiry_dates or spot_price == 0:
        return None

    current_expiry = expiry_dates[0]
    next_expiry    = expiry_dates[1] if len(expiry_dates) > 1 else None
    monthly_expiry = None
    for exp in expiry_dates:
        try:
            exp_date = datetime.strptime(exp, '%d-%b-%Y')
            if exp_date.day > 24:
                monthly_expiry = exp
                break
        except:
            pass

    all_data = records.get('data', [])
    if not all_data:
        return None

    expiry_data = [d for d in all_data
                   if d.get('expiryDates') == current_expiry
                   or d.get('CE', {}).get('expiryDate') == current_expiry
                   or d.get('PE', {}).get('expiryDate') == current_expiry]
    if not expiry_data:
        expiry_data = all_data[:80]

    atm_round  = 100 if 'BANK' in symbol else 50
    atm_strike = round(spot_price / atm_round) * atm_round

    strikes = sorted(set(
        safe_int(d.get('strikePrice', 0))
        for d in expiry_data
        if d.get('strikePrice')
    ))
    if not strikes:
        return None

    atm_idx        = min(range(len(strikes)), key=lambda i: abs(strikes[i] - atm_strike))
    nearby_range   = 7
    start_idx      = max(0, atm_idx - nearby_range)
    end_idx        = min(len(strikes), atm_idx + nearby_range + 1)
    nearby_strikes = set(strikes[start_idx:end_idx])

    five_start   = max(0, atm_idx - 5)
    five_end     = min(len(strikes), atm_idx + 6)
    five_strikes = set(strikes[five_start:five_end])

    three_start   = max(0, atm_idx - 1)
    three_end     = min(len(strikes), atm_idx + 2)
    three_strikes = set(strikes[three_start:three_end])

    today = date.today().isoformat()
    if symbol not in _prev_prices:
        _prev_prices[symbol] = {'date': today, 'data': {}}
    if _prev_prices[symbol]['date'] != today:
        _prev_prices[symbol] = {'date': today, 'data': {}}
    prev_data = _prev_prices[symbol]['data']

    chain_rows       = []
    full_chain_rows  = []
    total_ce_oi      = 0
    total_pe_oi      = 0
    total_ce_vol     = 0
    total_pe_vol     = 0
    total_ce_coi     = 0
    total_pe_coi     = 0
    max_pain_data    = {}
    atm_ce_coi       = 0
    atm_pe_coi       = 0
    five_ce_coi      = 0
    five_pe_coi      = 0
    three_ce_coi     = 0
    three_pe_coi     = 0
    five_strike_rows = []
    all_ce_vol       = []
    all_pe_vol       = []
    all_ce_oi_list   = []
    all_pe_oi_list   = []
    unwind_alerts    = []

    for d in expiry_data:
        strike = safe_int(d.get('strikePrice', 0))
        if strike == 0:
            continue

        ce        = d.get('CE', {})
        pe        = d.get('PE', {})
        ce_oi     = safe_int(ce.get('openInterest', 0))
        pe_oi     = safe_int(pe.get('openInterest', 0))
        ce_chg_oi = safe_int(ce.get('changeinOpenInterest', 0))
        pe_chg_oi = safe_int(pe.get('changeinOpenInterest', 0))
        ce_vol    = safe_int(ce.get('totalTradedVolume', 0))
        pe_vol    = safe_int(pe.get('totalTradedVolume', 0))
        ce_ltp    = safe_float(ce.get('lastPrice', 0))
        pe_ltp    = safe_float(pe.get('lastPrice', 0))
        ce_iv     = safe_float(ce.get('impliedVolatility', 0))
        pe_iv     = safe_float(pe.get('impliedVolatility', 0))

        total_ce_oi  += ce_oi
        total_pe_oi  += pe_oi
        total_ce_vol += ce_vol
        total_pe_vol += pe_vol
        total_ce_coi += ce_chg_oi
        total_pe_coi += pe_chg_oi

        max_pain_data[strike] = {'ce_oi': ce_oi, 'pe_oi': pe_oi}

        prev   = prev_data.get(strike, {})
        ce_sig = get_buildup_signal(ce_ltp, prev.get('ce_ltp'), ce_oi, prev.get('ce_oi'))
        pe_sig = get_buildup_signal(pe_ltp, prev.get('pe_ltp'), pe_oi, prev.get('pe_oi'))

        UNWIND_THRESHOLD = 50000
        if ce_chg_oi < -UNWIND_THRESHOLD and strike in nearby_strikes:
            unwind_alerts.append({'strike': strike, 'side': 'CE', 'chg_oi': ce_chg_oi, 'ltp': round(ce_ltp, 2), 'signal': 'Call OI Unwinding', 'color': '#60a5fa'})
        if pe_chg_oi < -UNWIND_THRESHOLD and strike in nearby_strikes:
            unwind_alerts.append({'strike': strike, 'side': 'PE', 'chg_oi': pe_chg_oi, 'ltp': round(pe_ltp, 2), 'signal': 'Put OI Unwinding', 'color': '#f59e0b'})

        if ce_vol > 0:
            all_ce_vol.append({'strike': strike, 'volume': ce_vol, 'ltp': round(ce_ltp, 2), 'oi': ce_oi, 'chg_oi': ce_chg_oi})
        if pe_vol > 0:
            all_pe_vol.append({'strike': strike, 'volume': pe_vol, 'ltp': round(pe_ltp, 2), 'oi': pe_oi, 'chg_oi': pe_chg_oi})
        if ce_oi > 0:
            all_ce_oi_list.append({'strike': strike, 'oi': ce_oi, 'chg_oi': ce_chg_oi, 'ltp': round(ce_ltp, 2), 'vol': ce_vol, 'signal': ce_sig, 'sig_color': buildup_color(ce_sig)})
        if pe_oi > 0:
            all_pe_oi_list.append({'strike': strike, 'oi': pe_oi, 'chg_oi': pe_chg_oi, 'ltp': round(pe_ltp, 2), 'vol': pe_vol, 'signal': pe_sig, 'sig_color': buildup_color(pe_sig)})

        if strike == atm_strike:
            atm_ce_coi = ce_chg_oi
            atm_pe_coi = pe_chg_oi

        if strike in three_strikes:
            three_ce_coi += ce_chg_oi
            three_pe_coi += pe_chg_oi

        if strike in five_strikes:
            five_ce_coi += ce_chg_oi
            five_pe_coi += pe_chg_oi
            pcr_coi_strike = round(pe_chg_oi / ce_chg_oi, 2) if ce_chg_oi > 0 else 0
            five_strike_rows.append({
                'strike':    strike,
                'is_atm':   strike == atm_strike,
                'ce_oi':     ce_oi,
                'pe_oi':     pe_oi,
                'ce_chg_oi': ce_chg_oi,
                'pe_chg_oi': pe_chg_oi,
                'ce_vol':    ce_vol,
                'pe_vol':    pe_vol,
                'pcr_coi':   pcr_coi_strike,
            })

        if strike in nearby_strikes:
            pcr_strike = round(pe_oi / ce_oi, 2) if ce_oi > 0 else 0
            chain_rows.append({
                'strike':       strike,
                'is_atm':       strike == atm_strike,
                'ce_oi':        ce_oi,
                'ce_chg_oi':    ce_chg_oi,
                'ce_vol':       ce_vol,
                'ce_ltp':       round(ce_ltp, 2),
                'ce_iv':        round(ce_iv, 2),
                'ce_signal':    ce_sig,
                'ce_sig_color': buildup_color(ce_sig),
                'ce_sig_short': buildup_short(ce_sig),
                'pe_oi':        pe_oi,
                'pe_chg_oi':    pe_chg_oi,
                'pe_vol':       pe_vol,
                'pe_ltp':       round(pe_ltp, 2),
                'pe_iv':        round(pe_iv, 2),
                'pe_signal':    pe_sig,
                'pe_sig_color': buildup_color(pe_sig),
                'pe_sig_short': buildup_short(pe_sig),
                'pcr_strike':   pcr_strike,
            })

        pcr_strike_full = round(pe_oi / ce_oi, 2) if ce_oi > 0 else 0
        full_chain_rows.append({
            'strike':       strike,
            'is_atm':       strike == atm_strike,
            'ce_oi':        ce_oi,
            'ce_chg_oi':    ce_chg_oi,
            'ce_vol':       ce_vol,
            'ce_ltp':       round(ce_ltp, 2),
            'ce_iv':        round(ce_iv, 2),
            'ce_signal':    ce_sig,
            'ce_sig_color': buildup_color(ce_sig),
            'ce_sig_short': buildup_short(ce_sig),
            'pe_oi':        pe_oi,
            'pe_chg_oi':    pe_chg_oi,
            'pe_vol':       pe_vol,
            'pe_ltp':       round(pe_ltp, 2),
            'pe_iv':        round(pe_iv, 2),
            'pe_signal':    pe_sig,
            'pe_sig_color': buildup_color(pe_sig),
            'pe_sig_short': buildup_short(pe_sig),
            'pcr_strike':   pcr_strike_full,
        })

        prev_data[strike] = {'ce_ltp': ce_ltp, 'ce_oi': ce_oi, 'pe_ltp': pe_ltp, 'pe_oi': pe_oi}

    pcr_total   = round(total_pe_oi  / total_ce_oi,  2) if total_ce_oi  > 0 else 0
    pcr_atm     = round(atm_pe_coi   / atm_ce_coi,   2) if atm_ce_coi   > 0 else 0
    pcr_5strike = round(five_pe_coi  / five_ce_coi,  2) if five_ce_coi  > 0 else 0
    pcr_3strike = round(three_pe_coi / three_ce_coi, 2) if three_ce_coi > 0 else 0

    top_ce_vol = sorted(all_ce_vol,     key=lambda x: x['volume'], reverse=True)[:5]
    top_pe_vol = sorted(all_pe_vol,     key=lambda x: x['volume'], reverse=True)[:5]
    top_ce_oi  = sorted(all_ce_oi_list, key=lambda x: x['oi'],     reverse=True)[:5]
    top_pe_oi  = sorted(all_pe_oi_list, key=lambda x: x['oi'],     reverse=True)[:5]

    max_pain_strike = calculate_max_pain(max_pain_data, strikes) if max_pain_data else atm_strike

    pe_below = sorted([x for x in all_pe_oi_list if x['strike'] < spot_price], key=lambda x: x['oi'], reverse=True)
    ce_above = sorted([x for x in all_ce_oi_list if x['strike'] > spot_price], key=lambda x: x['oi'], reverse=True)
    top_pe   = sorted(pe_below[:6], key=lambda x: abs(x['strike'] - spot_price))
    top_ce   = sorted(ce_above[:6], key=lambda x: abs(x['strike'] - spot_price))

    support_strike     = top_pe[0]['strike'] if len(top_pe) > 0 else None
    support2_strike    = top_pe[1]['strike'] if len(top_pe) > 1 else None
    support3_strike    = top_pe[2]['strike'] if len(top_pe) > 2 else None
    resistance_strike  = top_ce[0]['strike'] if len(top_ce) > 0 else None
    resistance2_strike = top_ce[1]['strike'] if len(top_ce) > 1 else None
    resistance3_strike = top_ce[2]['strike'] if len(top_ce) > 2 else None
    max_pain_distance  = round(spot_price - max_pain_strike, 2) if max_pain_strike else 0

    full_chain_payload = {
        'symbol':            symbol,
        'spot_price':        round(spot_price, 2),
        'atm_strike':        atm_strike,
        'max_pain':          max_pain_strike,
        'max_pain_distance': max_pain_distance,
        'support':           support_strike,
        'support2':          support2_strike,
        'support3':          support3_strike,
        'resistance':        resistance_strike,
        'resistance2':       resistance2_strike,
        'resistance3':       resistance3_strike,
        'expiry':            current_expiry,
        'next_expiry':       next_expiry,
        'monthly_expiry':    monthly_expiry,
        'all_expiries':      expiry_dates[:6],
        'pcr_total':         pcr_total,
        'sentiment_total':   sentiment_label(pcr_total),
        'total_ce_oi':       total_ce_oi,
        'total_pe_oi':       total_pe_oi,
        'total_ce_vol':      total_ce_vol,
        'total_pe_vol':      total_pe_vol,
        'total_ce_coi':      total_ce_coi,
        'total_pe_coi':      total_pe_coi,
        'chain':             sorted(full_chain_rows, key=lambda x: x['strike'], reverse=True),
        'total_strikes':     len(full_chain_rows),
        'timestamp':         datetime.now().strftime('%H:%M:%S'),
        'market_open':       is_market_open(),
        'iv_history':        [],
    }

    return {
        'symbol':            symbol,
        'spot_price':        round(spot_price, 2),
        'atm_strike':        atm_strike,
        'max_pain':          max_pain_strike,
        'max_pain_distance': max_pain_distance,
        'support':           support_strike,
        'support2':          support2_strike,
        'support3':          support3_strike,
        'resistance':        resistance_strike,
        'resistance2':       resistance2_strike,
        'resistance3':       resistance3_strike,
        'expiry':            current_expiry,
        'next_expiry':       next_expiry,
        'monthly_expiry':    monthly_expiry,
        'all_expiries':      expiry_dates[:6],
        'pcr_total':         pcr_total,
        'sentiment_total':   sentiment_label(pcr_total),
        'pcr_atm':           pcr_atm,
        'atm_ce_coi':        atm_ce_coi,
        'atm_pe_coi':        atm_pe_coi,
        'sentiment_atm':     sentiment_label(pcr_atm),
        'pcr_5strike':       pcr_5strike,
        'five_ce_coi':       five_ce_coi,
        'five_pe_coi':       five_pe_coi,
        'five_strike_rows':  sorted(five_strike_rows, key=lambda x: x['strike'], reverse=True),
        'sentiment_5strike': sentiment_label(pcr_5strike),
        'pcr_3strike':       pcr_3strike,
        'three_ce_coi':      three_ce_coi,
        'three_pe_coi':      three_pe_coi,
        'sentiment_3strike': sentiment_label(pcr_3strike),
        'top_ce_vol':        top_ce_vol,
        'top_pe_vol':        top_pe_vol,
        'top_ce_oi':         top_ce_oi,
        'top_pe_oi':         top_pe_oi,
        'unwind_alerts':     sorted(unwind_alerts, key=lambda x: abs(x['chg_oi']), reverse=True),
        'total_ce_oi':       total_ce_oi,
        'total_pe_oi':       total_pe_oi,
        'total_ce_vol':      total_ce_vol,
        'total_pe_vol':      total_pe_vol,
        'total_ce_coi':      total_ce_coi,
        'total_pe_coi':      total_pe_coi,
        'chain':             sorted(chain_rows, key=lambda x: x['strike'], reverse=True),
        'timestamp':         datetime.now().strftime('%H:%M:%S'),
        'market_open':       is_market_open(),
        'full_chain_payload': full_chain_payload,
    }