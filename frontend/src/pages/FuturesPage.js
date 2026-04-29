import { useState, useEffect, useRef } from 'react';
import PageTitle from '../components/PageTitle';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import GammaBlast from './GammaBlast';

var API = 'http://localhost:3001';

var SYMBOLS = [
  { code: 'NIFTY',     label: 'NIFTY 50',  flag: '📊' },
  { code: 'BANKNIFTY', label: 'BANKNIFTY', flag: '🏦' },
];

var SIGNAL_COLORS = {
  'Long Buildup':   '#4ade80',
  'Short Covering': '#60a5fa',
  'Short Buildup':  '#f87171',
  'Long Unwinding': '#f59e0b',
  'Absorption':     '#a78bfa',
  'Neutral':        '#64748b',
};

var SIGNAL_EMOJI = {
  'Long Buildup':   '🟢',
  'Short Covering': '🔵',
  'Short Buildup':  '🔴',
  'Long Unwinding': '🟠',
  'Absorption':     '🟣',
  'Neutral':        '⚪',
};

// Bullish signals (good for CE buyers); Bearish signals (good for PE buyers)
var BULLISH_SIGS = ['Long Buildup', 'Short Covering'];
var BEARISH_SIGS = ['Short Buildup', 'Long Unwinding'];

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmtOI(n) {
  if (n === null || n === undefined) return '—';
  var abs = Math.abs(n);
  if (abs >= 100000) return (n / 100000).toFixed(1) + 'L';
  if (abs >= 1000)   return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function fmtPrice(n) {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString();
}

function fmtDelta(n) {
  if (n === null || n === undefined) return '—';
  return (n > 0 ? '+' : '') + n;
}

function fmtSecsAgo(secs) {
  if (secs < 60)  return secs + 's ago';
  if (secs < 3600) return Math.floor(secs / 60) + 'm ago';
  return Math.floor(secs / 3600) + 'h ago';
}

function signalColor(s) { return SIGNAL_COLORS[s] || '#64748b'; }

function trendColor(s) {
  if (s === 'Bullish') return '#4ade80';
  if (s === 'Bearish') return '#f87171';
  return '#f59e0b';
}

function confColor(n) {
  if (n >= 70) return '#4ade80';
  if (n >= 40) return '#f59e0b';
  return '#f87171';
}

// ─── Smoothing — faster response than majority-of-3 ──────────────────────────
// Old version required 2-of-3 in last 3 ticks (3+ min lag). New: majority of
// last 2 ticks for display, with high-confidence override.
function smoothedSignal(history, rawSignal, rawConf) {
  if (!history || history.length < 2) {
    return { signal: rawSignal, confidence: rawConf, isShift: false, isSmoothed: false };
  }
  var last2 = history.slice(-2);
  var last3 = history.slice(-3);
  var prev3 = history.slice(-6, -3);

  // Majority of last 2 — much faster than majority of 3
  var s0 = last2[0] && last2[0].signal;
  var s1 = last2[1] && last2[1].signal;
  var voted = (s0 === s1) ? s0 : rawSignal;  // tie → trust raw

  // High-confidence override: if latest tick conf >= 75 and disagrees with
  // vote, surface the latest. Catches genuine fast flips.
  var lastConf = last2[1] && last2[1].confidence;
  if (lastConf >= 75 && rawSignal !== voted) voted = rawSignal;

  // EMA on confidence (alpha=0.4) — keeps the bar from jittering tick-to-tick
  var confVals = history.slice(-5).map(function(h) { return h.confidence || 0; });
  var alpha = 0.4, ema = confVals[0];
  for (var i = 1; i < confVals.length; i++) ema = alpha * confVals[i] + (1 - alpha) * ema;
  var smoothConf = Math.round(ema);

  // Shift detector: last 3 all agree AND prior cluster ended on a different signal
  var allSame    = last3.length === 3 && last3.every(function(h) { return h.signal === last3[0].signal; });
  var prevSignal = prev3.length > 0 ? prev3[prev3.length - 1].signal : null;
  var isShift    = allSame && prevSignal && prevSignal !== last3[0].signal;

  if (isShift) {
    return { signal: voted, confidence: rawConf, isShift: true, isSmoothed: false };
  }
  return { signal: voted, confidence: smoothConf, isShift: false, isSmoothed: voted !== rawSignal };
}

// ─── Signal duration: how long has the current signal been active? ───────────
// Walks history backwards counting consecutive matching signals.
function signalDurationMin(history, currentSignal) {
  if (!history || history.length === 0) return 0;
  var count = 0;
  for (var i = history.length - 1; i >= 0; i--) {
    if (history[i].signal === currentSignal) count++;
    else break;
  }
  // Each tick = 60s
  return count;
}

// ─── Acceleration: are recent ΔOI magnitudes growing or shrinking? ───────────
// Compares mean |ΔOI| of last 3 ticks vs prior 3 ticks. Returns
// 'accelerating', 'fading', or 'steady'.
function flowAcceleration(history) {
  if (!history || history.length < 6) return 'steady';
  var recent = history.slice(-3);
  var prior  = history.slice(-6, -3);
  function mean(rows) {
    var vals = rows.map(function(r) { return Math.abs(r.d_oi || 0); });
    return vals.reduce(function(a, b) { return a + b; }, 0) / Math.max(vals.length, 1);
  }
  var recMean = mean(recent), priMean = mean(prior);
  if (priMean === 0) return 'steady';
  var ratio = recMean / priMean;
  if (ratio > 1.4) return 'accelerating';
  if (ratio < 0.7) return 'fading';
  return 'steady';
}

// ─── Buyer Verdict — the central state machine ───────────────────────────────
// Combines signal direction × signal duration × spot direction × basis behavior
// into a single buyer-actionable verdict. Returns:
//   { state: 'CONFIRMED'|'FRAGILE'|'TRAP'|'NEUTRAL'|'WARMING',
//     bias:  'CALL'|'PUT'|'NONE',
//     headline: string,
//     reasons: [string], color: string }
function buyerVerdict(data, smoothed) {
  if (!data) return { state: 'WARMING', bias: 'NONE', headline: 'Awaiting first snapshot', reasons: [], color: '#64748b' };

  var sig      = smoothed.signal;
  var conf     = smoothed.confidence;
  var history  = data.history || [];
  var duration = signalDurationMin(history, sig);   // approx minutes
  var accel    = flowAcceleration(history);
  var dPrice   = data.d_price || 0;
  var basis    = data.basis;
  var basisTrend = (function() {
    // Last 5 basis values from history
    var b = history.slice(-5).map(function(r) {
      if (r.basis !== undefined && r.basis !== null) return r.basis;
      if (r.ltp && r.spot_ltp) return r.ltp - r.spot_ltp;
      return null;
    }).filter(function(v) { return v !== null; });
    if (b.length < 3) return 'flat';
    var first = b[0], last = b[b.length - 1];
    if (last > first + 3) return 'expanding';
    if (last < first - 3) return 'compressing';
    return 'flat';
  })();

  // Detect spot-flow disagreement (TRAP)
  // Spot up but signal is bearish OR Absorption with rising OI = sellers absorbing
  var spotUp   = dPrice > 0;
  var spotDn   = dPrice < 0;
  var signalBullish = BULLISH_SIGS.indexOf(sig) >= 0;
  var signalBearish = BEARISH_SIGS.indexOf(sig) >= 0;

  // Absorption with high OI build = trap
  if (sig === 'Absorption' && Math.abs(data.d_oi || 0) > 0) {
    return {
      state: 'TRAP', bias: 'NONE', color: '#a78bfa',
      headline: spotUp
        ? 'TRAP WARNING — sellers absorbing buying pressure'
        : spotDn
          ? 'TRAP WARNING — buyers absorbing selling pressure'
          : 'ABSORPTION — both sides fighting, no clean direction',
      reasons: [
        'Price ≈ flat but OI building heavily',
        'Avoid fresh CE/PE entries — wait for break',
        accel === 'accelerating' ? 'Activity accelerating — resolution near' : 'Hold for break confirmation',
      ],
    };
  }

  // Spot up but signal bearish → trap for CE buyers
  if (spotUp && signalBearish) {
    return {
      state: 'TRAP', bias: 'NONE', color: '#f59e0b',
      headline: 'TRAP WARNING — spot rising into bearish flow',
      reasons: [
        sig + ' active despite spot ' + (dPrice > 0 ? '+' : '') + dPrice,
        'CE buying discouraged — likely fade',
        'PE entries on confirmation if flow strengthens',
      ],
    };
  }
  // Spot down but signal bullish → trap for PE buyers
  if (spotDn && signalBullish) {
    return {
      state: 'TRAP', bias: 'NONE', color: '#f59e0b',
      headline: 'TRAP WARNING — spot falling into bullish flow',
      reasons: [
        sig + ' active despite spot ' + dPrice,
        'PE buying discouraged — likely fade',
        'CE entries on confirmation if flow strengthens',
      ],
    };
  }

  // Now classify CONFIRMED vs FRAGILE for aligned cases
  function classify(bias) {
    var reasons = [];
    var weakFlags = 0;

    // Long Unwinding / Short Covering are weaker than fresh buildup
    var isFreshBuildup = (sig === 'Long Buildup' || sig === 'Short Buildup');
    if (!isFreshBuildup) weakFlags++;

    // Short signal duration = fragile
    if (duration < 3) { weakFlags++; reasons.push('signal only ' + duration + ' min old'); }
    else              { reasons.push('signal sustained ' + duration + ' min'); }

    // Low confidence = fragile
    if (conf < 50) { weakFlags++; reasons.push('confidence low at ' + conf); }
    else if (conf >= 75) reasons.push('confidence high at ' + conf);
    else                 reasons.push('confidence at ' + conf);

    // Acceleration vs fading
    if (accel === 'accelerating') reasons.push('OI flow accelerating');
    else if (accel === 'fading')  { weakFlags++; reasons.push('OI flow fading'); }

    // Basis alignment
    var basisAligned =
      (bias === 'CALL' && basisTrend === 'expanding') ||
      (bias === 'PUT'  && basisTrend === 'compressing');
    var basisDisagree =
      (bias === 'CALL' && basisTrend === 'compressing') ||
      (bias === 'PUT'  && basisTrend === 'expanding');
    if (basisAligned)        reasons.push('basis ' + basisTrend + ' confirms');
    else if (basisDisagree)  { weakFlags++; reasons.push('basis ' + basisTrend + ' disagrees'); }

    // Short-covering / long-unwinding without fresh OI build = always FRAGILE
    if ((sig === 'Short Covering' || sig === 'Long Unwinding') && weakFlags === 0) weakFlags = 1;

    var state = weakFlags >= 2 ? 'FRAGILE' : 'CONFIRMED';
    var color = state === 'CONFIRMED'
      ? (bias === 'CALL' ? '#4ade80' : '#f87171')
      : '#f59e0b';
    var biasLabel = bias === 'CALL' ? 'CALL-FRIENDLY' : 'PUT-FRIENDLY';
    var headline = biasLabel + ' · ' + state + ' — ' + sig;
    return { state: state, bias: bias, color: color, headline: headline, reasons: reasons };
  }

  if (signalBullish) return classify('CALL');
  if (signalBearish) return classify('PUT');

  // Neutral / no clear signal
  return {
    state: 'NEUTRAL', bias: 'NONE', color: '#64748b',
    headline: 'NO BUYER EDGE — flow indecisive',
    reasons: [
      sig + ' active for ' + duration + ' min',
      'wait for clearer flow before entering',
      'consider holding existing positions only',
    ],
  };
}

// ─── Spot vs Futures divergence — the buyer-relevant basis read ──────────────
// Walks recent history to compute how futures has been moving relative to spot.
// "Futures leading spot up by +X over N min" = institutions leaning into move.
function divergenceRead(history, currentBasis) {
  if (!history || history.length < 3) {
    return { state: 'unknown', label: 'Building data', color: '#64748b', detail: '', deltaBasis: null, windowMin: 0 };
  }

  // Use up to last 8 ticks for the window
  var win = history.slice(-8);
  var basisVals = win.map(function(r) {
    if (r.basis !== undefined && r.basis !== null) return r.basis;
    if (r.ltp && r.spot_ltp) return r.ltp - r.spot_ltp;
    return null;
  }).filter(function(v) { return v !== null; });

  if (basisVals.length < 3) {
    return { state: 'unknown', label: 'Building data', color: '#64748b', detail: '', deltaBasis: null, windowMin: 0 };
  }

  var firstBasis = basisVals[0];
  var lastBasis  = basisVals[basisVals.length - 1];
  var delta      = Math.round((lastBasis - firstBasis) * 10) / 10;
  var windowMin  = basisVals.length;  // each ~1 min

  // Spot direction over same window
  var spotFirst = win[0] && (win[0].spot_ltp || null);
  var spotLast  = win[win.length - 1] && (win[win.length - 1].spot_ltp || null);
  var spotMove  = (spotFirst && spotLast) ? spotLast - spotFirst : null;

  // Classify
  // "Leading up" = basis expanding (futures > spot more than before) AND spot rising
  // "Leading down" = basis compressing AND spot falling
  // "Lagging" = basis moving opposite to spot
  // "Stable" = basis ±2 over window
  if (Math.abs(delta) <= 2) {
    return {
      state: 'stable', label: 'Spot–Futures stable', color: '#64748b',
      detail: 'Basis ' + (currentBasis > 0 ? '+' : '') + currentBasis + ' · no institutional lean',
      deltaBasis: delta, windowMin: windowMin,
    };
  }
  if (delta > 2 && spotMove != null && spotMove > 0) {
    return {
      state: 'leading_up', label: 'Futures leading spot UP', color: '#4ade80',
      detail: 'Basis +' + delta + ' over ' + windowMin + ' min · spot +' + Math.round(spotMove) + ' · institutional bid',
      deltaBasis: delta, windowMin: windowMin,
    };
  }
  if (delta < -2 && spotMove != null && spotMove < 0) {
    return {
      state: 'leading_dn', label: 'Futures leading spot DOWN', color: '#f87171',
      detail: 'Basis ' + delta + ' over ' + windowMin + ' min · spot ' + Math.round(spotMove) + ' · institutional offer',
      deltaBasis: delta, windowMin: windowMin,
    };
  }
  if (delta > 2 && spotMove != null && spotMove < 0) {
    return {
      state: 'lagging', label: 'Futures lagging — spot falling but basis expanding', color: '#a78bfa',
      detail: 'Possible squeeze setup or short cover · CE buyers cautious',
      deltaBasis: delta, windowMin: windowMin,
    };
  }
  if (delta < -2 && spotMove != null && spotMove > 0) {
    return {
      state: 'lagging', label: 'Futures lagging — spot rising but basis compressing', color: '#a78bfa',
      detail: 'Late-day position unwind · rally may not sustain',
      deltaBasis: delta, windowMin: windowMin,
    };
  }
  return {
    state: 'mixed', label: 'Mixed signal', color: '#64748b',
    detail: 'Basis Δ ' + delta + ' over ' + windowMin + ' min',
    deltaBasis: delta, windowMin: windowMin,
  };
}

// ─── Move Durability (0–100) — forward-looking confidence ────────────────────
// Components:
//   Signal consistency over last 5 ticks   40 pts
//   OI flow acceleration                   25 pts
//   Basis confirming direction             20 pts
//   Spot direction agreeing with signal    15 pts
function moveDurability(data, smoothed, divergence) {
  if (!data || !data.history || data.history.length < 3) {
    return { score: 0, components: [], state: 'WARMING' };
  }
  var history = data.history;
  var sig     = smoothed.signal;

  // 1. Signal consistency — fraction of last 5 ticks matching current
  var last5 = history.slice(-5);
  var matchCount = last5.filter(function(h) { return h.signal === sig; }).length;
  var consistency = Math.round((matchCount / last5.length) * 40);

  // 2. Acceleration
  var accel = flowAcceleration(history);
  var accelScore = accel === 'accelerating' ? 25 : accel === 'steady' ? 12 : 0;

  // 3. Basis alignment
  var basisScore = 0;
  var bullishSig = BULLISH_SIGS.indexOf(sig) >= 0;
  var bearishSig = BEARISH_SIGS.indexOf(sig) >= 0;
  if (bullishSig && divergence.state === 'leading_up')   basisScore = 20;
  else if (bearishSig && divergence.state === 'leading_dn') basisScore = 20;
  else if (divergence.state === 'stable')                   basisScore = 8;
  else if (divergence.state === 'lagging')                  basisScore = 0;

  // 4. Spot direction
  var dPrice = data.d_price || 0;
  var spotScore = 0;
  if (bullishSig && dPrice > 0) spotScore = 15;
  else if (bearishSig && dPrice < 0) spotScore = 15;
  else if (Math.abs(dPrice) < 5) spotScore = 6;

  var total = consistency + accelScore + basisScore + spotScore;
  return {
    score: total,
    components: [
      { label: 'Signal Consistency',   value: consistency, max: 40, detail: matchCount + '/5 last ticks match' },
      { label: 'Flow Acceleration',    value: accelScore,  max: 25, detail: accel },
      { label: 'Basis Alignment',      value: basisScore,  max: 20, detail: divergence.state.replace('_', ' ') },
      { label: 'Spot Direction',       value: spotScore,   max: 15, detail: dPrice > 0 ? 'spot up ' + dPrice : dPrice < 0 ? 'spot down ' + dPrice : 'spot flat' },
    ],
    state: total >= 70 ? 'STRONG' : total >= 40 ? 'MODERATE' : 'WEAK',
  };
}

// ─── Theta runway — time-of-day helper for buyers ────────────────────────────
function thetaRunway() {
  var ist  = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  var mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  var closeMin = 15 * 60 + 30;  // 15:30 IST
  if (mins >= closeMin) return { state: 'closed', minutesLeft: 0, label: 'Market closed', color: '#64748b' };
  if (mins < 9 * 60 + 15) return { state: 'preopen', minutesLeft: closeMin - (9 * 60 + 15), label: 'Pre-open', color: '#64748b' };
  var left = closeMin - mins;
  if (mins >= 15 * 60)      return { state: 'critical', minutesLeft: left, label: '⚠ ' + left + 'm left · theta heavy · favour resolutions in 15-30m', color: '#f87171' };
  if (mins >= 14 * 60 + 30) return { state: 'caution',  minutesLeft: left, label: '⚠ ' + left + 'm left · theta zone · favour resolutions in 30-45m', color: '#f59e0b' };
  if (mins >= 14 * 60)      return { state: 'caution',  minutesLeft: left, label: left + 'm left · theta drag picking up', color: '#f59e0b' };
  if (mins >= 13 * 60)      return { state: 'normal',   minutesLeft: left, label: Math.floor(left/60) + 'h ' + (left%60) + 'm left · normal runway', color: '#a3e635' };
  return { state: 'fresh', minutesLeft: left, label: '✓ ' + Math.floor(left/60) + 'h ' + (left%60) + 'm left · favourable runway', color: '#4ade80' };
}

// ─── Session helpers (IST) ────────────────────────────────────────────────────
function isMarketOpen() {
  var ist  = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  var day  = ist.getUTCDay();
  if (day === 0 || day === 6) return false;
  var mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return mins >= 555 && mins < 930;  // 9:15–15:30 IST
}

function shouldClearData() {
  var ist  = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  var day  = ist.getUTCDay();
  if (day === 0 || day === 6) return false;
  var mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return mins >= 480 && mins < 555;  // 8:00–9:15 IST
}

// ─── UI primitives ────────────────────────────────────────────────────────────

function ConfBar(props) {
  var n   = props.n || 0;
  var col = confColor(n);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: n + '%', height: '100%', background: col, borderRadius: 3, transition: 'width 0.5s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: col, minWidth: 28 }}>{n}</span>
    </div>
  );
}

