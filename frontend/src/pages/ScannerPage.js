import { useState, useEffect, useCallback } from 'react';

// ─── Config ───────────────────────────────────────────────────────────────────
var API_BASE = 'http://localhost:3001';

var NSE_FO_STOCKS = [
  'RELIANCE', 'INFY', 'TCS', 'HDFCBANK', 'ICICIBANK',
  'ASTRAL', 'CIPLA', 'JSWSTEEL', 'SBIN', 'BRITANNIA',
  'AXISBANK', 'KOTAKBANK', 'WIPRO', 'HCLTECH', 'LT',
  'BAJFINANCE', 'TITAN', 'MARUTI', 'NESTLEIND', 'DIVISLAB',
];

var GRADE_COLOR = { 'A+': '#f59e0b', 'A': '#22c55e', 'B': '#60a5fa', 'C': '#475569' };
var GRADE_BG    = { 'A+': 'rgba(245,158,11,0.10)', 'A': 'rgba(34,197,94,0.08)', 'B': 'rgba(96,165,250,0.08)', 'C': 'rgba(71,85,105,0.08)' };
var GRADE_ICON  = { 'A+': '⭐', 'A': '✅', 'B': '◆', 'C': '○' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function nowIST() {
  return new Date().toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata', hour12: false,
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function sessionLabel() {
  var t     = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' });
  var parts = t.split(':');
  var mins  = parseInt(parts[0]) * 60 + parseInt(parts[1]);
  if (mins < 9 * 60 + 15)                       return { label: 'PRE-MARKET',   color: '#64748b' };
  if (mins >= 9 * 60 + 15 && mins < 9 * 60 + 45) return { label: 'OPENING RANGE', color: '#f59e0b' };
  if (mins >= 9 * 60 + 30 && mins < 11 * 60)    return { label: 'PRIME',        color: '#22c55e' };
  if (mins >= 12 * 60 && mins < 13 * 60)        return { label: 'AVOID',        color: '#ef4444' };
  if (mins >= 13 * 60 && mins < 14 * 60 + 30)   return { label: 'AFTERNOON',    color: '#60a5fa' };
  if (mins >= 15 * 60 + 30)                     return { label: 'CLOSED',       color: '#ef4444' };
  return { label: 'REGULAR', color: '#64748b' };
}

// ─── Small components ─────────────────────────────────────────────────────────

function StatCard({ label, value, color, sub }) {
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '14px 18px', minWidth: 100 }}>
      <div style={{ fontSize: 11, color: '#475569', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || '#f1f5f9', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#334155', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function DirBadge({ direction }) {
  var bull = direction === 'BULL';
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, letterSpacing: '0.06em',
      background: bull ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
      color:      bull ? '#22c55e' : '#ef4444',
      border:     '1px solid ' + (bull ? '#22c55e' : '#ef4444') + '33',
    }}>
      {bull ? '▲ BULL' : '▼ BEAR'}
    </span>
  );
}

function LevelBox({ label, value, color }) {
  return (
    <div style={{ background: '#0a0f1e', border: '1px solid #1e293b', borderRadius: 8, padding: '10px 12px', flex: 1, minWidth: 90 }}>
      <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: color || '#f1f5f9' }}>{value != null ? value : '—'}</div>
    </div>
  );
}

