"""
volume_analytics.py
Per-strike volume analysis for NSE option chains.

Pure-function module. No state. No I/O. Reads a chain dict (as returned by
get_full_chain) and returns enriched per-strike metrics + aggregate stats.

Plugged into Flask via the /api/volume/analysis/<symbol> route in app.py.
Frontend polls this on the same 180s cadence as /api/option-chain.

KEY METRICS
-----------
- V/OI ratio:           volume / |OI|. <1.5 = position building, 1.5-3 = balanced,
                        >4 = churn-dominated (intraday speculation, low signal).
- Buildup state:        one of long_buildup / short_buildup / short_covering /
                        long_unwinding / churn / quiet, derived from premium +
                        OI co-movement (requires a previous snapshot for delta).
- Smart money score:    0-100 composite weighting V/OI position-building, time-of-day,
                        and strike distance from spot. Higher = more likely
                        institutional footprint at that strike.
- Churn percentage:     session-aggregate volume that did NOT convert to OI.
                        High churn = day-trader-dominated session, low signal.
"""

from datetime import datetime, timezone, timedelta


# ============================================================================
# CONSTANTS
# ============================================================================

IST = timezone(timedelta(hours=5, minutes=30))

# V/OI ratio classification thresholds (per the framework documented in chat)
VOI_POSITION_MAX = 1.5   # below this = position building, high conviction
VOI_BALANCED_MAX = 3.0   # 1.5-3.0 = balanced, follow the buildup
VOI_CHURN_MIN    = 4.0   # above this = churn-dominated, ignore for structure

# Time-of-day windows (IST minutes from midnight) and their signal weights.
# Tuned to NSE intraday character: opening auction is noise, mid-morning and
# mid-afternoon are prime institutional windows, close is exit-dominated.
TOD_WINDOWS = [
    # (start_min, end_min, weight 0-1, label)
    (555, 570, 0.20, 'opening_noise'),     # 9:15-9:30
    (570, 660, 1.00, 'morning_prime'),     # 9:30-11:00
    (660, 810, 0.70, 'midday'),            # 11:00-13:30
    (810, 870, 1.00, 'afternoon_prime'),   # 13:30-14:30
    (870, 915, 0.85, 'pre_close'),         # 14:30-15:15
    (915, 930, 0.30, 'close_squareoff'),   # 15:15-15:30
]


# ============================================================================
# HELPERS
# ============================================================================

def _safe_div(a, b):
    """Division returning 0.0 on zero/None denominator."""
    try:
        if not b:
            return 0.0
        return float(a) / float(b)
    except (TypeError, ValueError):
        return 0.0


def _ist_minutes_now():
    """Minutes since midnight IST."""
    now = datetime.now(IST)
    return now.hour * 60 + now.minute


def _tod_weight(ist_minutes=None):
    """Return (weight, label) for the current IST window."""
    m = ist_minutes if ist_minutes is not None else _ist_minutes_now()
    for start, end, weight, label in TOD_WINDOWS:
        if start <= m < end:
            return weight, label
    return 0.30, 'after_hours'


def _strike_distance_weight(strike, spot):
    """
    Weight strikes by distance from spot. ATM±3 carries highest signal,
    deep OTM (>5%) is heavily penalised because most spikes there are
    retail FOMO or hedging flows on Indian indices.
    """
    if not spot or spot <= 0:
        return 0.5
    pct = abs(strike - spot) / spot * 100.0
    if pct <= 1.0:   return 1.00   # ATM ±1%
    if pct <= 2.0:   return 0.85   # ±2%
    if pct <= 3.0:   return 0.65   # ±3%
    if pct <= 5.0:   return 0.40   # ±5%
    return 0.15                    # deep OTM


# ============================================================================
# CORE CLASSIFICATION
# ============================================================================

