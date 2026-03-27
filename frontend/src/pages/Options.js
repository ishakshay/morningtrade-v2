import { useState, useEffect, useRef } from 'react';
import PageTitle from '../components/PageTitle';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

var SYMBOLS = [
  { code: 'NIFTY',     label: 'NIFTY 50',  flag: '📊' },
  { code: 'BANKNIFTY', label: 'BANKNIFTY', flag: '🏦' },
];

function sentimentColor(s) {
  if (s === 'Bullish') return '#4ade80';
  if (s === 'Bearish') return '#f87171';
  return '#f59e0b';
}

function sentimentBg(s) {
  if (s === 'Bullish') return 'rgba(74,222,128,0.15)';
  if (s === 'Bearish') return 'rgba(248,113,113,0.15)';
  return 'rgba(245,158,11,0.15)';
}

function MiniChart(props) {
  var data   = props.data   || [];
  var width  = props.width  || 120;
  var height = props.height || 40;
  if (data.length < 2) return <div style={{ width: width, height: height }} />;
  var closes = data.map(function(d) { return d.close; });
  var maxVal = Math.max.apply(null, closes);
  var minVal = Math.min.apply(null, closes);
  var range  = maxVal - minVal || 1;
  var padX = 2, padY = 2;
  var chartW = width - padX * 2;
  var chartH = height - padY * 2;
  var isUp   = closes[closes.length - 1] >= closes[0];
  var col    = isUp ? '#4ade80' : '#f87171';
  var points = closes.map(function(v, i) {
    var x = padX + (i / (closes.length - 1)) * chartW;
    var y = padY + chartH - ((v - minVal) / range) * chartH;
    return x + ',' + y;
  }).join(' ');
  var lastX = padX + chartW;
  var lastY = padY + chartH - ((closes[closes.length - 1] - minVal) / range) * chartH;
  var fill  = points + ' ' + lastX + ',' + (padY + chartH) + ' ' + padX + ',' + (padY + chartH);
  return (
    <svg width={width} height={height} viewBox={'0 0 ' + width + ' ' + height}>
      <polygon points={fill} fill={col} opacity="0.1" />
      <polyline points={points} fill="none" stroke={col} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="2" fill={col} />
    </svg>
  );
}

