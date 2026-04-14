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

// ─── Smoothing helpers ────────────────────────────────────────────────────────

function smoothedSignal(history, rawSignal, rawConf) {
  if (!history || history.length < 2) {
    return { signal: rawSignal, confidence: rawConf, isShift: false, isSmoothed: false };
  }
  var recent = history.slice(-3);
  var prev   = history.slice(-6, -3);

  var counts = {};
  recent.forEach(function(h) {
    var s = h.signal || 'Neutral';
    counts[s] = (counts[s] || 0) + 1;
  });
  var winner = null, winCount = 0;
  Object.keys(counts).forEach(function(s) {
    if (counts[s] > winCount) { winner = s; winCount = counts[s]; }
  });
  var votedSignal = (winCount >= 2) ? winner : 'Neutral';

  var confVals = history.slice(-5).map(function(h) { return h.confidence || 0; });
  var alpha = 0.4, ema = confVals[0];
  for (var i = 1; i < confVals.length; i++) { ema = alpha * confVals[i] + (1 - alpha) * ema; }
  var smoothConf = Math.round(ema);

  var allSame    = recent.every(function(h) { return h.signal === recent[0].signal; });
  var prevSignal = prev.length > 0 ? prev[prev.length - 1].signal : null;
  var isShift    = allSame && prevSignal && prevSignal !== recent[0].signal;

  if (isShift) {
    return { signal: votedSignal, confidence: rawConf, isShift: true, isSmoothed: false };
  }
  return { signal: votedSignal, confidence: smoothConf, isShift: false, isSmoothed: votedSignal !== rawSignal };
}

