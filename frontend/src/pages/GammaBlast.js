// ─────────────────────────────────────────────────────────────────────────────
// GammaBlast.js
// Add this file to src/pages/ or src/components/
// Then import and use inside FuturesSentimentPage.js:
//
//   import GammaBlast from './GammaBlast';
//   ...
//   <GammaBlast symbol={symbol} />
//
// Place it at the bottom of the page, after <SentimentCard data={data} />
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';

var API = 'http://localhost:3001';

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing(props) {
  var score    = props.score    || 0;
  var maxScore = props.maxScore || 13;
  var color    = props.color    || '#64748b';
  var rating   = props.rating   || 'LOW';
  var emoji    = props.emoji    || '⚪';

  var pct         = score / maxScore;
  var r           = 44;
  var circ        = 2 * Math.PI * r;
  var strokeDash  = pct * circ;
  var size        = 120;
  var cx          = size / 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={strokeDash + ' ' + circ}
          strokeLinecap="round"
          transform={'rotate(-90 ' + cx + ' ' + cx + ')'}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x={cx} y={cx - 6} textAnchor="middle" fill={color}
              fontSize="22" fontWeight="800">{score}</text>
        <text x={cx} y={cx + 12} textAnchor="middle" fill="#475569"
              fontSize="10">/ {maxScore}</text>
      </svg>
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: color }}>
          {emoji} {rating}
        </p>
      </div>
    </div>
  );
}

// ─── Condition row ────────────────────────────────────────────────────────────

function ConditionRow(props) {
  var c = props.condition || {};
  var statusBg = {
    'HIGH': 'rgba(248,113,113,0.12)',
    'MED':  'rgba(245,158,11,0.12)',
    'LOW':  'rgba(100,116,139,0.08)',
  }[c.status] || 'transparent';

  var statusLabel = { 'HIGH': '●', 'MED': '◐', 'LOW': '○' }[c.status] || '○';

  var NOTES = {
    'proximity':  'How close spot is to the OI wall. Under 0.3% means the blast zone is active — writers are forced to hedge immediately.',
    'oi_erosion': 'OI at the wall strike is falling — option writers are covering their positions. This is the earliest and most reliable warning signal.',
    'iv_collapse':'IV at the wall strike is dropping despite spot approaching it. Writers are no longer defending — they expect the level to break.',
    'futures':    'Futures signal confirms the blast direction. Long Buildup + expanding basis = institutional buying driving spot into the wall.',
    'pcr':        'PCR shifting rapidly means traders are repositioning away from the wall. Collapsing PCR = call writers giving up resistance.',
  };

  var note = NOTES[c.id] || '';

  return (
    <div style={{ padding: '9px 14px', background: statusBg,
                  border: '1px solid ' + c.color + '33', borderRadius: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 16, color: c.color, minWidth: 16, lineHeight: 1 }}>{statusLabel}</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{c.label}</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>{c.detail}</p>
        </div>
        <div style={{ textAlign: 'right', minWidth: 40 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: c.color }}>+{c.score}</span>
          <p style={{ margin: 0, fontSize: 9, color: '#334155' }}>pts</p>
        </div>
      </div>
      {note && (
        <p style={{ margin: '6px 0 0 28px', fontSize: 10, color: '#475569', lineHeight: 1.5,
                    borderTop: '1px solid ' + c.color + '22', paddingTop: 6 }}>
          {note}
        </p>
      )}
    </div>
  );
}

// ─── Score history sparkline ───────────────────────────────────────────────────

