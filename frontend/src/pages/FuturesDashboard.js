import { useState, useEffect, useRef } from 'react';
import PageTitle from '../components/PageTitle';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

var API = 'http://localhost:3001';

var SYMBOLS = [
  { code: 'NIFTY',     label: 'NIFTY 50',  flag: '📊' },
  { code: 'BANKNIFTY', label: 'BANKNIFTY', flag: '🏦' },
];

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

function SignalBadge(props) {
  var sig = props.signal || 'NEUTRAL';
  var col = props.color ||
    (sig === 'BUY'  || sig === 'STRONG BUY'  || sig === 'MILD BUY'  ? '#4ade80' :
     sig === 'SELL' || sig === 'STRONG SELL' || sig === 'MILD SELL' ? '#f87171' : '#f59e0b');
  return (
    <span style={{
      fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 5,
      background: col + '18', color: col, border: '1px solid ' + col + '44',
      whiteSpace: 'nowrap',
    }}>
      {sig}
    </span>
  );
}

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
                  borderLeft: '4px solid ' + col, borderRadius: 12, padding: '14px 20px',
                  display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
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
      <Stat label="High"  value={f.fut_high || '—'} color="#94a3b8" />
      <Stat label="Low"   value={f.fut_low  || '—'} color="#94a3b8" />
      <Stat label="Open"  value={f.fut_open || '—'} color="#94a3b8" />
      <Stat label="Change"
            value={f.fut_chg != null ? (f.fut_chg > 0 ? '+' : '') + f.fut_chg + ' (' + f.fut_pct + '%)' : '—'}
            color={f.fut_chg > 0 ? '#4ade80' : f.fut_chg < 0 ? '#f87171' : '#94a3b8'} />
      <Stat label="Spot"  value={props.spot || '—'} color="#64748b" />
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