var SIGNAL_COLORS = {
  'Long Buildup':   '#4ade80',
  'Short Covering': '#60a5fa',
  'Short Buildup':  '#f87171',
  'Long Unwinding': '#f59e0b',
  'Absorption':     '#a78bfa',
  'Neutral':        '#64748b',
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

function fmtOI(n) {
  if (n === null || n === undefined) return '—';
  var abs = Math.abs(n);
  if (abs >= 100000) return (n / 100000).toFixed(1) + 'L';
  if (abs >= 1000)   return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function fmt(n) {
  if (!n && n !== 0) return '—';
  var sign = n < 0 ? '-' : '';
  var abs  = Math.abs(n);
  if (abs >= 10000000) return sign + (abs / 10000000).toFixed(2) + 'Cr';
  if (abs >= 100000)   return sign + (abs / 100000).toFixed(1) + 'L';
  if (abs >= 1000)     return sign + (abs / 1000).toFixed(0) + 'K';
  return String(n);
}

function fmtDiff(n) {
  if (!n && n !== 0) return '—';
  var abs = Math.abs(n);
  if (abs >= 10000000) return (n > 0 ? '+' : '') + (n / 10000000).toFixed(2) + 'Cr';
  if (abs >= 100000)   return (n > 0 ? '+' : '') + (n / 100000).toFixed(1) + 'L';
  if (abs >= 1000)     return (n > 0 ? '+' : '') + (n / 1000).toFixed(0) + 'K';
  return (n > 0 ? '+' : '') + n;
}

function fmtTime(t) {
  if (!t) return '—';
  var s = String(t).padStart(4, '0');
  return s.slice(0, 2) + ':' + s.slice(2);
}

function fmtPrice(n) {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString();
}

function fmtDelta(n) {
  if (n === null || n === undefined) return '—';
  return (n > 0 ? '+' : '') + n;
}

function signalColor(s) {
  if (s === 'Long Buildup')   return '#4ade80';
  if (s === 'Short Covering') return '#60a5fa';
  if (s === 'Short Buildup')  return '#f87171';
  if (s === 'Long Unwinding') return '#f59e0b';
  if (s === 'Absorption')     return '#a78bfa';
  return '#64748b';
}

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

function vwapSigCol(sig) {
  if (sig === 'BUY')  return '#4ade80';
  if (sig === 'SELL') return '#f87171';
  return '#f59e0b';
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

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
  var label    = props.label;
  var value    = props.value;
  var color    = props.color || '#f1f5f9';
  var subColor = props.subColor;
  var sub      = props.sub;
  return (
    <div style={{ padding: '10px 14px', background: '#1e293b', borderRadius: 8, minWidth: 80, flex: 1 }}>
      <p style={{ fontSize: 9, color: '#475569', margin: '0 0 3px',
                  fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </p>
      <span style={{ fontSize: 17, fontWeight: 800, color: color }}>{value}</span>
      {sub && <p style={{ fontSize: 9, color: subColor || '#64748b', margin: '2px 0 0' }}>{sub}</p>}
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
                     textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {trend.label}
      </span>
      <span style={{ fontSize: 10, color: '#64748b' }}>
        {trend.strength}% · {trend.window} snaps
      </span>
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

// ─── Signal sparkline ─────────────────────────────────────────────────────────

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

  var values  = history.slice(-40).map(function(h) { return SCORE[h.signal] !== undefined ? SCORE[h.signal] : 0; });
  var padX    = 4, padY = 6;
  var cW      = width  - padX * 2;
  var cH      = height - padY * 2;
  var minV    = -2, range = 4;
  var points  = values.map(function(v, i) {
    var x = padX + (i / Math.max(values.length - 1, 1)) * cW;
    var y = padY + cH - ((v - minV) / range) * cH;
    return x + ',' + y;
  }).join(' ');
  var lastVal = values[values.length - 1];
  var col     = lastVal > 0 ? '#4ade80' : lastVal < 0 ? '#f87171' : '#64748b';
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
    { label: 'Long Buildup',   color: '#4ade80', desc: 'Price ↑  OI ↑  — fresh buyers entering' },
    { label: 'Short Covering', color: '#60a5fa', desc: 'Price ↑  OI ↓  — trapped shorts exiting' },
    { label: 'Absorption',     color: '#a78bfa', desc: 'Price ≈  OI ↑  — both sides fighting' },
    { label: 'Neutral',        color: '#64748b', desc: 'Price ≈  OI ≈  — no clear pressure' },
    { label: 'Long Unwinding', color: '#f59e0b', desc: 'Price ↓  OI ↓  — longs exiting' },
    { label: 'Short Buildup',  color: '#f87171', desc: 'Price ↓  OI ↑  — fresh sellers entering' },
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

// ─── Sentiment history table (60s ticks) ─────────────────────────────────────

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

// ─── Sentiment card (60s OI-flow signal) ─────────────────────────────────────

function SentimentCard(props) {
  var data = props.data;
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

  var smooth       = smoothedSignal(data.history || [], data.signal, data.confidence);
  var displaySig   = smooth.signal;
  var displayConf  = smooth.confidence;
  var sc           = SIGNAL_COLORS[displaySig] || signalColor(data.signal);
  var tc           = data.trend_color || trendColor((data.trend || {}).label);
  var basisCol     = data.basis >= 0 ? '#60a5fa' : '#f59e0b';
  var basisIntel   = data.basis_intel || {};
  var options      = data.options     || {};
  var trend        = data.trend       || {};
  var displayEmoji = displaySig === 'Long Buildup'   ? '🟢'
                   : displaySig === 'Short Buildup'  ? '🔴'
                   : displaySig === 'Short Covering' ? '🔵'
                   : displaySig === 'Long Unwinding' ? '🟠'
                   : displaySig === 'Absorption'     ? '🟣' : '⚪';

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b',
                  borderLeft: '4px solid ' + sc, borderRadius: 12,
                  padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start',
                    justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 10, color: '#475569', margin: '0 0 4px',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            OI Flow Signal · 60s ticks
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: sc }}>
              {displayEmoji} {displaySig}
            </span>
            {smooth.isShift && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                             background: '#f59e0b22', border: '1px solid #f59e0b44', color: '#f59e0b' }}>
                🔄 SHIFT
              </span>
            )}
            {smooth.isSmoothed && !smooth.isShift && (
              <span style={{ fontSize: 9, color: '#334155' }}>smoothed · raw: {data.signal}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <TrendPill trend={trend} color={tc} />
          <span style={{ fontSize: 10, color: '#334155' }}>⏱ {data.timestamp}</span>
        </div>
      </div>

      {/* ── Confidence ── */}
      <div>
        <p style={{ fontSize: 9, color: '#475569', margin: '0 0 5px',
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Signal Confidence
          {smooth.isSmoothed && (
            <span style={{ fontSize: 9, color: '#334155', marginLeft: 6, fontWeight: 400 }}>
              (EMA smoothed · raw: {data.confidence})
            </span>
          )}
        </p>
        <ConfBar n={displayConf} />
      </div>

      {/* ── Key stats ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <StatBox label="Fut LTP"  value={fmtPrice(data.ltp)}      color="#f1f5f9" />
        <StatBox label="Spot LTP" value={fmtPrice(data.spot_ltp)} color="#94a3b8" />
        <StatBox label="Basis"
          value={(data.basis > 0 ? '+' : '') + data.basis}
          color={basisCol}
          sub={data.basis > 0 ? 'Premium' : data.basis < 0 ? 'Discount' : 'At par'}
          subColor={basisCol}
        />
        <StatBox label="ΔPrice"
          value={data.d_price != null ? (data.d_price > 0 ? '+' : '') + data.d_price : '—'}
          color={data.d_price >= 0 ? '#4ade80' : '#f87171'}
          sub="vs prev tick"
        />
        <StatBox label="ΔOI"
          value={data.d_oi != null ? (data.d_oi > 0 ? '+' : '') + fmtOI(data.d_oi) : '—'}
          color={data.d_oi >= 0 ? '#4ade80' : '#f87171'}
          sub="vs prev tick"
        />
      </div>

      {/* ── Basis intelligence ── */}
      {basisIntel.notes && basisIntel.notes.length > 0 && (
        <div style={{ padding: '10px 14px', background: '#1e293b', borderRadius: 8,
                      display: 'flex', flexDirection: 'column', gap: 4 }}>
          <p style={{ fontSize: 9, color: '#475569', margin: '0 0 4px',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Basis Intelligence
          </p>
          {basisIntel.notes.map(function(note, i) {
            return (
              <span key={i} style={{ fontSize: 12, color: '#94a3b8' }}>
                {i === 0 ? '📊 ' : '  · '}{note}
              </span>
            );
          })}
        </div>
      )}

      {/* ── Options implication ── */}
      {options.action && (
        <div style={{ padding: '12px 16px', background: sc + '12',
                      border: '1px solid ' + sc + '33', borderRadius: 8 }}>
          <p style={{ fontSize: 9, color: '#475569', margin: '0 0 5px',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Options Implication
          </p>
          <p style={{ fontSize: 14, fontWeight: 700, color: sc, margin: 0 }}>→ {options.action}</p>
          {options.avoid && (
            <p style={{ fontSize: 11, color: '#64748b', margin: '5px 0 0' }}>⚠ {options.avoid}</p>
          )}
        </div>
      )}

      {/* ── Alerts ── */}
      <Alerts alerts={data.alerts || []} />

      {/* ── Sparkline ── */}
      <div>
        <p style={{ fontSize: 9, color: '#334155', margin: '0 0 6px',
                    fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Signal history — last 40 ticks
        </p>
        <SignalSparkline history={data.history || []} width={420} height={52} />
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

      {/* ── Snapshot log ── */}
      <div>
        <p style={{ fontSize: 9, color: '#475569', margin: '0 0 8px',
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Snapshot Log
        </p>
        <SentimentHistoryTable history={data.history || []} />
      </div>

    </div>
  );
}

// ─── Futures price card (VWAP + price bar) ────────────────────────────────────

function FuturesCard(props) {
  var f   = props.futures || {};
  var col = f.fut_signal_color || '#f59e0b';

  function Stat(p) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 9, color: '#475569', fontWeight: 700,
                       textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.label}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: p.color || '#f1f5f9' }}>{p.value}</span>
      </div>
    );
  }

  return (
    <div style={{ background: '#0f172a', border: '1px solid ' + col + '44',
                  borderLeft: '4px solid ' + col, borderRadius: 12,
                  padding: '14px 20px', display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: '#475569', fontWeight: 700,
                       textTransform: 'uppercase', letterSpacing: '0.05em' }}>Futures Signal</span>
        <span style={{ fontSize: 22, fontWeight: 900, color: col }}>{f.fut_signal || 'NEUTRAL'}</span>
        <span style={{ fontSize: 10, color: '#64748b' }}>{f.fut_signal_reason || ''}</span>
      </div>
      <div style={{ width: 1, height: 48, background: '#1e293b', flexShrink: 0 }} />
      <Stat label="Futures LTP"  value={f.fut_ltp  || '—'} color="#f1f5f9" />
      <Stat label="Futures VWAP" value={f.fut_vwap || '—'} color="#60a5fa" />
      <Stat label="vs VWAP"
            value={f.fut_vs_vwap != null ? (f.fut_vs_vwap > 0 ? '+' : '') + f.fut_vs_vwap : '—'}
            color={f.fut_vs_vwap > 0 ? '#4ade80' : f.fut_vs_vwap < 0 ? '#f87171' : '#f59e0b'} />
      <Stat label="High"   value={f.fut_high || '—'} color="#94a3b8" />
      <Stat label="Low"    value={f.fut_low  || '—'} color="#94a3b8" />
      <Stat label="Open"   value={f.fut_open || '—'} color="#94a3b8" />
      <Stat label="Change"
            value={f.fut_chg != null ? (f.fut_chg > 0 ? '+' : '') + f.fut_chg + ' (' + f.fut_pct + '%)' : '—'}
            color={f.fut_chg > 0 ? '#4ade80' : f.fut_chg < 0 ? '#f87171' : '#94a3b8'} />
      <Stat label="Spot"   value={props.spot || '—'} color="#64748b" />
      {f.fut_ltp && f.fut_vwap && f.fut_high && f.fut_low && (
        <div style={{ marginLeft: 'auto', flexShrink: 0, minWidth: 120 }}>
          <span style={{ fontSize: 9, color: '#475569', fontWeight: 700,
                         textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            Price vs VWAP
          </span>
          {(function() {
            var range   = (f.fut_high - f.fut_low) || 1;
            var ltpPct  = Math.max(0, Math.min(100, ((f.fut_ltp  - f.fut_low) / range) * 100));
            var vwapPct = Math.max(0, Math.min(100, ((f.fut_vwap - f.fut_low) / range) * 100));
            return (
              <div style={{ position: 'relative', height: 8, background: '#1e293b', borderRadius: 4, width: 120 }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%',
                              width: ltpPct + '%', background: col, borderRadius: 4 }} />
                <div style={{ position: 'absolute', left: vwapPct + '%', top: -3,
                              width: 2, height: 14, background: '#60a5fa', transform: 'translateX(-50%)' }} />
              </div>
            );
          })()}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 8, color: '#334155' }}>
            <span>{f.fut_low}</span>
            <span style={{ color: '#60a5fa' }}>VWAP {f.fut_vwap}</span>
            <span>{f.fut_high}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Basis tracker ────────────────────────────────────────────────────────────

function BasisTracker(props) {
  var futures = props.futures || {};
  var spot    = props.spot    || 0;
  var tDays   = props.tDays   || 7;
  var history = props.history || [];
  // Also accept basis_intel notes from sentiment API if available
  var basisIntelNotes = props.basisIntelNotes || [];

  var futLtp = futures.fut_ltp || 0;
  var basis  = (futLtp > 0 && spot > 0) ? Math.round((futLtp - spot) * 100) / 100 : null;
  var normal = spot > 0 ? Math.round(spot * 0.065 * tDays / 365) : null;
  var diff   = (basis != null && normal != null) ? Math.round((basis - normal) * 100) / 100 : null;

  var bCol = diff == null ? '#64748b'
           : diff > 20   ? '#4ade80'
           : diff < -20  ? '#f87171'
           : '#f59e0b';
  var bLbl = diff == null ? 'No data'
           : diff > 20   ? 'Above normal — institutional futures buying'
           : diff < -20  ? 'Below normal — institutional selling / hedging'
           : 'Normal range — cost of carry';

  var trend = history.slice(0, 8).map(function(s) {
    return (s.price && spot) ? Math.round((s.price - spot) * 10) / 10 : null;
  }).filter(function(v) { return v !== null; });

  var tDir = trend.length >= 2
    ? (trend[0] > trend[trend.length - 1] + 2 ? 'rising'
    :  trend[0] < trend[trend.length - 1] - 2 ? 'falling' : 'flat')
    : 'flat';
  var tDirCol = tDir === 'rising' ? '#4ade80' : tDir === 'falling' ? '#f87171' : '#64748b';

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '14px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: 0,
                     textTransform: 'uppercase', letterSpacing: '0.05em' }}>Futures Basis</p>
        {diff != null && (
          <span style={{ fontSize: 10, fontWeight: 700, color: bCol, padding: '2px 8px',
                         borderRadius: 4, background: bCol + '18', border: '1px solid ' + bCol + '33' }}>
            {diff > 20 ? 'ABOVE NORMAL' : diff < -20 ? 'BELOW NORMAL' : 'NORMAL'}
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 10 }}>
        {[
          { label: 'Spot',    val: spot   > 0 ? spot.toLocaleString()   : '—', col: '#f1f5f9' },
          { label: 'Futures', val: futLtp > 0 ? futLtp.toLocaleString() : '—', col: '#60a5fa' },
          { label: 'Basis',   val: basis  != null ? (basis >= 0 ? '+' : '') + basis : '—', col: bCol },
          { label: 'Normal',  val: normal != null ? '~+' + normal : '—', col: '#64748b' },
        ].map(function(s, i) {
          return (
            <div key={i}>
              <p style={{ fontSize: 9, color: '#475569', margin: '0 0 2px', fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: s.col, margin: 0 }}>{s.val}</p>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 10px', lineHeight: 1.5 }}>{bLbl}</p>

      {/* Narrative notes from sentiment API if available */}
      {basisIntelNotes.length > 0 && (
        <div style={{ padding: '8px 12px', background: '#1e293b', borderRadius: 8,
                      display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 10 }}>
          {basisIntelNotes.map(function(note, i) {
            return (
              <span key={i} style={{ fontSize: 11, color: '#94a3b8' }}>
                {i === 0 ? '📊 ' : '  · '}{note}
              </span>
            );
          })}
        </div>
      )}

      {trend.length >= 2 && (
        <div>
          <p style={{ fontSize: 9, color: '#475569', margin: '0 0 6px', fontWeight: 700, textTransform: 'uppercase' }}>
            Basis trend &nbsp;
            <span style={{ color: tDirCol }}>
              {tDir === 'rising' ? '↑ Rising — institutional buying'
             : tDir === 'falling' ? '↓ Falling — long unwinding'
             : '→ Stable'}
            </span>
          </p>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {trend.map(function(v, i) {
              var col = v > (normal || 0) + 20 ? '#4ade80' : v < (normal || 0) - 20 ? '#f87171' : '#f59e0b';
              return (
                <div key={i} style={{ padding: '4px 8px',
                                      background: i === 0 ? col + '22' : '#1e293b',
                                      border: '1px solid ' + (i === 0 ? col + '55' : '#334155'),
                                      borderRadius: 6, textAlign: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: i === 0 ? 800 : 500, color: col }}>
                    {v >= 0 ? '+' : ''}{v}
                  </span>
                  {i === 0 && <span style={{ display: 'block', fontSize: 8, color: '#4ade80' }}>NOW</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p style={{ fontSize: 9, color: '#334155', margin: '8px 0 0' }}>
        Normal = Spot × 6.5% × days-to-expiry / 365 · Above normal = institutional buying · Below normal = hedging · Collapsing trend = unwinding
      </p>
    </div>
  );
}

// ─── Intraday table (3-min snapshots) ────────────────────────────────────────

// IntradayTable moved to Options.js

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FuturesPage() {
  var { user }  = useAuth();
  var navigate  = useNavigate();

  var [symbol,        setSymbol]        = useState('NIFTY');
  var [sentData,      setSentData]      = useState(null);   // /api/futures-sentiment
  var [sentLoading,   setSentLoading]   = useState(false);
  var [lastUpdate,    setLastUpdate]    = useState(null);

  var sentIntervalRef = useRef(null);

  var hasOptions = user && (
    user.plan === 'options' ||
    user.plan === 'global'  ||
    user.plan === 'admin'
  );

  function isMarketOpen() {
    var ist  = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    var day  = ist.getUTCDay();
    if (day === 0 || day === 6) return false;
    var mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
    return mins >= 555 && mins < 930;
  }

  function shouldClearData() {
    var ist  = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    var day  = ist.getUTCDay();
    if (day === 0 || day === 6) return false;
    var mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
    return mins >= 480 && mins < 555;
  }

  function fetchSentiment(sym) {
    setSentLoading(true);
    fetch(API + '/api/futures-sentiment?symbol=' + sym)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        setSentData(d);
        setSentLoading(false);
        setLastUpdate(new Date().toLocaleTimeString());
      })
      .catch(function(e) {
        console.error('[FuturesPage sentiment]', e);
        setSentLoading(false);
      });
  }



  useEffect(function() {
    if (!hasOptions) return;

    // Session clear window 8:00–9:15 AM
    if (shouldClearData()) {
      setSentData(null);
    }

    // Initial fetch for both
    fetchSentiment(symbol);

    // Sentiment: every 60s
    clearInterval(sentIntervalRef.current);
    sentIntervalRef.current = setInterval(function() {
      fetchSentiment(symbol);
    }, 60000);



    return function() {
      clearInterval(sentIntervalRef.current);
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
        <p style={{ fontSize: 14, color: '#64748b', margin: 0, textAlign: 'center',
                    maxWidth: 400, lineHeight: 1.6 }}>
          Live futures sentiment, VWAP analysis, intraday trend and basis tracking. Available on Options Pro.
        </p>
        <button onClick={function() { navigate('/pricing'); }}
          style={{ background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 10,
                   padding: '12px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          View Options Pro Plan →
        </button>
      </div>
    );
  }

  var loading  = sentLoading;
  var futures  = {};
  var basisIntelNotes = sentData && sentData.basis_intel ? (sentData.basis_intel.notes || []) : [];

  return (
    <div style={{ color: '#f1f5f9' }}>
      <PageTitle title="Futures" />

      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>
            Futures
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: 13 }}>
            OI Flow · VWAP · Basis · Intraday Trend · sentiment every 60s · dashboard every 3 min
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                        background: '#1e293b', borderRadius: 6, border: '1px solid #334155' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                           background: loading ? '#f59e0b' : isMarketOpen() ? '#4ade80' : '#64748b' }} />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              {loading ? 'Refreshing…'
               : lastUpdate ? 'Updated ' + lastUpdate + (isMarketOpen() ? '' : ' · market closed')
               : 'Waiting'}
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
            <button key={s.code} onClick={function() { setSymbol(s.code); }}
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
      {loading && !sentData && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#475569' }}>
          <p style={{ fontSize: 15 }}>Fetching {symbol} futures data…</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>



        {/* ── 2. OI Flow sentiment (60s signal + smoothing) ── */}
        <SentimentCard data={sentData} />

        {/* ── 3. GammaBlast ── */}
        <GammaBlast symbol={symbol} />

        {/* ── 4. Basis tracker — fed by sentiment API ── */}
        {sentData && (
          <BasisTracker
            futures={{}}
            spot={sentData ? sentData.spot_ltp : 0}
            tDays={7}
            history={[]}
            basisIntelNotes={basisIntelNotes}
          />
        )}


        {/* ── 6. Signal reference + confidence breakdown ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12,
                        padding: '20px 24px' }}>
            <p style={{ fontSize: 10, color: '#475569', margin: '0 0 12px',
                        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              OI Flow Signal Reference
            </p>
            <SignalLegend />
          </div>

          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12,
                        padding: '20px 24px' }}>
            <p style={{ fontSize: 10, color: '#475569', margin: '0 0 12px',
                        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Confidence Score Components
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'OI Magnitude',        weight: '35%', desc: 'Size of OI change vs rolling average — larger spike = stronger signal' },
                { label: 'Volume Confirmation', weight: '25%', desc: 'Volume in this tick vs average — above-average volume confirms intent' },
                { label: 'Basis Alignment',     weight: '20%', desc: 'Does basis direction agree? Expanding premium confirms Long Buildup' },
                { label: 'Consistency',         weight: '20%', desc: 'Last 3 ticks same signal = high consistency, mixed = low' },
              ].map(function(row) {
                return (
                  <div key={row.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start',
                                                padding: '8px 12px', background: '#1e293b', borderRadius: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#8b5cf6', minWidth: 32 }}>{row.weight}</span>
                    <div>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>{row.label}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>{row.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}