function StatBox(props) {
  return (
    <div style={{ padding: '10px 14px', background: '#1e293b', borderRadius: 8, minWidth: 80, flex: 1 }}>
      <p style={{ fontSize: 9, color: '#475569', margin: '0 0 3px',
                  fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {props.label}
      </p>
      <span style={{ fontSize: 17, fontWeight: 800, color: props.color || '#f1f5f9' }}>{props.value}</span>
      {props.sub && <p style={{ fontSize: 9, color: props.subColor || '#64748b', margin: '2px 0 0' }}>{props.sub}</p>}
    </div>
  );
}

function TrendPill(props) {
  var trend = props.trend || {};
  var col   = props.color || trendColor(trend.label) || '#64748b';
  if (!trend.label) return null;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 20,
                  background: col + '20', border: '1px solid ' + col + '44' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: col,
                     textTransform: 'uppercase', letterSpacing: '0.05em' }}>{trend.label}</span>
      <span style={{ fontSize: 10, color: '#64748b' }}>{trend.strength}% · {trend.window} snaps</span>
    </div>
  );
}

function Alerts(props) {
  var alerts = props.alerts || [];
  if (!alerts.length) return null;
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {alerts.map(function(a, i) {
        return (
          <div key={i} style={{ padding: '4px 10px', borderRadius: 6,
                                background: a.color + '18', border: '1px solid ' + a.color + '44',
                                fontSize: 11, color: a.color, fontWeight: 600 }}>
            ⚡ {a.msg}
          </div>
        );
      })}
    </div>
  );
}

