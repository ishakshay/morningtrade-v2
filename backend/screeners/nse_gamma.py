from datetime import datetime, date
import math

# ─── Helpers ──────────────────────────────────────────────────────────────────

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

# ─── Previous chain snapshot store ────────────────────────────────────────────
# We need to compare current chain vs previous chain to detect OI wall erosion
# and IV collapse at the wall strike. Store one snapshot per symbol per day.

_prev_chain_snap = {}   # { 'NIFTY': {'date': ..., 'data': {strike: {ce_oi, pe_oi, ce_iv, pe_iv}}} }
_gamma_history   = {}   # { 'NIFTY': {'date': ..., 'snapshots': [...]} }

def _save_prev_chain(symbol, chain_rows):
    today = date.today().isoformat()
    snap  = {}
    for row in chain_rows:
        strike = row.get('strike')
        if strike:
            snap[strike] = {
                'ce_oi': row.get('ce_oi', 0),
                'pe_oi': row.get('pe_oi', 0),
                'ce_iv': row.get('ce_iv', 0),
                'pe_iv': row.get('pe_iv', 0),
            }
    _prev_chain_snap[symbol] = {'date': today, 'data': snap}

def _get_prev_chain(symbol):
    today = date.today().isoformat()
    if symbol not in _prev_chain_snap:
        return {}
    if _prev_chain_snap[symbol]['date'] != today:
        return {}
    return _prev_chain_snap[symbol]['data']

def _save_gamma_snapshot(symbol, result):
    today = date.today().isoformat()
    if symbol not in _gamma_history or _gamma_history[symbol]['date'] != today:
        _gamma_history[symbol] = {'date': today, 'snapshots': []}
    _gamma_history[symbol]['snapshots'].append({
        'time':   datetime.now().strftime('%H:%M'),
        'score':  result['score'],
        'rating': result['rating'],
        'direction': result['direction'],
        'proximity_pct': result['proximity_pct'],
    })
    if len(_gamma_history[symbol]['snapshots']) > 120:
        _gamma_history[symbol]['snapshots'] = _gamma_history[symbol]['snapshots'][-120:]

def get_gamma_history(symbol):
    today = date.today().isoformat()
    if symbol not in _gamma_history or _gamma_history[symbol]['date'] != today:
        return []
    return _gamma_history[symbol]['snapshots']

# ─── Rating helpers ────────────────────────────────────────────────────────────

def _rating(score):
    if score >= 8:   return 'IMMINENT'
    if score >= 5:   return 'HIGH RISK'
    if score >= 3:   return 'WATCH'
    return 'LOW'

def _rating_color(rating):
    if rating == 'IMMINENT':  return '#f87171'
    if rating == 'HIGH RISK': return '#f59e0b'
    if rating == 'WATCH':     return '#60a5fa'
    return '#64748b'

def _rating_emoji(rating):
    if rating == 'IMMINENT':  return '🔴'
    if rating == 'HIGH RISK': return '🟠'
    if rating == 'WATCH':     return '🔵'
    return '⚪'

# ─── Action + reference table ─────────────────────────────────────────────────

RATING_REFERENCE = [
    {
        'rating':     'IMMINENT',
        'score':      '8 – 13',
        'color':      '#f87171',
        'emoji':      '🔴',
        'condition':  'Spot within 0.3% of wall + OI erosion + futures confirmation',
        'action':     'Buy ATM or OTM+1 in blast direction. Tight stop below/above wall strike.',
        'avoid':      'Avoid selling options — unlimited risk in a blast move.',
        'timing':     'Move likely within 1–3 candles (5-min)',
    },
    {
        'rating':     'HIGH RISK',
        'score':      '5 – 7',
        'color':      '#f59e0b',
        'emoji':      '🟠',
        'condition':  'Proximity + 2 of 3 confirming conditions active',
        'action':     'Prepare order. Watch next 2 ticks for IMMINENT confirmation before entering.',
        'avoid':      'Do not write naked options at or near the wall strike.',
        'timing':     'Setup forming — typically 5–15 min before blast',
    },
    {
        'rating':     'WATCH',
        'score':      '3 – 4',
        'color':      '#60a5fa',
        'emoji':      '🔵',
        'condition':  'Spot approaching wall, early conditions building',
        'action':     'Monitor OI wall erosion specifically. Do not act yet.',
        'avoid':      'Avoid adding new short positions near the wall.',
        'timing':     'Early warning — 15–30 min before potential blast',
    },
    {
        'rating':     'LOW',
        'score':      '0 – 2',
        'color':      '#64748b',
        'emoji':      '⚪',
        'condition':  'Spot far from walls, no confirming signals',
        'action':     'No gamma blast setup. Trade normally.',
        'avoid':      '',
        'timing':     'No imminent risk',
    },
]