function Sparkline(props) {
  var history = props.history || [];
  var field   = props.field   || 'pcr';
  var width   = props.width   || 80;
  var height  = props.height  || 36;
  var color   = props.color   || null;
  if (history.length < 2) {
    return <div style={{ width: width, height: height, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#334155' }}>no data</div>;
  }
  var values = history.slice(-30).map(function(h) { return h[field] || 0; });
  var maxVal = Math.max.apply(null, values);
  var minVal = Math.min.apply(null, values);
  var range  = maxVal - minVal || 0.01;
  var padX = 2, padY = 4;
  var chartW = width - padX * 2;
  var chartH = height - padY * 2;
  var points = values.map(function(v, i) {
    var x = padX + (i / (values.length - 1)) * chartW;
    var y = padY + chartH - ((v - minVal) / range) * chartH;
    return x + ',' + y;
  }).join(' ');
  var lastVal    = values[values.length - 1];
  var lineColor  = color || (lastVal > 1.2 ? '#4ade80' : lastVal < 0.8 ? '#f87171' : '#f59e0b');
  var lastX      = padX + chartW;
  var lastY      = padY + chartH - ((lastVal - minVal) / range) * chartH;
  var fillPoints = points + ' ' + lastX + ',' + (padY + chartH) + ' ' + padX + ',' + (padY + chartH);
  return (
    <svg width={width} height={height} viewBox={'0 0 ' + width + ' ' + height}>
      <polygon points={fillPoints} fill={lineColor} opacity="0.1" />
      <polyline points={points} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="2.5" fill={lineColor} />
    </svg>
  );
}

function TopBar(props) {
  var overview    = props.overview    || {};
  var nifty       = overview['NIFTY']     || {};
  var banknifty   = overview['BANKNIFTY'] || {};
  var vix         = overview['VIX']       || {};
  var usdinr      = overview['USDINR']    || {};
  var crude       = overview['CRUDE']     || {};
  var breadth     = overview['breadth']   || {};
  var niftyChart  = overview['nifty_chart']     || [];
  var bnChart     = overview['banknifty_chart'] || [];

  function IndexPill(p) {
    var d     = p.data  || {};
    var label = p.label;
    var chart = p.chart || [];
    if (!d.last) return null;
    var isUp  = d.is_up;
    var color = isUp ? '#4ade80' : '#f87171';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#1e293b', borderRadius: 10, flexShrink: 0, border: '1px solid #334155' }}>
        <div>
          <p style={{ fontSize: 10, color: '#94a3b8', margin: '0 0 2px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>{d.last ? d.last.toLocaleString() : '—'}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: color }}>
              {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{d.pct_change}%
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            <span style={{ fontSize: 10, color: '#4ade80', fontWeight: 600 }}>A:{d.advances}</span>
            <span style={{ fontSize: 10, color: '#f87171', fontWeight: 600 }}>D:{d.declines}</span>
            <span style={{ fontSize: 10, color: '#64748b' }}>R:{d.ad_ratio}</span>
          </div>
        </div>
        {chart.length > 2 && <MiniChart data={chart} width={90} height={36} />}
      </div>
    );
  }

  function SmallPill(p) {
    var label   = p.label;
    var value   = p.value;
    var change  = p.change;
    var isUp    = p.isUp;
    var color   = p.color || (isUp ? '#4ade80' : '#f87171');
    var sub     = p.sub;
    var onClick = p.onClick;
    var extra   = p.extra;
    return (
      <div
        onClick={onClick}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#1e293b', borderRadius: 10, flexShrink: 0, border: '1px solid #334155', cursor: onClick ? 'pointer' : 'default' }}
      >
        <div>
          <p style={{ fontSize: 10, color: '#94a3b8', margin: '0 0 2px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#f1f5f9' }}>{value}</span>
            {change != null && (
              <span style={{ fontSize: 11, fontWeight: 700, color: isUp ? '#f87171' : '#4ade80' }}>
                {isUp ? '▲' : '▼'} {Math.abs(change)}
              </span>
            )}
          </div>
          {sub && <p style={{ fontSize: 10, color: color, margin: '2px 0 0', fontWeight: 600 }}>{sub}</p>}
        </div>
        {extra}
      </div>
    );
  }

  function BreadthPill() {
    if (!breadth.advances) return null;
    var total  = breadth.total || 1;
    var advPct = Math.round((breadth.advances / total) * 100);
    var decPct = Math.round((breadth.declines  / total) * 100);
    var color  = sentimentColor(breadth.breadth || 'Neutral');
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#1e293b', borderRadius: 10, flexShrink: 0, border: '1px solid #334155' }}>
        <div>
          <p style={{ fontSize: 10, color: '#94a3b8', margin: '0 0 3px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nifty 500 A/D</p>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#4ade80' }}>{breadth.advances}</span>
            <span style={{ fontSize: 11, color: '#475569' }}>/</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#f87171' }}>{breadth.declines}</span>
          </div>
          <div style={{ display: 'flex', gap: 2, marginTop: 4, width: 80 }}>
            <div style={{ height: 4, width: advPct + '%', background: '#16a34a', borderRadius: '2px 0 0 2px', minWidth: 2 }} />
            <div style={{ height: 4, width: decPct + '%', background: '#dc2626', borderRadius: '0 2px 2px 0', minWidth: 2 }} />
          </div>
          <p style={{ fontSize: 10, color: color, margin: '3px 0 0', fontWeight: 700 }}>{breadth.breadth} · {breadth.ad_ratio}x</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
      <IndexPill data={nifty}     label="NIFTY 50"  chart={niftyChart} />
      <IndexPill data={banknifty} label="BANKNIFTY" chart={bnChart} />
      {vix.last && (
        <SmallPill
          label="India VIX ↗"
          value={vix.last}
          change={vix.pct_change}
          isUp={vix.is_up}
          color={vix.last > 20 ? '#f87171' : vix.last > 15 ? '#f59e0b' : '#4ade80'}
          sub={vix.last > 20 ? 'High Fear' : vix.last > 15 ? 'Moderate' : 'Low Fear'}
          onClick={function() { window.open('https://www.tradingview.com/symbols/NSE-INDIAVIX/', '_blank'); }}
          extra={(vix.history || []).length >= 2 ? <Sparkline history={vix.history} field="value" width={60} height={32} color={vix.last > 20 ? '#f87171' : vix.last > 15 ? '#f59e0b' : '#4ade80'} /> : null}
        />
      )}
      {usdinr.last && (
        <SmallPill
          label="USD/INR"
          value={usdinr.last}
          change={usdinr.change}
          isUp={usdinr.is_up}
          sub={usdinr.is_up ? 'INR Weak' : 'INR Strong'}
        />
      )}
      {crude.last && (
        <SmallPill
          label="Crude Oil"
          value={'$' + crude.last}
          change={crude.change}
          isUp={crude.is_up}
          sub={'USD/bbl · ' + crude.pct_change + '%'}
        />
      )}
      <BreadthPill />
    </div>
  );
}

function SectorHighlights(props) {
  var overview = props.overview || {};
  var niftyStocks     = overview['nifty_constituents']    || [];
  var bankniftyStocks = overview['banknifty_constituents'] || [];
  if (niftyStocks.length === 0) return null;

  var sectorMap = {
    'IT':      ['TCS', 'INFY', 'HCLTECH', 'WIPRO', 'LTIM', 'TECHM'],
    'Banking': ['HDFCBANK', 'ICICIBANK', 'SBIN', 'AXISBANK', 'KOTAKBANK'],
    'Energy':  ['RELIANCE', 'NTPC', 'POWERGRID', 'ONGC', 'BPCL'],
    'Auto':    ['MARUTI', 'TATAMOTORS', 'EICHERMOT', 'HEROMOTOCO', 'M&M'],
    'Pharma':  ['SUNPHARMA', 'CIPLA', 'DRREDDY', 'DIVISLAB', 'APOLLOHOSP'],
    'FMCG':    ['HINDUNILVR', 'ITC', 'NESTLEIND', 'BRITANNIA', 'TATACONSUM'],
    'Infra':   ['LT', 'ADANIPORTS', 'ADANIENT'],
    'Metals':  ['TATASTEEL', 'HINDALCO', 'JSWSTEEL', 'COALINDIA'],
  };

  var allStocks = niftyStocks.concat(bankniftyStocks);
  var stockMap  = {};
  allStocks.forEach(function(s) { stockMap[s.symbol] = s; });

  var allSectors = [];
  Object.keys(sectorMap).forEach(function(sector) {
    var stocks = sectorMap[sector].map(function(s) { return stockMap[s]; }).filter(Boolean);
    if (stocks.length === 0) return;
    var avgChg = stocks.reduce(function(sum, s) { return sum + s.pct_change; }, 0) / stocks.length;
    allSectors.push({ name: sector, avg: Math.round(avgChg * 100) / 100, count: stocks.length });
  });
  if (allSectors.length === 0) return null;

  allSectors.sort(function(a, b) { return b.avg - a.avg; });
  var best  = allSectors.slice(0, 2);
  var worst = allSectors.slice(-2).reverse();

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>Sectors</span>
      <span style={{ fontSize: 11, color: '#334155' }}>Best:</span>
      {best.map(function(s) {
        return (
          <div key={'b-' + s.name} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 20 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{s.name}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#4ade80' }}>{s.avg > 0 ? '+' : ''}{s.avg}%</span>
            <span style={{ fontSize: 10, color: '#4ade80' }}>▲</span>
          </div>
        );
      })}
      <span style={{ fontSize: 11, color: '#334155' }}>Worst:</span>
      {worst.map(function(s) {
        return (
          <div key={'w-' + s.name} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 20 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{s.name}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#f87171' }}>{s.avg > 0 ? '+' : ''}{s.avg}%</span>
            <span style={{ fontSize: 10, color: '#f87171' }}>▼</span>
          </div>
        );
      })}
    </div>
  );
}

function SupportResistance(props) {
  var support    = props.support;
  var resistance = props.resistance;
  var spot       = props.spot;
  var maxPain    = props.maxPain;
  var distance   = props.maxPainDistance;
  if (!support && !resistance) return null;
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '14px 20px', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>OI Levels</p>
      {support && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#4ade80', fontWeight: 700, textTransform: 'uppercase' }}>Support</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#4ade80' }}>{support}</span>
          <span style={{ fontSize: 10, color: '#334155' }}>(Max PE OI)</span>
        </div>
      )}
      <div style={{ width: 1, height: 24, background: '#1e293b' }} />
      {resistance && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#f87171', fontWeight: 700, textTransform: 'uppercase' }}>Resistance</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#f87171' }}>{resistance}</span>
          <span style={{ fontSize: 10, color: '#334155' }}>(Max CE OI)</span>
        </div>
      )}
      <div style={{ width: 1, height: 24, background: '#1e293b' }} />
      {maxPain && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>Max Pain</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>{maxPain}</span>
          <span style={{ fontSize: 10, color: distance > 0 ? '#f87171' : '#4ade80' }}>
            {distance > 0 ? '↑' : '↓'} {Math.abs(distance)} pts from spot
          </span>
        </div>
      )}
      {spot && (
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: '#64748b' }}>Spot</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#60a5fa' }}>{spot}</span>
        </div>
      )}
    </div>
  );
}