// ─── Signal sparkline — confidence-weighted ──────────────────────────────────
function SignalSparkline(props) {
  var history = props.history || [];
  var width   = props.width   || 300;
  var height  = props.height  || 48;

  var SCORE = {
    'Long Buildup':   2,
    'Short Covering': 1,
    'Neutral':        0,
    'Absorption':     0,
    'Long Unwinding': -1,
    'Short Buildup':  -2,
  };

  if (history.length < 2) {
    return (
      <div style={{ width: width, height: height, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 11, color: '#334155' }}>
        collecting data…
      </div>
    );
  }

  // Confidence-weighted score: a high-confidence Short Covering (+1 × 90%) now
  // outweighs a low-confidence Long Buildup (+2 × 30%) — the line shape
  // reflects intensity, not just direction.
  var values = history.slice(-40).map(function(h) {
    var base = SCORE[h.signal] !== undefined ? SCORE[h.signal] : 0;
    var conf = (h.confidence || 0) / 100;
    return base * conf;
  });

  var padX = 4, padY = 6;
  var cW   = width  - padX * 2;
  var cH   = height - padY * 2;
  var minV = -2, range = 4;
  var points = values.map(function(v, i) {
    var x = padX + (i / Math.max(values.length - 1, 1)) * cW;
    var y = padY + cH - ((v - minV) / range) * cH;
    return x + ',' + y;
  }).join(' ');
  var lastVal = values[values.length - 1];
  var col     = lastVal > 0.1 ? '#4ade80' : lastVal < -0.1 ? '#f87171' : '#64748b';
  var lastX   = padX + cW;
  var lastY   = padY + cH - ((lastVal - minV) / range) * cH;
  var zeroY   = padY + cH - ((0 - minV) / range) * cH;
  var fillPts = points + ' ' + lastX + ',' + (padY + cH) + ' ' + padX + ',' + (padY + cH);

  return (
    <svg width={width} height={height} viewBox={'0 0 ' + width + ' ' + height}>
      <line x1={padX} y1={zeroY} x2={padX + cW} y2={zeroY}
            stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
      <polygon points={fillPts} fill={col} opacity="0.08" />
      <polyline points={points} fill="none" stroke={col}
                strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="3" fill={col} />
    </svg>
  );
}