function BasisTracker(props) {
  var futures = props.futures || {};
  var spot    = props.spot    || 0;
  var tDays   = props.tDays   || 7;
  var history = props.history || [];

  var futLtp  = futures.fut_ltp || 0;
  var basis   = (futLtp > 0 && spot > 0) ? Math.round((futLtp - spot) * 100) / 100 : null;
  var normal  = spot > 0 ? Math.round(spot * 0.065 * tDays / 365) : null;
  var diff    = (basis != null && normal != null) ? Math.round((basis - normal) * 100) / 100 : null;

  var bCol  = diff == null ? '#64748b' : diff > 20 ? '#4ade80' : diff < -20 ? '#f87171' : '#f59e0b';
  var bLbl  = diff == null ? 'No data'
            : diff > 20  ? 'Above normal — institutional futures buying'
            : diff < -20 ? 'Below normal — institutional selling / hedging'
            : 'Normal range — cost of carry';

  var trend = history.slice(0, 8).map(function(s) {
    return (s.price && spot) ? Math.round((s.price - spot) * 10) / 10 : null;
  }).filter(function(v) { return v !== null; });

  var tDir = trend.length >= 2
    ? (trend[0] > trend[trend.length-1] + 2 ? 'rising'
    :  trend[0] < trend[trend.length-1] - 2 ? 'falling' : 'flat')
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
          { label: 'Spot',    val: spot    > 0 ? spot.toLocaleString()   : '—', col: '#f1f5f9' },
          { label: 'Futures', val: futLtp  > 0 ? futLtp.toLocaleString() : '—', col: '#60a5fa' },
          { label: 'Basis',   val: basis   != null ? (basis >= 0 ? '+' : '') + basis : '—', col: bCol },
          { label: 'Normal',  val: normal  != null ? '~+' + normal : '—', col: '#64748b' },
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

      {trend.length >= 2 && (
        <div>
          <p style={{ fontSize: 9, color: '#475569', margin: '0 0 6px', fontWeight: 700, textTransform: 'uppercase' }}>
            Basis trend &nbsp;
            <span style={{ color: tDirCol }}>
              {tDir === 'rising' ? '↑ Rising — institutional buying' : tDir === 'falling' ? '↓ Falling — long unwinding' : '→ Stable'}
            </span>
          </p>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {trend.map(function(v, i) {
              var col = v > (normal||0)+20 ? '#4ade80' : v < (normal||0)-20 ? '#f87171' : '#f59e0b';
              return (
                <div key={i} style={{ padding: '4px 8px', background: i===0 ? col+'22' : '#1e293b',
                                      border: '1px solid ' + (i===0 ? col+'55' : '#334155'), borderRadius: 6, textAlign: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: i===0 ? 800 : 500, color: col }}>{v >= 0 ? '+' : ''}{v}</span>
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

function IntradayTable(props) {
  var history = props.history || [];

  function sigCol(sig) {
    if (sig === 'BUY')  return '#4ade80';
    if (sig === 'SELL') return '#f87171';
    return '#f59e0b';
  }

  if (history.length === 0) {
    return (
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12,
                    padding: '40px', textAlign: 'center', color: '#475569', fontSize: 13 }}>
        <p style={{ margin: '0 0 8px', fontSize: 15 }}>No intraday data yet</p>
        <p style={{ margin: 0, fontSize: 12, color: '#334155' }}>
          Snapshots are saved every 3 minutes. Check back after the next options refresh.
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', margin: 0,
                       textTransform: 'uppercase', letterSpacing: '0.05em' }}>Intraday Trend</p>
          <p style={{ fontSize: 11, color: '#475569', margin: '2px 0 0' }}>
            {history.length} readings · newest first · every 3 min
          </p>
        </div>
        <span style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>
          USE DATA AFTER 10:30 AM
        </span>
      </div>

      <div style={{ overflowX: 'auto', maxHeight: 520, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr style={{ background: '#162032' }}>
              <th style={{ padding: '8px 14px', color: '#94a3b8', textAlign: 'left',   fontWeight: 700 }}>Time</th>
              <th style={{ padding: '8px 14px', color: '#f87171', textAlign: 'right',  fontWeight: 600 }}>Call Vol</th>
              <th style={{ padding: '8px 14px', color: '#4ade80', textAlign: 'right',  fontWeight: 600 }}>Put Vol</th>
              <th style={{ padding: '8px 14px', color: '#94a3b8', textAlign: 'right',  fontWeight: 600 }}>
                Diff
                <span style={{ display: 'block', fontSize: 9, color: '#475569', fontWeight: 400 }}>Put − Call</span>
              </th>
              <th style={{ padding: '8px 14px', color: '#94a3b8', textAlign: 'center', fontWeight: 600 }}>PCR</th>
              <th style={{ padding: '8px 14px', color: '#94a3b8', textAlign: 'center', fontWeight: 600 }}>
                PCR (COI)
                <span style={{ display: 'block', fontSize: 9, color: '#475569', fontWeight: 400 }}>Full Chain</span>
              </th>
              <th style={{ padding: '8px 14px', color: '#94a3b8', textAlign: 'center', fontWeight: 600,
                           borderLeft: '1px solid #334155' }}>Option Signal</th>
              <th style={{ padding: '8px 14px', color: '#60a5fa', textAlign: 'right',  fontWeight: 600,
                           borderLeft: '1px solid #334155' }}>VWAP</th>
              <th style={{ padding: '8px 14px', color: '#60a5fa', textAlign: 'right',  fontWeight: 600 }}>Price</th>
              <th style={{ padding: '8px 14px', color: '#94a3b8', textAlign: 'center', fontWeight: 600 }}>VWAP Signal</th>
            </tr>
          </thead>
          <tbody>
            {history.map(function(snap, i) {
              var isFirst  = i === 0;
              var prev     = history[i + 1];
              var diffVal  = snap.diff || 0;
              var pcrUp    = prev && snap.pcr > prev.pcr;
              var pcrDown  = prev && snap.pcr < prev.pcr;
              var pcrArrow = pcrUp ? ' ↑' : pcrDown ? ' ↓' : '';
              var pcrCol   = snap.pcr > 1.2 ? '#4ade80' : snap.pcr < 0.8 ? '#f87171' : '#f59e0b';
              var coiPcr     = snap.pcr_coi || 0;
              var coiPcrCol  = coiPcr > 1.2 ? '#4ade80' : coiPcr > 0 && coiPcr < 0.8 ? '#f87171' : '#f59e0b';
              var coiPcrUp   = prev && coiPcr > (prev.pcr_coi || 0);
              var coiPcrDown = prev && coiPcr < (prev.pcr_coi || 0);
              var coiArrow   = coiPcrUp ? ' ↑' : coiPcrDown ? ' ↓' : '';
              var diffCol  = diffVal > 0 ? '#4ade80' : diffVal < 0 ? '#f87171' : '#64748b';
              var priceCol = snap.price > snap.vwap ? '#4ade80' : snap.price < snap.vwap ? '#f87171' : '#f1f5f9';

              return (
                <tr key={i} style={{
                  background:    isFirst ? 'rgba(96,165,250,0.07)' : 'transparent',
                  borderBottom:  '1px solid #1e293b22',
                  opacity:       isFirst ? 1 : Math.max(0.45, 1 - i * 0.025),
                }}>
                  <td style={{ padding: '9px 14px', fontWeight: isFirst ? 700 : 500,
                               color: isFirst ? '#f1f5f9' : '#94a3b8', whiteSpace: 'nowrap' }}>
                    {fmtTime(snap.time)}
                    {isFirst && <span style={{ display: 'block', fontSize: 8, color: '#4ade80', fontWeight: 700 }}>LATEST</span>}
                  </td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: '#f87171', fontWeight: 600 }}>
                    {fmt(snap.call_vol)}
                  </td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: '#4ade80', fontWeight: 600 }}>
                    {fmt(snap.put_vol)}
                  </td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: diffCol, fontWeight: 700 }}>
                    {fmtDiff(diffVal)}
                  </td>
                  <td style={{ padding: '9px 14px', textAlign: 'center', color: pcrCol, fontWeight: 700 }}>
                    {snap.pcr}
                    <span style={{ fontSize: 10, color: pcrUp ? '#4ade80' : pcrDown ? '#f87171' : '#64748b' }}>
                      {pcrArrow}
                    </span>
                  </td>
                  <td style={{ padding: '9px 14px', textAlign: 'center', color: coiPcrCol, fontWeight: 700 }}>
                    {coiPcr > 0 ? coiPcr.toFixed(2) : '—'}
                    <span style={{ fontSize: 10, color: coiPcrUp ? '#4ade80' : coiPcrDown ? '#f87171' : '#64748b' }}>
                      {coiArrow}
                    </span>
                  </td>
                  <td style={{ padding: '9px 14px', textAlign: 'center', borderLeft: '1px solid #1e293b' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: sigCol(snap.opt_signal) }}>
                      {snap.opt_signal}
                    </span>
                  </td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: '#60a5fa', fontWeight: 600,
                               borderLeft: '1px solid #1e293b' }}>
                    {snap.vwap || '—'}
                  </td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: priceCol, fontWeight: 700 }}>
                    {snap.price || '—'}
                  </td>
                  <td style={{ padding: '9px 14px', textAlign: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: sigCol(snap.vwap_signal) }}>
                      {snap.vwap_signal}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ padding: '8px 16px', borderTop: '1px solid #1e293b', fontSize: 10, color: '#334155' }}>
        Option Signal: BUY if Put vol &gt; Call vol + PCR &gt;1.2 · SELL if Call vol &gt; Put vol + PCR &lt;0.8 ·
        VWAP Signal: BUY if Futures LTP &gt; VWAP · SELL if below · VWAP = (H+L+C)/3
      </div>
    </div>
  );
}


