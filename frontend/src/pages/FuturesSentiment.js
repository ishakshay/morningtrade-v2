// FuturesSentiment.js
// Drop-in card for the Options page.
// Usage: <FuturesSentiment symbol={symbol} />
// Polls /api/futures-sentiment?symbol=NIFTY every 60 seconds.

import { useState, useEffect, useRef } from 'react';

var API = 'http://localhost:3001';

// ─── Smoothing helpers ────────────────────────────────────────────────────────

// Majority-vote signal over last N history entries.
// Returns { signal, confidence, isShift, isSmoothed }
function smoothedSignal(history, rawSignal, rawConf) {
  if (!history || history.length < 2) {
    return { signal: rawSignal, confidence: rawConf, isShift: false, isSmoothed: false };
  }

  var recent = history.slice(-3);    // last 3 ticks — voting window
  var prev   = history.slice(-6, -3); // prior 3 ticks — for shift detection

  // ── Majority vote ──
  var counts = {};
  recent.forEach(function(h) {
    var s = h.signal || 'Neutral';
    counts[s] = (counts[s] || 0) + 1;
  });
  var winner = null, winCount = 0;
  Object.keys(counts).forEach(function(s) {
    if (counts[s] > winCount) { winner = s; winCount = counts[s]; }
  });
  // Require at least 2/3 agreement, otherwise fall back to Neutral
  var votedSignal = (winCount >= 2) ? winner : 'Neutral';

  // ── EMA confidence (α=0.4 over last 5 readings) ──
  var confVals = history.slice(-5).map(function(h) { return h.confidence || 0; });
  var alpha = 0.4;
  var ema = confVals[0];
  for (var i = 1; i < confVals.length; i++) {
    ema = alpha * confVals[i] + (1 - alpha) * ema;
  }
  var smoothConf = Math.round(ema);

  // ── Shift detection: 3 consecutive same signal, different from prior 3 ──
  var allSame = recent.every(function(h) { return h.signal === recent[0].signal; });
  var prevSignal = prev.length > 0 ? prev[prev.length - 1].signal : null;
  var isShift = allSame && prevSignal && prevSignal !== recent[0].signal;

  // If genuine shift, show immediately at raw confidence
  if (isShift) {
    return { signal: votedSignal, confidence: rawConf, isShift: true, isSmoothed: false };
  }

  return { signal: votedSignal, confidence: smoothConf, isShift: false, isSmoothed: votedSignal !== rawSignal };
}

var SIGNAL_COLOR = {
  'Long Buildup':   '#4ade80',
  'Short Covering': '#60a5fa',
  'Short Buildup':  '#f87171',
  'Long Unwinding': '#f59e0b',
  'Absorption':     '#a78bfa',
  'Neutral':        '#64748b',
};

// ─── Mini signal sparkline ─────────────────────────────────────────────────

function SignalSparkline(props) {
  var history = props.history || [];
  var width   = props.width   || 260;
  var height  = props.height  || 44;

  if (history.length < 2) {
    return (
      <div style={{ width: width, height: height, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 10, color: '#334155' }}>
        collecting data…
      </div>
    );
  }

  // Encode signal → numeric so we can draw a line
  var signalScore = {
    'Long Buildup':   2,
    'Short Covering': 1,
    'Neutral':        0,
    'Absorption':     0,
    'Long Unwinding': -1,
    'Short Buildup':  -2,
  };

  var values = history.slice(-30).map(function(h) {
    return signalScore[h.signal] !== undefined ? signalScore[h.signal] : 0;
  });
  var times  = history.slice(-30).map(function(h) { return h.time; });

  var maxV = 2, minV = -2, range = 4;
  var padX = 4, padY = 6;
  var chartW = width  - padX * 2;
  var chartH = height - padY * 2;

  var points = values.map(function(v, i) {
    var x = padX + (i / Math.max(values.length - 1, 1)) * chartW;
    var y = padY + chartH - ((v - minV) / range) * chartH;
    return x + ',' + y;
  }).join(' ');

  var lastVal   = values[values.length - 1];
  var lineColor = lastVal > 0 ? '#4ade80' : lastVal < 0 ? '#f87171' : '#64748b';
  var lastX     = padX + chartW;
  var lastY     = padY + chartH - ((lastVal - minV) / range) * chartH;

  // Zero line
  var zeroY = padY + chartH - ((0 - minV) / range) * chartH;

  return (
    <svg width={width} height={height} viewBox={'0 0 ' + width + ' ' + height}>
      <line x1={padX} y1={zeroY} x2={padX + chartW} y2={zeroY}
            stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
      <polyline points={points} fill="none" stroke={lineColor}
                strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="3" fill={lineColor} />
    </svg>
  );
}