// ─── Signal legend ────────────────────────────────────────────────────────────
function SignalLegend() {
  var items = [
    { label: 'Long Buildup',   color: '#4ade80', desc: 'Price ↑  OI ↑  — fresh buyers entering · CE-friendly' },
    { label: 'Short Covering', color: '#60a5fa', desc: 'Price ↑  OI ↓  — trapped shorts exiting · CE-friendly but fragile' },
    { label: 'Absorption',     color: '#a78bfa', desc: 'Price ≈  OI ↑  — both sides fighting · TRAP zone' },
    { label: 'Neutral',        color: '#64748b', desc: 'Price ≈  OI ≈  — no clear pressure' },
    { label: 'Long Unwinding', color: '#f59e0b', desc: 'Price ↓  OI ↓  — longs exiting · PE-friendly but fragile' },
    { label: 'Short Buildup',  color: '#f87171', desc: 'Price ↓  OI ↑  — fresh sellers entering · PE-friendly' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {items.map(function(item) {
        return (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10,
                                         padding: '8px 12px', background: '#1e293b', borderRadius: 8,
                                         border: '1px solid ' + item.color + '33' }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: item.color, flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: item.color }}>{item.label}</p>
              <p style={{ margin: 0, fontSize: 10, color: '#64748b' }}>{item.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Buyer Verdict Hero — replaces the old SentimentCard hero ────────────────
function BuyerVerdictHero(props) {
  var data      = props.data;
  var verdict   = props.verdict;
  var smoothed  = props.smoothed;
  var durab     = props.durability;
  var theta     = props.theta;
  var stale     = props.stale;

  if (!data) {
    return (
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12,
                    padding: '24px', color: '#334155', fontSize: 13, textAlign: 'center' }}>
        No sentiment data yet — first snapshot arrives within 60s of server start
      </div>
    );
  }
  if (data.error) {
    return (
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12,
                    padding: '24px', color: '#f87171', fontSize: 12 }}>
        {data.error}
      </div>
    );
  }

  var col = verdict.color;
  var stateBadgeBg = verdict.state === 'CONFIRMED' ? col + '22' : col + '15';

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b',
                  borderLeft: '4px solid ' + col, borderRadius: 12,
                  padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Verdict line ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <p style={{ fontSize: 10, color: '#475569', margin: '0 0 6px',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Option Buyer Verdict · 60s flow
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: col, padding: '3px 10px', borderRadius: 6,
                           background: stateBadgeBg, border: '1px solid ' + col + '44',
                           textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {verdict.state}
            </span>
            {smoothed.isShift && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                             background: '#f59e0b22', border: '1px solid #f59e0b44', color: '#f59e0b' }}>
                🔄 SHIFT
              </span>
            )}
            {smoothed.isSmoothed && !smoothed.isShift && (
              <span style={{ fontSize: 9, color: '#334155' }}>smoothed · raw: {data.signal}</span>
            )}
          </div>
          <p style={{ fontSize: 17, fontWeight: 800, color: col, margin: '0 0 8px', lineHeight: 1.3 }}>
            {SIGNAL_EMOJI[smoothed.signal] || '⚪'} {verdict.headline}
          </p>
          <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 12, color: '#94a3b8', lineHeight: 1.7 }}>
            {verdict.reasons.map(function(r, i) { return <li key={i}>{r}</li>; })}
          </ul>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, minWidth: 140 }}>
          {/* Move Durability score */}
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 9, color: '#475569', margin: '0 0 2px', fontWeight: 700, textTransform: 'uppercase' }}>
              Move Durability
            </p>
            <span style={{ fontSize: 28, fontWeight: 900,
                           color: durab.score >= 70 ? '#4ade80' : durab.score >= 40 ? '#a3e635' : durab.score >= 20 ? '#f59e0b' : '#64748b' }}>
              {durab.score}
            </span>
            <span style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}>/ 100</span>
            <p style={{ fontSize: 9, color: '#475569', margin: '2px 0 0', fontWeight: 600, textTransform: 'uppercase' }}>
              {durab.state}
            </p>
          </div>
          {/* Theta runway */}
          {theta && (
            <div style={{ padding: '5px 10px', borderRadius: 6,
                          background: theta.color + '15', border: '1px solid ' + theta.color + '33' }}>
              <span style={{ fontSize: 10, color: theta.color, fontWeight: 700 }}>{theta.label}</span>
            </div>
          )}
          {/* Staleness indicator */}
          <div style={{ fontSize: 10, color: stale.stale ? '#f87171' : '#475569' }}>
            {stale.label}
          </div>
        </div>
      </div>

      {/* ── Confidence bar ── */}
      <div>
        <p style={{ fontSize: 9, color: '#475569', margin: '0 0 5px',
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Signal Confidence (smoothed)
          {smoothed.isSmoothed && (
            <span style={{ fontSize: 9, color: '#334155', marginLeft: 6, fontWeight: 400 }}>
              raw: {data.confidence}
            </span>
          )}
        </p>
        <ConfBar n={smoothed.confidence} />
      </div>

      {/* ── Key numbers ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <StatBox label="Spot LTP" value={fmtPrice(data.spot_ltp)} color="#94a3b8" />
        <StatBox label="Fut LTP"  value={fmtPrice(data.ltp)} color="#f1f5f9" />
        <StatBox label="Basis"
          value={(data.basis > 0 ? '+' : '') + data.basis}
          color={data.basis >= 0 ? '#60a5fa' : '#f59e0b'}
          sub={data.basis > 0 ? 'Premium' : data.basis < 0 ? 'Discount' : 'At par'}
          subColor={data.basis >= 0 ? '#60a5fa' : '#f59e0b'} />
        <StatBox label="ΔPrice (60s)"
          value={data.d_price != null ? (data.d_price > 0 ? '+' : '') + data.d_price : '—'}
          color={data.d_price >= 0 ? '#4ade80' : '#f87171'} />
        <StatBox label="ΔOI (60s)"
          value={data.d_oi != null ? (data.d_oi > 0 ? '+' : '') + fmtOI(data.d_oi) : '—'}
          color={data.d_oi >= 0 ? '#4ade80' : '#f87171'} />
      </div>

      {/* ── Alerts ── */}
      <Alerts alerts={data.alerts || []} />

    </div>
  );
}

