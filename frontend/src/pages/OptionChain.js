import { useState, useEffect, useRef } from 'react';
import PageTitle from '../components/PageTitle';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

var SYMBOLS = [
  { code: 'NIFTY',     label: 'NIFTY 50',  flag: '📊' },
  { code: 'BANKNIFTY', label: 'BANKNIFTY', flag: '🏦' },
  { code: 'SENSEX',    label: 'SENSEX',    flag: '📈' },
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

function IVStatusCompact(props) {
  var history = props.history || [];
  var symbol  = props.symbol  || 'NIFTY';

  if (history.length < 2) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: '#1e293b', borderRadius: 8, fontSize: 11, color: '#475569', border: '1px solid #334155' }}>
        <span>IV: collecting data...</span>
      </div>
    );
  }

  var last    = history[history.length - 1];
  var prev    = history[history.length - 2];
  var avgNow  = last.avg_iv  != null ? last.avg_iv  : (last.ce_iv  + last.pe_iv)  / 2;
  var avgPrev = prev.avg_iv  != null ? prev.avg_iv  : (prev.ce_iv  + prev.pe_iv)  / 2;
  var ceUp    = last.ce_iv > prev.ce_iv;
  var peUp    = last.pe_iv > prev.pe_iv;
  var avgUp   = avgNow > avgPrev;
  var color   = avgUp ? '#f87171' : '#4ade80';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '5px 14px', background: '#0f172a', border: '1px solid ' + color + '44', borderRadius: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>IV</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: color }}>{avgNow.toFixed(1)}%</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: color }}>{avgUp ? '↑' : '↓'}</span>
        <span style={{ fontSize: 10, color: '#475569' }}>{avgUp ? 'Rising · expensive' : 'Falling · cheap'}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, fontSize: 10 }}>
        <span style={{ color: '#64748b' }}>
          CE: <b style={{ color: '#f87171' }}>{last.ce_iv.toFixed(1)}%</b>
          <span style={{ color: ceUp ? '#f87171' : '#4ade80', marginLeft: 2 }}>{ceUp ? '↑' : '↓'}</span>
        </span>
        <span style={{ color: '#64748b' }}>
          PE: <b style={{ color: '#4ade80' }}>{last.pe_iv.toFixed(1)}%</b>
          <span style={{ color: peUp ? '#f87171' : '#4ade80', marginLeft: 2 }}>{peUp ? '↑' : '↓'}</span>
        </span>
      </div>
      <span style={{ fontSize: 10, color: '#334155' }}>{last.time}</span>
    </div>
  );
}

