import { useState, useEffect, useRef } from 'react';
import PageTitle from '../components/PageTitle';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

var API = 'http://localhost:3001';

var SYMBOLS = [
  { code: 'NIFTY',     label: 'NIFTY 50',  flag: '📊' },
  { code: 'BANKNIFTY', label: 'BANKNIFTY', flag: '🏦' },
];

var FILTERS = [
  { id: 'all',    label: 'All Strikes'  },
  { id: 'near',   label: 'Near ATM ±10' },
  { id: 'calls',  label: 'Calls Only'   },
  { id: 'puts',   label: 'Puts Only'    },
];

var BUILDUP_CE = {
  'Long Buildup':   { color: '#4ade80', short: 'LB', meaning: 'Call Buying · Bullish'     },
  'Short Buildup':  { color: '#f87171', short: 'SB', meaning: 'Call Writing · Bearish'    },
  'Short Covering': { color: '#60a5fa', short: 'SC', meaning: 'Writers Exiting · Bullish' },
  'Long Unwinding': { color: '#f59e0b', short: 'LU', meaning: 'Buyers Exiting · Bearish'  },
};

var BUILDUP_PE = {
  'Long Buildup':   { color: '#f87171', short: 'LB', meaning: 'Put Buying · Bearish'      },
  'Short Buildup':  { color: '#4ade80', short: 'SB', meaning: 'Put Writing · Bullish'     },
  'Short Covering': { color: '#f59e0b', short: 'SC', meaning: 'Writers Exiting · Bearish' },
  'Long Unwinding': { color: '#60a5fa', short: 'LU', meaning: 'Buyers Exiting · Bullish'  },
};

function fmt(n) {
  if (!n && n !== 0) return '—';
  var sign = n < 0 ? '-' : '';
  var abs  = Math.abs(n);
  if (abs >= 100000) return sign + (abs / 100000).toFixed(1) + 'L';
  if (abs >= 1000)   return sign + (abs / 1000).toFixed(0) + 'K';
  return String(n);
}

function fmtChg(n) {
  if (!n && n !== 0) return '—';
  var abs = Math.abs(n);
  if (abs >= 100000) return (n > 0 ? '+' : '') + (n / 100000).toFixed(1) + 'L';
  if (abs >= 1000)   return (n > 0 ? '+' : '') + (n / 1000).toFixed(0) + 'K';
  return (n > 0 ? '+' : '') + n;
}

function chgCol(v) {
  if (!v || v === 0) return '#64748b';
  return v > 0 ? '#4ade80' : '#f87171';
}

function BuildupBadge(props) {
  var sig  = props.signal;
  var side = props.side || 'CE';
  if (!sig) return <span style={{ color: '#334155', fontSize: 10 }}>—</span>;
  var map = side === 'CE' ? BUILDUP_CE : BUILDUP_PE;
  var s   = map[sig] || { color: '#64748b', short: '?', meaning: '' };
  return (
    <span
      title={sig + ' — ' + s.meaning}
      style={{
        fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
        background: s.color + '22', color: s.color, whiteSpace: 'nowrap',
        cursor: 'default', border: '1px solid ' + s.color + '33',
      }}
    >
      {s.short}
    </span>
  );
}