function SetupCard({ setup }) {
  var [open, setOpen] = useState(false);
  var bull = setup.direction === 'BULL';
  var risk = Math.abs(setup.entry - setup.sl_wide);
  var rr1  = risk > 0 ? (Math.abs(setup.tp1 - setup.entry) / risk).toFixed(1) + 'R' : '—';
  var rr2  = risk > 0 ? (Math.abs(setup.tp2 - setup.entry) / risk).toFixed(1) + 'R' : '—';

  return (
    <div
      onClick={function() { setOpen(!open); }}
      style={{
        background:   '#0f172a',
        border:       '1px solid ' + (bull ? '#166534' : '#7f1d1d'),
        borderLeft:   '3px solid ' + (bull ? '#22c55e' : '#ef4444'),
        borderRadius: 10,
        padding:      '16px 18px',
        marginBottom: 10,
        cursor:       'pointer',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.3px' }}>{setup.symbol}</span>
            <DirBadge direction={setup.direction} />
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
              background: GRADE_BG[setup.grade], color: GRADE_COLOR[setup.grade],
              border: '1px solid ' + GRADE_COLOR[setup.grade] + '44', letterSpacing: '0.08em',
            }}>
              {GRADE_ICON[setup.grade]} {setup.grade}
            </span>
            {setup.confirmed_15m && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: 'rgba(129,140,248,0.12)', color: '#818cf8', border: '1px solid #818cf833' }}>
                15M ✓
              </span>
            )}
            {setup.entry_5m && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: 'rgba(52,211,153,0.10)', color: '#34d399', border: '1px solid #34d39933' }}>
                5M ✓
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#475569' }}>
            1H BOS · FVG gap {setup.fvg_gap_pct}% · Daily bias&nbsp;
            <span style={{ fontWeight: 600, color: setup.daily_bias === 'BULL' ? '#22c55e' : setup.daily_bias === 'BEAR' ? '#ef4444' : '#64748b' }}>
              {setup.daily_bias}
            </span>
          </div>
        </div>
        <span style={{ fontSize: 11, color: '#334155' }}>{open ? '▲' : '▼'}</span>
      </div>

      {/* Levels */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <LevelBox label="Entry"                value={setup.entry}    color="#22c55e" />
        {setup.entry_5m && <LevelBox label="5M Entry" value={setup.entry_5m} color="#34d399" />}
        <LevelBox label="SL Wide"              value={setup.sl_wide}  color="#ef4444" />
        <LevelBox label={'TP1 (' + rr1 + ')'}  value={setup.tp1}      color="#f59e0b" />
        <LevelBox label={'TP2 (' + rr2 + ')'}  value={setup.tp2}      color="#a78bfa" />
        {setup.tp3 && <LevelBox label="TP3 (Daily)" value={setup.tp3} color="#64748b" />}
      </div>

      {/* Expanded */}
      {open && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #1e293b', display: 'flex', flexWrap: 'wrap', gap: '8px 24px', fontSize: 12 }}>
          {[
            ['FVG Zone',  setup.fvg_bottom + ' – ' + setup.fvg_top, '#94a3b8'],
            ['Rally',     setup.rally_pct + '%',                     '#60a5fa'],
            ['Vol ratio', setup.vol_ratio,                           setup.vol_ratio <= 0.6 ? '#22c55e' : '#f59e0b'],
            ['EMA 20/50', setup.ema20 + ' / ' + setup.ema50,        '#94a3b8'],
            ['SL Medium', setup.sl_medium,                           '#fca5a5'],
            ['SL Tight',  setup.sl_tight,                            '#fca5a5'],
            setup.or_high ? ['OR H/L', setup.or_high + ' / ' + setup.or_low, '#94a3b8'] : null,
            setup.pdh     ? ['PDH/L',  setup.pdh    + ' / ' + setup.pdl,    '#94a3b8'] : null,
          ].filter(Boolean).map(function(row) {
            return (
              <div key={row[0]} style={{ color: '#475569' }}>
                {row[0]}&nbsp;
                <span style={{ color: row[2], fontWeight: 600 }}>{row[1]}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ScannerPage() {
  var [selectedSyms, setSelectedSyms] = useState(NSE_FO_STOCKS.slice());
  var [minGrade, setMinGrade]         = useState('B');
  var [tradeDate, setTradeDate]       = useState(todayISO());
  var [showPicker, setShowPicker]     = useState(false);
  var [loading, setLoading]           = useState(false);
  var [result, setResult]             = useState(null);
  var [error, setError]               = useState('');
  var [clock, setClock]               = useState(nowIST());
  var session                         = sessionLabel();

  useEffect(function() {
    var iv = setInterval(function() { setClock(nowIST()); }, 1000);
    return function() { clearInterval(iv); };
  }, []);

  function toggleSym(sym) {
    setSelectedSyms(function(prev) {
      return prev.includes(sym) ? prev.filter(function(s) { return s !== sym; }) : prev.concat(sym);
    });
  }

  var handleScan = useCallback(async function() {
    if (loading || !selectedSyms.length) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      var url  = API_BASE + '/api/scanner/mtf?symbols=' + encodeURIComponent(selectedSyms.join(',')) + '&grade=' + encodeURIComponent(minGrade) + '&date=' + encodeURIComponent(tradeDate);
      var res  = await fetch(url);
      if (!res.ok) throw new Error('Server error ' + res.status);
      var data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e.message || 'Scan failed');
    } finally {
      setLoading(false);
    }
  }, [loading, selectedSyms, minGrade, tradeDate]);

  var byGrade = { 'A+': [], 'A': [], 'B': [], 'C': [] };
  if (result && result.setups) {
    result.setups.forEach(function(s) { if (byGrade[s.grade]) byGrade[s.grade].push(s); });
  }

  // ── Shared input style ──
  var inputStyle = {
    background: '#0a0f1e', border: '1px solid #1e293b', borderRadius: 6,
    color: '#e2e8f0', fontSize: 13, padding: '6px 10px', fontFamily: 'inherit', outline: 'none',
  };
  var labelStyle = { fontSize: 11, color: '#475569', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' };

  return (
    <div>
      {/* ── Page header ── */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0, letterSpacing: '-0.3px' }}>
          MTF Scanner
        </h2>
        <p style={{ fontSize: 12, color: '#475569', margin: '4px 0 0' }}>
          Daily bias → 1H BOS FVG Retest → 15M confirm → 5M entry · NSE F&O stocks
        </p>
      </div>

      {/* ── Session / clock bar ── */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '10px 16px', marginBottom: 14, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', fontSize: 12 }}>
        <span style={{ color: '#475569' }}>IST <span style={{ color: '#94a3b8', fontWeight: 600 }}>{clock}</span></span>
        <span style={{
          fontWeight: 700, fontSize: 11, letterSpacing: '0.08em',
          color: session.color, background: session.color + '18',
          border: '1px solid ' + session.color + '44', borderRadius: 6, padding: '2px 10px',
        }}>
          ● {session.label}
        </span>
        <span style={{ color: '#334155', fontSize: 11 }}>
          Best:&nbsp;<span style={{ color: '#475569' }}>09:30–11:00 &amp; 13:00–14:30</span>
          &nbsp;·&nbsp;Avoid:&nbsp;<span style={{ color: '#475569' }}>12:00–13:00</span>
        </span>
      </div>

      {/* ── Controls panel ── */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>

          <div>
            <div style={labelStyle}>Date</div>
            <input type="date" value={tradeDate} onChange={function(e) { setTradeDate(e.target.value); }} style={inputStyle} />
          </div>

          <div>
            <div style={labelStyle}>Min Grade</div>
            <select value={minGrade} onChange={function(e) { setMinGrade(e.target.value); }} style={Object.assign({}, inputStyle, { cursor: 'pointer' })}>
              <option value="A+">A+ only</option>
              <option value="A">A and above</option>
              <option value="B">B and above</option>
              <option value="C">All grades</option>
            </select>
          </div>

          <div>
            <div style={labelStyle}>Symbols ({selectedSyms.length}/{NSE_FO_STOCKS.length})</div>
            <button
              onClick={function() { setShowPicker(!showPicker); }}
              style={{
                background: showPicker ? 'rgba(96,165,250,0.1)' : '#0a0f1e',
                border: '1px solid ' + (showPicker ? '#60a5fa' : '#1e293b'),
                borderRadius: 6, color: showPicker ? '#60a5fa' : '#94a3b8',
                fontSize: 13, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {showPicker ? '▲ Hide' : '▼ Pick symbols'}
            </button>
          </div>

          <div style={{ marginLeft: 'auto' }}>
            <div style={{ fontSize: 11, color: 'transparent', marginBottom: 5 }}>·</div>
            <button
              onClick={handleScan}
              disabled={loading || !selectedSyms.length}
              style={{
                background:   loading ? '#1e293b' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                border:       'none', borderRadius: 6,
                color:        loading ? '#64748b' : '#fff',
                fontSize:     13, fontWeight: 700, padding: '7px 22px',
                cursor:       loading ? 'not-allowed' : 'pointer',
                fontFamily:   'inherit', letterSpacing: '0.06em',
              }}
            >
              {loading ? 'Scanning…' : '⟳ Run Scan'}
            </button>
          </div>
        </div>

        {/* Symbol picker */}
        {showPicker && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Select</span>
              <button onClick={function() { setSelectedSyms(NSE_FO_STOCKS.slice()); }} style={{ fontSize: 11, color: '#60a5fa', background: 'rgba(96,165,250,0.08)', border: '1px solid #1e3a5f', borderRadius: 5, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>All</button>
              <button onClick={function() { setSelectedSyms([]); }}                    style={{ fontSize: 11, color: '#94a3b8', background: '#0a0f1e',               border: '1px solid #1e293b', borderRadius: 5, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>None</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {NSE_FO_STOCKS.map(function(sym) {
                var sel = selectedSyms.includes(sym);
                return (
                  <button
                    key={sym}
                    onClick={function() { toggleSym(sym); }}
                    style={{
                      fontSize: 12, fontWeight: sel ? 600 : 400, padding: '4px 10px',
                      borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit',
                      border:      '1px solid ' + (sel ? '#3b82f6' : '#1e293b'),
                      background:  sel ? 'rgba(59,130,246,0.12)' : 'transparent',
                      color:       sel ? '#93c5fd' : '#475569',
                    }}
                  >
                    {sym}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '12px 16px', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Fetching multi-timeframe data</div>
          <div style={{ fontSize: 13, color: '#334155' }}>{selectedSyms.length} symbols · Daily → 1H → 15M → 5M · may take ~60 sec</div>
        </div>
      )}

      {/* ── Summary stat row ── */}
      {!loading && result && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <StatCard label="Scanned"   value={result.scanned}       color="#94a3b8" />
          <StatCard label="Setups"    value={result.setups_found}  color="#60a5fa" sub={'grade ≥ ' + result.min_grade} />
          <StatCard label="A+"        value={byGrade['A+'].length} color="#f59e0b" />
          <StatCard label="A"         value={byGrade['A'].length}  color="#22c55e" />
          <StatCard label="B"         value={byGrade['B'].length}  color="#60a5fa" />
          <StatCard label="Date"      value={result.date}          color="#94a3b8" />
        </div>
      )}

      {/* ── Empty result ── */}
      {!loading && result && result.setups_found === 0 && (
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '48px 24px', textAlign: 'center', color: '#334155', fontSize: 13 }}>
          No setups found at grade {minGrade} or above on {result.date}.
          <div style={{ fontSize: 11, color: '#1e293b', marginTop: 8 }}>Try lowering the minimum grade or selecting more symbols.</div>
        </div>
      )}

      {/* ── Grade groups ── */}
      {!loading && result && ['A+', 'A', 'B', 'C'].map(function(grade) {
        var group = byGrade[grade];
        if (!group.length) return null;
        return (
          <div key={grade} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #1e293b' }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, letterSpacing: '0.1em',
                background: GRADE_BG[grade], color: GRADE_COLOR[grade],
                border: '1px solid ' + GRADE_COLOR[grade] + '33',
              }}>
                {GRADE_ICON[grade]} GRADE {grade}
              </span>
              <span style={{ fontSize: 11, color: '#334155' }}>{group.length} setup{group.length !== 1 ? 's' : ''}</span>
            </div>
            {group.map(function(setup) {
              return <SetupCard key={setup.symbol + setup.bos_time} setup={setup} />;
            })}
          </div>
        );
      })}

      {/* ── Initial empty state ── */}
      {!loading && !result && !error && (
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 30, opacity: 0.1, marginBottom: 14 }}>◈</div>
          <div style={{ fontSize: 14, color: '#475569', marginBottom: 6 }}>
            Press <strong style={{ color: '#60a5fa' }}>Run Scan</strong> to find setups
          </div>
          <div style={{ fontSize: 12, color: '#334155', maxWidth: 420, margin: '0 auto' }}>
            Scans {selectedSyms.length} NSE F&O symbols across Daily / 1H / 15M / 5M for BOS + FVG Retest setups graded A+ to C.
          </div>
        </div>
      )}
    </div>
  );
}
