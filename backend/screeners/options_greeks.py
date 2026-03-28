"""
screeners/options_greeks.py
Top strikes for option buyers — corrected logic.

CALLS — you need spot to go UP:
  1. High volume (liquidity)
  2. CE COI moderate/low — writers not piling in
  3. PE COI > CE COI at same strike — put writers confident spot stays above = bullish
  4. Strike 1-3% above spot (OTM only)
  5. Moderate IV (15-28%) — not too expensive
  6. Penalise ITM calls (strike below spot)

PUTS — you need spot to go DOWN:
  1. High volume (liquidity)
  2. PE COI moderate/low — writers not piling in
  3. CE COI > PE COI at same strike — call writers confident spot stays below = bearish
  4. Strike 1-3% below spot (OTM only)
  5. Moderate IV (15-28%)
  6. Penalise ITM puts (strike above spot)

REMOVED (were wrong):
  - OI unwinding bonus — unwinding means conviction is reducing, not increasing
  - ITM strikes — high volume but bad risk/reward for buyers
"""

from datetime import datetime


def get_top_strikes(option_chain_result, iv_history=None):
    if not option_chain_result:
        return None

    chain = option_chain_result.get('chain', [])
    spot  = option_chain_result.get('spot_price', 0)

    if not chain or not spot:
        return None

    # Only active strikes with valid LTP
    active = [r for r in chain if r.get('ce_ltp', 0) > 0 and r.get('pe_ltp', 0) > 0]
    if not active:
        active = [r for r in chain if r.get('ce_ltp', 0) > 0 or r.get('pe_ltp', 0) > 0]

    if not active:
        return None

    # Normalisation references
    max_ce_vol   = max((r.get('ce_vol',    0) for r in active), default=1)
    max_pe_vol   = max((r.get('pe_vol',    0) for r in active), default=1)
    max_ce_chgoi = max((r.get('ce_chg_oi', 0) for r in active if r.get('ce_chg_oi', 0) > 0), default=1)
    max_pe_chgoi = max((r.get('pe_chg_oi', 0) for r in active if r.get('pe_chg_oi', 0) > 0), default=1)

    # IV trend
    iv_rising = False
    if iv_history and len(iv_history) >= 2:
        last      = iv_history[-1]
        prev      = iv_history[-2]
        avg_now   = (last.get('ce_iv', 0) + last.get('pe_iv', 0)) / 2
        avg_prv   = (prev.get('ce_iv', 0) + prev.get('pe_iv', 0)) / 2
        iv_rising = avg_now > avg_prv

    call_candidates = []
    put_candidates  = []

    for row in active:
        strike   = row.get('strike',    0)
        ce_vol   = row.get('ce_vol',    0)
        pe_vol   = row.get('pe_vol',    0)
        ce_chgoi = row.get('ce_chg_oi', 0)
        pe_chgoi = row.get('pe_chg_oi', 0)
        ce_ltp   = row.get('ce_ltp',    0)
        pe_ltp   = row.get('pe_ltp',    0)
        ce_iv    = row.get('ce_iv',     0)
        pe_iv    = row.get('pe_iv',     0)

        otm_pct   = (strike - spot) / spot * 100   # positive = above spot
        is_otm_ce = 0.3 <= otm_pct <= 3.5          # call OTM zone
        is_otm_pe = -3.5 <= otm_pct <= -0.3        # put OTM zone

        # ── CALLS ──────────────────────────────────────────────────────────
        if ce_ltp > 0:
            score   = 0
            reasons = []

            # Hard filter: must be OTM for calls
            if otm_pct < 0:
                # ITM call — penalise heavily, less leverage
                score -= 30
                reasons.append('ITM ✗')
            elif otm_pct > 4:
                # Too far OTM — low probability
                score -= 15
                reasons.append('Far OTM ✗')

            # Signal 1: Volume (0-25 pts)
            vol_pct = ce_vol / max_ce_vol if max_ce_vol > 0 else 0
            vol_score = vol_pct * 25
            score += vol_score
            if vol_pct >= 0.4:
                reasons.append(f'Vol {_fmt(ce_vol)} ✓')

            # Signal 2: CE COI — writers not dominant (0 to +10, or -15)
            if ce_chgoi > 0 and max_ce_chgoi > 0:
                coi_pct = ce_chgoi / max_ce_chgoi
                if coi_pct >= 0.80:
                    score  -= 15
                    reasons.append('Writers dominant ✗')
                elif coi_pct >= 0.50:
                    score  -= 5
                    reasons.append('Moderate writers')
                elif coi_pct <= 0.25:
                    score  += 10
                    reasons.append('Low CE writing ✓')
                else:
                    score  += 3
            elif ce_chgoi <= 0:
                # Zero or negative — no fresh call writing, neutral
                score += 2

            # Signal 3: PE COI > CE COI = put writers confident spot stays above (0-20 pts)
            if pe_chgoi > 0 and ce_chgoi >= 0:
                if pe_chgoi > ce_chgoi:
                    ratio  = min(pe_chgoi / max(ce_chgoi, 1), 5)
                    score += min(ratio * 4, 20)
                    reasons.append(f'PE writing ({_fmt(pe_chgoi)}) > CE ✓')
            elif pe_chgoi > 0 and ce_chgoi < 0:
                # Put writers active, call writers exiting — strongly bullish setup
                score  += 20
                reasons.append('PE writing, CE exiting ✓✓')

            # Signal 4: OTM sweet spot (0-10 pts)
            if is_otm_ce:
                # Score highest at 1-2% OTM, less at edges
                otm_score = 10 - abs(otm_pct - 1.5) * 3
                score    += max(otm_score, 2)
                reasons.append(f'{otm_pct:.1f}% OTM ✓')

            # Signal 5: IV level (0-8 pts, penalty if too high)
            if 15 <= ce_iv <= 28:
                score  += 8
                reasons.append(f'IV {ce_iv}% ✓')
            elif ce_iv < 15:
                score  += 3   # very cheap, could be illiquid
            elif 28 < ce_iv <= 35:
                score  -= 3   # getting expensive
            elif ce_iv > 35:
                score  -= 8   # too expensive, IV crush risk

            # Signal 6: IV rising bonus (0-5 pts)
            if iv_rising:
                score  += 5
                reasons.append('IV rising ✓')

            call_candidates.append({
                'strike':    strike,
                'ltp':       ce_ltp,
                'iv':        ce_iv,
                'volume':    ce_vol,
                'chg_oi':    ce_chgoi,
                'opp_chgoi': pe_chgoi,
                'otm_pct':   round(otm_pct, 2),
                'score':     round(score, 1),
                'reason':    ' · '.join(reasons) if reasons else '—',
                'iv_rising': iv_rising,
            })

        # ── PUTS ───────────────────────────────────────────────────────────
        if pe_ltp > 0:
            score   = 0
            reasons = []

            # Hard filter: must be OTM for puts
            if otm_pct > 0:
                # ITM put (strike above spot) — penalise
                score -= 30
                reasons.append('ITM ✗')
            elif otm_pct < -4:
                # Too far OTM
                score -= 15
                reasons.append('Far OTM ✗')

            # Signal 1: Volume (0-25 pts)
            vol_pct   = pe_vol / max_pe_vol if max_pe_vol > 0 else 0
            vol_score = vol_pct * 25
            score    += vol_score
            if vol_pct >= 0.4:
                reasons.append(f'Vol {_fmt(pe_vol)} ✓')

            # Signal 2: PE COI — writers not dominant (0 to +10, or -15)
            if pe_chgoi > 0 and max_pe_chgoi > 0:
                coi_pct = pe_chgoi / max_pe_chgoi
                if coi_pct >= 0.80:
                    score  -= 15
                    reasons.append('Writers dominant ✗')
                elif coi_pct >= 0.50:
                    score  -= 5
                    reasons.append('Moderate writers')
                elif coi_pct <= 0.25:
                    score  += 10
                    reasons.append('Low PE writing ✓')
                else:
                    score  += 3
            elif pe_chgoi <= 0:
                # Zero or negative — no fresh put writing, neutral
                score += 2

            # Signal 3: CE COI > PE COI = call writers confident spot stays below (0-20 pts)
            if ce_chgoi > 0 and pe_chgoi >= 0:
                if ce_chgoi > pe_chgoi:
                    ratio  = min(ce_chgoi / max(pe_chgoi, 1), 5)
                    score += min(ratio * 4, 20)
                    reasons.append(f'CE writing ({_fmt(ce_chgoi)}) > PE ✓')
            elif ce_chgoi > 0 and pe_chgoi < 0:
                # Call writers active, put writers exiting — strongly bearish setup
                score  += 20
                reasons.append('CE writing, PE exiting ✓✓')

            # Signal 4: OTM sweet spot (0-10 pts)
            if is_otm_pe:
                otm_score = 10 - abs(otm_pct + 1.5) * 3
                score    += max(otm_score, 2)
                reasons.append(f'{abs(otm_pct):.1f}% OTM ✓')

            # Signal 5: IV level (0-8 pts)
            if 15 <= pe_iv <= 28:
                score  += 8
                reasons.append(f'IV {pe_iv}% ✓')
            elif pe_iv < 15:
                score  += 3
            elif 28 < pe_iv <= 35:
                score  -= 3
            elif pe_iv > 35:
                score  -= 8

            # Signal 6: IV rising bonus
            if iv_rising:
                score  += 5
                reasons.append('IV rising ✓')

            put_candidates.append({
                'strike':    strike,
                'ltp':       pe_ltp,
                'iv':        pe_iv,
                'volume':    pe_vol,
                'chg_oi':    pe_chgoi,
                'opp_chgoi': ce_chgoi,
                'otm_pct':   round(abs(otm_pct), 2),
                'score':     round(score, 1),
                'reason':    ' · '.join(reasons) if reasons else '—',
                'iv_rising': iv_rising,
            })

    # Sort and take top 3 — only positive scores qualify
    top_calls = sorted(
        [c for c in call_candidates if c['score'] > 0],
        key=lambda x: x['score'], reverse=True
    )[:3]

    top_puts = sorted(
        [p for p in put_candidates if p['score'] > 0],
        key=lambda x: x['score'], reverse=True
    )[:3]

    return {
        'top_calls': top_calls,
        'top_puts':  top_puts,
        'spot':      spot,
        'expiry':    option_chain_result.get('expiry', ''),
        'iv_rising': iv_rising,
        'timestamp': datetime.now().strftime('%H:%M:%S'),
    }


def _fmt(n):
    if not n: return '—'
    if abs(n) >= 100000: return f'{n/100000:.1f}L'
    if abs(n) >= 1000:   return f'{n/1000:.0f}K'
    return str(n)