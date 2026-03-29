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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtOI(n) {
  if (!n) return '—';
  var abs = Math.abs(n);
  if (abs >= 100000) return (n / 100000).toFixed(1) + 'L';
  if (abs >= 1000)   return (n / 1000).toFixed(1) + 'K';
  return String(n);
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

  var values = history.slice(-40).map(function(h) {
    return SCORE[h.signal] !== undefined ? SCORE[h.signal] : 0;
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

  var lastVal  = values[values.length - 1];
  var col      = lastVal > 0 ? '#4ade80' : lastVal < 0 ? '#f87171' : '#64748b';
  var lastX    = padX + cW;
  var lastY    = padY + cH - ((lastVal - minV) / range) * cH;
  var zeroY    = padY + cH - ((0 - minV) / range) * cH;
  var fillPts  = points + ' ' + lastX + ',' + (padY + cH) + ' ' + padX + ',' + (padY + cH);

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

// ─── Confidence bar ────────────────────────────────────────────────────────────

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

// ─── Stat box ─────────────────────────────────────────────────────────────────

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
      <span style={{ fontSize: 17, fontWeight: 800, color: color }}>
        {value}
      </span>
      {sub && (
        <p style={{ fontSize: 9, color: subColor || '#64748b', margin: '2px 0 0' }}>{sub}</p>
      )}
    </div>
  );
}

// ─── Trend pill ───────────────────────────────────────────────────────────────

function TrendPill(props) {
  var trend = props.trend || {};
  var col   = trendColor(trend.label);
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

// ─── Alerts ───────────────────────────────────────────────────────────────────

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

// ─── History table ─────────────────────────────────────────────────────────────

function HistoryTable(props) {
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
            var sc  = r.signal_color || signalColor(r.signal);
            var bg  = i % 2 === 0 ? 'transparent' : '#0f172a55';
            return (
              <tr key={i} style={{ background: bg, borderBottom: '1px solid #0f172a' }}>
                <td style={{ ...td, textAlign: 'left', color: '#64748b' }}>{r.time}</td>
                <td style={{ ...td, color: sc, fontWeight: 700 }}>
                  {r.signal_emoji} {r.signal}
                </td>
                <td style={{ ...td, color: confColor(r.confidence) }}>{r.confidence}</td>
                <td style={{ ...td, color: '#f1f5f9' }}>{r.ltp ? r.ltp.toLocaleString() : '—'}</td>
                <td style={{ ...td, color: '#94a3b8' }}>{r.spot_ltp ? r.spot_ltp.toLocaleString() : '—'}</td>
                <td style={{ ...td, color: r.basis >= 0 ? '#60a5fa' : '#f59e0b' }}>
                  {r.basis > 0 ? '+' : ''}{r.basis}
                </td>
                <td style={{ ...td, color: r.d_price >= 0 ? '#4ade80' : '#f87171' }}>
                  {r.d_price > 0 ? '+' : ''}{r.d_price}
                </td>
                <td style={{ ...td, color: r.d_oi >= 0 ? '#4ade80' : '#f87171' }}>
                  {r.d_oi > 0 ? '+' : ''}{fmtOI(r.d_oi)}
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

// ─── Main card for one symbol ─────────────────────────────────────────────────

function SentimentCard(props) {
  var data = props.data;
  if (!data) {
    return (
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12,
                    padding: '24px', color: '#334155', fontSize: 13, textAlign: 'center' }}>
        No data yet — first snapshot arrives within 60s of server start
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

  var sc         = signalColor(data.signal);
  var basisColor = data.basis >= 0 ? '#60a5fa' : '#f59e0b';
  var basisIntel = data.basis_intel || {};
  var options    = data.options     || {};
  var trend      = data.trend       || {};

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b',
                  borderLeft: '4px solid ' + sc,
                  borderRadius: 12, padding: '20px 24px',
                  display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Signal + trend row ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 10, color: '#475569', margin: '0 0 4px',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Current Signal
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: sc }}>
              {data.signal_emoji} {data.signal}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <TrendPill trend={trend} />
          <span style={{ fontSize: 10, color: '#334155' }}>⏱ {data.timestamp}</span>
        </div>
      </div>

      {/* ── Confidence ── */}
      <div>
        <p style={{ fontSize: 9, color: '#475569', margin: '0 0 5px',
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Signal Confidence
        </p>
        <ConfBar n={data.confidence} />
      </div>

      {/* ── Key stats ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <StatBox label="Fut LTP"  value={data.ltp ? data.ltp.toLocaleString() : '—'} color="#f1f5f9" />
        <StatBox label="Spot LTP" value={data.spot_ltp ? data.spot_ltp.toLocaleString() : '—'} color="#94a3b8" />
        <StatBox
          label="Basis"
          value={(data.basis > 0 ? '+' : '') + data.basis}
          color={basisColor}
          sub={data.basis > 0 ? 'Premium' : data.basis < 0 ? 'Discount' : 'At par'}
          subColor={basisColor}
        />
        <StatBox
          label="ΔPrice"
          value={(data.d_price > 0 ? '+' : '') + data.d_price}
          color={data.d_price >= 0 ? '#4ade80' : '#f87171'}
          sub="vs prev tick"
        />
        <StatBox
          label="ΔOI"
          value={(data.d_oi > 0 ? '+' : '') + fmtOI(data.d_oi)}
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
          <p style={{ fontSize: 14, fontWeight: 700, color: sc, margin: 0 }}>
            → {options.action}
          </p>
          {options.avoid && (
            <p style={{ fontSize: 11, color: '#64748b', margin: '5px 0 0' }}>
              ⚠ {options.avoid}
            </p>
          )}
        </div>
      )}

      {/* ── Alerts ── */}
      <Alerts alerts={data.alerts || []} />

      {/* ── Sparkline ── */}
      <div>
        <p style={{ fontSize: 9, color: '#334155', margin: '0 0 6px',
                    fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Signal History — last 40 ticks
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

      {/* ── History table ── */}
      <div>
        <p style={{ fontSize: 9, color: '#475569', margin: '0 0 8px',
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Snapshot Log
        </p>
        <HistoryTable history={data.history || []} />
      </div>

    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FuturesSentimentPage() {
  var { user }   = useAuth();
  var navigate   = useNavigate();
  var [symbol, setSymbol]   = useState('NIFTY');
  var [data,   setData]     = useState(null);
  var [loading, setLoading] = useState(false);
  var [lastUpdate, setLastUpdate] = useState(null);
  var intervalRef = useRef(null);

  var hasOptions = user && (
    user.plan === 'options' ||
    user.plan === 'global'  ||
    user.plan === 'admin'
  );

  function fetchData(sym) {
    setLoading(true);
    fetch(API + '/api/futures-sentiment?symbol=' + sym)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        setData(d);
        setLoading(false);
        setLastUpdate(new Date().toLocaleTimeString());
      })
      .catch(function(e) {
        console.error('[FuturesSentimentPage]', e);
        setLoading(false);
      });
  }

  useEffect(function() {
    if (!hasOptions) return;
    fetchData(symbol);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(function() { fetchData(symbol); }, 60000);
    return function() { clearInterval(intervalRef.current); };
  }, [symbol, hasOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Paywall ──
  if (!hasOptions) {
    return (
      <div style={{ color: '#f1f5f9', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', minHeight: 500, gap: 20 }}>
        <PageTitle title="Futures Sentiment" />
        <div style={{ fontSize: 48 }}>📈</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Futures Sentiment</h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0, textAlign: 'center',
                    maxWidth: 400, lineHeight: 1.6 }}>
          Live Nifty futures buy/sell pressure analysis. Available on Options Pro.
        </p>
        <button
          onClick={function() { navigate('/pricing'); }}
          style={{ background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 10,
                   padding: '12px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
        >
          View Options Pro Plan →
        </button>
      </div>
    );
  }

  return (
    <div style={{ color: '#f1f5f9' }}>
      <PageTitle title="Futures Sentiment" />

      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>
            Futures Sentiment
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: 13 }}>
            Price × OI · Basis · Confidence · Options Implication · every 60s
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                        background: '#1e293b', borderRadius: 6, border: '1px solid #334155' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                           background: loading ? '#f59e0b' : '#4ade80' }} />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              {loading ? 'Refreshing…' : lastUpdate ? 'Updated ' + lastUpdate : 'Waiting'}
            </span>
          </div>
          <button
            onClick={function() { navigate('/options'); }}
            style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
                     padding: '6px 14px', color: '#94a3b8', fontSize: 12, fontWeight: 600,
                     cursor: 'pointer' }}
          >
            ← Options
          </button>
        </div>
      </div>

      {/* ── Symbol tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {SYMBOLS.map(function(s) {
          return (
            <button
              key={s.code}
              onClick={function() { setSymbol(s.code); }}
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
              }}
            >
              {s.flag} {s.label}
            </button>
          );
        })}
      </div>

      {/* ── Main card ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {loading && !data && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#475569' }}>
            <p style={{ fontSize: 15 }}>Fetching {symbol} futures sentiment…</p>
          </div>
        )}

        <SentimentCard data={data} />
        <GammaBlast symbol={symbol} />

        {/* ── Signal reference ── */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12,
                      padding: '20px 24px' }}>
          <p style={{ fontSize: 10, color: '#475569', margin: '0 0 12px',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Signal Reference
          </p>
          <SignalLegend />
        </div>

        {/* ── How confidence is calculated ── */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12,
                      padding: '20px 24px' }}>
          <p style={{ fontSize: 10, color: '#475569', margin: '0 0 12px',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Confidence Score Components
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'OI Magnitude',      weight: '35%', desc: 'Size of OI change vs rolling average — larger spike = stronger signal' },
              { label: 'Volume Confirmation', weight: '25%', desc: 'Volume in this tick vs average — above-average volume confirms intent' },
              { label: 'Basis Alignment',   weight: '20%', desc: 'Does basis direction agree? Expanding premium confirms Long Buildup' },
              { label: 'Consistency',       weight: '20%', desc: 'Last 3 ticks same signal = high consistency, mixed = low' },
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
  );
}