// ─── Confidence bar ────────────────────────────────────────────────────────

function ConfidenceBar(props) {
  var score = props.score || 0;
  var color = score >= 70 ? '#4ade80' : score >= 40 ? '#f59e0b' : '#f87171';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: score + '%', height: '100%', background: color,
                      borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: color, minWidth: 30 }}>{score}</span>
    </div>
  );
}

// ─── Trend pill ────────────────────────────────────────────────────────────

function TrendPill(props) {
  var trend = props.trend || {};
  var color = props.color || '#64748b';
  if (!trend.label) return null;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 9px', borderRadius: 20, background: color + '22',
                  border: '1px solid ' + color + '55' }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {trend.label}
      </span>
      <span style={{ fontSize: 10, color: '#64748b' }}>
        {trend.strength}% · {trend.window} snaps
      </span>
    </div>
  );
}

// ─── Alerts row ────────────────────────────────────────────────────────────

function AlertsRow(props) {
  var alerts = props.alerts || [];
  if (!alerts.length) return null;
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
      {alerts.map(function(a, i) {
        return (
          <div key={i} style={{ padding: '3px 10px', borderRadius: 6,
                                background: a.color + '18', border: '1px solid ' + a.color + '44',
                                fontSize: 10, color: a.color, fontWeight: 600 }}>
            ⚡ {a.msg}
          </div>
        );
      })}
    </div>
  );
}

// ─── History mini-table ─────────────────────────────────────────────────────