# ─── Core scoring engine ───────────────────────────────────────────────────────

def compute_gamma_blast(options_data, futures_payload, prev_pcr_3strike=None):
    """
    options_data   — result dict from nse_options.parse_option_chain()
    futures_payload — result dict from nse_futures.poll_futures_sentiment()
    prev_pcr_3strike — pcr_3strike value from previous options snapshot (optional)

    Returns full gamma blast payload.
    """
    if not options_data:
        return None

    spot        = safe_float(options_data.get('spot_price', 0))
    resistance  = options_data.get('resistance')
    support     = options_data.get('support')
    chain_rows  = options_data.get('chain', [])
    pcr_3strike = safe_float(options_data.get('pcr_3strike', 0))
    atm_strike  = options_data.get('atm_strike', 0)

    if spot == 0 or (not resistance and not support):
        return None

    # Build chain lookup by strike
    chain_map = {row['strike']: row for row in chain_rows}

    # Get previous chain for delta comparisons
    prev_chain = _get_prev_chain(options_data.get('symbol', 'NIFTY'))

    # ── Which wall are we approaching? ────────────────────────────────────────
    dist_r = abs(spot - resistance) / spot * 100 if resistance else 999
    dist_s = abs(spot - support)    / spot * 100 if support    else 999

    approaching_resistance = dist_r <= dist_s
    wall_strike  = resistance if approaching_resistance else support
    proximity    = dist_r     if approaching_resistance else dist_s
    direction    = 'UP'       if approaching_resistance else 'DOWN'

    if wall_strike is None:
        return None

    score  = 0
    alerts = []
    conditions = []

    # ── Condition 1 — Proximity to wall (max 3 pts) ───────────────────────────
    if proximity < 0.3:
        score += 3
        conditions.append({
            'id':      'proximity',
            'label':   'Proximity',
            'status':  'HIGH',
            'detail':  f'Spot within {round(proximity, 2)}% of wall at {wall_strike}',
            'score':   3,
            'color':   '#f87171',
        })
        alerts.append(f'Spot within 0.3% of OI wall ({wall_strike})')
    elif proximity < 0.6:
        score += 1
        conditions.append({
            'id':      'proximity',
            'label':   'Proximity',
            'status':  'MED',
            'detail':  f'Spot within {round(proximity, 2)}% of wall at {wall_strike}',
            'score':   1,
            'color':   '#f59e0b',
        })
    else:
        conditions.append({
            'id':      'proximity',
            'label':   'Proximity',
            'status':  'LOW',
            'detail':  f'Wall {round(proximity, 2)}% away at {wall_strike}',
            'score':   0,
            'color':   '#64748b',
        })

    # ── Condition 2 — OI Wall Erosion (max 3 pts) ─────────────────────────────
    wall_row      = chain_map.get(wall_strike, {})
    wall_oi_now   = wall_row.get('ce_oi', 0) if approaching_resistance else wall_row.get('pe_oi', 0)
    prev_wall_row = prev_chain.get(wall_strike, {})
    wall_oi_prev  = prev_wall_row.get('ce_oi', wall_oi_now) if approaching_resistance else prev_wall_row.get('pe_oi', wall_oi_now)

    oi_erosion_pct = 0
    if wall_oi_prev > 0:
        oi_erosion_pct = round((wall_oi_prev - wall_oi_now) / wall_oi_prev * 100, 2)

    if oi_erosion_pct > 5:
        score += 3
        conditions.append({
            'id':      'oi_erosion',
            'label':   'OI Wall Erosion',
            'status':  'HIGH',
            'detail':  f'Wall OI dropped {oi_erosion_pct}% — writers covering',
            'score':   3,
            'color':   '#f87171',
        })
        alerts.append(f'OI wall eroding {oi_erosion_pct}% — writers covering')
    elif oi_erosion_pct > 2:
        score += 1
        conditions.append({
            'id':      'oi_erosion',
            'label':   'OI Wall Erosion',
            'status':  'MED',
            'detail':  f'Wall OI down {oi_erosion_pct}% — early unwinding',
            'score':   1,
            'color':   '#f59e0b',
        })
    else:
        conditions.append({
            'id':      'oi_erosion',
            'label':   'OI Wall Erosion',
            'status':  'LOW',
            'detail':  f'Wall OI stable (Δ {oi_erosion_pct}%)',
            'score':   0,
            'color':   '#64748b',
        })

    # ── Condition 3 — IV Collapse at wall (max 2 pts) ─────────────────────────
    iv_now  = safe_float(wall_row.get('ce_iv', 0) if approaching_resistance else wall_row.get('pe_iv', 0))
    iv_prev = safe_float(prev_wall_row.get('ce_iv', iv_now) if approaching_resistance else prev_wall_row.get('pe_iv', iv_now))
    iv_drop = round(iv_prev - iv_now, 2)

    if iv_drop > 3:
        score += 2
        conditions.append({
            'id':      'iv_collapse',
            'label':   'IV Collapse at Wall',
            'status':  'HIGH',
            'detail':  f'IV dropped {iv_drop}pts at {wall_strike} — resistance weakening',
            'score':   2,
            'color':   '#f87171',
        })
        alerts.append(f'IV collapsing {iv_drop}pts at wall — writers not defending')
    elif iv_drop > 1:
        score += 1
        conditions.append({
            'id':      'iv_collapse',
            'label':   'IV Collapse at Wall',
            'status':  'MED',
            'detail':  f'IV down {iv_drop}pts at {wall_strike}',
            'score':   1,
            'color':   '#f59e0b',
        })
    else:
        conditions.append({
            'id':      'iv_collapse',
            'label':   'IV Collapse at Wall',
            'status':  'LOW',
            'detail':  f'IV stable at {wall_strike} (Δ {iv_drop})',
            'score':   0,
            'color':   '#64748b',
        })

    # ── Condition 4 — Futures confirmation (max 3 pts) ────────────────────────
    fut_score  = 0
    fut_detail = 'No futures data'
    fut_status = 'LOW'
    fut_color  = '#64748b'

    if futures_payload:
        fut_signal = futures_payload.get('signal', '')
        fut_conf   = safe_int(futures_payload.get('confidence', 0))
        d_basis    = safe_float(futures_payload.get('d_basis', 0))

        bullish_signals = {'Long Buildup', 'Short Covering'}
        bearish_signals = {'Short Buildup', 'Long Unwinding'}

        direction_match = (
            (approaching_resistance and fut_signal in bullish_signals) or
            (not approaching_resistance and fut_signal in bearish_signals)
        )
        basis_confirm = (approaching_resistance and d_basis > 0) or (not approaching_resistance and d_basis < 0)

        if direction_match and fut_conf > 60 and basis_confirm:
            fut_score  = 3
            fut_status = 'HIGH'
            fut_color  = '#f87171'
            fut_detail = f'{fut_signal} conf:{fut_conf} + basis {"expanding" if approaching_resistance else "collapsing"}'
            alerts.append(f'Futures {fut_signal} (conf {fut_conf}) confirms blast direction')
        elif direction_match and fut_conf > 40:
            fut_score  = 1
            fut_status = 'MED'
            fut_color  = '#f59e0b'
            fut_detail = f'{fut_signal} conf:{fut_conf} — partial confirmation'
        else:
            fut_detail = f'{fut_signal} conf:{fut_conf} — no direction match'

        score += fut_score

    conditions.append({
        'id':      'futures',
        'label':   'Futures Confirmation',
        'status':  fut_status,
        'detail':  fut_detail,
        'score':   fut_score,
        'color':   fut_color,
    })

    # ── Condition 5 — PCR collapse / surge (max 2 pts) ────────────────────────
    pcr_delta  = 0
    pcr_status = 'LOW'
    pcr_color  = '#64748b'
    pcr_detail = 'No previous PCR data'
    pcr_score  = 0

    if prev_pcr_3strike and prev_pcr_3strike > 0:
        pcr_delta = round(pcr_3strike - prev_pcr_3strike, 2)

        # For upside blast: PCR dropping = puts unwinding, bulls taking over
        # For downside blast: PCR rising = calls unwinding, bears taking over
        pcr_confirms = (approaching_resistance and pcr_delta < -0.25) or \
                       (not approaching_resistance and pcr_delta > 0.25)

        pcr_strong = abs(pcr_delta) > 0.4

        if pcr_confirms and pcr_strong:
            pcr_score  = 2
            pcr_status = 'HIGH'
            pcr_color  = '#f87171'
            pcr_detail = f'PCR {"dropped" if pcr_delta < 0 else "surged"} {abs(pcr_delta)} — resistance {"melting" if approaching_resistance else "building"}'
            alerts.append(f'PCR {"collapsing" if pcr_delta < 0 else "surging"} ({pcr_delta}) — wall weakening')
        elif pcr_confirms:
            pcr_score  = 1
            pcr_status = 'MED'
            pcr_color  = '#f59e0b'
            pcr_detail = f'PCR moving {pcr_delta} — early repositioning'
        else:
            pcr_detail = f'PCR stable (Δ {pcr_delta})'

        score += pcr_score

    conditions.append({
        'id':      'pcr',
        'label':   'PCR Repositioning',
        'status':  pcr_status,
        'detail':  pcr_detail,
        'score':   pcr_score,
        'color':   pcr_color,
    })

    # ── Final rating ───────────────────────────────────────────────────────────
    rating       = _rating(score)
    rating_color = _rating_color(rating)
    rating_emoji = _rating_emoji(rating)

    # ── Action for current rating ──────────────────────────────────────────────
    ref = next((r for r in RATING_REFERENCE if r['rating'] == rating), RATING_REFERENCE[-1])

    # ── Wall data for display ──────────────────────────────────────────────────
    wall_oi_display = wall_oi_now
    resistance_row  = chain_map.get(resistance, {})
    support_row     = chain_map.get(support,    {})

    result = {
        'symbol':         options_data.get('symbol'),
        'timestamp':      datetime.now().strftime('%H:%M:%S'),
        'score':          score,
        'max_score':      13,
        'rating':         rating,
        'rating_color':   rating_color,
        'rating_emoji':   rating_emoji,
        'direction':      direction,
        'wall_strike':    wall_strike,
        'proximity_pct':  round(proximity, 3),
        'spot':           spot,
        'resistance':     resistance,
        'support':        support,
        'resistance_oi':  resistance_row.get('ce_oi', 0),
        'support_oi':     support_row.get('pe_oi',   0),
        'wall_oi_now':    wall_oi_display,
        'wall_oi_prev':   wall_oi_prev,
        'oi_erosion_pct': oi_erosion_pct,
        'wall_iv_now':    iv_now,
        'wall_iv_prev':   iv_prev,
        'iv_drop':        iv_drop,
        'pcr_3strike':    pcr_3strike,
        'pcr_delta':      pcr_delta,
        'conditions':     conditions,
        'alerts':         alerts,
        'action':         ref['action'],
        'avoid':          ref['avoid'],
        'timing':         ref['timing'],
        'condition_desc': ref['condition'],
        'reference':      RATING_REFERENCE,
        'history':        get_gamma_history(options_data.get('symbol', 'NIFTY')),
    }

    # Save chain snapshot for next comparison
    _save_prev_chain(options_data.get('symbol', 'NIFTY'), chain_rows)
    _save_gamma_snapshot(options_data.get('symbol', 'NIFTY'), result)

    return result