function ScoreSparkline(props) {
  var history = props.history || [];
  var width   = props.width   || 320;
  var height  = props.height  || 44;

  if (history.length < 2) {
    return (
      <div style={{ width: width, height: height, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 11, color: '#334155' }}>
        collecting data…
      </div>
    );
  }

  var values = history.slice(-40).map(function(h) { return h.score || 0; });
  var maxV   = 13;
  var minV   = 0;
  var range  = maxV - minV;
  var padX   = 4, padY = 6;
  var cW     = width  - padX * 2;
  var cH     = height - padY * 2;

  var points = values.map(function(v, i) {
    var x = padX + (i / Math.max(values.length - 1, 1)) * cW;
    var y = padY + cH - ((v - minV) / range) * cH;
    return x + ',' + y;
  }).join(' ');

  var lastVal  = values[values.length - 1];
  var col      = lastVal >= 8 ? '#f87171' : lastVal >= 5 ? '#f59e0b' : lastVal >= 3 ? '#60a5fa' : '#64748b';
  var lastX    = padX + cW;
  var lastY    = padY + cH - ((lastVal - minV) / range) * cH;

  // Threshold lines
  var y8 = padY + cH - (8 / range) * cH;
  var y5 = padY + cH - (5 / range) * cH;
  var y3 = padY + cH - (3 / range) * cH;

  var fillPts = points + ' ' + lastX + ',' + (padY + cH) + ' ' + padX + ',' + (padY + cH);

  return (
    <svg width={width} height={height} viewBox={'0 0 ' + width + ' ' + height}>
      <line x1={padX} y1={y8} x2={padX + cW} y2={y8} stroke="#f87171" strokeWidth="0.5" strokeDasharray="2,3" opacity="0.4" />
      <line x1={padX} y1={y5} x2={padX + cW} y2={y5} stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="2,3" opacity="0.4" />
      <line x1={padX} y1={y3} x2={padX + cW} y2={y3} stroke="#60a5fa" strokeWidth="0.5" strokeDasharray="2,3" opacity="0.4" />
      <polygon points={fillPts} fill={col} opacity="0.08" />
      <polyline points={points} fill="none" stroke={col}
                strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="3" fill={col} />
    </svg>
  );
}

// ─── Reference table ──────────────────────────────────────────────────────────

