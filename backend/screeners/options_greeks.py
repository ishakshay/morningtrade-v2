"""
screeners/options_greeks.py
Top strikes screener for option buyers — based purely on volume + OI signals.

From real data analysis:
- CE volumes range: 3.2K to 3.3M  (max at 23000)
- PE volumes range: 380K to 4.1M  (max at 23000)
- CE COI range: -2.2K to 89.7K
- PE COI range: -13.2K to 15.1K

Logic for CALLS to buy:
  - Volume in top 50% of chain
  - COI not the highest (not writer-dominated)
  - PE COI > CE COI at same strike (puts being written = bullish bias)
  - LTP > 0, strike above spot preferred (OTM calls)

Logic for PUTS to buy:
  - Volume in top 50% of chain
  - COI not the highest
  - CE COI > PE COI at same strike (calls being written = bearish bias)
  - LTP > 0, strike below spot preferred (OTM puts)
"""

from datetime import datetime

def get_top_strikes(option_chain_result, iv_history=None):
    if not option_chain_result:
        return None

    chain = option_chain_result.get('chain', [])
    spot  = option_chain_result.get('spot_price', 0)

    if not chain or not spot:
        return None

    # Filter to active strikes with valid prices
    active = [r for r in chain if r.get('ce_ltp', 0) > 0 or r.get('pe_ltp', 0) > 0]
    if not active:
        active = chain

    # Sort volumes to find median threshold
    ce_vols = sorted([r.get('ce_vol', 0) for r in active], reverse=True)
    pe_vols = sorted([r.get('pe_vol', 0) for r in active], reverse=True)

    # Use median as threshold (top 50%)
    ce_vol_threshold = ce_vols[len(ce_vols) // 2] if ce_vols else 0
    pe_vol_threshold = pe_vols[len(pe_vols) // 2] if pe_vols else 0

    max_ce_vol   = ce_vols[0] if ce_vols else 1
    max_pe_vol   = pe_vols[0] if pe_vols else 1

    # Max COI for normalization (only positive values)
    ce_chgois    = [r.get('ce_chg_oi', 0) for r in active if r.get('ce_chg_oi', 0) > 0]
    pe_chgois    = [r.get('pe_chg_oi', 0) for r in active if r.get('pe_chg_oi', 0) > 0]
    max_ce_chgoi = max(ce_chgois, default=1)
    max_pe_chgoi = max(pe_chgois, default=1)

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
        strike   = row.get('strike', 0)
        ce_vol   = row.get('ce_vol',    0)
        pe_vol   = row.get('pe_vol',    0)
        ce_chgoi = row.get('ce_chg_oi', 0)
        pe_chgoi = row.get('pe_chg_oi', 0)
        ce_ltp   = row.get('ce_ltp',    0)
        pe_ltp   = row.get('pe_ltp',    0)
        ce_iv    = row.get('ce_iv',     0)
        pe_iv    = row.get('pe_iv',     0)
        is_atm   = row.get('is_atm',    False)

        # ── CALLS ──────────────────────────────────────────────────
        if ce_ltp > 0:
            score   = 0
            reasons = []

            # Volume score 0-30 (normalized)
            vol_pct = ce_vol / max_ce_vol if max_ce_vol > 0 else 0
            score  += vol_pct * 30
            if vol_pct > 0.5:
                reasons.append(f'Vol {_fmt(ce_vol)} ✓')

            # COI not dominant — penalise writer-heavy strikes
            if ce_chgoi > 0 and max_ce_chgoi > 0:
                coi_pct = ce_chgoi / max_ce_chgoi
                if coi_pct > 0.80:
                    score  -= 15
                    reasons.append('Writer dominated ✗')
                elif coi_pct > 0.50:
                    score  -= 5
                elif coi_pct < 0.30:
                    score  += 8
                    reasons.append('Low writer activity ✓')
                else:
                    score  += 2
            elif ce_chgoi < 0:
                # OI unwinding on calls = call sellers exiting = bullish
                score  += 10
                reasons.append('CE OI unwinding ↑')

            # Opposite side: PE COI > CE COI = puts being written = bullish
            if pe_chgoi > ce_chgoi:
                score  += 12
                reasons.append('PE writing > CE ✓')

            # OTM calls preferred (slightly above spot)
            if spot < strike <= spot * 1.02:
                score  += 8
                reasons.append('OTM ✓')
            elif strike > spot * 1.02:
                score  -= 3  # too far OTM

            # IV level
            if 0 < ce_iv <= 25:
                score  += 5
                reasons.append(f'IV {ce_iv}%')
            elif ce_iv > 35:
                score  -= 5  # too expensive

            # IV rising
            if iv_rising:
                score  += 4
                reasons.append('IV ↑')

            call_candidates.append({
                'strike':    strike,
                'ltp':       ce_ltp,
                'iv':        ce_iv,
                'volume':    ce_vol,
                'chg_oi':    ce_chgoi,
                'opp_chgoi': pe_chgoi,
                'score':     round(score, 1),
                'reason':    ' · '.join(reasons),
                'iv_rising': iv_rising,
            })

        # ── PUTS ───────────────────────────────────────────────────
        if pe_ltp > 0:
            score   = 0
            reasons = []

            # Volume score 0-30
            vol_pct = pe_vol / max_pe_vol if max_pe_vol > 0 else 0
            score  += vol_pct * 30
            if vol_pct > 0.5:
                reasons.append(f'Vol {_fmt(pe_vol)} ✓')

            # COI not dominant
            if pe_chgoi > 0 and max_pe_chgoi > 0:
                coi_pct = pe_chgoi / max_pe_chgoi
                if coi_pct > 0.80:
                    score  -= 15
                    reasons.append('Writer dominated ✗')
                elif coi_pct > 0.50:
                    score  -= 5
                elif coi_pct < 0.30:
                    score  += 8
                    reasons.append('Low writer activity ✓')
                else:
                    score  += 2
            elif pe_chgoi < 0:
                # OI unwinding on puts = put sellers exiting = bearish
                score  += 10
                reasons.append('PE OI unwinding ↓')

            # Opposite side: CE COI > PE COI = calls being written = bearish
            if ce_chgoi > pe_chgoi:
                score  += 12
                reasons.append('CE writing > PE ✓')

            # OTM puts preferred (slightly below spot)
            if spot * 0.98 <= strike < spot:
                score  += 8
                reasons.append('OTM ✓')
            elif strike < spot * 0.98:
                score  -= 3  # too far OTM

            # IV level
            if 0 < pe_iv <= 25:
                score  += 5
                reasons.append(f'IV {pe_iv}%')
            elif pe_iv > 35:
                score  -= 5

            # IV rising
            if iv_rising:
                score  += 4
                reasons.append('IV ↑')

            put_candidates.append({
                'strike':    strike,
                'ltp':       pe_ltp,
                'iv':        pe_iv,
                'volume':    pe_vol,
                'chg_oi':    pe_chgoi,
                'opp_chgoi': ce_chgoi,
                'score':     round(score, 1),
                'reason':    ' · '.join(reasons),
                'iv_rising': iv_rising,
            })

    # Sort by score, take top 3
    top_calls = sorted(call_candidates, key=lambda x: x['score'], reverse=True)[:3]
    top_puts  = sorted(put_candidates,  key=lambda x: x['score'], reverse=True)[:3]

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
    if n >= 100000: return f'{n/100000:.1f}L'
    if n >= 1000:   return f'{n/1000:.0f}K'
    return str(n)