def classify_buildup(d_premium, d_oi, volume, oi_threshold_pct=0.005, prem_threshold=0.5):
    """
    Classify a single side's (CE or PE) buildup from per-snapshot deltas.

    Inputs are the *delta* between two snapshots, plus the snapshot's volume
    (cumulative volume difference between snapshots is what matters most for
    classification, but raw current volume is used as a churn floor).

    Returns one of:
        long_buildup     - premium up + OI up      (fresh buyers)
        short_buildup    - premium down + OI up    (fresh writers)
        short_covering   - premium up + OI down    (writers exiting)
        long_unwinding   - premium down + OI down  (buyers exiting)
        churn            - OI flat, volume present (no commitment)
        quiet            - no meaningful activity
    """
    oi_flat = abs(d_oi) < max(1, oi_threshold_pct * abs(d_oi if d_oi else 1))
    # Use absolute OI thresholds: <100 contracts of net OI change is noise on Nifty
    if abs(d_oi) < 100:
        oi_flat = True

    prem_flat = abs(d_premium) < prem_threshold

    if oi_flat and (volume or 0) > 0:
        return 'churn'
    if oi_flat and (volume or 0) == 0:
        return 'quiet'

    if d_premium > 0 and d_oi > 0:
        return 'long_buildup'
    if d_premium < 0 and d_oi > 0:
        return 'short_buildup'
    if d_premium > 0 and d_oi < 0:
        return 'short_covering'
    if d_premium < 0 and d_oi < 0:
        return 'long_unwinding'

    # Premium flat but OI changing — classify by OI direction alone
    if d_oi > 0:
        return 'short_buildup'   # OI build with flat premium is usually writer activity
    return 'long_unwinding'


def classify_voi_ratio(volume, oi):
    """
    Classify V/OI ratio into a structural label.

    Returns dict: { ratio, label, signal_strength (0-1) }
    """
    ratio = _safe_div(volume, oi)
    if ratio == 0:
        return {'ratio': 0.0, 'label': 'no_data', 'signal_strength': 0.0}
    if ratio < VOI_POSITION_MAX:
        return {'ratio': round(ratio, 2), 'label': 'position_building', 'signal_strength': 0.95}
    if ratio < VOI_BALANCED_MAX:
        return {'ratio': round(ratio, 2), 'label': 'balanced',         'signal_strength': 0.70}
    if ratio < VOI_CHURN_MIN:
        return {'ratio': round(ratio, 2), 'label': 'mixed',            'signal_strength': 0.40}
    return {'ratio': round(ratio, 2), 'label': 'churn',                'signal_strength': 0.10}


# ============================================================================
# SMART MONEY SCORE
# ============================================================================

def smart_money_score(strike, spot, volume, oi, d_oi, ist_minutes=None):
    """
    Composite score 0-100 estimating likelihood of institutional footprint
    at this strike on this snapshot. Combines four factors:

        - V/OI signal strength      (35%)  position-building dominates
        - ΔOI/Volume conversion     (25%)  high conversion = single-actor
        - Time-of-day               (20%)  prime windows weighted
        - Strike distance from spot (20%)  ATM±3 weighted

    Higher score = more likely institutional. <30 = retail noise, 60+ = real.
    """
    voi = classify_voi_ratio(volume, oi)
    voi_component = voi['signal_strength'] * 100.0

    # Conversion: how much of the volume actually became fresh OI
    conversion = _safe_div(abs(d_oi or 0), volume or 0)
    conversion_component = min(conversion * 100.0, 100.0)

    tod_weight, _tod_label = _tod_weight(ist_minutes)
    tod_component = tod_weight * 100.0

    dist_component = _strike_distance_weight(strike, spot) * 100.0

    score = (voi_component        * 0.35
             + conversion_component * 0.25
             + tod_component        * 0.20
             + dist_component       * 0.20)

    return round(score, 1)


# ============================================================================
# PER-STRIKE ANALYSIS (CURRENT SNAPSHOT)
# ============================================================================