function ReferenceTable(props) {
  var reference = props.reference || [];
  if (!reference.length) return null;

  var th = { padding: '7px 12px', fontSize: 9, fontWeight: 700, color: '#475569',
             textTransform: 'uppercase', letterSpacing: '0.05em',
             borderBottom: '1px solid #1e293b', textAlign: 'left' };
  var td = { padding: '10px 12px', fontSize: 11, verticalAlign: 'top' };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>Rating</th>
            <th style={th}>Score</th>
            <th style={th}>Condition</th>
            <th style={th}>Action</th>
            <th style={th}>Avoid</th>
            <th style={th}>Timing</th>
          </tr>
        </thead>
        <tbody>
          {reference.map(function(row, i) {
            var bg = i % 2 === 0 ? 'transparent' : '#0f172a55';
            return (
              <tr key={row.rating} style={{ background: bg, borderBottom: '1px solid #0f172a' }}>
                <td style={{ ...td }}>
                  <span style={{ fontWeight: 800, color: row.color }}>
                    {row.emoji} {row.rating}
                  </span>
                </td>
                <td style={{ ...td, color: row.color, fontWeight: 700 }}>{row.score}</td>
                <td style={{ ...td, color: '#94a3b8' }}>{row.condition}</td>
                <td style={{ ...td, color: '#4ade80', fontWeight: 600 }}>{row.action}</td>
                <td style={{ ...td, color: '#f87171' }}>{row.avoid || '—'}</td>
                <td style={{ ...td, color: '#64748b' }}>{row.timing}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Wall display ─────────────────────────────────────────────────────────────

function WallDisplay(props) {
  var data = props.data || {};

  function fmtOI(n) {
    if (!n) return '—';
    var abs = Math.abs(n);
    if (abs >= 100000) return (n / 100000).toFixed(1) + 'L';
    if (abs >= 1000)   return (n / 1000).toFixed(0) + 'K';
    return String(n);
  }

  var dirColor   = data.direction === 'UP' ? '#4ade80' : '#f87171';
  var dirLabel   = data.direction === 'UP' ? '↑ Upside Blast Risk' : '↓ Downside Blast Risk';
  var basisColor = data.direction === 'UP' ? '#f87171' : '#4ade80';

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>

      <div style={{ padding: '10px 14px', background: '#1e293b', borderRadius: 8, flex: 1, minWidth: 100 }}>
        <p style={{ fontSize: 9, color: '#475569', margin: '0 0 3px',
                    fontWeight: 700, textTransform: 'uppercase' }}>Direction</p>
        <span style={{ fontSize: 15, fontWeight: 800, color: dirColor }}>{dirLabel}</span>
      </div>

      <div style={{ padding: '10px 14px', background: '#1e293b', borderRadius: 8, flex: 1, minWidth: 90 }}>
        <p style={{ fontSize: 9, color: '#475569', margin: '0 0 3px',
                    fontWeight: 700, textTransform: 'uppercase' }}>Wall Strike</p>
        <span style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>{data.wall_strike || '—'}</span>
        <p style={{ fontSize: 9, color: '#64748b', margin: '2px 0 0' }}>
          {data.proximity_pct}% away
        </p>
      </div>

      <div style={{ padding: '10px 14px', background: '#1e293b', borderRadius: 8, flex: 1, minWidth: 90 }}>
        <p style={{ fontSize: 9, color: '#475569', margin: '0 0 3px',
                    fontWeight: 700, textTransform: 'uppercase' }}>Wall OI</p>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>
          {fmtOI(data.wall_oi_now)}
        </span>
        <p style={{ fontSize: 9, color: data.oi_erosion_pct > 2 ? '#f87171' : '#64748b', margin: '2px 0 0' }}>
          Δ {data.oi_erosion_pct > 0 ? '-' : ''}{data.oi_erosion_pct}%
        </p>
      </div>

      <div style={{ padding: '10px 14px', background: '#1e293b', borderRadius: 8, flex: 1, minWidth: 90 }}>
        <p style={{ fontSize: 9, color: '#475569', margin: '0 0 3px',
                    fontWeight: 700, textTransform: 'uppercase' }}>Wall IV</p>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>
          {data.wall_iv_now || '—'}
        </span>
        <p style={{ fontSize: 9, color: data.iv_drop > 1 ? '#f87171' : '#64748b', margin: '2px 0 0' }}>
          Δ {data.iv_drop > 0 ? '-' : ''}{data.iv_drop}
        </p>
      </div>

      <div style={{ padding: '10px 14px', background: '#1e293b', borderRadius: 8, flex: 1, minWidth: 90 }}>
        <p style={{ fontSize: 9, color: '#475569', margin: '0 0 3px',
                    fontWeight: 700, textTransform: 'uppercase' }}>Resistance</p>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#f87171' }}>{data.resistance || '—'}</span>
        <p style={{ fontSize: 9, color: '#64748b', margin: '2px 0 0' }}>
          CE OI {fmtOI(data.resistance_oi)}
        </p>
      </div>

      <div style={{ padding: '10px 14px', background: '#1e293b', borderRadius: 8, flex: 1, minWidth: 90 }}>
        <p style={{ fontSize: 9, color: '#475569', margin: '0 0 3px',
                    fontWeight: 700, textTransform: 'uppercase' }}>Support</p>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#4ade80' }}>{data.support || '—'}</span>
        <p style={{ fontSize: 9, color: '#64748b', margin: '2px 0 0' }}>
          PE OI {fmtOI(data.support_oi)}
        </p>
      </div>

    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GammaBlast(props) {
  var symbol = props.symbol || 'NIFTY';

  var [data,        setData]        = useState(null);
  var [loading,     setLoading]     = useState(true);
  var [showRef,     setShowRef]     = useState(false);
  var [showHistory, setShowHistory] = useState(false);
  var intervalRef = useRef(null);

  function fetchData() {
    fetch(API + '/api/gamma-blast?symbol=' + symbol)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        setData(d && !d.error ? d : null);
        setLoading(false);
      })
      .catch(function() { setLoading(false); });
  }

  useEffect(function() {
    setLoading(true);
    setData(null);
    fetchData();
    intervalRef.current = setInterval(fetchData, 180000);  // every 3 min, matches options refresh
    return function() { clearInterval(intervalRef.current); };
  }, [symbol]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading ──
  if (loading && !data) {
    return (
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12,
                    padding: '20px 24px', color: '#334155', fontSize: 13 }}>
        Computing {symbol} Gamma Blast score…
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12,
                    padding: '20px 24px', color: '#475569', fontSize: 12 }}>
        No gamma data yet — computed after first options refresh (every 3 min)
      </div>
    );
  }

  var rc    = data.rating_color || '#64748b';
  var alerts = data.alerts || [];

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b',
                  borderLeft: '4px solid ' + rc,
                  borderRadius: 12, padding: '20px 24px',
                  display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 10, color: '#475569', margin: '0 0 2px',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Gamma Blast Detector · {symbol}
          </p>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
            {data.condition_desc}
          </p>
        </div>
        <span style={{ fontSize: 10, color: '#334155' }}>⏱ {data.timestamp}</span>
      </div>

      {/* ── Score ring + action ── */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        <ScoreRing
          score={data.score}
          maxScore={data.max_score}
          color={rc}
          rating={data.rating}
          emoji={data.rating_emoji}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Action */}
          <div style={{ padding: '12px 16px', background: rc + '12',
                        border: '1px solid ' + rc + '33', borderRadius: 8 }}>
            <p style={{ fontSize: 9, color: '#475569', margin: '0 0 4px',
                        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Action
            </p>
            <p style={{ fontSize: 14, fontWeight: 700, color: rc, margin: 0 }}>
              → {data.action}
            </p>
            {data.avoid && (
              <p style={{ fontSize: 11, color: '#64748b', margin: '5px 0 0' }}>
                ⚠ {data.avoid}
              </p>
            )}
            <p style={{ fontSize: 10, color: '#475569', margin: '6px 0 0' }}>
              ⏳ {data.timing}
            </p>
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {alerts.map(function(a, i) {
                return (
                  <div key={i} style={{ padding: '6px 10px', borderRadius: 6,
                                        background: '#f8717118', border: '1px solid #f8717144',
                                        fontSize: 11, color: '#f87171', fontWeight: 600 }}>
                    ⚡ {a}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Wall display ── */}
      <div>
        <p style={{ fontSize: 9, color: '#475569', margin: '0 0 8px',
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          OI Walls
        </p>
        <WallDisplay data={data} />
      </div>

      {/* ── Conditions ── */}
      <div>
        <p style={{ fontSize: 9, color: '#475569', margin: '0 0 8px',
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Scoring Conditions
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(data.conditions || []).map(function(c) {
            return <ConditionRow key={c.id} condition={c} />;
          })}
        </div>
      </div>

      {/* ── Score history sparkline ── */}
      <div>
        <p style={{ fontSize: 9, color: '#475569', margin: '0 0 6px',
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Score History
        </p>
        <ScoreSparkline history={data.history || []} width={420} height={52} />
        <div style={{ display: 'flex', gap: 14, marginTop: 5 }}>
          {[
            { label: 'IMMINENT (8+)',  color: '#f87171' },
            { label: 'HIGH RISK (5+)', color: '#f59e0b' },
            { label: 'WATCH (3+)',     color: '#60a5fa' },
            { label: 'LOW',            color: '#64748b' },
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

      {/* ── Reference table toggle ── */}
      <div>
        <button
          onClick={function() { setShowRef(function(v) { return !v; }); }}
          style={{ fontSize: 11, color: '#475569', background: 'none', border: 'none',
                   cursor: 'pointer', padding: 0, textDecoration: 'underline', marginBottom: 8 }}>
          {showRef ? '▲ Hide' : '▼ Show'} Rating Reference Table
        </button>
        {showRef && (
          <div style={{ background: '#080f1c', border: '1px solid #1e293b', borderRadius: 8, overflow: 'hidden' }}>
            <ReferenceTable reference={data.reference || []} />
          </div>
        )}
      </div>

    </div>
  );
}