function UnwindAlerts(props) {
  var alerts = props.alerts || [];
  if (alerts.length === 0) return null;
  function fmt(n) {
    var abs = Math.abs(n);
    if (abs >= 100000) return (n / 100000).toFixed(1) + 'L';
    if (abs >= 1000)   return (n / 1000).toFixed(0) + 'K';
    return n;
  }
  return (
    <div style={{ background: '#0f172a', border: '1px solid #f59e0b44', borderRadius: 12, padding: '14px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 16 }}>⚠️</span>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>OI Unwinding Alerts</p>
        <span style={{ fontSize: 11, color: '#64748b' }}>Large OI exits detected near ATM</span>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {alerts.map(function(a, i) {
          return (
            <div key={i} style={{ background: '#1e293b', borderRadius: 8, padding: '8px 14px', border: '1px solid ' + a.color + '44' }}>
              <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 2px', fontWeight: 600 }}>{a.signal}</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9', margin: '0 0 2px' }}>{a.strike}</p>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#f87171', margin: 0 }}>{fmt(a.chg_oi)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OIActivityTable(props) {
  var ceOI = props.ceOI || [];
  var peOI = props.peOI || [];
  var [tab, setTab] = useState('calls');

  var rows   = tab === 'calls' ? ceOI : peOI;
  var color  = tab === 'calls' ? '#f87171' : '#4ade80';
  var barCol = tab === 'calls' ? '#dc2626'  : '#16a34a';
  var maxOI  = Math.max.apply(null, rows.map(function(r) { return r.oi; }).concat([1]));

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

  function buildupBadge(sig) {
    if (!sig) return null;
    var cols = {
      'Long Buildup':   { bg: 'rgba(74,222,128,0.15)',  color: '#4ade80' },
      'Short Buildup':  { bg: 'rgba(248,113,113,0.15)', color: '#f87171' },
      'Short Covering': { bg: 'rgba(96,165,250,0.15)',  color: '#60a5fa' },
      'Long Unwinding': { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
    };
    var style = cols[sig] || { bg: 'rgba(100,116,139,0.15)', color: '#64748b' };
    return (
      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: style.bg, color: style.color, whiteSpace: 'nowrap' }}>
        {sig}
      </span>
    );
  }

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Most Active by OI
        </p>
        <div style={{ display: 'flex', gap: 4 }}>
          {['calls', 'puts'].map(function(t) {
            return (
              <button
                key={t}
                onClick={function() { setTab(t); }}
                style={{
                  border:       '1px solid #334155',
                  borderRadius: 6,
                  padding:      '4px 12px',
                  cursor:       'pointer',
                  fontSize:     11,
                  fontWeight:   600,
                  background:   tab === t ? (t === 'calls' ? '#dc2626' : '#16a34a') : 'transparent',
                  color:        tab === t ? '#fff' : '#64748b',
                }}
              >
                {t === 'calls' ? '📞 Calls' : '📉 Puts'}
              </button>
            );
          })}
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#1e293b' }}>
            <th style={{ padding: '7px 12px', color: '#94a3b8', textAlign: 'left',   fontWeight: 600 }}>Strike</th>
            <th style={{ padding: '7px 12px', color: '#94a3b8', textAlign: 'right',  fontWeight: 600 }}>OI</th>
            <th style={{ padding: '7px 12px', color: '#94a3b8', textAlign: 'right',  fontWeight: 600 }}>Chg OI</th>
            <th style={{ padding: '7px 12px', color: '#94a3b8', textAlign: 'right',  fontWeight: 600 }}>Volume</th>
            <th style={{ padding: '7px 12px', color: '#94a3b8', textAlign: 'right',  fontWeight: 600 }}>LTP</th>
            <th style={{ padding: '7px 12px', color: '#94a3b8', textAlign: 'center', fontWeight: 600 }}>Signal</th>
            <th style={{ padding: '7px 12px', color: '#94a3b8', textAlign: 'center', fontWeight: 600 }}>Bar</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(function(row) {
            var barPct = (row.oi / maxOI) * 100;
            return (
              <tr key={row.strike} style={{ borderBottom: '1px solid #1e293b22' }}>
                <td style={{ padding: '9px 12px', fontWeight: 700, color: '#f1f5f9', fontSize: 13 }}>{row.strike}</td>
                <td style={{ padding: '9px 12px', textAlign: 'right', color: color, fontWeight: 700 }}>{fmt(row.oi)}</td>
                <td style={{ padding: '9px 12px', textAlign: 'right', color: chgCol(row.chg_oi), fontWeight: 600 }}>
                  {row.chg_oi > 0 ? '+' : ''}{fmt(row.chg_oi)}
                </td>
                <td style={{ padding: '9px 12px', textAlign: 'right', color: '#94a3b8' }}>{fmt(row.vol)}</td>
                <td style={{ padding: '9px 12px', textAlign: 'right', color: '#f1f5f9' }}>{row.ltp}</td>
                <td style={{ padding: '9px 12px', textAlign: 'center' }}>{buildupBadge(row.signal)}</td>
                <td style={{ padding: '9px 12px' }}>
                  <div style={{ height: 5, background: '#1e293b', borderRadius: 3, overflow: 'hidden', width: 80 }}>
                    <div style={{ width: barPct + '%', height: '100%', background: barCol, borderRadius: 3 }} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ padding: '8px 16px', borderTop: '1px solid #1e293b', fontSize: 10, color: '#334155' }}>
        Sorted by highest OI · Signal based on price vs prev 3-min reading
      </div>
    </div>
  );
}

function PCRIntradayTable(props) {
  var data3m  = props.data3m  || [];
  var data9m  = props.data9m  || [];
  var data15m = props.data15m || [];
  var symbol  = props.symbol  || 'NIFTY';
  var [tab, setTab] = useState('3m');

  var rows = tab === '3m' ? data3m : tab === '9m' ? data9m : data15m;

  function fmtDiff(n) {
    if (!n && n !== 0) return '—';
    var abs = Math.abs(n);
    if (abs >= 100000) return (n > 0 ? '+' : '') + (n / 100000).toFixed(1) + 'L';
    if (abs >= 1000)   return (n > 0 ? '+' : '') + (n / 1000).toFixed(0) + 'K';
    return (n > 0 ? '+' : '') + n;
  }

  function signalStyle(sig) {
    if (sig === 'BUY')  return { color: '#4ade80', fontWeight: 700 };
    if (sig === 'SELL') return { color: '#f87171', fontWeight: 700 };
    return { color: '#f59e0b', fontWeight: 700 };
  }

  function pcrColor(pcr) {
    if (pcr > 1.2) return '#4ade80';
    if (pcr < 0.8) return '#f87171';
    return '#f59e0b';
  }

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Intraday PCR — {symbol}
        </p>
        <div style={{ display: 'flex', gap: 4 }}>
          {['3m', '9m', '15m'].map(function(t) {
            return (
              <button
                key={t}
                onClick={function() { setTab(t); }}
                style={{
                  border:       '1px solid #334155',
                  borderRadius: 6,
                  padding:      '3px 10px',
                  cursor:       'pointer',
                  fontSize:     11,
                  fontWeight:   600,
                  background:   tab === t ? '#3b82f6' : 'transparent',
                  color:        tab === t ? '#fff'    : '#64748b',
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#1e293b' }}>
            <th style={{ padding: '7px 14px', color: '#64748b', textAlign: 'left',   fontWeight: 600 }}>Time</th>
            <th style={{ padding: '7px 14px', color: '#64748b', textAlign: 'right',  fontWeight: 600 }}>PE COI - CE COI</th>
            <th style={{ padding: '7px 14px', color: '#64748b', textAlign: 'right',  fontWeight: 600 }}>PCR</th>
            <th style={{ padding: '7px 14px', color: '#64748b', textAlign: 'center', fontWeight: 600 }}>Signal</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#475569', fontSize: 13 }}>
                Collecting intraday data — updates every 3 minutes during market hours
              </td>
            </tr>
          ) : (
            rows.map(function(row, i) {
              var diff    = row.diff !== undefined ? row.diff : ((row.pe_coi || 0) - (row.ce_coi || 0));
              var diffCol = diff > 0 ? '#4ade80' : '#f87171';
              return (
                <tr key={i} style={{ borderBottom: '1px solid #1e293b22' }}>
                  <td style={{ padding: '9px 14px', color: '#f1f5f9', fontWeight: 600, fontFamily: 'monospace' }}>{row.time}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: diffCol, fontWeight: 700, fontFamily: 'monospace' }}>{fmtDiff(diff)}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: pcrColor(row.pcr), fontWeight: 700 }}>
                    {row.pcr ? row.pcr.toFixed(2) : '—'}
                  </td>
                  <td style={{ padding: '9px 14px', textAlign: 'center', ...signalStyle(row.signal) }}>{row.signal || '—'}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function IVStatus(props) {
  var history = props.history || [];
  var symbol  = props.symbol  || 'NIFTY';

  if (history.length < 2) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, fontSize: 12, color: '#475569' }}>
        <span style={{ fontSize: 13 }}>📊</span>
        <span>IV Status: collecting data — updates every 3 minutes</span>
      </div>
    );
  }

  var last    = history[history.length - 1];
  var prev    = history[history.length - 2];
  var ceUp    = last.ce_iv > prev.ce_iv;
  var peUp    = last.pe_iv > prev.pe_iv;
  var avgNow  = last.avg_iv || ((last.ce_iv + last.pe_iv) / 2);
  var avgPrev = prev.avg_iv || ((prev.ce_iv + prev.pe_iv) / 2);
  var avgUp   = avgNow > avgPrev;
  var ivColor = avgUp ? '#f87171' : '#4ade80';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 20px', background: '#0f172a', border: '1px solid ' + ivColor + '33', borderRadius: 10, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: ivColor }}>{avgUp ? 'IV Rising ↑' : 'IV Falling ↓'}</span>
        <span style={{ fontSize: 11, color: '#475569' }}>{avgUp ? 'Options getting expensive' : 'Options getting cheaper'}</span>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10, color: '#f87171', fontWeight: 700 }}>CE IV</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#f87171' }}>{last.ce_iv.toFixed(2)}%</span>
          <span style={{ fontSize: 12, color: ceUp ? '#f87171' : '#4ade80' }}>{ceUp ? '↑' : '↓'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10, color: '#4ade80', fontWeight: 700 }}>PE IV</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#4ade80' }}>{last.pe_iv.toFixed(2)}%</span>
          <span style={{ fontSize: 12, color: peUp ? '#f87171' : '#4ade80' }}>{peUp ? '↑' : '↓'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>Avg</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: ivColor }}>{avgNow.toFixed(2)}%</span>
          <span style={{ fontSize: 10, color: '#475569' }}>prev:{avgPrev.toFixed(2)}</span>
        </div>
      </div>
      <span style={{ fontSize: 10, color: '#334155', marginLeft: 'auto' }}>{history.length} readings · {last.time}</span>
    </div>
  );
}

function PCRCard(props) {
  var title     = props.title;
  var subtitle  = props.subtitle;
  var pcr       = props.pcr       || 0;
  var sentiment = props.sentiment || 'Neutral';
  var prevPCR   = props.prevPCR;
  var ceVal     = props.ceVal;
  var peVal     = props.peVal;
  var ceLabel   = props.ceLabel   || 'COI Call';
  var peLabel   = props.peLabel   || 'COI Put';
  var history   = props.history   || [];
  var field     = props.field     || 'pcr';
  var color     = sentimentColor(sentiment);
  var bg        = sentimentBg(sentiment);
  var trend     = prevPCR != null ? (pcr > prevPCR ? '↑' : pcr < prevPCR ? '↓' : '→') : null;
  var trendCol  = prevPCR != null ? (pcr > prevPCR ? '#4ade80' : pcr < prevPCR ? '#f87171' : '#94a3b8') : '#94a3b8';
  var pct       = Math.min(Math.max((pcr / 2) * 100, 1), 97);

  function fmt(n) {
    if (!n && n !== 0) return '—';
    var sign = n < 0 ? '-' : '';
    var abs  = Math.abs(n);
    if (abs >= 100000) return sign + (abs / 100000).toFixed(1) + 'L';
    if (abs >= 1000)   return sign + (abs / 1000).toFixed(1) + 'K';
    return n;
  }

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
        <p style={{ fontSize: 10, color: '#475569', margin: 0 }}>{subtitle}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 36, fontWeight: 800, color: color, lineHeight: 1 }}>{pcr.toFixed(2)}</span>
          {trend && <span style={{ fontSize: 16, fontWeight: 700, color: trendCol }}>{trend}</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: bg, color: color, border: '1px solid ' + color + '44' }}>
            {sentiment}
          </span>
          <Sparkline history={history} field={field} width={80} height={36} />
        </div>
      </div>
      <div style={{ position: 'relative', height: 6, background: '#1e293b', borderRadius: 4 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '100%', background: 'linear-gradient(90deg, #f87171 0%, #f59e0b 50%, #4ade80 100%)', borderRadius: 4, opacity: 0.25 }} />
        <div style={{ position: 'absolute', left: pct + '%', top: -4, width: 14, height: 14, background: color, borderRadius: '50%', transform: 'translateX(-50%)', border: '2px solid #0f172a', boxShadow: '0 0 6px ' + color }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#475569' }}>
        <span>Bearish &lt;0.8</span>
        <span>Neutral</span>
        <span>Bullish &gt;1.2</span>
      </div>
      {(ceVal != null || peVal != null) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, paddingTop: 8, borderTop: '1px solid #1e293b' }}>
          <div style={{ background: 'rgba(248,113,113,0.1)', borderRadius: 6, padding: '6px 10px' }}>
            <p style={{ fontSize: 9, color: '#f87171', margin: '0 0 2px', fontWeight: 700, textTransform: 'uppercase' }}>{ceLabel}</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#f87171', margin: 0 }}>{fmt(ceVal)}</p>
          </div>
          <div style={{ background: 'rgba(74,222,128,0.1)', borderRadius: 6, padding: '6px 10px' }}>
            <p style={{ fontSize: 9, color: '#4ade80', margin: '0 0 2px', fontWeight: 700, textTransform: 'uppercase' }}>{peLabel}</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#4ade80', margin: 0 }}>{fmt(peVal)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function IVChart(props) {
  var history = props.history || [];
  var symbol  = props.symbol  || 'NIFTY';
  if (history.length < 2) {
    return (
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>IV Trend — {symbol} ATM</p>
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#475569', fontSize: 13 }}>Collecting IV data — updates every 3 minutes</div>
      </div>
    );
  }
  var ceVals  = history.map(function(h) { return h.ce_iv || 0; });
  var peVals  = history.map(function(h) { return h.pe_iv || 0; });
  var allVals = ceVals.concat(peVals);
  var maxVal  = Math.max.apply(null, allVals);
  var minVal  = Math.min.apply(null, allVals);
  var range   = maxVal - minVal || 1;
  var w = 600, h = 100, padL = 36, padR = 10, padT = 10, padB = 22;
  var chartW  = w - padL - padR;
  var chartH  = h - padT - padB;
  function makePoints(vals) {
    return vals.map(function(v, i) {
      var x = padL + (i / (vals.length - 1)) * chartW;
      var y = padT + chartH - ((v - minVal) / range) * chartH;
      return x + ',' + y;
    }).join(' ');
  }
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>IV Trend — {symbol} ATM Strike</p>
        <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
          <span style={{ color: '#f87171' }}>■ CE IV: {ceVals[ceVals.length - 1].toFixed(2)}%</span>
          <span style={{ color: '#4ade80' }}>■ PE IV: {peVals[peVals.length - 1].toFixed(2)}%</span>
          <span style={{ color: '#64748b' }}>{history.length} readings</span>
        </div>
      </div>
      <svg viewBox={'0 0 ' + w + ' ' + h} style={{ width: '100%', height: 'auto' }}>
        <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="#1e293b" strokeWidth="1" />
        <line x1={padL} y1={padT + chartH} x2={padL + chartW} y2={padT + chartH} stroke="#1e293b" strokeWidth="1" />
        {[minVal, (minVal + maxVal) / 2, maxVal].map(function(ref, i) {
          var y = padT + chartH - ((ref - minVal) / range) * chartH;
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={padL + chartW} y2={y} stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4,4" />
              <text x={padL - 4} y={y + 4} fill="#334155" fontSize="8" textAnchor="end">{ref.toFixed(1)}</text>
            </g>
          );
        })}
        <polyline points={makePoints(ceVals)} fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={makePoints(peVals)} fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        {history.filter(function(_, i) { return i % Math.max(1, Math.floor(history.length / 6)) === 0; }).map(function(d, i) {
          var origIdx = history.indexOf(d);
          var x = padL + (origIdx / (history.length - 1)) * chartW;
          return <text key={i} x={x} y={padT + chartH + 16} fill="#334155" fontSize="8" textAnchor="middle">{d.time}</text>;
        })}
      </svg>
    </div>
  );
}