export default function FuturesDashboard() {
  var { user }  = useAuth();
  var navigate  = useNavigate();
  var [symbol,     setSymbol]     = useState('NIFTY');
  var [data,       setData]       = useState(null);
  var [loading,    setLoading]    = useState(false);
  var [lastUpdate, setLastUpdate] = useState(null);
  var intervalRef = useRef(null);

  var hasOptions = user && (
    user.plan === 'options' ||
    user.plan === 'global'  ||
    user.plan === 'admin'
  );

  function fetchData(sym) {
    setLoading(true);
    fetch(API + '/api/futures-dashboard?symbol=' + sym)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d && !d.error) { setData(d); setLastUpdate(new Date().toLocaleTimeString()); }
        setLoading(false);
      })
      .catch(function(e) { console.error(e); setLoading(false); });
  }

  useEffect(function() {
    if (!hasOptions) return;
    setLoading(true);
    setData(null);
    fetchData(symbol);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(function() { fetchData(symbol); }, 180000);
    return function() { clearInterval(intervalRef.current); };
  }, [symbol, hasOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hasOptions) {
    return (
      <div style={{ color: '#f1f5f9', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', minHeight: 500, gap: 20 }}>
        <PageTitle title="Futures Dashboard" />
        <div style={{ fontSize: 48 }}>📈</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Futures Dashboard</h1>
        <p style={{ fontSize: 14, color: '#64748b', textAlign: 'center', maxWidth: 420, lineHeight: 1.6 }}>
          Intraday trend, futures vs VWAP, strike signals. Options Pro required.
        </p>
        <button onClick={function() { navigate('/pricing'); }}
          style={{ background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 10,
                   padding: '12px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          View Options Pro Plan →
        </button>
      </div>
    );
  }

  var futures = data ? (data.futures          || {}) : {};
  var history = data ? (data.intraday_history || []) : [];

  return (
    <div style={{ color: '#f1f5f9' }}>
      <PageTitle title="Futures Dashboard" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>
            Futures Dashboard
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: 13 }}>
            Intraday trend · Strike signals · Futures vs VWAP · refreshes every 60s
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                        background: '#1e293b', borderRadius: 6, border: '1px solid #334155' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                           background: loading ? '#f59e0b' : '#4ade80' }} />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              {loading ? 'Loading…' : lastUpdate ? 'Updated ' + lastUpdate : 'Waiting'}
            </span>
          </div>
          <button onClick={function() { fetchData(symbol); }}
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

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {SYMBOLS.map(function(s) {
          return (
            <button key={s.code} onClick={function() { setSymbol(s.code); }}
              style={{
                border: '1px solid #334155', borderRadius: 8, padding: '8px 20px',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: symbol === s.code ? '#8b5cf6' : '#1e293b',
                color:      symbol === s.code ? '#fff'    : '#94a3b8',
                transition: 'all 0.15s',
              }}>
              {s.flag} {s.label}
            </button>
          );
        })}
      </div>

      {loading && !data && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#475569' }}>
          <p style={{ fontSize: 15 }}>Fetching {symbol} data…</p>
        </div>
      )}

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FuturesCard futures={futures} spot={data.spot_price} />
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '8px 16px',
                        background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9' }}>{data.symbol}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#60a5fa' }}>{data.spot_price}</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>Expiry: <b style={{ color: '#f1f5f9' }}>{data.expiry}</b></span>
            <span style={{ fontSize: 12, color: '#64748b' }}>ATM: <b style={{ color: '#60a5fa' }}>{data.atm_strike}</b></span>
            <span style={{ fontSize: 12, color: '#64748b' }}>Futures: <b style={{ color: futures.fut_signal_color || '#f59e0b' }}>{futures.fut_ltp}</b></span>
            <span style={{ fontSize: 12, color: '#64748b' }}>VWAP: <b style={{ color: '#60a5fa' }}>{futures.fut_vwap}</b></span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#334155' }}>⏱ {data.timestamp}</span>
          </div>

          <BasisTracker futures={futures} spot={data.spot_price || 0} tDays={data.t_days || 7} history={history} />

          {/* PRIMARY: Intraday trend sorted newest first */}
          <IntradayTable history={history} />

        </div>
      )}
    </div>
  );
}