function OIBar(props) {
  var data      = props.data || {};
  var totalCE   = data.total_ce_oi  || 0;
  var totalPE   = data.total_pe_oi  || 0;
  var totalCEV  = data.total_ce_vol || 0;
  var totalPEV  = data.total_pe_vol || 0;
  var totalCEC  = data.total_ce_coi || 0;
  var totalPEC  = data.total_pe_coi || 0;
  var pcr       = data.pcr_total    || 0;
  var sentiment = data.sentiment_total || 'Neutral';
  var oiTotal   = totalCE  + totalPE  || 1;
  var volTotal  = totalCEV + totalPEV || 1;
  var coiTotal  = Math.abs(totalCEC) + Math.abs(totalPEC) || 1;
  var cePct     = Math.round((totalCE  / oiTotal)  * 100);
  var pePct     = 100 - cePct;
  var ceVolPct  = Math.round((totalCEV / volTotal) * 100);
  var peVolPct  = 100 - ceVolPct;
  var ceCOIPct  = Math.round((Math.abs(totalCEC) / coiTotal) * 100);
  var peCOIPct  = 100 - ceCOIPct;
  var volDiff   = totalPEV - totalCEV;
  var coiDiff   = totalPEC - totalCEC;
  var sCol      = sentiment === 'Bullish' ? '#4ade80' : sentiment === 'Bearish' ? '#f87171' : '#f59e0b';
  var volDiffCol = volDiff > 0 ? '#4ade80' : volDiff < 0 ? '#f87171' : '#64748b';
  var coiDiffCol = coiDiff > 0 ? '#4ade80' : coiDiff < 0 ? '#f87171' : '#64748b';

  function Section(p) {
    return (
      <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 14px',
                    border: '1px solid #334155', flex: 1, minWidth: 160 }}>
        <p style={{ fontSize: 9, color: '#475569', margin: '0 0 8px', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.title}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <p style={{ fontSize: 9, color: '#f87171', margin: '0 0 2px', fontWeight: 600 }}>CE</p>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#f87171' }}>{fmt(p.ce)}</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 9, color: '#475569', margin: '0 0 2px', fontWeight: 600 }}>DIFF (PE−CE)</p>
            <span style={{ fontSize: 13, fontWeight: 800, color: p.diffCol }}>{p.diff > 0 ? '+' : ''}{fmt(p.diff)}</span>
            <p style={{ fontSize: 9, margin: '2px 0 0', color: p.diffCol, fontWeight: 600 }}>
              {p.diff > 0 ? '↑ PE Dom' : p.diff < 0 ? '↓ CE Dom' : 'Balanced'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 9, color: '#4ade80', margin: '0 0 2px', fontWeight: 600 }}>PE</p>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#4ade80' }}>{fmt(p.pe)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: p.cePct + '%', background: '#dc2626', transition: 'width 0.4s' }} />
          <div style={{ width: p.pePct + '%', background: '#16a34a', transition: 'width 0.4s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 9, color: '#475569' }}>
          <span>CE {p.cePct}%</span><span>PE {p.pePct}%</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10,
                  padding: '12px 16px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 9, color: '#475569', margin: '0 0 2px', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.05em' }}>PCR (OI)</p>
          <span style={{ fontSize: 22, fontWeight: 800, color: sCol }}>{pcr}</span>
        </div>
        <div style={{ padding: '4px 12px', borderRadius: 20, background: sCol + '20', border: '1px solid ' + sCol + '44' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: sCol }}>{sentiment}</span>
        </div>
        <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>
          {sentiment === 'Bullish' ? 'More PE OI — put writers building support below spot'
            : sentiment === 'Bearish' ? 'More CE OI — call writers building resistance above spot'
            : 'Balanced OI — no strong directional bias'}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Section title="Open Interest (OI)"  ce={totalCE}  pe={totalPE}  diff={totalPE - totalCE} diffCol={totalPE > totalCE ? '#4ade80' : '#f87171'} cePct={cePct}    pePct={pePct}    />
        <Section title="Volume (Today)"      ce={totalCEV} pe={totalPEV} diff={volDiff}            diffCol={volDiffCol}                                cePct={ceVolPct} pePct={peVolPct} />
        <Section title="Change in OI (COI)"  ce={totalCEC} pe={totalPEC} diff={coiDiff}            diffCol={coiDiffCol}                                cePct={ceCOIPct} pePct={peCOIPct} />
      </div>
    </div>
  );
}

function SupportResistanceBar(props) {
  var d = props.data || {};
  function Level(p) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 3,
                       background: p.bg, color: p.color }}>{p.label}</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: p.color }}>{p.value}</span>
        {p.sub && <span style={{ fontSize: 9, color: '#475569' }}>{p.sub}</span>}
      </div>
    );
  }
  if (!d.support && !d.resistance) return null;
  return (
    <div style={{ padding: '10px 16px', background: '#0f172a', border: '1px solid #1e293b',
                  borderRadius: 10, marginBottom: 10 }}>
      <p style={{ fontSize: 9, fontWeight: 700, color: '#475569', margin: '0 0 8px',
                  textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        OI Levels — S1/R1 closest to spot · Max Pain
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', overflowX: 'auto', paddingBottom: 2 }}>
        {d.support3  && <Level label="S3" value={d.support3}  color="#16a34a" bg="rgba(22,163,74,0.1)"    sub="3rd" />}
        {d.support3  && d.support2 && <span style={{ color: '#334155' }}>→</span>}
        {d.support2  && <Level label="S2" value={d.support2}  color="#22c55e" bg="rgba(34,197,94,0.12)"   sub="2nd" />}
        {d.support2  && d.support  && <span style={{ color: '#334155' }}>→</span>}
        {d.support   && <Level label="S1" value={d.support}   color="#4ade80" bg="rgba(74,222,128,0.18)"  sub="1st" />}
        <div style={{ flex: 1, height: 3, background: 'linear-gradient(90deg,#16a34a,#60a5fa,#dc2626)', borderRadius: 2, minWidth: 16 }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 3,
                         background: 'rgba(96,165,250,0.2)', color: '#60a5fa' }}>SPOT</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#60a5fa' }}>{d.spot_price}</span>
        </div>
        <div style={{ flex: 1, height: 3, background: 'linear-gradient(90deg,#60a5fa,#dc2626)', borderRadius: 2, minWidth: 16 }} />
        {d.resistance  && <Level label="R1" value={d.resistance}  color="#f87171" bg="rgba(248,113,113,0.18)" sub="1st" />}
        {d.resistance  && d.resistance2 && <span style={{ color: '#334155' }}>→</span>}
        {d.resistance2 && <Level label="R2" value={d.resistance2} color="#ef4444" bg="rgba(239,68,68,0.12)"   sub="2nd" />}
        {d.resistance2 && d.resistance3 && <span style={{ color: '#334155' }}>→</span>}
        {d.resistance3 && <Level label="R3" value={d.resistance3} color="#dc2626" bg="rgba(220,38,38,0.1)"    sub="3rd" />}
        {d.max_pain && (
          <>
            <div style={{ width: 1, height: 36, background: '#1e293b', marginLeft: 8 }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 3,
                             background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>MAX PAIN</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#f59e0b' }}>{d.max_pain}</span>
              {d.max_pain_distance !== undefined && (
                <span style={{ fontSize: 9, fontWeight: 600, color: d.max_pain_distance > 0 ? '#f87171' : '#4ade80' }}>
                  {d.max_pain_distance > 0 ? '▲' : '▼'} {Math.abs(d.max_pain_distance)}pts
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function IVCompact(props) {
  var history = props.history || [];
  if (history.length < 2) return null;
  var last   = history[history.length - 1];
  var prev   = history[history.length - 2];
  var avgNow = last.avg_iv != null ? last.avg_iv : (last.ce_iv + last.pe_iv) / 2;
  var avgUp  = avgNow > (prev.avg_iv != null ? prev.avg_iv : (prev.ce_iv + prev.pe_iv) / 2);
  var col    = avgUp ? '#f87171' : '#4ade80';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px',
                  background: '#0f172a', border: '1px solid ' + col + '44', borderRadius: 8 }}>
      <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>IV</span>
      <span style={{ fontSize: 14, fontWeight: 800, color: col }}>{avgNow.toFixed(1)}%</span>
      <span style={{ fontSize: 12, color: col }}>{avgUp ? '↑' : '↓'}</span>
      <span style={{ fontSize: 10, color: '#475569' }}>CE {last.ce_iv.toFixed(1)} · PE {last.pe_iv.toFixed(1)}</span>
    </div>
  );
}

export default function OptionChain() {
  var { user }  = useAuth();
  var navigate  = useNavigate();
  var [symbol,     setSymbol]     = useState('NIFTY');
  var [data,       setData]       = useState(null);
  var [loading,    setLoading]    = useState(false);
  var [lastUpdate, setLastUpdate] = useState(null);
  var [filter,     setFilter]     = useState('near');
  var [search,     setSearch]     = useState('');
  var intervalRef = useRef(null);

  var hasOptions = user && (
    user.plan === 'options' ||
    user.plan === 'global'  ||
    user.plan === 'admin'
  );

  function fetchData(sym) {
    setLoading(true);
    fetch(API + '/api/option-chain?symbol=' + sym)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d && d.spot_price) {
          setData(d);
          setLastUpdate(new Date().toLocaleTimeString());
        }
        setLoading(false);
      })
      .catch(function(e) { console.error(e); setLoading(false); });
  }


  function isMarketOpen() {
    var now = new Date();
    var ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    var day = ist.getUTCDay();
    if (day === 0 || day === 6) return false;
    var mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
    return mins >= 555 && mins < 930;
  }

  useEffect(function() {
    if (!hasOptions) return;
    setLoading(true);
    setData(null);
    fetchData(symbol);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(function() {
      if (!isMarketOpen()) { clearInterval(intervalRef.current); return; }
      fetchData(symbol);
    }, 180000);
    return function() { clearInterval(intervalRef.current); };
  }, [symbol, hasOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hasOptions) {
    return (
      <div style={{ color: '#f1f5f9', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', minHeight: 500, gap: 20 }}>
        <PageTitle title="Option Chain" />
        <div style={{ fontSize: 48 }}>🔗</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Option Chain</h1>
        <p style={{ fontSize: 14, color: '#64748b', textAlign: 'center', maxWidth: 420, lineHeight: 1.6 }}>
          Full option chain with all strikes, buildup signals, S/R levels and IV. Options Pro required.
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

  var chain     = data ? (data.chain || []) : [];
  var atmStrike = data ? data.atm_strike : null;
  var ivHistory = data ? (data.iv_history || []) : [];

  var filtered = chain.filter(function(row) {
    if (search && !String(row.strike).includes(search)) return false;
    if (filter === 'near') {
      var atmIdx = chain.findIndex(function(r) { return r.strike === atmStrike; });
      var rowIdx = chain.findIndex(function(r) { return r.strike === row.strike; });
      return Math.abs(rowIdx - atmIdx) <= 10;
    }
    if (filter === 'calls') return row.ce_oi > 0;
    if (filter === 'puts')  return row.pe_oi > 0;
    return true;
  });

  var maxCEOI = Math.max.apply(null, chain.map(function(r) { return r.ce_oi; }).concat([1]));
  var maxPEOI = Math.max.apply(null, chain.map(function(r) { return r.pe_oi; }).concat([1]));

  return (
    <div style={{ color: '#f1f5f9' }}>
      <PageTitle title="Option Chain" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>Option Chain</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: 13 }}>
            Full chain · {data ? data.total_strikes || chain.length : '—'} strikes · every 3 min
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {data && <IVCompact history={ivHistory} />}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                        background: '#1e293b', borderRadius: 6, border: '1px solid #334155' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                           background: loading ? '#f59e0b' : isMarketOpen() ? '#4ade80' : '#f59e0b' }} />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              {loading ? 'Loading…' : !isMarketOpen() ? 'Market closed · paused' : lastUpdate ? 'Updated ' + lastUpdate : 'Waiting'}
            </span>
          </div>
          <button
            onClick={function() { navigate('/options'); }}
            style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
                     padding: '6px 14px', color: '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            ← Analysis
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {SYMBOLS.map(function(s) {
          return (
            <button
              key={s.code}
              onClick={function() { setSymbol(s.code); setSearch(''); }}
              style={{
                border: '1px solid #334155', borderRadius: 8, padding: '8px 20px',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: symbol === s.code ? '#8b5cf6' : '#1e293b',
                color:      symbol === s.code ? '#fff'    : '#94a3b8',
                transition: 'all 0.15s',
              }}
            >
              {s.flag} {s.label}
            </button>
          );
        })}
      </div>

      {data && (
        <>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '8px 16px',
                        background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10,
                        marginBottom: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#f1f5f9' }}>{data.symbol}</span>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#60a5fa' }}>{data.spot_price}</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>Expiry: <b style={{ color: '#f1f5f9' }}>{data.expiry}</b></span>
            <span style={{ fontSize: 12, color: '#64748b' }}>ATM: <b style={{ color: '#60a5fa' }}>{atmStrike}</b></span>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              PCR: <b style={{ color: data.pcr_total > 1.2 ? '#4ade80' : data.pcr_total < 0.8 ? '#f87171' : '#f59e0b' }}>
                {data.pcr_total}
              </b>
            </span>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Strikes: <b style={{ color: '#f1f5f9' }}>{data.total_strikes || chain.length}</b>
            </span>
            <span style={{ fontSize: 11, color: '#334155', marginLeft: 'auto' }}>⏱ {data.timestamp}</span>
          </div>
          <OIBar data={data} />
          <SupportResistanceBar data={data} />
        </>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {FILTERS.map(function(f) {
          return (
            <button
              key={f.id}
              onClick={function() { setFilter(f.id); }}
              style={{
                border: '1px solid #334155', borderRadius: 6, padding: '5px 14px',
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: filter === f.id ? '#1e40af' : '#1e293b',
                color:      filter === f.id ? '#93c5fd' : '#64748b',
              }}
            >
              {f.label}
            </button>
          );
        })}
        <input
          type="text"
          placeholder="Jump to strike…"
          value={search}
          onChange={function(e) { setSearch(e.target.value); setFilter('all'); }}
          style={{
            background: '#1e293b', border: '1px solid #334155', borderRadius: 6,
            padding: '5px 12px', color: '#f1f5f9', fontSize: 12, outline: 'none', width: 140,
          }}
        />
        {data && (
          <span style={{ fontSize: 11, color: '#475569', marginLeft: 4 }}>
            Showing {filtered.length} of {chain.length} strikes
          </span>
        )}
      </div>

      {loading && !data && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#475569' }}>
          <p style={{ fontSize: 15 }}>Fetching {symbol} full option chain…</p>
          <p style={{ fontSize: 12, color: '#334155', marginTop: 8 }}>
            First load triggers a fresh NSE fetch — usually 5–10 seconds
          </p>
        </div>
      )}

      {data && !data.error && filtered.length > 0 && (
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            {/* FIX: width max-content prevents column squishing */}
            <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#1e293b' }}>
                  {filter !== 'puts' && (
                    <th colSpan={7} style={{ padding: '7px', color: '#f87171', textAlign: 'center',
                                 fontWeight: 700, borderRight: '2px solid #334155' }}>
                      CALLS
                    </th>
                  )}
                  {/* FIX: Strike — fixed 90px */}
                  <th style={{ padding: '7px 14px', color: '#f1f5f9', textAlign: 'center',
                               fontWeight: 800, background: '#0f172a', fontSize: 13,
                               minWidth: 90, width: 90 }}>
                    Strike
                  </th>
                  {/* FIX: Vol Bias — fixed 80px */}
                  <th style={{ padding: '7px 10px', color: '#94a3b8', textAlign: 'center',
                               fontWeight: 700, fontSize: 10, background: '#0f172a',
                               whiteSpace: 'nowrap', minWidth: 80, width: 80 }}>
                    Vol Bias
                  </th>
                  {filter !== 'calls' && (
                    <th colSpan={7} style={{ padding: '7px', color: '#4ade80', textAlign: 'center',
                                 fontWeight: 700, borderLeft: '2px solid #334155' }}>
                      PUTS
                    </th>
                  )}
                </tr>
                <tr style={{ background: '#162032' }}>
                  {filter !== 'puts' && <>
                    <th style={{ padding: '5px 8px',  color: '#f87171', textAlign: 'right',  fontWeight: 600, fontSize: 10 }}>Sig</th>
                    <th style={{ padding: '5px 10px', color: '#f87171', textAlign: 'right',  fontWeight: 600, fontSize: 10 }}>OI</th>
                    <th style={{ padding: '5px 10px', color: '#f87171', textAlign: 'right',  fontWeight: 600, fontSize: 10 }}>ChgOI</th>
                    <th style={{ padding: '5px 10px', color: '#f87171', textAlign: 'right',  fontWeight: 600, fontSize: 10 }}>Vol</th>
                    <th style={{ padding: '5px 10px', color: '#f87171', textAlign: 'right',  fontWeight: 600, fontSize: 10 }}>IV%</th>
                    <th style={{ padding: '5px 10px', color: '#f87171', textAlign: 'right',  fontWeight: 600, fontSize: 10, borderRight: '2px solid #334155' }}>LTP</th>
                    <th style={{ padding: '5px 8px',  color: '#64748b', textAlign: 'right',  fontWeight: 600, fontSize: 10, borderRight: '2px solid #334155', width: 60 }}>OI Bar</th>
                  </>}
                  {/* sub-header placeholders to keep column alignment */}
                  <th style={{ padding: '5px 14px', background: '#0f172a', minWidth: 90, width: 90 }} />
                  <th style={{ padding: '5px 10px', background: '#0f172a', minWidth: 80, width: 80,
                               fontSize: 9, color: '#334155', textAlign: 'center' }}>PE−CE Vol</th>
                  {filter !== 'calls' && <>
                    <th style={{ padding: '5px 8px',  color: '#64748b', textAlign: 'left',   fontWeight: 600, fontSize: 10, borderLeft: '2px solid #334155', width: 60 }}>OI Bar</th>
                    <th style={{ padding: '5px 10px', color: '#4ade80', textAlign: 'left',   fontWeight: 600, fontSize: 10, borderLeft: '2px solid #334155' }}>LTP</th>
                    <th style={{ padding: '5px 10px', color: '#4ade80', textAlign: 'left',   fontWeight: 600, fontSize: 10 }}>IV%</th>
                    <th style={{ padding: '5px 10px', color: '#4ade80', textAlign: 'left',   fontWeight: 600, fontSize: 10 }}>Vol</th>
                    <th style={{ padding: '5px 10px', color: '#4ade80', textAlign: 'left',   fontWeight: 600, fontSize: 10 }}>ChgOI</th>
                    <th style={{ padding: '5px 10px', color: '#4ade80', textAlign: 'left',   fontWeight: 600, fontSize: 10 }}>OI</th>
                    <th style={{ padding: '5px 8px',  color: '#4ade80', textAlign: 'left',   fontWeight: 600, fontSize: 10 }}>Sig</th>
                  </>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(function(row) {
                  var isATM = row.strike === atmStrike;
                  var isMP  = row.strike === data.max_pain;
                  var isS1  = row.strike === data.support;
                  var isS2  = row.strike === data.support2;
                  var isS3  = row.strike === data.support3;
                  var isR1  = row.strike === data.resistance;
                  var isR2  = row.strike === data.resistance2;
                  var isR3  = row.strike === data.resistance3;

                  var rowBg = isATM ? 'rgba(96,165,250,0.1)'   :
                              isMP  ? 'rgba(245,158,11,0.07)'  :
                              isS1  ? 'rgba(74,222,128,0.07)'  :
                              isR1  ? 'rgba(248,113,113,0.07)' : 'transparent';

                  var strikeCol = isATM ? '#60a5fa' :
                                  isMP  ? '#f59e0b' :
                                  isS1  ? '#4ade80' : isS2 ? '#22c55e' : isS3 ? '#16a34a' :
                                  isR1  ? '#f87171' : isR2 ? '#ef4444' : isR3 ? '#dc2626' : '#f1f5f9';

                  var strikeLabel = isATM ? 'ATM' : isMP ? 'MP' :
                                    isS1 ? 'S1' : isS2 ? 'S2' : isS3 ? 'S3' :
                                    isR1 ? 'R1' : isR2 ? 'R2' : isR3 ? 'R3' : null;

                  var cePct = maxCEOI > 0 ? Math.round((row.ce_oi / maxCEOI) * 100) : 0;
                  var pePct = maxPEOI > 0 ? Math.round((row.pe_oi / maxPEOI) * 100) : 0;

                  var diff     = (row.pe_vol || 0) - (row.ce_vol || 0);
                  var absDiff  = Math.abs(diff);
                  var total    = (row.pe_vol || 0) + (row.ce_vol || 0);
                  var domPct   = total > 0 ? Math.round((absDiff / total) * 100) : 0;
                  var isBal    = total === 0 || domPct < 10;
                  var isPEDom  = diff > 0;
                  var volCol   = isBal ? '#64748b' : isPEDom ? '#4ade80' : '#f87171';
                  var volLabel = isBal ? 'Balanced' : isPEDom ? 'PE Dom' : 'CE Dom';
                  var diffFmt  = absDiff >= 100000 ? (diff / 100000).toFixed(1) + 'L'
                               : absDiff >= 1000   ? (diff / 1000).toFixed(0) + 'K'
                               : String(diff);

                  return (
                    <tr key={row.strike} style={{ background: rowBg, borderBottom: '1px solid #1e293b22' }}>

                      {/* CALLS */}
                      {filter !== 'puts' && <>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                          <BuildupBadge signal={row.ce_signal} side="CE" />
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', color: '#f87171' }}>
                          {fmt(row.ce_oi)}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', color: chgCol(row.ce_chg_oi), fontWeight: 600 }}>
                          {fmtChg(row.ce_chg_oi)}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', color: '#94a3b8' }}>
                          {fmt(row.ce_vol)}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', color: '#64748b' }}>
                          {row.ce_iv || '—'}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', color: '#f1f5f9',
                                     fontWeight: 600, borderRight: '2px solid #334155' }}>
                          {row.ce_ltp || '—'}
                        </td>
                        <td style={{ padding: '6px 8px', borderRight: '2px solid #334155', width: 64 }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <div style={{ width: cePct + '%', maxWidth: 56, height: 6,
                                          background: '#dc2626', borderRadius: 2,
                                          minWidth: cePct > 0 ? 2 : 0 }} />
                          </div>
                        </td>
                      </>}

                      {/* FIX: Strike — fixed 90px */}
                      <td style={{ padding: '6px 14px', textAlign: 'center', fontWeight: 800,
                                   fontSize: 13, color: strikeCol, background: '#0f172a',
                                   whiteSpace: 'nowrap', minWidth: 90, width: 90 }}>
                        {row.strike}
                        {strikeLabel && (
                          <span style={{ display: 'block', fontSize: 8, color: strikeCol,
                                         fontWeight: 700, marginTop: 1 }}>
                            {strikeLabel}
                          </span>
                        )}
                      </td>

                      {/* FIX: Vol Bias — fixed 80px, no IIFE */}
                      <td style={{ padding: '6px 8px', textAlign: 'center',
                                   background: '#0f172a', minWidth: 80, width: 80 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: volCol }}>
                          {isBal ? '—' : (diff > 0 ? '+' : '') + diffFmt}
                        </span>
                        <span style={{ display: 'block', fontSize: 8, fontWeight: 600,
                                       color: volCol, marginTop: 1 }}>
                          {volLabel}
                        </span>
                      </td>

                      {/* PUTS */}
                      {filter !== 'calls' && <>
                        <td style={{ padding: '6px 8px', borderLeft: '2px solid #334155', width: 64 }}>
                          <div style={{ width: pePct + '%', maxWidth: 56, height: 6,
                                        background: '#16a34a', borderRadius: 2,
                                        minWidth: pePct > 0 ? 2 : 0 }} />
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'left', color: '#f1f5f9',
                                     fontWeight: 600, borderLeft: '2px solid #334155' }}>
                          {row.pe_ltp || '—'}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'left', color: '#64748b' }}>
                          {row.pe_iv || '—'}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'left', color: '#94a3b8' }}>
                          {fmt(row.pe_vol)}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'left', color: chgCol(row.pe_chg_oi), fontWeight: 600 }}>
                          {fmtChg(row.pe_chg_oi)}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'left', color: '#4ade80' }}>
                          {fmt(row.pe_oi)}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'left' }}>
                          <BuildupBadge signal={row.pe_signal} side="PE" />
                        </td>
                      </>}

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '10px 16px', borderTop: '1px solid #1e293b',
                        display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: '#475569' }}>
            <span style={{ color: '#94a3b8', fontWeight: 700 }}>CALLS:</span>
            <span><span style={{ color: '#f87171', fontWeight: 700 }}>SB</span> Writing·Bearish</span>
            <span><span style={{ color: '#4ade80', fontWeight: 700 }}>LB</span> Buying·Bullish</span>
            <span><span style={{ color: '#60a5fa', fontWeight: 700 }}>SC</span> Writers Exit·Bullish</span>
            <span><span style={{ color: '#f59e0b', fontWeight: 700 }}>LU</span> Buyers Exit·Bearish</span>
            <span style={{ color: '#1e293b' }}>|</span>
            <span style={{ color: '#94a3b8', fontWeight: 700 }}>PUTS:</span>
            <span><span style={{ color: '#4ade80', fontWeight: 700 }}>SB</span> Writing·Bullish</span>
            <span><span style={{ color: '#f87171', fontWeight: 700 }}>LB</span> Buying·Bearish</span>
            <span style={{ marginLeft: 'auto', color: '#334155' }}>
              Signals appear after 2nd refresh · OI bars relative to max strike OI · Vol Bias = PE Vol − CE Vol
            </span>
          </div>
        </div>
      )}

      {data && !data.error && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#475569', fontSize: 13 }}>
          No strikes match the current filter.
        </div>
      )}
    </div>
  );
}