function ConstituentTable(props) {
  var stocks = props.stocks || [];
  var title  = props.title  || '';
  var color  = props.color  || '#60a5fa';
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
        <p style={{ fontSize: 12, fontWeight: 700, color: color, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#1e293b' }}>
              <th style={{ padding: '6px 12px', color: '#94a3b8', textAlign: 'left',   fontWeight: 600 }}>Symbol</th>
              <th style={{ padding: '6px 12px', color: '#94a3b8', textAlign: 'right',  fontWeight: 600 }}>LTP</th>
              <th style={{ padding: '6px 12px', color: '#94a3b8', textAlign: 'right',  fontWeight: 600 }}>% Chg</th>
              <th style={{ padding: '6px 12px', color: '#94a3b8', textAlign: 'right',  fontWeight: 600 }}>Weight</th>
              <th style={{ padding: '6px 12px', color: '#94a3b8', textAlign: 'center', fontWeight: 600 }}>Bar</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map(function(s) {
              var isUp     = s.is_up;
              var pctCol   = isUp ? '#4ade80' : '#f87171';
              var barColor = isUp ? '#16a34a' : '#dc2626';
              return (
                <tr key={s.symbol} style={{ borderBottom: '1px solid #1e293b22' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 700, color: '#f1f5f9' }}>{s.symbol}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#cbd5e1' }}>{s.last_price}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: isUp ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.15)', color: pctCol }}>
                      {isUp ? '+' : ''}{s.pct_change.toFixed(2)}%
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#94a3b8', fontWeight: 600 }}>{s.weight}%</td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden', width: 80 }}>
                      <div style={{ width: Math.min(s.weight * 3, 100) + '%', height: '100%', background: barColor, borderRadius: 3 }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FiveStrikeTable(props) {
  var rows      = props.rows      || [];
  var pcr       = props.pcr       || 0;
  var sentiment = props.sentiment || 'Neutral';
  var ceCOI     = props.ceCOI     || 0;
  var peCOI     = props.peCOI     || 0;
  var history       = props.history       || [];
  var strikeHistory = props.strikeHistory || [];
  var color     = sentimentColor(sentiment);

  function fmt(n) {
    if (!n && n !== 0) return '—';
    var sign = n < 0 ? '-' : '+';
    var abs  = Math.abs(n);
    if (abs >= 100000) return sign + (abs / 100000).toFixed(1) + 'L';
    if (abs >= 1000)   return sign + (abs / 1000).toFixed(0) + 'K';
    return (n > 0 ? '+' : '') + n;
  }

  function chgCol(v) {
    if (!v || v === 0) return '#64748b';
    return v > 0 ? '#4ade80' : '#f87171';
  }

  function pcrColor(v) {
    if (v > 1.2) return '#4ade80';
    if (v < 0.8) return '#f87171';
    return '#f59e0b';
  }

  var totalCE = ceCOI || rows.reduce(function(s, r) { return s + (r.ce_chg_oi || 0); }, 0);
  var totalPE = peCOI || rows.reduce(function(s, r) { return s + (r.pe_chg_oi || 0); }, 0);
  var total   = Math.abs(totalCE) + Math.abs(totalPE) || 1;
  var cePct   = Math.round((Math.abs(totalCE) / total) * 100);
  var pePct   = 100 - cePct;

  // last 6 snapshots for COI PCR trend
  var last6 = history.slice(-6);

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e293b' }}>

        {/* Title + current PCR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ATM ± 2 Strikes — COI PCR</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: color }}>{pcr.toFixed(2)}</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: sentimentBg(sentiment), color: color, border: '1px solid ' + color + '44' }}>{sentiment}</span>
          </div>
        </div>

        {/* CE / PE COI boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div style={{ background: 'rgba(248,113,113,0.1)', borderRadius: 8, padding: '8px 12px' }}>
            <p style={{ fontSize: 10, color: '#f87171', margin: '0 0 2px', fontWeight: 700 }}>Total CE COI (5 strikes)</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#f87171', margin: 0 }}>{fmt(totalCE)}</p>
          </div>
          <div style={{ background: 'rgba(74,222,128,0.1)', borderRadius: 8, padding: '8px 12px' }}>
            <p style={{ fontSize: 10, color: '#4ade80', margin: '0 0 2px', fontWeight: 700 }}>Total PE COI (5 strikes)</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#4ade80', margin: 0 }}>{fmt(totalPE)}</p>
          </div>
        </div>

        {/* CE/PE bar */}
        <div style={{ position: 'relative', height: 6, borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: cePct + '%', background: '#dc2626', borderRadius: '3px 0 0 3px' }} />
          <div style={{ width: pePct + '%', background: '#16a34a', borderRadius: '0 3px 3px 0' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: '#475569' }}>
          <span>CE {cePct}% writing</span>
          <span>PE {pePct}% writing</span>
        </div>

        {/* Last 6 COI PCR trend */}
        {last6.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#475569', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              COI PCR Trend — Last {last6.length} readings (every 3 min)
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {last6.map(function(snap, i) {
                var val     = snap.pcr_5strike || 0;
                var col     = pcrColor(val);
                var isLast  = i === last6.length - 1;
                var prevVal = i > 0 ? (last6[i - 1].pcr_5strike || 0) : null;
                var arrow   = prevVal === null ? '' : val > prevVal ? ' ↑' : val < prevVal ? ' ↓' : ' →';
                var arrowCol = prevVal === null ? '#64748b' : val > prevVal ? '#4ade80' : val < prevVal ? '#f87171' : '#64748b';
                return (
                  <div
                    key={i}
                    style={{
                      display:        'flex',
                      flexDirection:  'column',
                      alignItems:     'center',
                      padding:        '6px 10px',
                      background:     isLast ? col + '22' : '#1e293b',
                      border:         '1px solid ' + (isLast ? col + '66' : '#334155'),
                      borderRadius:   8,
                      minWidth:       52,
                    }}
                  >
                    <span style={{ fontSize: 9, color: '#475569', marginBottom: 2 }}>{snap.time}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: col }}>
                      {val.toFixed(2)}
                      <span style={{ fontSize: 11, color: arrowCol }}>{arrow}</span>
                    </span>
                    <span style={{ fontSize: 9, color: col, fontWeight: 600 }}>
                      {val > 1.2 ? 'Bull' : val < 0.8 ? 'Bear' : 'Neut'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Strike table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#1e293b' }}>
            <th style={{ padding: '8px 16px', color: '#f87171', textAlign: 'right',  fontWeight: 600 }}>CE COI</th>
            <th style={{ padding: '8px 16px', color: '#f87171', textAlign: 'right',  fontWeight: 600 }}>CE Vol</th>
            <th style={{ padding: '8px 16px', color: '#f1f5f9', textAlign: 'center', fontWeight: 700 }}>Strike</th>
            <th style={{ padding: '8px 16px', color: '#4ade80', textAlign: 'left',   fontWeight: 600 }}>PE Vol</th>
            <th style={{ padding: '8px 16px', color: '#4ade80', textAlign: 'left',   fontWeight: 600 }}>PE COI</th>
            <th style={{ padding: '8px 16px', color: '#94a3b8', textAlign: 'center', fontWeight: 700, borderLeft: '1px solid #334155' }}>Now</th>
            {strikeHistory.map(function(snap, i) {
              return <th key={i} style={{ padding: '8px 10px', color: '#475569', textAlign: 'center', fontWeight: 600, fontSize: 10, whiteSpace: 'nowrap' }}>{snap.time}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map(function(row) {
            var isATM  = row.is_atm;
            var rowBg  = isATM ? 'rgba(96,165,250,0.1)' : 'transparent';
            var pcrCol = pcrColor(row.pcr_coi);
            return (
              <tr key={row.strike} style={{ background: rowBg, borderBottom: '1px solid #1e293b22' }}>
                <td style={{ padding: '10px 16px', textAlign: 'right',  color: chgCol(row.ce_chg_oi), fontWeight: 600 }}>{fmt(row.ce_chg_oi)}</td>
                <td style={{ padding: '10px 16px', textAlign: 'right',  color: '#94a3b8' }}>{fmt(row.ce_vol)}</td>
                <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, fontSize: 13, color: isATM ? '#60a5fa' : '#f1f5f9' }}>
                  {row.strike}
                  {isATM && <span style={{ display: 'block', fontSize: 9, color: '#60a5fa', fontWeight: 600 }}>ATM</span>}
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'left',   color: '#94a3b8' }}>{fmt(row.pe_vol)}</td>
                <td style={{ padding: '10px 16px', textAlign: 'left',   color: chgCol(row.pe_chg_oi), fontWeight: 600 }}>{fmt(row.pe_chg_oi)}</td>
                <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: pcrCol, borderLeft: '1px solid #334155' }}>{row.pcr_coi || '—'}</td>
                {strikeHistory.map(function(snap, i) {
                  var val     = snap.strikes ? snap.strikes[String(row.strike)] : null;
                  var col     = val != null ? pcrColor(val) : '#334155';
                  var prevVal = i > 0 && strikeHistory[i-1].strikes ? strikeHistory[i-1].strikes[String(row.strike)] : null;
                  var arrow   = val != null && prevVal != null ? (val > prevVal ? '↑' : val < prevVal ? '↓' : '') : '';
                  return (
                    <td key={i} style={{ padding: '10px 10px', textAlign: 'center', color: col, fontWeight: 500, fontSize: 11 }}>
                      {val != null ? val.toFixed(2) : '—'}
                      {arrow && <span style={{ fontSize: 9, marginLeft: 2, color: arrow === '↑' ? '#4ade80' : '#f87171' }}>{arrow}</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function VolumeLeaders(props) {
  var ceVol = props.ceVol || [];
  var peVol = props.peVol || [];
  function fmt(n) {
    if (!n) return '—';
    if (n >= 100000) return (n / 100000).toFixed(1) + 'L';
    if (n >= 1000)   return (n / 1000).toFixed(0) + 'K';
    return n;
  }
  function chgCol(v) {
    if (!v || v === 0) return '#64748b';
    return v > 0 ? '#4ade80' : '#f87171';
  }
  var maxCEVol = Math.max.apply(null, ceVol.map(function(r) { return r.volume; }).concat([1]));
  var maxPEVol = Math.max.apply(null, peVol.map(function(r) { return r.volume; }).concat([1]));

  function VolumeList(p) {
    var list   = p.list   || [];
    var maxVol = p.maxVol || 1;
    var side   = p.side   || 'ce';
    var color  = side === 'ce' ? '#f87171' : '#4ade80';
    var barCol = side === 'ce' ? '#dc2626'  : '#16a34a';
    return (
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
          <p style={{ fontSize: 12, fontWeight: 700, color: color, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {side === 'ce' ? 'Top Call Volume' : 'Top Put Volume'}
          </p>
        </div>
        <div style={{ padding: '6px 0' }}>
          {list.map(function(row, i) {
            return (
              <div key={row.strike} style={{ padding: '7px 16px', borderBottom: i < list.length - 1 ? '1px solid #1e293b22' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#334155', minWidth: 16 }}>#{i + 1}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{row.strike}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: color }}>{fmt(row.volume)}</span>
                    <span style={{ fontSize: 10, color: chgCol(row.chg_oi), marginLeft: 8 }}>COI: {row.chg_oi > 0 ? '+' : ''}{fmt(row.chg_oi)}</span>
                  </div>
                </div>
                <div style={{ height: 3, background: '#1e293b', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: ((row.volume / maxVol) * 100) + '%', height: '100%', background: barCol, borderRadius: 2 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                  <span style={{ fontSize: 10, color: '#334155' }}>LTP: {row.ltp}</span>
                  <span style={{ fontSize: 10, color: '#334155' }}>OI: {fmt(row.oi)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <VolumeList list={ceVol} maxVol={maxCEVol} side="ce" />
      <VolumeList list={peVol} maxVol={maxPEVol} side="pe" />
    </div>
  );
}

// Paste this into Options.js right before:  export default function Options() {

function TopStrikesSection(props) {
  var data = props.data || {};
  var ts   = data.top_strikes || {};

  if (!ts.top_calls && !ts.top_puts) {
    return (
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '20px 24px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          🎯 Top Strikes for Option Buyers
        </p>
        <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>Collecting data — available after first refresh</p>
      </div>
    );
  }

  var topCalls = ts.top_calls || [];
  var topPuts  = ts.top_puts  || [];

  function fmtVol(n) {
    if (!n) return '—';
    if (n >= 100000) return (n / 100000).toFixed(1) + 'L';
    if (n >= 1000)   return (n / 1000).toFixed(0) + 'K';
    return n;
  }

  function fmtCOI(n) {
    if (!n && n !== 0) return '—';
    var sign = n < 0 ? '-' : '+';
    var abs  = Math.abs(n);
    if (abs >= 100000) return sign + (abs / 100000).toFixed(1) + 'L';
    if (abs >= 1000)   return sign + (abs / 1000).toFixed(0) + 'K';
    return (n > 0 ? '+' : '') + n;
  }

  function StrikeCard(p) {
    var item     = p.item;
    var side     = p.side;
    var rank     = p.rank;
    var borderCol = side === 'call' ? '#f87171' : '#4ade80';
    var sideLabel = side === 'call' ? 'CALL' : 'PUT';

    var maxScore = 60;
    var scorePct = Math.min((item.score / maxScore) * 100, 100);
    var scoreCol = item.score >= 35 ? '#4ade80' : item.score >= 20 ? '#f59e0b' : '#f87171';

    return (
      <div style={{
        background:   '#0f172a',
        border:       '1px solid ' + borderCol + '44',
        borderLeft:   '3px solid ' + borderCol,
        borderRadius: 10,
        padding:      '14px 16px',
        flex:         1,
        minWidth:     200,
        maxWidth:     320,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#334155' }}>#{rank}</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9' }}>{item.strike}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: borderCol + '22', color: borderCol }}>
              {sideLabel}
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>₹{item.ltp}</p>
            <p style={{ fontSize: 9, color: '#475569', margin: 0 }}>LTP</p>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
          <div style={{ background: '#1e293b', borderRadius: 6, padding: '6px 10px' }}>
            <p style={{ fontSize: 9, color: '#64748b', margin: '0 0 2px', fontWeight: 700 }}>VOLUME</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{fmtVol(item.volume)}</p>
          </div>
          <div style={{ background: '#1e293b', borderRadius: 6, padding: '6px 10px' }}>
            <p style={{ fontSize: 9, color: '#64748b', margin: '0 0 2px', fontWeight: 700 }}>MY COI</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: (item.chg_oi || 0) >= 0 ? '#4ade80' : '#f87171', margin: 0 }}>
              {fmtCOI(item.chg_oi)}
            </p>
          </div>
          <div style={{ background: '#1e293b', borderRadius: 6, padding: '6px 10px' }}>
            <p style={{ fontSize: 9, color: '#64748b', margin: '0 0 2px', fontWeight: 700 }}>
              {side === 'call' ? 'PE COI (opp)' : 'CE COI (opp)'}
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: (item.opp_chgoi || 0) >= 0 ? '#4ade80' : '#f87171', margin: 0 }}>
              {fmtCOI(item.opp_chgoi)}
            </p>
          </div>
          <div style={{ background: '#1e293b', borderRadius: 6, padding: '6px 10px' }}>
            <p style={{ fontSize: 9, color: '#64748b', margin: '0 0 2px', fontWeight: 700 }}>IV</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: item.iv > 30 ? '#f87171' : '#f59e0b', margin: 0 }}>
              {item.iv}%
              {item.iv_rising && <span style={{ fontSize: 9, color: '#f87171', marginLeft: 4 }}>↑</span>}
            </p>
          </div>
        </div>

        {/* Score bar */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 9, color: '#475569' }}>Buyer Score</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: scoreCol }}>{item.score}</span>
          </div>
          <div style={{ height: 4, background: '#1e293b', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: scorePct + '%', height: '100%', background: scoreCol, borderRadius: 2 }} />
          </div>
        </div>

        {/* Reasons */}
        {item.reason && (
          <p style={{ fontSize: 10, color: '#475569', margin: 0, lineHeight: 1.5 }}>
            {item.reason}
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: '#0f172a', border: '1px solid #8b5cf644', borderRadius: 12, padding: '18px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🎯 Top Strikes for Option Buyers
          </p>
          <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>
            High volume · Low writer activity · Opposite side writing pressure
            {ts.iv_rising ? ' · IV Rising ↑' : ''}
          </p>
        </div>
        <span style={{ fontSize: 10, color: '#334155' }}>⏱ {ts.timestamp}</span>
      </div>

      <div style={{ height: 1, background: '#1e293b', margin: '12px 0' }} />

      {/* Calls */}
      <p style={{ fontSize: 11, fontWeight: 700, color: '#f87171', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        📞 Top Calls to Buy
      </p>
      {topCalls.length === 0 ? (
        <p style={{ fontSize: 12, color: '#475569', margin: '0 0 16px' }}>No calls matching criteria right now</p>
      ) : (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          {topCalls.map(function(item, i) {
            return <StrikeCard key={item.strike + '-call'} item={item} side="call" rank={i + 1} />;
          })}
        </div>
      )}

      {/* Puts */}
      <p style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        📉 Top Puts to Buy
      </p>
      {topPuts.length === 0 ? (
        <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>No puts matching criteria right now</p>
      ) : (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {topPuts.map(function(item, i) {
            return <StrikeCard key={item.strike + '-put'} item={item} side="put" rank={i + 1} />;
          })}
        </div>
      )}

      <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid #1e293b' }}>
        <p style={{ fontSize: 10, color: '#334155', margin: 0 }}>
          Score based on volume rank · writer activity · opposite side pressure · IV level · Not financial advice
        </p>
      </div>
    </div>
  );
}
export default function Options() {
  var { user }  = useAuth();
  var navigate  = useNavigate();
  var [symbol, setSymbol]         = useState('NIFTY');
  var [data, setData]             = useState(null);
  var [bnData, setBnData]         = useState(null);
  var [overview, setOverview]     = useState({});
  var [loading, setLoading]       = useState(false);
  var [lastUpdate, setLastUpdate] = useState(null);
  var intervalRef                 = useRef(null);
  var overviewRef                 = useRef(null);
  var prevPCRRef                  = useRef({});

  var hasOptions = user && (
    user.plan === 'options' ||
    user.plan === 'global'  ||
    user.plan === 'admin'
  );

  function fetchOverview() {
    fetch('http://localhost:3001/api/market-overview')
      .then(function(r) { return r.json(); })
      .then(function(d) { if (d && !d.error) setOverview(d); })
      .catch(function() {});
  }

  function fetchSym(sym, setter) {
    fetch('http://localhost:3001/api/options?symbol=' + sym)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d && d.spot_price) {
          setter(function(prev) {
            if (prev && sym === symbol) {
              prevPCRRef.current = {
                pcr_total:   prev.pcr_total,
                pcr_atm:     prev.pcr_atm,
                pcr_5strike: prev.pcr_5strike,
              };
            }
            return d;
          });
          setLoading(false);
          setLastUpdate(new Date().toLocaleTimeString());
        }
      })
      .catch(function(e) { console.error(e); setLoading(false); });
  }

  useEffect(function() {
    if (!hasOptions) return;
    fetchOverview();
    overviewRef.current = setInterval(fetchOverview, 180000);
    return function() { clearInterval(overviewRef.current); };
  }, [hasOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(function() {
    if (!hasOptions) return;
    setLoading(true);
    setData(null);
    prevPCRRef.current = {};
    fetchSym(symbol, setData);
    fetchSym('BANKNIFTY', setBnData);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(function() {
      fetchSym(symbol, setData);
      fetchSym('BANKNIFTY', setBnData);
    }, 180000);
    return function() { clearInterval(intervalRef.current); };
  }, [symbol, hasOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hasOptions) {
    return (
      <div style={{ color: '#f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 500, gap: 20 }}>
        <PageTitle title="Options Analysis" />
        <div style={{ fontSize: 48 }}>📊</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Options Analysis</h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0, textAlign: 'center', maxWidth: 400, lineHeight: 1.6 }}>
          PCR analysis, OI buildup, IV trends and market sentiment. Available on Options Pro.
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

  var niftyStocks     = overview['nifty_constituents']     || [];
  var bankniftyStocks = overview['banknifty_constituents'] || [];

  return (
    <div style={{ color: '#f1f5f9' }}>
      <PageTitle title="Options Analysis" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>Options Analysis</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: 13 }}>PCR · IV · OI · Intraday · Buildup Signals · every 3 min</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#1e293b', borderRadius: 6, border: '1px solid #334155' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block', background: '#4ade80' }} />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              {lastUpdate ? 'Updated ' + lastUpdate : loading ? 'Loading...' : 'Waiting'}
            </span>
          </div>
          <button
            onClick={function() { navigate('/option-chain'); }}
            style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '6px 14px', color: '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Full Chain →
          </button>
        </div>
      </div>

      <TopBar overview={overview} />
      <SectorHighlights overview={overview} />

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

      {loading && !data && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#475569' }}>
          <p style={{ fontSize: 15 }}>Fetching {symbol} option chain from NSE...</p>
        </div>
      )}

      {data && data.error && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#f87171' }}>
          <p>{data.error}</p>
        </div>
      )}

      {data && !data.error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 20px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>{data.symbol}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#60a5fa' }}>{data.spot_price}</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>Expiry: <b style={{ color: '#f1f5f9' }}>{data.expiry}</b></span>
            <span style={{ fontSize: 12, color: '#64748b' }}>ATM: <b style={{ color: '#60a5fa' }}>{data.atm_strike}</b></span>
            <span style={{ fontSize: 12, color: '#64748b' }}>Max Pain: <b style={{ color: '#f59e0b' }}>{data.max_pain}</b></span>
            <span style={{ fontSize: 11, color: '#334155', marginLeft: 'auto' }}>⏱ {data.timestamp}</span>
          </div>

          <SupportResistance
            support={data.support}
            resistance={data.resistance}
            spot={data.spot_price}
            maxPain={data.max_pain}
            maxPainDistance={data.max_pain_distance}
          />

          {(data.unwind_alerts || []).length > 0 && (
            <UnwindAlerts alerts={data.unwind_alerts} />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <PCRCard
              title="PCR — Total OI"
              subtitle="Put OI / Call OI across all strikes"
              pcr={data.pcr_total || 0}
              sentiment={data.sentiment_total || 'Neutral'}
              prevPCR={prevPCRRef.current.pcr_total}
              ceVal={data.total_ce_oi}
              peVal={data.total_pe_oi}
              ceLabel="Total CE OI"
              peLabel="Total PE OI"
              history={data.pcr_history || []}
              field="pcr"
            />
            <PCRCard
              title="PCR — ATM COI"
              subtitle={'COI(Put) / COI(Call) at ' + data.atm_strike + ' only'}
              pcr={data.pcr_atm || 0}
              sentiment={data.sentiment_atm || 'Neutral'}
              prevPCR={prevPCRRef.current.pcr_atm}
              ceVal={data.atm_ce_coi}
              peVal={data.atm_pe_coi}
              ceLabel="CE Chg OI"
              peLabel="PE Chg OI"
              history={data.pcr_history || []}
              field="pcr_atm"
            />
            <PCRCard
              title="PCR — 5 Strike COI"
              subtitle="COI(Put) / COI(Call) ATM ± 2 strikes"
              pcr={data.pcr_5strike || 0}
              sentiment={data.sentiment_5strike || 'Neutral'}
              prevPCR={prevPCRRef.current.pcr_5strike}
              ceVal={data.five_ce_coi}
              peVal={data.five_pe_coi}
              ceLabel="CE COI (5 strikes)"
              peLabel="PE COI (5 strikes)"
              history={data.pcr_history || []}
              field="pcr_5strike"
            />
          </div>

          <IVStatus history={data.iv_history || []} symbol={symbol} />
          <IVChart  history={data.iv_history || []} symbol={symbol} />
          {data.top_strikes && <TopStrikesSection data={data} />}

          {/* FiveStrikeTable moved here — below IVChart */}
          <FiveStrikeTable
            rows={data.five_strike_rows || []}
            pcr={data.pcr_5strike || 0}
            sentiment={data.sentiment_5strike || 'Neutral'}
            ceCOI={data.five_ce_coi}
            peCOI={data.five_pe_coi}
            history={data.pcr_history || []}
            strikeHistory={data.strike_pcr_history || []}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <PCRIntradayTable
              data3m={data.pcr_intraday_3m   || []}
              data9m={data.pcr_intraday_9m   || []}
              data15m={data.pcr_intraday_15m || []}
              symbol="NIFTY"
            />
            <PCRIntradayTable
              data3m={bnData  ? (bnData.pcr_intraday_3m  || []) : []}
              data9m={bnData  ? (bnData.pcr_intraday_9m  || []) : []}
              data15m={bnData ? (bnData.pcr_intraday_15m || []) : []}
              symbol="BANKNIFTY"
            />
          </div>

          <OIActivityTable
            ceOI={data.top_ce_oi || []}
            peOI={data.top_pe_oi || []}
          />

          <VolumeLeaders
            ceVol={data.top_ce_vol || []}
            peVol={data.top_pe_vol || []}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <ConstituentTable stocks={niftyStocks}     title="NIFTY 50 — Top Weighted"  color="#60a5fa" />
            <ConstituentTable stocks={bankniftyStocks} title="BANKNIFTY — Top Weighted" color="#f59e0b" />
          </div>

        </div>
      )}
    </div>
  );
}