def analyze_strike(row, spot, prev_row=None, ist_minutes=None):
    """
    Compute full volume analytics for one strike's row.

    `row` is one entry from the chain (with ce_oi, pe_oi, ce_vol, pe_vol,
    ce_ltp, pe_ltp, ce_coi, pe_coi, strike).
    `prev_row` is the same strike from the previous snapshot (or None for
    the first snapshot of the session).

    Returns a dict keyed by side (ce, pe) plus a top-level smart_money_score.
    """
    strike = row.get('strike', 0)

    out = {'strike': strike, 'ce': {}, 'pe': {}}

    for side in ('ce', 'pe'):
        oi  = row.get(side + '_oi',  0) or 0
        vol = row.get(side + '_vol', 0) or 0
        ltp = row.get(side + '_ltp', 0) or 0
        # Use COI from chain when available (already a session delta from NSE).
        # Falls back to comparison with prev_row if COI is absent.
        d_oi = row.get(side + '_coi', None)
        if d_oi is None and prev_row:
            d_oi = oi - (prev_row.get(side + '_oi', 0) or 0)
        d_oi = d_oi or 0

        d_premium = 0.0
        if prev_row:
            d_premium = ltp - (prev_row.get(side + '_ltp', 0) or 0)

        # Per-snapshot delta volume (volume since previous snapshot)
        d_volume = vol
        if prev_row:
            d_volume = max(0, vol - (prev_row.get(side + '_vol', 0) or 0))

        voi      = classify_voi_ratio(d_volume or vol, oi)
        buildup  = classify_buildup(d_premium, d_oi, d_volume or vol)
        sm_score = smart_money_score(strike, spot, d_volume or vol, oi, d_oi, ist_minutes)

        out[side] = {
            'oi':                 int(oi),
            'volume':             int(vol),
            'delta_volume':       int(d_volume),
            'delta_oi':           int(d_oi),
            'delta_premium':      round(d_premium, 2),
            'voi_ratio':          voi['ratio'],
            'voi_label':          voi['label'],
            'voi_signal':         voi['signal_strength'],
            'buildup':            buildup,
            'smart_money_score':  sm_score,
            'conversion_pct':     round(_safe_div(abs(d_oi), d_volume or vol) * 100.0, 1),
        }

    # Top-level convenience: max smart-money score across both sides
    out['smart_money_score'] = max(out['ce']['smart_money_score'],
                                   out['pe']['smart_money_score'])
    return out


# ============================================================================
# AGGREGATE SESSION METRICS
# ============================================================================