// ─── Divergence Panel — replaces basis tracker for buyer view ────────────────
function DivergencePanel(props) {
  var div = props.divergence;
  if (!div) return null;
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12,
                  padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ fontSize: 10, color: '#475569', margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Spot vs Futures
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: div.color }}>{div.label}</span>
        {div.deltaBasis !== null && (
          <span style={{ fontSize: 10, color: '#64748b', padding: '2px 8px', borderRadius: 4, background: '#1e293b' }}>
            Δbasis {div.deltaBasis > 0 ? '+' : ''}{div.deltaBasis} · {div.windowMin} min window
          </span>
        )}
      </div>
      <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>{div.detail}</p>
    </div>
  );
}

// ─── Durability Panel — components breakdown ─────────────────────────────────
function DurabilityPanel(props) {
  var durab = props.durability;
  if (!durab || !durab.components || durab.components.length === 0) return null;
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12,
                  padding: '20px 24px' }}>
      <p style={{ fontSize: 10, color: '#475569', margin: '0 0 12px',
                  fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Move Durability Components — what's driving the {durab.score}/100
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {durab.components.map(function(c) {
          var pct = (c.value / c.max) * 100;
          var col = pct >= 70 ? '#4ade80' : pct >= 40 ? '#a3e635' : pct > 0 ? '#f59e0b' : '#475569';
          return (
            <div key={c.label} style={{ display: 'flex', gap: 12, alignItems: 'center',
                                        padding: '8px 12px', background: '#1e293b', borderRadius: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: col, minWidth: 50 }}>
                {c.value}<span style={{ color: '#475569' }}>/{c.max}</span>
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>{c.label}</p>
                <p style={{ margin: '2px 0 0', fontSize: 10, color: '#64748b' }}>{c.detail}</p>
              </div>
              <div style={{ width: 80, height: 4, background: '#0f172a', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: pct + '%', height: '100%', background: col, borderRadius: 2, transition: 'width 0.5s' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Event Stream — rolling ticker showing every snapshot as it arrives ──────
// Maintains a local list of recent events. When new snapshot data arrives,
// computes what changed and pushes new event lines. Auto-scrolls to top.
function EventStream(props) {
  var events = props.events || [];
  var paused = props.paused;

  if (!events.length) {
    return (
      <div style={{ background: '#0a1020', border: '1px solid #1e293b', borderRadius: 12,
                    padding: '20px 24px', minHeight: 180 }}>
        <p style={{ fontSize: 10, color: '#475569', margin: '0 0 10px',
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Live Event Stream
        </p>
        <p style={{ fontSize: 12, color: '#334155', margin: 0, fontFamily: 'monospace' }}>
          Waiting for first snapshot…
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: '#0a1020', border: '1px solid #1e293b', borderRadius: 12,
                  padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <p style={{ fontSize: 10, color: '#475569', margin: 0,
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Live Event Stream &nbsp;·&nbsp; {events.length} events
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                         background: paused ? '#64748b' : '#4ade80',
                         boxShadow: paused ? 'none' : '0 0 6px #4ade80aa',
                         animation: paused ? 'none' : 'pulse 1.5s infinite' }} />
          <span style={{ fontSize: 10, color: paused ? '#64748b' : '#4ade80', fontWeight: 600 }}>
            {paused ? 'PAUSED' : 'LIVE'}
          </span>
        </div>
      </div>
      <div style={{ maxHeight: 320, overflowY: 'auto', fontFamily: 'monospace', fontSize: 11, lineHeight: 1.7 }}>
        {events.slice().reverse().map(function(e, i) {
          var col = e.color || '#94a3b8';
          var isNew = i === 0;
          return (
            <div key={e.id} style={{ display: 'flex', gap: 10, padding: '4px 8px',
                                     background: isNew ? '#1e293b44' : 'transparent',
                                     borderRadius: 4, color: '#94a3b8',
                                     borderLeft: '2px solid ' + col + '66' }}>
              <span style={{ color: '#475569', minWidth: 56 }}>{e.time}</span>
              <span style={{ color: col, minWidth: 14 }}>{e.icon}</span>
              <span style={{ color: '#cbd5e1', flex: 1 }}>{e.text}</span>
              {e.detail && <span style={{ color: '#64748b' }}>{e.detail}</span>}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}

// ─── Sentiment history table — kept, demoted ─────────────────────────────────
function SentimentHistoryTable(props) {
  var history = props.history || [];
  var rows    = history.slice(-15).reverse();
  if (!rows.length) {
    return (
      <div style={{ padding: '20px 0', textAlign: 'center', color: '#334155', fontSize: 12 }}>
        No history yet — collecting snapshots every 60s
      </div>
    );
  }
  var th = { padding: '6px 10px', fontSize: 9, fontWeight: 700, color: '#475569',
             textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right',
             borderBottom: '1px solid #1e293b' };
  var td = { padding: '6px 10px', fontSize: 11, textAlign: 'right' };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...th, textAlign: 'left' }}>Time</th>
            <th style={th}>Signal</th>
            <th style={th}>Conf</th>
            <th style={th}>Fut LTP</th>
            <th style={th}>Spot</th>
            <th style={th}>Basis</th>
            <th style={th}>ΔPrice</th>
            <th style={th}>ΔOI</th>
            <th style={th}>ΔVol</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(function(r, i) {
            var sc = r.signal_color || signalColor(r.signal);
            var bg = i % 2 === 0 ? 'transparent' : '#0f172a55';
            return (
              <tr key={i} style={{ background: bg, borderBottom: '1px solid #0f172a' }}>
                <td style={{ ...td, textAlign: 'left', color: '#64748b' }}>{r.time}</td>
                <td style={{ ...td, color: sc, fontWeight: 700 }}>{r.signal_emoji} {r.signal}</td>
                <td style={{ ...td, color: confColor(r.confidence) }}>{r.confidence}</td>
                <td style={{ ...td, color: '#f1f5f9' }}>{fmtPrice(r.ltp)}</td>
                <td style={{ ...td, color: '#94a3b8' }}>{fmtPrice(r.spot_ltp)}</td>
                <td style={{ ...td, color: r.basis >= 0 ? '#60a5fa' : '#f59e0b' }}>
                  {r.basis > 0 ? '+' : ''}{r.basis}
                </td>
                <td style={{ ...td, color: r.d_price >= 0 ? '#4ade80' : '#f87171' }}>
                  {fmtDelta(r.d_price)}
                </td>
                <td style={{ ...td, color: r.d_oi >= 0 ? '#4ade80' : '#f87171' }}>
                  {r.d_oi !== undefined ? (r.d_oi > 0 ? '+' : '') + fmtOI(r.d_oi) : '—'}
                </td>
                <td style={{ ...td, color: '#64748b' }}>{fmtOI(r.d_vol)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FuturesPage() {
  var { user }  = useAuth();
  var navigate  = useNavigate();

  var [symbol,        setSymbol]        = useState('NIFTY');
  var [sentData,      setSentData]      = useState(null);
  var [sentLoading,   setSentLoading]   = useState(false);
  var [lastUpdate,    setLastUpdate]    = useState(null);
  var [now,           setNow]           = useState(Date.now());  // for staleness tick
  var [events,        setEvents]        = useState([]);          // rolling event stream
  var [paused,        setPaused]        = useState(false);

  var sentIntervalRef = useRef(null);
  var clockRef        = useRef(null);
  var prevSnapshotRef = useRef(null);     // used to diff snapshots → events
  var eventIdRef      = useRef(0);

  var hasOptions = user && (
    user.plan === 'options' ||
    user.plan === 'global'  ||
    user.plan === 'admin'
  );

  function fetchSentiment(sym) {
    if (paused) return;
    setSentLoading(true);
    fetch(API + '/api/futures-sentiment?symbol=' + sym)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        setSentData(d);
        setSentLoading(false);
        setLastUpdate(Date.now());
        // Append events from the new snapshot
        appendEventsFromSnapshot(d);
      })
      .catch(function(e) {
        console.error('[FuturesPage sentiment]', e);
        setSentLoading(false);
        pushEvent({ icon: '⚠', text: 'Fetch failed', detail: String(e), color: '#f87171' });
      });
  }

  function pushEvent(ev) {
    var id = ++eventIdRef.current;
    var t  = new Date();
    var hh = String(t.getHours()).padStart(2, '0');
    var mm = String(t.getMinutes()).padStart(2, '0');
    var ss = String(t.getSeconds()).padStart(2, '0');
    setEvents(function(prev) {
      var next = prev.concat([{ id: id, time: hh + ':' + mm + ':' + ss, icon: ev.icon, text: ev.text, detail: ev.detail || '', color: ev.color || '#94a3b8' }]);
      // Keep last 80 events
      return next.slice(-80);
    });
  }

  // Compares prev vs new snapshot, emits one or more event lines describing
  // what changed. This is the "rolling screen" the user asked for.
  function appendEventsFromSnapshot(d) {
    if (!d || d.error) return;
    var prev = prevSnapshotRef.current;

    // Always log the snapshot arrival
    var sigCol = signalColor(d.signal);
    pushEvent({
      icon: SIGNAL_EMOJI[d.signal] || '⚪',
      text: 'Snapshot · ' + d.signal + ' (conf ' + d.confidence + ')',
      detail: 'Fut ' + fmtPrice(d.ltp) + ' · Spot ' + fmtPrice(d.spot_ltp) + ' · Basis ' + (d.basis >= 0 ? '+' : '') + d.basis,
      color: sigCol,
    });

    if (prev) {
      // Signal flip
      if (prev.signal !== d.signal) {
        pushEvent({
          icon: '🔄',
          text: 'SIGNAL FLIP · ' + prev.signal + ' → ' + d.signal,
          detail: 'conf ' + prev.confidence + ' → ' + d.confidence,
          color: '#f59e0b',
        });
      }
      // Confidence regime change
      var prevTier = prev.confidence >= 70 ? 'high' : prev.confidence >= 40 ? 'mid' : 'low';
      var nextTier = d.confidence >= 70 ? 'high' : d.confidence >= 40 ? 'mid' : 'low';
      if (prevTier !== nextTier) {
        pushEvent({
          icon: nextTier === 'high' ? '↑' : nextTier === 'low' ? '↓' : '·',
          text: 'Confidence ' + prevTier + ' → ' + nextTier + ' (' + d.confidence + ')',
          color: nextTier === 'high' ? '#4ade80' : nextTier === 'low' ? '#f87171' : '#f59e0b',
        });
      }
      // Big OI move
      var dOiAbs = Math.abs(d.d_oi || 0);
      if (dOiAbs > 50000) {
        pushEvent({
          icon: '⚡',
          text: 'Large ΔOI ' + (d.d_oi > 0 ? '+' : '') + fmtOI(d.d_oi) + ' in last 60s',
          detail: '',
          color: d.d_oi > 0 ? '#4ade80' : '#f87171',
        });
      }
      // Basis regime change (premium ↔ discount)
      if ((prev.basis >= 0) !== (d.basis >= 0)) {
        pushEvent({
          icon: '🔁',
          text: 'Basis flipped to ' + (d.basis >= 0 ? 'PREMIUM' : 'DISCOUNT'),
          detail: 'now ' + (d.basis > 0 ? '+' : '') + d.basis,
          color: d.basis >= 0 ? '#60a5fa' : '#f59e0b',
        });
      }
      // Alerts from backend
      var alerts = d.alerts || [];
      alerts.forEach(function(a) {
        // Only push if alert message is new
        if (!prev.alerts || !prev.alerts.find(function(x) { return x.msg === a.msg; })) {
          pushEvent({ icon: '⚡', text: a.msg, color: a.color || '#f59e0b' });
        }
      });
    } else {
      pushEvent({ icon: '✓', text: 'First snapshot received · stream live', color: '#4ade80' });
    }

    prevSnapshotRef.current = d;
  }

  useEffect(function() {
    if (!hasOptions) return;

    if (shouldClearData()) setSentData(null);
    fetchSentiment(symbol);

    // Sentiment poll every 60s — also re-checks shouldClearData at each tick
    clearInterval(sentIntervalRef.current);
    sentIntervalRef.current = setInterval(function() {
      if (shouldClearData()) setSentData(null);
      fetchSentiment(symbol);
    }, 60000);

    // 1-second clock for staleness display
    clearInterval(clockRef.current);
    clockRef.current = setInterval(function() { setNow(Date.now()); }, 1000);

    // Pause polling when tab hidden — saves API budget on long opens
    function onVisibility() {
      if (document.hidden) {
        setPaused(true);
        clearInterval(sentIntervalRef.current);
      } else {
        setPaused(false);
        fetchSentiment(symbol);
        sentIntervalRef.current = setInterval(function() {
          if (shouldClearData()) setSentData(null);
          fetchSentiment(symbol);
        }, 60000);
      }
    }
    document.addEventListener('visibilitychange', onVisibility);

    return function() {
      clearInterval(sentIntervalRef.current);
      clearInterval(clockRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [symbol, hasOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Paywall ──
  if (!hasOptions) {
    return (
      <div style={{ color: '#f1f5f9', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', minHeight: 500, gap: 20 }}>
        <PageTitle title="Futures" />
        <div style={{ fontSize: 48 }}>📈</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Futures</h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0, textAlign: 'center', maxWidth: 400, lineHeight: 1.6 }}>
          Live futures sentiment, OI flow, basis tracking, and option-buyer translation. Available on Options Pro.
        </p>
        <button onClick={function() { navigate('/pricing'); }}
          style={{ background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 10,
                   padding: '12px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          View Options Pro Plan →
        </button>
      </div>
    );
  }

  // Compute derived buyer-perspective state for render
  var smoothed = sentData
    ? smoothedSignal(sentData.history || [], sentData.signal, sentData.confidence)
    : { signal: 'Neutral', confidence: 0, isShift: false, isSmoothed: false };
  var divergence = sentData
    ? divergenceRead(sentData.history || [], sentData.basis || 0)
    : { state: 'unknown', label: 'Building data', color: '#64748b', detail: '', deltaBasis: null, windowMin: 0 };
  var durab     = moveDurability(sentData, smoothed, divergence);
  var verdict   = buyerVerdict(sentData, smoothed);
  var theta     = thetaRunway();

  // Staleness
  var stale = (function() {
    if (!lastUpdate) return { stale: false, label: 'Awaiting first update' };
    var secs = Math.round((now - lastUpdate) / 1000);
    var open = isMarketOpen();
    var staleNow = open && secs > 90;
    return {
      stale: staleNow,
      label: (staleNow ? '⚠ ' : '⏱ ') + 'Updated ' + fmtSecsAgo(secs) + (open ? '' : ' · market closed'),
    };
  })();

  return (
    <div style={{ color: '#f1f5f9' }}>
      <PageTitle title="Futures" />

      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>
            Futures · Buyer View
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: 13 }}>
            OI Flow translated for option buyers · 60s sentiment · live event stream
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                        background: '#1e293b', borderRadius: 6, border: '1px solid #334155' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                           background: paused ? '#64748b'
                                     : sentLoading ? '#f59e0b'
                                     : isMarketOpen() ? '#4ade80' : '#64748b' }} />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              {paused ? 'Paused (tab hidden)'
               : sentLoading ? 'Refreshing…'
               : stale.label}
            </span>
          </div>
          <button onClick={function() { fetchSentiment(symbol); }}
            style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
                     padding: '6px 14px', color: '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            ↻ Refresh
          </button>
          <button onClick={function() { navigate('/options'); }}
            style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
                     padding: '6px 14px', color: '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            ← Options
          </button>
        </div>
      </div>

      {/* ── Symbol tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {SYMBOLS.map(function(s) {
          return (
            <button key={s.code} onClick={function() { setSymbol(s.code); setEvents([]); prevSnapshotRef.current = null; }}
              style={{
                border:       '1px solid #334155',
                borderRadius: 8,
                padding:      '8px 20px',
                cursor:       'pointer',
                fontSize:     13,
                fontWeight:   600,
                background:   symbol === s.code ? '#8b5cf6' : '#1e293b',
                color:        symbol === s.code ? '#fff'    : '#94a3b8',
                transition:   'all 0.15s',
              }}>
              {s.flag} {s.label}
            </button>
          );
        })}
      </div>

      {/* ── Loading skeleton ── */}
      {sentLoading && !sentData && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#475569' }}>
          <p style={{ fontSize: 15 }}>Fetching {symbol} futures data…</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── 1. Buyer Verdict Hero ── */}
        <BuyerVerdictHero
          data={sentData}
          verdict={verdict}
          smoothed={smoothed}
          durability={durab}
          theta={theta}
          stale={stale}
        />

        {/* ── 2. Spot vs Futures divergence ── */}
        {sentData && <DivergencePanel divergence={divergence} />}

        {/* ── 3. Live event stream (the rolling screen) ── */}
        <EventStream events={events} paused={paused} />

        {/* ── 4. Move Durability components ── */}
        {sentData && <DurabilityPanel durability={durab} />}

        {/* ── 5. GammaBlast ── */}
        <GammaBlast symbol={symbol} />

        {/* ── 6. Sparkline + Snapshot log (collapsible/secondary) ── */}
        {sentData && (
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12,
                        padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <p style={{ fontSize: 9, color: '#475569', margin: '0 0 6px',
                          fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Signal History — last 40 ticks (confidence-weighted)
              </p>
              <SignalSparkline history={sentData.history || []} width={420} height={52} />
              <div style={{ display: 'flex', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
                {[
                  { label: 'Long Buildup',   color: '#4ade80' },
                  { label: 'Short Covering', color: '#60a5fa' },
                  { label: 'Neutral',        color: '#64748b' },
                  { label: 'Long Unwinding', color: '#f59e0b' },
                  { label: 'Short Buildup',  color: '#f87171' },
                ].map(function(l) {
                  return (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                      <span style={{ fontSize: 9, color: '#475569' }}>{l.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <p style={{ fontSize: 9, color: '#475569', margin: '0 0 8px',
                          fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Snapshot Log (last 15)
              </p>
              <SentimentHistoryTable history={sentData.history || []} />
            </div>
          </div>
        )}

        {/* ── 7. Reference legend ── */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12,
                      padding: '20px 24px' }}>
          <p style={{ fontSize: 10, color: '#475569', margin: '0 0 12px',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            OI Flow Signal Reference
          </p>
          <SignalLegend />
        </div>

      </div>
    </div>
  );
}