function SupportResistanceBar(props) {
  var support     = props.support;
  var support2    = props.support2;
  var support3    = props.support3;
  var resistance  = props.resistance;
  var resistance2 = props.resistance2;
  var resistance3 = props.resistance3;
  var spot        = props.spot;
  var maxPain     = props.maxPain;
  var distance    = props.maxPainDistance;

  if (!support && !resistance) return null;

  function Level(p) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 3, background: p.bg, color: p.color }}>
          {p.label}
        </span>
        <span style={{ fontSize: 14, fontWeight: 800, color: p.color }}>{p.value}</span>
        {p.sub && <span style={{ fontSize: 9, color: '#475569' }}>{p.sub}</span>}
      </div>
    );
  }

  return (
    <div style={{ padding: '10px 16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, marginBottom: 10 }}>
      <p style={{ fontSize: 9, fontWeight: 700, color: '#475569', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        OI Levels — S1/R1 closest to spot
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', overflowX: 'auto', paddingBottom: 2 }}>
        {support3 && <Level label="S3" value={support3} color="#16a34a" bg="rgba(22,163,74,0.1)"   sub="3rd" />}
        {support3 && support2 && <span style={{ color: '#334155', fontSize: 12 }}>→</span>}
        {support2 && <Level label="S2" value={support2} color="#22c55e" bg="rgba(34,197,94,0.12)"  sub="2nd" />}
        {support2 && support  && <span style={{ color: '#334155', fontSize: 12 }}>→</span>}
        {support  && <Level label="S1" value={support}  color="#4ade80" bg="rgba(74,222,128,0.18)" sub="1st" />}

        <div style={{ flex: 1, height: 3, background: 'linear-gradient(90deg, #16a34a, #60a5fa, #dc2626)', borderRadius: 2, minWidth: 16 }} />

        {spot && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 3, background: 'rgba(96,165,250,0.2)', color: '#60a5fa' }}>SPOT</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#60a5fa' }}>{spot}</span>
          </div>
        )}

        <div style={{ flex: 1, height: 3, background: 'linear-gradient(90deg, #60a5fa, #dc2626)', borderRadius: 2, minWidth: 16 }} />

        {resistance  && <Level label="R1" value={resistance}  color="#f87171" bg="rgba(248,113,113,0.18)" sub="1st" />}
        {resistance  && resistance2 && <span style={{ color: '#334155', fontSize: 12 }}>→</span>}
        {resistance2 && <Level label="R2" value={resistance2} color="#ef4444" bg="rgba(239,68,68,0.12)"   sub="2nd" />}
        {resistance2 && resistance3 && <span style={{ color: '#334155', fontSize: 12 }}>→</span>}
        {resistance3 && <Level label="R3" value={resistance3} color="#dc2626" bg="rgba(220,38,38,0.1)"    sub="3rd" />}

        <div style={{ width: 1, height: 36, background: '#1e293b', flexShrink: 0, marginLeft: 8 }} />

        {maxPain && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 3, background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>MAX PAIN</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#f59e0b' }}>{maxPain}</span>
            {distance !== undefined && (
              <span style={{ fontSize: 9, fontWeight: 600, color: distance > 0 ? '#f87171' : '#4ade80' }}>
                {distance > 0 ? '▲' : '▼'} {Math.abs(distance)}pts
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OptionChain() {
  var { user }  = useAuth();
  var navigate  = useNavigate();
  var [symbol, setSymbol]         = useState('NIFTY');
  var [data, setData]             = useState(null);
  var [loading, setLoading]       = useState(false);
  var [lastUpdate, setLastUpdate] = useState(null);
  var intervalRef                 = useRef(null);

  var hasOptions = user && (
    user.plan === 'options' ||
    user.plan === 'global'  ||
    user.plan === 'admin'
  );

  function fetchData(sym) {
    fetch('http://localhost:3001/api/options?symbol=' + sym)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d && d.spot_price) {
          setData(d);
          setLoading(false);
          setLastUpdate(new Date().toLocaleTimeString());
        }
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
  }, [symbol, hasOptions]);

  function fmt(n) {
    if (!n && n !== 0) return '—';
    if (Math.abs(n) >= 100000) return (n / 100000).toFixed(1) + 'L';
    if (Math.abs(n) >= 1000)   return (n / 1000).toFixed(0) + 'K';
    return n;
  }

  function chgCol(v) {
    if (!v || v === 0) return '#64748b';
    return v > 0 ? '#4ade80' : '#f87171';
  }

  if (!hasOptions) {
    return (
      <div style={{ color: '#f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 500, gap: 20 }}>
        <PageTitle title="Option Chain" />
        <div style={{ fontSize: 48 }}>🔗</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Option Chain</h1>
        <p style={{ fontSize: 14, color: '#64748b', textAlign: 'center', maxWidth: 420, lineHeight: 1.6 }}>
          Full option chain with buildup signals, S1 S2 S3 support, R1 R2 R3 resistance and IV status. Options Pro required.
        </p>
        <button
          onClick={function() { navigate('/pricing'); }}
          style={{ background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
        >
          View Options Pro Plan →
        </button>
      </div>
    );
  }

  var chain     = data ? (data.chain     || []) : [];
  var atmStrike = data ? data.atm_strike : null;
  var maxPain   = data ? data.max_pain   : null;
  var ivHistory = data ? (data.iv_history || []) : [];

  return (
    <div style={{ color: '#f1f5f9' }}>
      <PageTitle title="Option Chain" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>Option Chain</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: 13 }}>Buildup Signals · S1 S2 S3 · R1 R2 R3 · refreshes every 3 min</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {data && <IVStatusCompact history={ivHistory} symbol={symbol} />}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#1e293b', borderRadius: 6, border: '1px solid #334155' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block', background: '#4ade80' }} />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              {lastUpdate ? 'Updated ' + lastUpdate : loading ? 'Loading...' : 'Waiting'}
            </span>
          </div>
          <button
            onClick={function() { navigate('/options'); }}
            style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '6px 14px', color: '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
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
              onClick={function() { setSymbol(s.code); }}
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
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '8px 16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#f1f5f9' }}>{data.symbol}</span>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#60a5fa' }}>{data.spot_price}</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>Expiry: <b style={{ color: '#f1f5f9' }}>{data.expiry}</b></span>
            <span style={{ fontSize: 12, color: '#64748b' }}>ATM: <b style={{ color: '#60a5fa' }}>{atmStrike}</b></span>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              PCR: <b style={{ color: data.pcr_total > 1.2 ? '#4ade80' : data.pcr_total < 0.8 ? '#f87171' : '#f59e0b' }}>{data.pcr_total}</b>
            </span>
            <span style={{ fontSize: 11, color: '#334155', marginLeft: 'auto' }}>⏱ {data.timestamp}</span>
          </div>

          <SupportResistanceBar
            support={data.support}     support2={data.support2}     support3={data.support3}
            resistance={data.resistance} resistance2={data.resistance2} resistance3={data.resistance3}
            spot={data.spot_price}
            maxPain={data.max_pain}
            maxPainDistance={data.max_pain_distance}
          />
        </>
      )}

      {loading && !data && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#475569' }}>
          <p style={{ fontSize: 15 }}>Fetching {symbol} option chain...</p>
        </div>
      )}

      {data && data.error && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#f87171' }}>
          <p style={{ fontSize: 15 }}>{data.error}</p>
        </div>
      )}

      {data && !data.error && chain.length > 0 && (
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#1e293b' }}>
                  <th colSpan="6" style={{ padding: '7px', color: '#f87171', textAlign: 'center', fontWeight: 700, borderRight: '2px solid #334155' }}>CALLS</th>
                  <th style={{ padding: '7px 14px', color: '#f1f5f9', textAlign: 'center', fontWeight: 800, background: '#0f172a', fontSize: 13 }}>Strike</th>
                  <th colSpan="6" style={{ padding: '7px', color: '#4ade80', textAlign: 'center', fontWeight: 700, borderLeft: '2px solid #334155' }}>PUTS</th>
                </tr>
                <tr style={{ background: '#162032' }}>
                  <th style={{ padding: '5px 8px',  color: '#f87171', textAlign: 'right',  fontWeight: 600, fontSize: 11 }}>Sig</th>
                  <th style={{ padding: '5px 10px', color: '#f87171', textAlign: 'right',  fontWeight: 600, fontSize: 11 }}>OI</th>
                  <th style={{ padding: '5px 10px', color: '#f87171', textAlign: 'right',  fontWeight: 600, fontSize: 11 }}>Chg OI</th>
                  <th style={{ padding: '5px 10px', color: '#f87171', textAlign: 'right',  fontWeight: 600, fontSize: 11 }}>Vol</th>
                  <th style={{ padding: '5px 10px', color: '#f87171', textAlign: 'right',  fontWeight: 600, fontSize: 11 }}>IV%</th>
                  <th style={{ padding: '5px 10px', color: '#f87171', textAlign: 'right',  fontWeight: 600, fontSize: 11, borderRight: '2px solid #334155' }}>LTP</th>
                  <th style={{ padding: '5px 14px', color: '#f1f5f9', textAlign: 'center', fontWeight: 800, background: '#0f172a' }}></th>
                  <th style={{ padding: '5px 10px', color: '#4ade80', textAlign: 'left',   fontWeight: 600, fontSize: 11, borderLeft: '2px solid #334155' }}>LTP</th>
                  <th style={{ padding: '5px 10px', color: '#4ade80', textAlign: 'left',   fontWeight: 600, fontSize: 11 }}>IV%</th>
                  <th style={{ padding: '5px 10px', color: '#4ade80', textAlign: 'left',   fontWeight: 600, fontSize: 11 }}>Vol</th>
                  <th style={{ padding: '5px 10px', color: '#4ade80', textAlign: 'left',   fontWeight: 600, fontSize: 11 }}>Chg OI</th>
                  <th style={{ padding: '5px 10px', color: '#4ade80', textAlign: 'left',   fontWeight: 600, fontSize: 11 }}>OI</th>
                  <th style={{ padding: '5px 8px',  color: '#4ade80', textAlign: 'left',   fontWeight: 600, fontSize: 11 }}>Sig</th>
                </tr>
              </thead>
              <tbody>
                {chain.map(function(row) {
                  var isATM = row.strike === atmStrike;
                  var isMP  = row.strike === maxPain;
                  var isS1  = row.strike === data.support;
                  var isS2  = row.strike === data.support2;
                  var isS3  = row.strike === data.support3;
                  var isR1  = row.strike === data.resistance;
                  var isR2  = row.strike === data.resistance2;
                  var isR3  = row.strike === data.resistance3;

                  var rowBg = isATM ? 'rgba(96,165,250,0.1)'  :
                              isMP  ? 'rgba(245,158,11,0.07)' :
                              isS1  ? 'rgba(74,222,128,0.07)' :
                              isR1  ? 'rgba(248,113,113,0.07)': 'transparent';

                  var strikeCol = isATM ? '#60a5fa' :
                                  isMP  ? '#f59e0b' :
                                  isS1  ? '#4ade80' : isS2 ? '#22c55e' : isS3 ? '#16a34a' :
                                  isR1  ? '#f87171' : isR2 ? '#ef4444' : isR3 ? '#dc2626' : '#f1f5f9';

                  var strikeLabel = isATM ? 'ATM' : isMP ? 'MP' :
                                    isS1 ? 'S1' : isS2 ? 'S2' : isS3 ? 'S3' :
                                    isR1 ? 'R1' : isR2 ? 'R2' : isR3 ? 'R3' : null;

                  return (
                    <tr key={row.strike} style={{ background: rowBg, borderBottom: '1px solid #1e293b22' }}>
                      <td style={{ padding: '7px 8px',  textAlign: 'right' }}>
                        <BuildupBadge signal={row.ce_signal} side="CE" />
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'right',  color: '#f87171' }}>{fmt(row.ce_oi)}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right',  color: chgCol(row.ce_chg_oi), fontWeight: 600 }}>
                        {row.ce_chg_oi > 0 ? '+' : ''}{fmt(row.ce_chg_oi)}
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'right',  color: '#94a3b8' }}>{fmt(row.ce_vol)}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right',  color: '#64748b' }}>{row.ce_iv || '—'}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right',  color: '#f1f5f9', fontWeight: 600, borderRight: '2px solid #334155' }}>{row.ce_ltp || '—'}</td>
                      <td style={{ padding: '7px 14px', textAlign: 'center', fontWeight: 800, fontSize: 13, color: strikeCol, background: '#0f172a', whiteSpace: 'nowrap', minWidth: 68 }}>
                        {row.strike}
                        {strikeLabel && (
                          <span style={{ display: 'block', fontSize: 8, color: strikeCol, fontWeight: 700, marginTop: 1 }}>
                            {strikeLabel}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'left',   color: '#f1f5f9', fontWeight: 600, borderLeft: '2px solid #334155' }}>{row.pe_ltp || '—'}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'left',   color: '#64748b' }}>{row.pe_iv || '—'}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'left',   color: '#94a3b8' }}>{fmt(row.pe_vol)}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'left',   color: chgCol(row.pe_chg_oi), fontWeight: 600 }}>
                        {row.pe_chg_oi > 0 ? '+' : ''}{fmt(row.pe_chg_oi)}
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'left',   color: '#4ade80' }}>{fmt(row.pe_oi)}</td>
                      <td style={{ padding: '7px 8px',  textAlign: 'left' }}>
                        <BuildupBadge signal={row.pe_signal} side="PE" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 16px', borderTop: '1px solid #1e293b', display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: '#475569' }}>
            <span style={{ color: '#94a3b8', fontWeight: 700 }}>CALLS:</span>
            <span><span style={{ color: '#f87171', fontWeight: 700 }}>SB</span> Writing·Bearish</span>
            <span><span style={{ color: '#4ade80', fontWeight: 700 }}>LB</span> Buying·Bullish</span>
            <span><span style={{ color: '#60a5fa', fontWeight: 700 }}>SC</span> Writers Exit·Bullish</span>
            <span><span style={{ color: '#f59e0b', fontWeight: 700 }}>LU</span> Buyers Exit·Bearish</span>
            <span style={{ color: '#1e293b' }}>|</span>
            <span style={{ color: '#94a3b8', fontWeight: 700 }}>PUTS:</span>
            <span><span style={{ color: '#4ade80', fontWeight: 700 }}>SB</span> Writing·Bullish</span>
            <span><span style={{ color: '#f87171', fontWeight: 700 }}>LB</span> Buying·Bearish</span>
            <span style={{ marginLeft: 'auto', color: '#334155' }}>Signals appear after 2nd refresh</span>
          </div>
        </div>
      )}
    </div>
  );
}