def aggregate_volume_metrics(chain, spot, atm, prev_chain=None, window=10):
    """
    Aggregate-level volume picture across the chain, scoped to ATM ± `window`.

    Returns:
        {
          total_ce_volume, total_pe_volume,
          total_ce_oi,     total_pe_oi,
          ce_voi_ratio,    pe_voi_ratio,
          churn_pct,                 # session-level: vol that didn't become OI
          ce_pe_volume_ratio,        # >1 = call-heavy session
          dominant_buildup,          # most-common buildup state at ATM±2
          top_volume_strikes,        # top 5 by total vol with full analytics
          atm,
        }
    """
    if not chain:
        return None

    # Index prev_chain by strike for O(1) lookup
    prev_index = {}
    if prev_chain:
        for r in prev_chain:
            prev_index[r.get('strike')] = r

    # Filter to ATM ± window strikes
    scoped = [r for r in chain
              if abs(r.get('strike', 0) - atm) <= window * _strike_step(chain, atm)]
    if not scoped:
        scoped = chain

    ist_minutes = _ist_minutes_now()

    total_ce_vol = sum(r.get('ce_vol', 0) or 0 for r in scoped)
    total_pe_vol = sum(r.get('pe_vol', 0) or 0 for r in scoped)
    total_ce_oi  = sum(r.get('ce_oi', 0)  or 0 for r in scoped)
    total_pe_oi  = sum(r.get('pe_oi', 0)  or 0 for r in scoped)
    total_ce_coi = sum(abs(r.get('ce_coi', 0) or 0) for r in scoped)
    total_pe_coi = sum(abs(r.get('pe_coi', 0) or 0) for r in scoped)

    ce_voi = _safe_div(total_ce_vol, total_ce_oi)
    pe_voi = _safe_div(total_pe_vol, total_pe_oi)

    # Churn: volume that didn't convert to fresh OI
    total_vol = total_ce_vol + total_pe_vol
    total_coi = total_ce_coi + total_pe_coi
    churn_pct = round((1.0 - min(_safe_div(total_coi, total_vol), 1.0)) * 100.0, 1)

    # Per-strike enriched view, sorted by total volume
    enriched = []
    for r in scoped:
        prev = prev_index.get(r.get('strike'))
        analysis = analyze_strike(r, spot, prev, ist_minutes)
        analysis['total_volume'] = (r.get('ce_vol', 0) or 0) + (r.get('pe_vol', 0) or 0)
        enriched.append(analysis)
    enriched.sort(key=lambda x: x['total_volume'], reverse=True)
    top_strikes = enriched[:5]

    # Dominant buildup at ATM±2 (tighter scope for direction read)
    step = _strike_step(chain, atm)
    near_atm = [a for a in enriched if abs(a['strike'] - atm) <= 2 * step]
    buildup_counts = {}
    for a in near_atm:
        for side in ('ce', 'pe'):
            b = a[side]['buildup']
            key = side + '_' + b
            buildup_counts[key] = buildup_counts.get(key, 0) + 1
    dominant = max(buildup_counts.items(), key=lambda x: x[1])[0] if buildup_counts else 'quiet'

    return {
        'total_ce_volume':     total_ce_vol,
        'total_pe_volume':     total_pe_vol,
        'total_ce_oi':         total_ce_oi,
        'total_pe_oi':         total_pe_oi,
        'ce_voi_ratio':        round(ce_voi, 2),
        'pe_voi_ratio':        round(pe_voi, 2),
        'ce_pe_volume_ratio':  round(_safe_div(total_ce_vol, total_pe_vol), 2),
        'churn_pct':           churn_pct,
        'dominant_buildup':    dominant,
        'top_volume_strikes':  top_strikes,
        'atm':                 atm,
        'spot':                spot,
        'tod_window':          _tod_weight(ist_minutes)[1],
        'snapshot_time':       datetime.now(IST).strftime('%H:%M:%S'),
    }


def _strike_step(chain, atm):
    """Infer strike step (50 for Nifty, 100 for BankNifty) from chain."""
    if not chain or len(chain) < 2:
        return 50
    strikes = sorted(set(r.get('strike', 0) for r in chain if r.get('strike')))
    if len(strikes) < 2:
        return 50
    diffs = [strikes[i+1] - strikes[i] for i in range(len(strikes)-1)]
    return min(d for d in diffs if d > 0) if diffs else 50


# ============================================================================
# PUBLIC ENTRY POINT
# ============================================================================

def compute(chain_data, prev_chain_data=None):
    """
    Top-level entry. Called from the Flask route.

    `chain_data` is the dict returned by get_full_chain(symbol). Expects:
        - chain or full_chain: list of per-strike rows
        - spot_price
        - atm_strike
    """
    if not chain_data:
        return None

    chain = chain_data.get('full_chain') or chain_data.get('chain') or []
    spot  = chain_data.get('spot_price', 0) or 0
    atm   = chain_data.get('atm_strike', 0) or 0

    if not chain or not atm:
        return None

    prev_chain = None
    if prev_chain_data:
        prev_chain = prev_chain_data.get('full_chain') or prev_chain_data.get('chain') or []

    return aggregate_volume_metrics(chain, spot, atm, prev_chain, window=10)