function HistoryTable(props) {
  var history = props.history || [];
  var rows    = history.slice(-8).reverse();
  if (!rows.length) return null;

  var colStyle = { padding: '4px 8px', fontSize: 10, textAlign: 'right' };
  var hdStyle  = { padding: '4px 8px', fontSize: 9, fontWeight: 700, color: '#475569',
                   textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' };

  return (
    <div style={{ overflowX: 'auto', marginTop: 4 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #1e293b' }}>
            <th style={{ ...hdStyle, textAlign: 'left' }}>Time</th>
            <th style={hdStyle}>Signal</th>
            <th style={hdStyle}>Conf</th>
            <th style={hdStyle}>ΔPrice</th>
            <th style={hdStyle}>ΔOI</th>
            <th style={hdStyle}>Basis</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(function(r, i) {
            return (
              <tr key={i} style={{ borderBottom: '1px solid #0f172a',
                                   background: i % 2 === 0 ? 'transparent' : '#0f172a44' }}>
                <td style={{ ...colStyle, textAlign: 'left', color: '#64748b' }}>{r.time}</td>
                <td style={{ ...colStyle, color: r.signal_color || '#64748b', fontWeight: 700 }}>
                  {r.signal_emoji} {r.signal}
                </td>
                <td style={{ ...colStyle, color: '#94a3b8' }}>{r.confidence}</td>
                <td style={{ ...colStyle, color: r.d_price >= 0 ? '#4ade80' : '#f87171' }}>
                  {r.d_price > 0 ? '+' : ''}{r.d_price}
                </td>
                <td style={{ ...colStyle, color: r.d_oi >= 0 ? '#4ade80' : '#f87171' }}>
                  {r.d_oi > 0 ? '+' : ''}{(r.d_oi / 1000).toFixed(1)}K
                </td>
                <td style={{ ...colStyle, color: r.basis >= 0 ? '#60a5fa' : '#f59e0b' }}>
                  {r.basis > 0 ? '+' : ''}{r.basis}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function FuturesSentiment(props) {
  var symbol = props.symbol || 'NIFTY';

  var [data,    setData]    = useState(null);
  var [loading, setLoading] = useState(true);
  var [showHistory, setShowHistory] = useState(false);
  var intervalRef = useRef(null);

  function fetchData() {
    fetch(API + '/api/futures-sentiment?symbol=' + symbol)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        setData(d);
        setLoading(false);
      })
      .catch(function(e) {
        console.error('[FuturesSentiment] fetch error:', e);
        setLoading(false);
      });
  }

  useEffect(function() {
    setLoading(true);
    setData(null);
    fetchData();
    intervalRef.current = setInterval(fetchData, 60000);
    return function() { clearInterval(intervalRef.current); };
  }, [symbol]);

  // ── Skeleton ──
  if (loading && !data) {
    return (
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12,
                    padding: '16px 20px', color: '#334155', fontSize: 13 }}>
        Fetching {symbol} futures sentiment…
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12,
                    padding: '16px 20px', color: '#f87171', fontSize: 12 }}>
        {data && data.error ? data.error : 'No futures data available'}
      </div>
    );
  }

  // ── Apply smoothing ──
  var smooth      = smoothedSignal(data.history || [], data.signal, data.confidence);
  var displaySig  = smooth.signal;
  var displayConf = smooth.confidence;
  var signalColor = SIGNAL_COLOR[displaySig] || data.signal_color || '#64748b';
  var trendColor  = data.trend_color  || '#64748b';
  var basisColor  = data.basis >= 0 ? '#60a5fa' : '#f59e0b';
  var basisIntel  = data.basis_intel  || {};
  var options     = data.options      || {};
  var trend       = data.trend        || {};
  // Override options implication if smoothed signal differs from raw
  var displayEmoji = smooth.signal === 'Long Buildup' ? '🟢'
    : smooth.signal === 'Short Buildup'  ? '🔴'
    : smooth.signal === 'Short Covering' ? '🔵'
    : smooth.signal === 'Long Unwinding' ? '🟠'
    : smooth.signal === 'Absorption'     ? '🟣'
    : '⚪';

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b',
                  borderLeft: '4px solid ' + signalColor,
                  borderRadius: 12, padding: '16px 20px', display: 'flex',
                  flexDirection: 'column', gap: 14 }}>

      {/* ── Header row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 10, color: '#475569', margin: '0 0 2px',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Futures Sentiment · {symbol}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: signalColor }}>
              {displayEmoji} {displaySig}
            </span>
            {smooth.isShift && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                             background: '#f59e0b22', border: '1px solid #f59e0b44', color: '#f59e0b' }}>
                🔄 SHIFT
              </span>
            )}
            {smooth.isSmoothed && !smooth.isShift && (
              <span style={{ fontSize: 9, color: '#334155', marginLeft: 2 }}>
                smoothed · raw: {data.signal}
              </span>
            )}
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <TrendPill trend={trend} color={trendColor} />
          <span style={{ fontSize: 10, color: '#334155' }}>⏱ {data.timestamp}</span>
        </div>
      </div>

      {/* ── Confidence ── */}
      <div>
        <p style={{ fontSize: 10, color: '#475569', margin: '0 0 4px', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Confidence
          {smooth.isSmoothed && <span style={{ fontSize: 9, color: '#334155', marginLeft: 6, fontWeight: 400 }}>(EMA · raw: {data.confidence})</span>}
        </p>
        <ConfidenceBar score={displayConf} />
      </div>

      {/* ── Key metrics row ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>

        <div style={{ padding: '8px 12px', background: '#1e293b', borderRadius: 8, minWidth: 90 }}>
          <p style={{ fontSize: 9, color: '#475569', margin: '0 0 2px',
                      fontWeight: 700, textTransform: 'uppercase' }}>Futures LTP</p>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>
            {data.ltp ? data.ltp.toLocaleString() : '—'}
          </span>
        </div>

        <div style={{ padding: '8px 12px', background: '#1e293b', borderRadius: 8, minWidth: 90 }}>
          <p style={{ fontSize: 9, color: '#475569', margin: '0 0 2px',
                      fontWeight: 700, textTransform: 'uppercase' }}>Spot LTP</p>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#94a3b8' }}>
            {data.spot_ltp ? data.spot_ltp.toLocaleString() : '—'}
          </span>
        </div>

        <div style={{ padding: '8px 12px', background: '#1e293b', borderRadius: 8, minWidth: 80 }}>
          <p style={{ fontSize: 9, color: '#475569', margin: '0 0 2px',
                      fontWeight: 700, textTransform: 'uppercase' }}>Basis</p>
          <span style={{ fontSize: 16, fontWeight: 800, color: basisColor }}>
            {data.basis > 0 ? '+' : ''}{data.basis}
          </span>
        </div>

        <div style={{ padding: '8px 12px', background: '#1e293b', borderRadius: 8, minWidth: 70 }}>
          <p style={{ fontSize: 9, color: '#475569', margin: '0 0 2px',
                      fontWeight: 700, textTransform: 'uppercase' }}>ΔPrice</p>
          <span style={{ fontSize: 15, fontWeight: 700,
                         color: data.d_price >= 0 ? '#4ade80' : '#f87171' }}>
            {data.d_price > 0 ? '+' : ''}{data.d_price}
          </span>
        </div>

        <div style={{ padding: '8px 12px', background: '#1e293b', borderRadius: 8, minWidth: 70 }}>
          <p style={{ fontSize: 9, color: '#475569', margin: '0 0 2px',
                      fontWeight: 700, textTransform: 'uppercase' }}>ΔOI</p>
          <span style={{ fontSize: 15, fontWeight: 700,
                         color: data.d_oi >= 0 ? '#4ade80' : '#f87171' }}>
            {data.d_oi > 0 ? '+' : ''}{data.d_oi > 0 || data.d_oi < 0 ? (data.d_oi / 1000).toFixed(1) + 'K' : '—'}
          </span>
        </div>
      </div>

      {/* ── Basis intel ── */}
      {basisIntel.notes && basisIntel.notes.length > 0 && (
        <div style={{ padding: '8px 12px', background: '#1e293b', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {basisIntel.notes.map(function(note, i) {
            return (
              <span key={i} style={{ fontSize: 11, color: '#94a3b8' }}>
                {i === 0 ? '📊 ' : '  · '}{note}
              </span>
            );
          })}
        </div>
      )}

      {/* ── Options implication ── */}
      {options.action && (
        <div style={{ padding: '10px 14px', background: signalColor + '12',
                      border: '1px solid ' + signalColor + '33', borderRadius: 8 }}>
          <p style={{ fontSize: 9, color: '#475569', margin: '0 0 4px',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Options Implication
          </p>
          <p style={{ fontSize: 13, fontWeight: 700, color: signalColor, margin: 0 }}>
            → {options.action}
          </p>
          {options.avoid && (
            <p style={{ fontSize: 10, color: '#64748b', margin: '4px 0 0' }}>
              ⚠ {options.avoid}
            </p>
          )}
        </div>
      )}

      {/* ── Alerts ── */}
      <AlertsRow alerts={data.alerts || []} />

      {/* ── Sparkline ── */}
      <div>
        <p style={{ fontSize: 9, color: '#334155', margin: '0 0 4px',
                    fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Signal History (last 30 ticks)
        </p>
        <SignalSparkline history={data.history || []} width={340} height={44} />
        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          {[
            { label: 'Long Buildup',   color: '#4ade80', score:  2 },
            { label: 'Short Covering', color: '#60a5fa', score:  1 },
            { label: 'Neutral',        color: '#64748b', score:  0 },
            { label: 'Long Unwind',    color: '#f59e0b', score: -1 },
            { label: 'Short Buildup',  color: '#f87171', score: -2 },
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

      {/* ── History toggle ── */}
      <div>
        <button
          onClick={function() { setShowHistory(function(v) { return !v; }); }}
          style={{ fontSize: 10, color: '#475569', background: 'none', border: 'none',
                   cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
          {showHistory ? '▲ Hide' : '▼ Show'} recent snapshots
        </button>
        {showHistory && <HistoryTable history={data.history || []} />}
      </div>

    </div>
  );
}