import React, { useState, useEffect, useRef } from 'react';
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
  var chain = props.chain || [];
  var ceOI  = chain.map(function(r) { return { strike: r.strike, oi: r.ce_oi, chg_oi: r.ce_chg_oi, vol: r.ce_vol, ltp: r.ce_ltp, signal: r.ce_signal }; });
  var peOI  = chain.map(function(r) { return { strike: r.strike, oi: r.pe_oi, chg_oi: r.pe_chg_oi, vol: r.pe_vol, ltp: r.pe_ltp, signal: r.pe_signal }; });

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
      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3, background: style.bg, color: style.color, whiteSpace: 'nowrap' }}>
        {sig}
      </span>
    );
  }

  // Combine CE and PE, only positive COI (fresh writing), sort by COI descending
  var allWriting = [];
  ceOI.forEach(function(r) {
    if (r.chg_oi > 0) {
      allWriting.push({
        strike:  r.strike,
        side:    'CE',
        oi:      r.oi,
        chg_oi:  r.chg_oi,
        vol:     r.vol,
        ltp:     r.ltp,
        signal:  r.signal,
      });
    }
  });
  peOI.forEach(function(r) {
    if (r.chg_oi > 0) {
      allWriting.push({
        strike:  r.strike,
        side:    'PE',
        oi:      r.oi,
        chg_oi:  r.chg_oi,
        vol:     r.vol,
        ltp:     r.ltp,
        signal:  r.signal,
      });
    }
  });

  // Sort by COI descending, take top 5
  allWriting.sort(function(a, b) { return b.chg_oi - a.chg_oi; });
  var top5 = allWriting.slice(0, 5);

  var maxCOI = top5.length > 0 ? top5[0].chg_oi : 1;

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Top 5 Options Being Written
        </p>
        <p style={{ fontSize: 10, color: '#475569', margin: '3px 0 0' }}>
          Highest fresh COI (positive change in OI) across calls and puts — where writers are most active
        </p>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#1e293b' }}>
            <th style={{ padding: '7px 12px', color: '#94a3b8', textAlign: 'left',   fontWeight: 600 }}>#</th>
            <th style={{ padding: '7px 12px', color: '#94a3b8', textAlign: 'left',   fontWeight: 600 }}>Strike</th>
            <th style={{ padding: '7px 12px', color: '#94a3b8', textAlign: 'center', fontWeight: 600 }}>Side</th>
            <th style={{ padding: '7px 12px', color: '#94a3b8', textAlign: 'right',  fontWeight: 600 }}>OI</th>
            <th style={{ padding: '7px 12px', color: '#94a3b8', textAlign: 'right',  fontWeight: 600 }}>Fresh COI</th>
            <th style={{ padding: '7px 12px', color: '#94a3b8', textAlign: 'right',  fontWeight: 600 }}>Volume</th>
            <th style={{ padding: '7px 12px', color: '#94a3b8', textAlign: 'right',  fontWeight: 600 }}>LTP</th>
            <th style={{ padding: '7px 12px', color: '#94a3b8', textAlign: 'center', fontWeight: 600 }}>Signal</th>
            <th style={{ padding: '7px 12px', color: '#94a3b8', textAlign: 'left',   fontWeight: 600 }}>Writing intensity</th>
          </tr>
        </thead>
        <tbody>
          {top5.length === 0 ? (
            <tr>
              <td colSpan="9" style={{ padding: '24px', textAlign: 'center', color: '#475569', fontSize: 13 }}>
                No fresh writing detected — all COI flat or negative
              </td>
            </tr>
          ) : (
            top5.map(function(row, i) {
              var isCE     = row.side === 'CE';
              var sideCol  = isCE ? '#f87171' : '#4ade80';
              var sideBg   = isCE ? 'rgba(248,113,113,0.15)' : 'rgba(74,222,128,0.15)';
              var barPct   = (row.chg_oi / maxCOI) * 100;
              var barCol   = isCE ? '#dc2626' : '#16a34a';
              return (
                <tr key={row.strike + row.side} style={{ borderBottom: '1px solid #1e293b22' }}>
                  <td style={{ padding: '10px 12px', color: '#334155', fontWeight: 700 }}>#{i + 1}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 800, color: '#f1f5f9', fontSize: 14 }}>{row.strike}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: sideBg, color: sideCol }}>
                      {row.side}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: sideCol, fontWeight: 700 }}>{fmt(row.oi)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#4ade80', fontWeight: 700 }}>+{fmt(row.chg_oi)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#94a3b8' }}>{fmt(row.vol)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#f1f5f9' }}>₹{row.ltp}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>{buildupBadge(row.signal)}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: barPct + '%', height: '100%', background: barCol, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 10, color: '#475569', minWidth: 32 }}>{Math.round(barPct)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      <div style={{ padding: '8px 16px', borderTop: '1px solid #1e293b', fontSize: 10, color: '#334155' }}>
        CE writing = bearish (resistance building) · PE writing = bullish (support building) · Sorted by fresh COI
      </div>
    </div>
  );
}


function PCRHistory(props) {
  var history = props.history || [];
  var field   = props.field   || 'pcr';
  var last10  = history.slice(-10).reverse(); // newest first
 
  if (last10.length === 0) {
    return <div style={{ fontSize: 10, color: '#334155' }}>no data</div>;
  }
 
  function pcrColor(v) {
    if (v > 1.2) return '#4ade80';
    if (v < 0.8) return '#f87171';
    return '#f59e0b';
  }
 
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
      {last10.map(function(snap, i) {
        var val     = snap[field] || 0;
        var col     = pcrColor(val);
        var prevVal = i < last10.length - 1 ? (last10[i + 1][field] || 0) : null;
        var arrow   = prevVal === null ? '' : val > prevVal ? '↑' : val < prevVal ? '↓' : '→';
        var arrowCol = arrow === '↑' ? '#4ade80' : arrow === '↓' ? '#f87171' : '#64748b';
        var isFirst = i === 0;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, opacity: isFirst ? 1 : 0.6 + (0.4 * (1 - i / last10.length)) }}>
            <span style={{ fontSize: 9, color: '#475569', minWidth: 32 }}>{snap.time}</span>
            <div style={{ flex: 1, height: 3, background: '#1e293b', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: Math.min((val / 2) * 100, 100) + '%', height: '100%', background: col, borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 10, fontWeight: isFirst ? 700 : 500, color: col, minWidth: 28, textAlign: 'right' }}>{val.toFixed(2)}</span>
            <span style={{ fontSize: 9, color: arrowCol, minWidth: 8 }}>{arrow}</span>
          </div>
        );
      })}
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
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 36, fontWeight: 800, color: color, lineHeight: 1 }}>{pcr.toFixed(2)}</span>
            {trend && <span style={{ fontSize: 16, fontWeight: 700, color: trendCol }}>{trend}</span>}
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: bg, color: color, border: '1px solid ' + color + '44' }}>
            {sentiment}
          </span>
        </div>
        <div style={{ flex: 1 }}>
          <PCRHistory history={history} field={field} />
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

// Replace IVStatus and IVChart functions in Options.js with this single IVDashboard component.
// Then in the JSX render, replace:
//   <IVStatus history={data.iv_history || []} symbol={symbol} />
//   <IVChart  history={data.iv_history || []} symbol={symbol} />
// With:
//   <IVDashboard history={data.iv_history || []} symbol={symbol} tDays={data.top_strikes ? data.top_strikes.T_days : null} />

function IVDashboard(props) {
  var history = props.history || [];
  var symbol  = props.symbol  || 'NIFTY';
  var tDays   = props.tDays;

  if (history.length < 2) {
    return (
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '16px 20px', color: '#475569', fontSize: 13 }}>
        <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>IV & Premium Dashboard — {symbol}</p>
        <p style={{ margin: 0 }}>Collecting data — updates every 3 minutes during market hours</p>
      </div>
    );
  }

  var last    = history[history.length - 1];
  var prev    = history[history.length - 2];
  var first   = history[0];

  var ceUp    = last.ce_iv  > prev.ce_iv;
  var peUp    = last.pe_iv  > prev.pe_iv;
  var avgNow  = last.avg_iv  || ((last.ce_iv  + last.pe_iv)  / 2);
  var avgPrev = prev.avg_iv  || ((prev.ce_iv  + prev.pe_iv)  / 2);
  var avgUp   = avgNow > avgPrev;
  var ivColor = avgUp ? '#f87171' : '#4ade80';

  // Premium decay
  var ceLtpNow   = last.ce_ltp  || 0;
  var peLtpNow   = last.pe_ltp  || 0;
  var ceLtpFirst = first.ce_ltp || 0;
  var peLtpFirst = first.pe_ltp || 0;
  var ceLtpPrev  = prev.ce_ltp  || 0;
  var peLtpPrev  = prev.pe_ltp  || 0;

  var ceFromOpen  = ceLtpNow && ceLtpFirst ? round2(ceLtpNow - ceLtpFirst) : null;
  var peFromOpen  = peLtpNow && peLtpFirst ? round2(peLtpNow - peLtpFirst) : null;
  var ceDecaying  = ceFromOpen !== null ? ceFromOpen < 0 : null;
  var peDecaying  = peFromOpen !== null ? peFromOpen < 0 : null;

  // Decay rate — avg change per reading
  var ceRate = null;
  var peRate = null;
  if (history.length >= 3 && ceLtpFirst && ceLtpNow) {
    ceRate = round2((ceLtpNow - ceLtpFirst) / (history.length - 1));
    peRate = round2((peLtpNow - peLtpFirst) / (history.length - 1));
  }

  var hasPremium = ceLtpNow > 0 && peLtpNow > 0;

  // Last 6 history reversed (newest first)

  // IV chart SVG
  var ceVals  = history.map(function(h) { return h.ce_iv || 0; });
  var peVals  = history.map(function(h) { return h.pe_iv || 0; });
  var allVals = ceVals.concat(peVals);
  var maxVal  = Math.max.apply(null, allVals);
  var minVal  = Math.min.apply(null, allVals);
  var range   = maxVal - minVal || 1;
  var w = 600, h = 80, padL = 36, padR = 10, padT = 8, padB = 20;
  var chartW  = w - padL - padR;
  var chartH  = h - padT - padB;

  function makePoints(vals) {
    return vals.map(function(v, i) {
      var x = padL + (i / Math.max(vals.length - 1, 1)) * chartW;
      var y = padT + chartH - ((v - minVal) / range) * chartH;
      return x + ',' + y;
    }).join(' ');
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  // Decision summary
  function getDecision() {
    if (!hasPremium) return null;
    var lines = [];

    if (ceDecaying && !peDecaying) {
      lines.push({ color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: '#f8717133',
        title: 'CE decaying · PE expanding — spot moving UP',
        body: 'CE LTP down ' + Math.abs(ceFromOpen) + ' from open' + (ceRate ? ' (avg ' + ceRate + '/reading)' : '') + '. ' +
              'PE LTP up ' + Math.abs(peFromOpen) + ' from open' + (peRate ? ' (avg +' + peRate + '/reading)' : '') + '. ' +
              (ceUp ? 'CE IV rising despite decay — IV fighting price move. ' : 'CE IV falling — IV crush adding to CE losses. ') +
              'CE holders: assess exit. PE holders: premium working. Avoid fresh CE buys until spot stabilises.'
      });
    } else if (peDecaying && !ceDecaying) {
      lines.push({ color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: '#4ade8033',
        title: 'PE decaying · CE expanding — spot moving DOWN',
        body: 'PE LTP down ' + Math.abs(peFromOpen) + ' from open' + (peRate ? ' (avg ' + peRate + '/reading)' : '') + '. ' +
              'CE LTP up ' + Math.abs(ceFromOpen) + ' from open' + (ceRate ? ' (avg +' + ceRate + '/reading)' : '') + '. ' +
              (peUp ? 'PE IV rising — market pricing in more downside risk. ' : 'PE IV falling — IV crush adding to PE losses. ') +
              'PE holders: assess exit. CE holders: premium working. Avoid fresh PE buys until spot stabilises.'
      });
    } else if (ceDecaying && peDecaying) {
      lines.push({ color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: '#f59e0b33',
        title: 'Both CE and PE decaying — choppy / time decay dominant',
        body: 'CE down ' + Math.abs(ceFromOpen) + ', PE down ' + Math.abs(peFromOpen) + ' from open. ' +
              'No directional move — theta bleeding both sides. ' +
              'Option buyers on both sides losing. Writers profiting. Avoid fresh directional buys in this environment.'
      });
    } else {
      lines.push({ color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: '#60a5fa33',
        title: 'Both CE and PE expanding — volatility expanding',
        body: 'CE up ' + Math.abs(ceFromOpen) + ', PE up ' + Math.abs(peFromOpen) + ' from open. ' +
              'IV likely rising — options getting expensive. ' +
              'Straddle/strangle holders benefiting. Buyers: be cautious of IV crush after the move. Writers: risk increasing.'
      });
    }

    if (tDays !== null && tDays <= 2) {
      lines.push({ color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: '#f59e0b33',
        title: 'Theta warning — ' + tDays + ' day' + (tDays === 1 ? '' : 's') + ' to expiry',
        body: 'ATM options lose 30–50% of remaining value in last 2 days. ' +
              (ceRate ? 'CE bleeding at ' + ceRate + '/reading. ' : '') +
              (peRate ? 'PE at ' + (peRate > 0 ? '+' : '') + peRate + '/reading. ' : '') +
              'Buyers: only hold if expecting a sharp move. Writers: theta strongly in your favour.'
      });
    }

    if (!ceUp && !peUp) {
      lines.push({ color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: '#4ade8033',
        title: 'IV falling on both sides — options getting cheaper',
        body: 'CE IV ' + last.ce_iv.toFixed(2) + '% (prev ' + prev.ce_iv.toFixed(2) + '%) · PE IV ' + last.pe_iv.toFixed(2) + '% (prev ' + prev.pe_iv.toFixed(2) + '%). ' +
              'Good time to consider buying — premium cheaper. Watch for IV reversal before entry.'
      });
    } else if (ceUp && peUp) {
      lines.push({ color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: '#f8717133',
        title: 'IV rising on both sides — options getting expensive',
        body: 'CE IV ' + last.ce_iv.toFixed(2) + '% (prev ' + prev.ce_iv.toFixed(2) + '%) · PE IV ' + last.pe_iv.toFixed(2) + '% (prev ' + prev.pe_iv.toFixed(2) + '%). ' +
              'Premium expanding — buyers paying more. Risk of IV crush after the move resolves. Writers benefiting from higher premiums.'
      });
    }

    return lines;
  }


  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: ivColor }}>{avgUp ? 'IV Rising ↑' : 'IV Falling ↓'}</span>
          <span style={{ fontSize: 11, color: '#475569' }}>{avgUp ? 'Options getting expensive' : 'Options getting cheaper'}</span>
          <div style={{ display: 'flex', gap: 12 }}>
            <span style={{ fontSize: 11, color: '#f87171', fontWeight: 700 }}>
              CE IV {last.ce_iv.toFixed(2)}% <span style={{ color: ceUp ? '#f87171' : '#4ade80' }}>{ceUp ? '↑' : '↓'}</span>
            </span>
            <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 700 }}>
              PE IV {last.pe_iv.toFixed(2)}% <span style={{ color: peUp ? '#f87171' : '#4ade80' }}>{peUp ? '↑' : '↓'}</span>
            </span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              Avg {avgNow.toFixed(2)}% <span style={{ color: '#475569' }}>prev:{avgPrev.toFixed(2)}</span>
            </span>
          </div>
        </div>
        <span style={{ fontSize: 10, color: '#334155' }}>{history.length} readings · {last.time}</span>
      </div>

      {/* IV Chart */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>IV trend — {symbol} ATM strike</p>
          <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
            <span style={{ color: '#f87171' }}>■ CE IV</span>
            <span style={{ color: '#4ade80' }}>■ PE IV</span>
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
            var x = padL + (origIdx / Math.max(history.length - 1, 1)) * chartW;
            return <text key={i} x={x} y={padT + chartH + 16} fill="#334155" fontSize="8" textAnchor="middle">{d.time}</text>;
          })}
        </svg>
      </div>


      {/* IV Spread + Demand — Full Day Table */}
      {(function() {
        if (history.length < 2) return null;

        var rows = history.slice().reverse(); // newest first

        return (
          <div style={{ padding: '14px 20px', borderTop: '1px solid #1e293b' }}>

            {/* Header */}
            <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: '0 0 12px',
                         textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              IV Spread + Demand — Full Day · every 3 min
            </p>

            {/* Table */}
            <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '7px 12px', color: '#64748b', textAlign: 'left',  fontWeight: 600, whiteSpace: 'nowrap' }}>Time</th>
                    <th style={{ padding: '7px 12px', color: '#94a3b8', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>Price</th>
                    <th style={{ padding: '7px 12px', color: '#94a3b8', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      Spread
                      <span style={{ display: 'block', fontSize: 9, color: '#475569', fontWeight: 400 }}>CE − PE IV</span>
                    </th>
                    <th style={{ padding: '7px 12px', color: '#f87171', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      CE / VIX
                      <span style={{ display: 'block', fontSize: 9, color: '#475569', fontWeight: 400 }}>calls vs fear</span>
                    </th>
                    <th style={{ padding: '7px 12px', color: '#4ade80', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      PE / VIX
                      <span style={{ display: 'block', fontSize: 9, color: '#475569', fontWeight: 400 }}>puts vs fear</span>
                    </th>
                    <th style={{ padding: '7px 12px', color: '#a78bfa', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>VIX</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(function(snap, i) {
                    var prev     = rows[i + 1];
                    var isLatest = i === 0;
                    var opacity  = isLatest ? 1 : Math.max(0.35, 1 - i * 0.025);
                    var vix      = snap.vix || 0;

                    var sp       = snap.spread != null ? snap.spread
                                 : (snap.ce_iv > 0 && snap.pe_iv > 0 ? snap.ce_iv - snap.pe_iv : null);
                    var prevSp   = prev ? (prev.spread != null ? prev.spread
                                 : (prev.ce_iv > 0 && prev.pe_iv > 0 ? prev.ce_iv - prev.pe_iv : null)) : null;
                    var ceR      = snap.ce_vix_ratio || (vix > 0 && snap.ce_iv > 0 ? snap.ce_iv / vix : null);
                    var peR      = snap.pe_vix_ratio || (vix > 0 && snap.pe_iv > 0 ? snap.pe_iv / vix : null);
                    var prevCeR  = prev ? (prev.ce_vix_ratio || (vix > 0 && prev.ce_iv > 0 ? prev.ce_iv / vix : null)) : null;
                    var prevPeR  = prev ? (prev.pe_vix_ratio || (vix > 0 && prev.pe_iv > 0 ? prev.pe_iv / vix : null)) : null;

                    var spDir    = sp != null && prevSp != null ? (sp > prevSp + 0.03 ? '↑' : sp < prevSp - 0.03 ? '↓' : '') : '';
                    var ceDir    = ceR != null && prevCeR != null ? (ceR > prevCeR + 0.005 ? '↑' : ceR < prevCeR - 0.005 ? '↓' : '') : '';
                    var peDir    = peR != null && prevPeR != null ? (peR > prevPeR + 0.005 ? '↑' : peR < prevPeR - 0.005 ? '↓' : '') : '';

                    var spColor  = spDir === '↑' ? '#4ade80' : spDir === '↓' ? '#f87171' : '#64748b';
                    var ceColor  = ceDir === '↑' ? '#4ade80' : ceDir === '↓' ? '#f87171' : '#64748b';
                    var peColor  = peDir === '↑' ? '#f87171' : peDir === '↓' ? '#4ade80' : '#64748b';
                    var priceDir = prev && snap.spot > prev.spot ? '↑' : prev && snap.spot < prev.spot ? '↓' : '';
                    var priceCol = priceDir === '↑' ? '#4ade80' : priceDir === '↓' ? '#f87171' : '#64748b';

                    return (
                      <tr key={i} style={{
                        background:   isLatest ? 'rgba(96,165,250,0.07)' : 'transparent',
                        borderBottom: '1px solid #1e293b22',
                        opacity:      opacity,
                      }}>
                        <td style={{ padding: '6px 12px', color: isLatest ? '#f1f5f9' : '#64748b',
                                     fontWeight: isLatest ? 700 : 400, whiteSpace: 'nowrap' }}>
                          {snap.time}
                          {isLatest && <span style={{ marginLeft: 6, fontSize: 8, color: '#4ade80', fontWeight: 700 }}>LATEST</span>}
                        </td>
                        <td style={{ padding: '6px 12px', textAlign: 'right', color: priceCol, fontWeight: 500, whiteSpace: 'nowrap' }}>
                          {snap.spot > 0 ? snap.spot.toFixed(0) : '—'}
                          {priceDir && <span style={{ fontSize: 9, marginLeft: 2 }}>{priceDir}</span>}
                        </td>
                        <td style={{ padding: '6px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#94a3b8', fontWeight: 500 }}>{sp != null ? sp.toFixed(2) : '—'}</span>
                          {spDir && <span style={{ fontSize: 10, color: spColor, marginLeft: 4, fontWeight: 700 }}>{spDir}</span>}
                        </td>
                        <td style={{ padding: '6px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <span style={{ color: ceR != null && ceR > 1.0 ? '#f87171' : '#64748b',
                                         fontWeight: ceR != null && ceR > 1.0 ? 700 : 400 }}>
                            {ceR != null ? ceR.toFixed(3) : '—'}
                          </span>
                          {ceDir && <span style={{ fontSize: 10, color: ceColor, marginLeft: 4, fontWeight: 700 }}>{ceDir}</span>}
                        </td>
                        <td style={{ padding: '6px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <span style={{ color: peR != null && peR > 1.0 ? '#4ade80' : '#64748b',
                                         fontWeight: peR != null && peR > 1.0 ? 700 : 400 }}>
                            {peR != null ? peR.toFixed(3) : '—'}
                          </span>
                          {peDir && <span style={{ fontSize: 10, color: peColor, marginLeft: 4, fontWeight: 700 }}>{peDir}</span>}
                        </td>
                        <td style={{ padding: '6px 12px', textAlign: 'right', color: '#a78bfa', whiteSpace: 'nowrap' }}>
                          {vix > 0 ? vix.toFixed(2) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Interpretation guide */}
            <div style={{ marginTop: 12, padding: '12px 14px', background: '#1e293b', borderRadius: 8,
                          border: '1px solid #334155' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', margin: '0 0 8px',
                           textTransform: 'uppercase', letterSpacing: '0.05em' }}>How to read this table</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', margin: '0 0 4px' }}>Spread (CE − PE IV)</p>
                  <p style={{ fontSize: 10, color: '#475569', margin: '0 0 2px', lineHeight: 1.5 }}>
                    <span style={{ color: '#4ade80' }}>↑ Rising</span> — CE IV gaining on PE IV. Call side becoming more active relative to puts. Bullish demand building.
                  </p>
                  <p style={{ fontSize: 10, color: '#475569', margin: 0, lineHeight: 1.5 }}>
                    <span style={{ color: '#f87171' }}>↓ Falling</span> — PE IV gaining on CE IV. Put side becoming more active. Bearish demand building.
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', margin: '0 0 4px' }}>CE / VIX and PE / VIX ratios</p>
                  <p style={{ fontSize: 10, color: '#475569', margin: '0 0 2px', lineHeight: 1.5 }}>
                    <span style={{ color: '#f1f5f9', fontWeight: 600 }}>Above 1.0 (bold)</span> — that side is trading above the market fear baseline. Genuine buying pressure, not just VIX noise.
                  </p>
                  <p style={{ fontSize: 10, color: '#475569', margin: '0 0 2px', lineHeight: 1.5 }}>
                    <span style={{ color: '#4ade80' }}>CE/VIX ↑</span> — calls being bought above fear level → bullish. &nbsp;
                    <span style={{ color: '#f87171' }}>PE/VIX ↑</span> — puts being bought above fear level → bearish.
                  </p>
                  <p style={{ fontSize: 10, color: '#475569', margin: 0, lineHeight: 1.5 }}>
                    Both ratios falling → IV crush in progress — premium collapsing, no edge in buying options.
                  </p>
                </div>
              </div>
            </div>

          </div>
        );
      })()}

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
  var volDiff    = totalPEV - totalCEV;
  var coiDiff    = totalPEC - totalCEC;
  var sCol       = sentiment === 'Bullish' ? '#4ade80' : sentiment === 'Bearish' ? '#f87171' : '#f59e0b';
  var volDiffCol = volDiff > 0 ? '#4ade80' : volDiff < 0 ? '#f87171' : '#64748b';
  var coiDiffCol = coiDiff > 0 ? '#4ade80' : coiDiff < 0 ? '#f87171' : '#64748b';
  function fmtOI(n) {
    if (!n && n !== 0) return '—';
    var sign = n < 0 ? '-' : '';
    var abs  = Math.abs(n);
    if (abs >= 100000) return sign + (abs / 100000).toFixed(1) + 'L';
    if (abs >= 1000)   return sign + (abs / 1000).toFixed(1) + 'K';
    return String(n);
  }
  function Section(p) {
    return (
      <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 14px', border: '1px solid #334155', flex: 1, minWidth: 160 }}>
        <p style={{ fontSize: 9, color: '#475569', margin: '0 0 8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.title}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <p style={{ fontSize: 9, color: '#f87171', margin: '0 0 2px', fontWeight: 600 }}>CE</p>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#f87171' }}>{fmtOI(p.ce)}</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 9, color: '#475569', margin: '0 0 2px', fontWeight: 600 }}>DIFF (PE−CE)</p>
            <span style={{ fontSize: 13, fontWeight: 800, color: p.diffCol }}>{p.diff > 0 ? '+' : ''}{fmtOI(p.diff)}</span>
            <p style={{ fontSize: 9, margin: '2px 0 0', color: p.diffCol, fontWeight: 600 }}>{p.diff > 0 ? '↑ PE Dom' : p.diff < 0 ? '↓ CE Dom' : 'Balanced'}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 9, color: '#4ade80', margin: '0 0 2px', fontWeight: 600 }}>PE</p>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#4ade80' }}>{fmtOI(p.pe)}</span>
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
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 9, color: '#475569', margin: '0 0 2px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PCR (OI)</p>
          <span style={{ fontSize: 22, fontWeight: 800, color: sCol }}>{pcr}</span>
        </div>
        <div style={{ padding: '4px 12px', borderRadius: 20, background: sCol + '20', border: '1px solid ' + sCol + '44' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: sCol }}>{sentiment}</span>
        </div>
        <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>
          {sentiment === 'Bullish' ? 'More PE OI — put writers building support below spot' : sentiment === 'Bearish' ? 'More CE OI — call writers building resistance above spot' : 'Balanced OI — no strong directional bias'}
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

function FiveStrikeTable(props) {
  var rows            = props.rows            || [];
  var sentiment       = props.sentiment       || 'Neutral';
  var ceCOI           = props.ceCOI           || 0;
  var peCOI           = props.peCOI           || 0;
  var history         = props.history         || [];
  var strikeHistory   = props.strikeHistory   || [];
  var reversedHistory = strikeHistory.slice().reverse();

  // CE/PE COI trend — 9-min lookback: avg of last 3 snapshots vs avg of prev 3
  function getCOITrend(strike, side) {
    if (strikeHistory.length < 2) return null;
    var recent = strikeHistory.slice(-3);
    var prev3  = strikeHistory.length >= 6 ? strikeHistory.slice(-6, -3) : strikeHistory.slice(0, Math.max(1, strikeHistory.length - 3));
    if (prev3.length === 0) return null;

    function avgCOI(snaps) {
      var vals = snaps.map(function(s) {
        var e = s.strikes ? s.strikes[String(strike)] : null;
        if (!e || typeof e !== 'object') return null;
        return side === 'ce' ? (e.ce_coi || 0) : (e.pe_coi || 0);
      }).filter(function(v) { return v !== null; });
      return vals.length > 0 ? vals.reduce(function(a, b) { return a + b; }, 0) / vals.length : null;
    }

    var recentAvg = avgCOI(recent);
    var prevAvg   = avgCOI(prev3);
    if (recentAvg === null || prevAvg === null) return null;

    if (recentAvg > prevAvg + 2000) return 'up';
    if (recentAvg < prevAvg - 2000) return 'down';
    return 'flat';
  }
  var color = sentimentColor(sentiment);

  function fmt(n) {
    if (!n && n !== 0) return '—';
    var sign = n < 0 ? '-' : '+';
    var abs  = Math.abs(n);
    if (abs >= 100000) return sign + (abs / 100000).toFixed(1) + 'L';
    if (abs >= 1000)   return sign + (abs / 1000).toFixed(0) + 'K';
    return (n > 0 ? '+' : '') + n;
  }

  function fmtDiff(n) {
    if (!n && n !== 0) return '—';
    var abs  = Math.abs(n);
    var sign = n > 0 ? '+' : '';
    if (abs >= 100000) return sign + (n / 100000).toFixed(1) + 'L';
    if (abs >= 1000)   return sign + (n / 1000).toFixed(0) + 'K';
    return (n > 0 ? '+' : '') + n;
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


  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e293b' }}>

        {/* Title + current PCR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ATM ± 5 Strikes — COI PCR · Vol Bias
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: sentimentBg(sentiment), color: color, border: '1px solid ' + color + '44' }}>{sentiment}</span>
          </div>
        </div>

        {/* CE / PE COI summary boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div style={{ background: 'rgba(248,113,113,0.1)', borderRadius: 8, padding: '8px 12px' }}>
            <p style={{ fontSize: 10, color: '#f87171', margin: '0 0 2px', fontWeight: 700 }}>Total CE COI (11 strikes)</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#f87171', margin: 0 }}>{fmt(totalCE)}</p>
          </div>
          <div style={{ background: 'rgba(74,222,128,0.1)', borderRadius: 8, padding: '8px 12px' }}>
            <p style={{ fontSize: 10, color: '#4ade80', margin: '0 0 2px', fontWeight: 700 }}>Total PE COI (11 strikes)</p>
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

      </div>

      {/* Strike table — CE OI | CE COI | CE Trend | Strike | PE Trend | PE OI | PE COI | Vol Bias | Historical OI PCR + vol diff */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#1e293b' }}>
              <th style={{ padding: '8px 10px', color: '#f87171', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                CE OI
                <span style={{ display: 'block', fontSize: 9, color: '#475569', fontWeight: 400 }}>Calls</span>
              </th>
              <th style={{ padding: '8px 10px', color: '#f87171', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                CE COI
                <span style={{ display: 'block', fontSize: 9, color: '#475569', fontWeight: 400 }}>Chg OI</span>
              </th>
              <th style={{ padding: '8px 8px', color: '#f87171', textAlign: 'center', fontWeight: 600, whiteSpace: 'nowrap' }}>
                CE ↕
                <span style={{ display: 'block', fontSize: 9, color: '#475569', fontWeight: 400 }}>Trend</span>
              </th>
              <th style={{ padding: '8px 14px', color: '#f1f5f9', textAlign: 'center', fontWeight: 700, whiteSpace: 'nowrap' }}>Strike</th>
              <th style={{ padding: '8px 8px', color: '#4ade80', textAlign: 'center', fontWeight: 600, whiteSpace: 'nowrap' }}>
                PE ↕
                <span style={{ display: 'block', fontSize: 9, color: '#475569', fontWeight: 400 }}>Trend</span>
              </th>
              <th style={{ padding: '8px 10px', color: '#4ade80', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>
                PE OI
                <span style={{ display: 'block', fontSize: 9, color: '#475569', fontWeight: 400 }}>Puts</span>
              </th>
              <th style={{ padding: '8px 10px', color: '#4ade80', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>
                PE COI
                <span style={{ display: 'block', fontSize: 9, color: '#475569', fontWeight: 400 }}>Chg OI</span>
              </th>
              <th style={{ padding: '8px 12px', color: '#94a3b8', textAlign: 'center', fontWeight: 600, whiteSpace: 'nowrap', borderLeft: '1px solid #1e293b' }}>
                Vol Bias
                <span style={{ display: 'block', fontSize: 9, color: '#475569', fontWeight: 400 }}>PE−CE Vol</span>
              </th>
              {reversedHistory.map(function(snap, i) {
                return (
                  <th key={i} style={{ padding: '6px 8px', color: '#475569', textAlign: 'center',
                                       fontWeight: 600, fontSize: 9, whiteSpace: 'nowrap',
                                       borderLeft: '1px solid #1e293b' }}>
                    {snap.time}
                    <span style={{ display: 'block', fontSize: 8, color: '#334155', fontWeight: 400 }}>PCR·ΔVol</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map(function(row) {
              var isATM  = row.is_atm;
              var rowBg  = isATM ? 'rgba(96,165,250,0.1)' : 'transparent';

              var volDiff  = (row.pe_vol || 0) - (row.ce_vol || 0);
              var volTotal = (row.pe_vol || 0) + (row.ce_vol || 0);
              var domPct   = volTotal > 0 ? Math.round((Math.abs(volDiff) / volTotal) * 100) : 0;
              var isBal    = volTotal === 0 || domPct < 10;
              var isPEDom  = volDiff > 0;
              var volCol   = isBal ? '#64748b' : isPEDom ? '#4ade80' : '#f87171';
              var volLabel = isBal ? 'Balanced' : isPEDom ? 'PE Dom' : 'CE Dom';

              var ceTrend  = getCOITrend(row.strike, 'ce');
              var peTrend  = getCOITrend(row.strike, 'pe');
              // CE COI up = more call writing = bearish (red arrow) · down = unwind = bullish (green)
              // PE COI up = more put writing = bullish (green arrow) · down = unwind = bearish (red)
              var ceTrendCol = ceTrend === 'up' ? '#f87171' : ceTrend === 'down' ? '#4ade80' : '#475569';
              var peTrendCol = peTrend === 'up' ? '#4ade80' : peTrend === 'down' ? '#f87171' : '#475569';
              var ceTrendArrow = ceTrend === 'up' ? '↑' : ceTrend === 'down' ? '↓' : '→';
              var peTrendArrow = peTrend === 'up' ? '↑' : peTrend === 'down' ? '↓' : '→';

              return (
                <tr key={row.strike} style={{ background: rowBg, borderBottom: '1px solid #1e293b22' }}>

                  {/* CE OI */}
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#f87171', fontWeight: 600 }}>
                    {(function() { var n = row.ce_oi || 0; if (n >= 100000) return (n/100000).toFixed(1)+'L'; if (n >= 1000) return (n/1000).toFixed(0)+'K'; return n; })()}
                  </td>

                  {/* CE COI */}
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600,
                               color: (row.ce_chg_oi || 0) > 0 ? '#f87171' : (row.ce_chg_oi || 0) < 0 ? '#4ade80' : '#64748b' }}>
                    {fmt(row.ce_chg_oi || 0)}
                  </td>

                  {/* CE COI Trend */}
                  <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: ceTrendCol }}>{ceTrendArrow}</span>
                  </td>

                  {/* Strike */}
                  <td style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 700,
                               fontSize: 13, color: isATM ? '#60a5fa' : '#f1f5f9', whiteSpace: 'nowrap' }}>
                    {row.strike}
                    {isATM && <span style={{ display: 'block', fontSize: 9, color: '#60a5fa', fontWeight: 600 }}>ATM</span>}
                  </td>

                  {/* PE COI Trend */}
                  <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: peTrendCol }}>{peTrendArrow}</span>
                  </td>

                  {/* PE OI */}
                  <td style={{ padding: '8px 10px', textAlign: 'left', color: '#4ade80', fontWeight: 600 }}>
                    {(function() { var n = row.pe_oi || 0; if (n >= 100000) return (n/100000).toFixed(1)+'L'; if (n >= 1000) return (n/1000).toFixed(0)+'K'; return n; })()}
                  </td>

                  {/* PE COI */}
                  <td style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600,
                               color: (row.pe_chg_oi || 0) > 0 ? '#4ade80' : (row.pe_chg_oi || 0) < 0 ? '#f87171' : '#64748b' }}>
                    {fmt(row.pe_chg_oi || 0)}
                  </td>

                  {/* Vol Bias — current */}
                  <td style={{ padding: '8px 12px', textAlign: 'center', borderLeft: '1px solid #1e293b' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: volCol }}>
                      {isBal ? '—' : fmtDiff(volDiff)}
                    </span>
                    <span style={{ display: 'block', fontSize: 9, fontWeight: 600, color: volCol, marginTop: 1 }}>
                      {volLabel}
                    </span>
                  </td>


                  {/* Historical snapshots — each shows COI PCR + vol diff */}
                  {reversedHistory.map(function(snap, i) {
                    var entry   = snap.strikes ? snap.strikes[String(row.strike)] : null;
                    var pcr_h   = entry && typeof entry === 'object' ? entry.pcr_oi   : (typeof entry === 'number' ? entry : null);
                    var vdiff_h = entry && typeof entry === 'object' ? entry.vol_diff : null;
                    var col     = pcr_h != null ? pcrColor(pcr_h) : '#334155';

                    var vdAbs   = vdiff_h != null ? Math.abs(vdiff_h) : 0;
                    var vdFmt   = vdiff_h == null ? '—'
                                : vdAbs >= 100000 ? (vdiff_h > 0 ? '+' : '') + (vdiff_h / 100000).toFixed(1) + 'L'
                                : vdAbs >= 1000   ? (vdiff_h > 0 ? '+' : '') + (vdiff_h / 1000).toFixed(0) + 'K'
                                : (vdiff_h > 0 ? '+' : '') + vdiff_h;
                    var vdCol   = vdiff_h == null ? '#334155' : vdiff_h > 0 ? '#4ade80' : vdiff_h < 0 ? '#f87171' : '#64748b';

                    return (
                      <td key={i} style={{ padding: '8px 8px', textAlign: 'center',
                                           borderLeft: '1px solid #1e293b', minWidth: 64 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: col }}>
                          {pcr_h != null ? pcr_h.toFixed(2) : '—'}
                        </span>
                        <span style={{ display: 'block', fontSize: 9, color: vdCol, marginTop: 1 }}>
                          {vdFmt}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals row */}
      {(function() {
        var totalCEOI  = rows.reduce(function(s, r) { return s + (r.ce_oi  || 0); }, 0);
        var totalPEOI  = rows.reduce(function(s, r) { return s + (r.pe_oi  || 0); }, 0);
        var totalCECOI = rows.reduce(function(s, r) { return s + (r.ce_chg_oi || 0); }, 0);
        var totalPECOI = rows.reduce(function(s, r) { return s + (r.pe_chg_oi || 0); }, 0);

        function fmtAbs(n) {
          var abs = Math.abs(n);
          if (abs >= 100000) return (abs / 100000).toFixed(1) + 'L';
          if (abs >= 1000)   return (abs / 1000).toFixed(0) + 'K';
          return abs;
        }
        function fmtSigned(n) {
          var sign = n < 0 ? '-' : '+';
          var abs  = Math.abs(n);
          if (abs >= 100000) return sign + (abs / 100000).toFixed(1) + 'L';
          if (abs >= 1000)   return sign + (abs / 1000).toFixed(0) + 'K';
          return sign + abs;
        }

        return (
          <div style={{ padding: '10px 16px', borderTop: '1px solid #334155',
                        background: '#1e293b', display: 'flex', gap: 0, alignItems: 'stretch' }}>
            <div style={{ flex: 1, textAlign: 'right', paddingRight: 14 }}>
              <p style={{ fontSize: 9, color: '#f87171', fontWeight: 700, margin: '0 0 2px', textTransform: 'uppercase' }}>Total CE OI</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#f87171', margin: 0 }}>{fmtAbs(totalCEOI)}</p>
            </div>
            <div style={{ width: 1, background: '#334155', margin: '0 4px' }} />
            <div style={{ flex: 1, textAlign: 'right', paddingRight: 14 }}>
              <p style={{ fontSize: 9, color: '#f87171', fontWeight: 700, margin: '0 0 2px', textTransform: 'uppercase' }}>Total CE COI</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: totalCECOI >= 0 ? '#f87171' : '#4ade80', margin: 0 }}>{fmtSigned(totalCECOI)}</p>
            </div>
            <div style={{ width: 1, background: '#334155', margin: '0 4px' }} />
            <div style={{ flex: 1, textAlign: 'center', padding: '0 8px' }}>
              <p style={{ fontSize: 9, color: '#64748b', fontWeight: 700, margin: '0 0 2px', textTransform: 'uppercase' }}>ATM ± 5</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#475569', margin: 0 }}>11 strikes</p>
            </div>
            <div style={{ width: 1, background: '#334155', margin: '0 4px' }} />
            <div style={{ flex: 1, textAlign: 'left', paddingLeft: 14 }}>
              <p style={{ fontSize: 9, color: '#4ade80', fontWeight: 700, margin: '0 0 2px', textTransform: 'uppercase' }}>Total PE COI</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: totalPECOI >= 0 ? '#4ade80' : '#f87171', margin: 0 }}>{fmtSigned(totalPECOI)}</p>
            </div>
            <div style={{ width: 1, background: '#334155', margin: '0 4px' }} />
            <div style={{ flex: 1, textAlign: 'left', paddingLeft: 14 }}>
              <p style={{ fontSize: 9, color: '#4ade80', fontWeight: 700, margin: '0 0 2px', textTransform: 'uppercase' }}>Total PE OI</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#4ade80', margin: 0 }}>{fmtAbs(totalPEOI)}</p>
            </div>
          </div>
        );
      })()}

      <div style={{ padding: '8px 16px', borderTop: '1px solid #1e293b', fontSize: 10, color: '#334155' }}>
        Vol Bias: PE Dom = put side more active · CE Dom = call side more active · Each historical column shows OI PCR = PE OI/CE OI (top) + Vol Diff PE−CE (bottom)
      </div>
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

// ─── OTM Positioning Intelligence ───────────────────────────────────────────


// ─── Nifty/BankNifty Candlestick + COI PCR Histogram ─────────────────────────
// history = intraday_history (newest first) from /api/futures-dashboard
// Each snap: {time, open, high, low, close, price, vwap, pcr_coi, pcr, diff}
// Top panel:    candlestick chart + VWAP line
// Bottom panel: COI PCR as histogram (green above 1.0, red below)
function PCRChart(props) {
  var candles    = props.candles    || [];  // [{time,open,high,low,close}] from NSE/yfinance
  var pcrHistory = props.pcrHistory || [];  // [{time,pcr_coi,pcr}] from pcr_intraday_3m
  var dashHist   = props.dashHist   || [];  // [{time,vwap,fut_vol}] from intraday_history (optional)
  var symbol     = props.symbol     || 'NIFTY';

  var [hover, setHover] = React.useState(null);
  var svgRef = React.useRef(null);

  // Merge candles with PCR data by time key
  // candles = chronological OHLC from NSE/yf  e.g. time="0915" or "09:15"
  // pcrHistory = newest-first intraday snapshots time="0915"
  var snaps = React.useMemo(function() {
    // Normalise time to HHMM 4-digit string, stripping colons
    function normTime(t) {
      var s = String(t || '').replace(':', '');
      return s.padStart(4, '0');
    }
    // Also build a minutes-since-midnight lookup for fuzzy matching
    function toMins(t) {
      var s = normTime(t);
      return parseInt(s.slice(0,2), 10) * 60 + parseInt(s.slice(2), 10);
    }

    var pcrByTime = {};
    var pcrByMins = {};
    // Primary: pcr_intraday_3m has pcr_coi per snapshot
    pcrHistory.slice().reverse().forEach(function(s) {
      var t = normTime(s.time);
      var m = toMins(t);
      pcrByTime[t] = s;
      pcrByMins[m] = s;
    });
    // Secondary: dashHist for vwap + fut_vol
    var dashByTime = {}, dashByMins = {};
    dashHist.slice().reverse().forEach(function(s) {
      var t = normTime(s.time);
      var m = toMins(t);
      dashByTime[t] = s;
      dashByMins[m] = s;
    });

    // Debug: log first few times from each source
    if (candles.length > 0 && pcrHistory.length > 0) {
      var cSample = candles.slice(0,3).map(function(c){ return normTime(c.time); });
      var pSample = pcrHistory.slice(-3).map(function(s){ return normTime(s.time); });
      console.log('[PCRChart] candle times:', cSample, 'pcr times:', pSample);
    }

    if (candles.length >= 3) {
      return candles.filter(function(c) { return c.close > 0; }).map(function(c) {
        var t   = normTime(c.time);
        var m   = toMins(t);
        // Exact match first, then ±3 min fuzzy match
        var pcr  = pcrByTime[t]  || pcrByMins[m]  || pcrByMins[m+1]  || pcrByMins[m-1]
                               || pcrByMins[m+2]  || pcrByMins[m-2]
                               || pcrByMins[m+3]  || pcrByMins[m-3]  || {};
        var dash = dashByTime[t] || dashByMins[m] || dashByMins[m+1] || dashByMins[m-1]
                                 || dashByMins[m+2] || dashByMins[m-2]
                                 || dashByMins[m+3] || dashByMins[m-3] || {};
        return Object.assign({}, c, {
          pcr_coi:  pcr.pcr_coi  || 0,
          pcr:      pcr.pcr      || 0,
          vwap:     dash.vwap    || pcr.vwap  || c.vwap || 0,
          price:    c.close,
          call_vol: pcr.call_vol || 0,
          put_vol:  pcr.put_vol  || 0,
          diff:     pcr.diff     || 0,
          fut_vol:  dash.fut_vol || 0,
        });
      });
    }

    // Fallback: use pcrHistory even without price data
    // pcr_intraday_3m has no price field — use 0, chart will hide candle panel
    var pcrSnaps = pcrHistory.slice().reverse();
    if (pcrSnaps.length > 0) return pcrSnaps;

    // Last resort: try dashHist
    return dashHist.slice().reverse().filter(function(s) {
      return s.price > 0 || s.close > 0;
    });
  }, [candles, pcrHistory, dashHist]);

  var n = snaps.length;

  // ── Determine if we have real price data ──────────────────────────────────
  var _allH = snaps.map(function(s){ return s.high || s.close || s.price || 0; }).filter(Boolean);
  var _allL = snaps.map(function(s){ return s.low  || s.close || s.price || 0; }).filter(Boolean);
  var hasPriceData = _allH.length >= 3 && Math.max.apply(null, _allH) !== Math.min.apply(null, _allL);

  // ── Layout ────────────────────────────────────────────────────────────────
  var W    = 880;
  var Hc   = hasPriceData ? 240 : 0;   // hide candle panel if no price
  var Hh   = hasPriceData ? 80 : 220;  // expand PCR panel when no candles
  var Hv   = hasPriceData ? 70 : 0;    // hide volume panel if no price
  var Hgap = 10;           // gap between panels
  var padL = 12, padR = 68, padT = 18, padB = 32;
  var cW   = W - padL - padR;
  // Candle panel
  var cTop = padT;
  var cBot = padT + Hc;
  // COI PCR histogram panel
  var hTop = cBot + Hgap;
  var hBot = hTop + Hh;
  // Volume panel
  var vTop = hBot + Hgap;
  var vBot = vTop + Hv;
  // Total SVG height
  var svgH = vBot + padB;

  // ── Candle data ───────────────────────────────────────────────────────────
  function close(s) { return s.close || s.price || 0; }
  function open_(s) { return s.open  || close(s); }
  function high(s)  { return s.high  || close(s); }
  function low(s)   { return s.low   || close(s); }

  var allHigh = snaps.map(high).filter(Boolean);
  var allLow  = snaps.map(low).filter(Boolean);
  var pMax    = allHigh.length ? Math.max.apply(null, allHigh) : 0;
  var pMin    = allLow.length  ? Math.min.apply(null, allLow)  : 0;
  var pPad    = (pMax - pMin) * 0.1 || 10;
  pMax += pPad; pMin -= pPad;
  var pRange  = pMax - pMin || 1;

  function xOf(i)  { return padL + (i / Math.max(n - 1, 1)) * cW; }
  function pY(v)   { return cBot - ((v - pMin) / pRange) * (cBot - cTop); }

  // Candle bar width
  var barW = Math.max(4, Math.min(14, cW / Math.max(n, 1) * 0.75));

  // ── Futures volume series ─────────────────────────────────────────────────
  var futVols = snaps.map(function(s) { return s.fut_vol || 0; });
  var maxVol  = Math.max.apply(null, futVols.filter(Boolean)) || 1;
  function vY(v) { return vBot - (v / maxVol) * Hv; }

  // ── VWAP line ─────────────────────────────────────────────────────────────
  var vwapPoints = snaps.map(function(s, i) {
    var v = s.vwap || 0;
    return v > 0 ? (xOf(i).toFixed(1) + ',' + pY(v).toFixed(1)) : null;
  }).filter(Boolean).join(' ');

  // ── COI PCR histogram ─────────────────────────────────────────────────────
  var coiVals   = snaps.map(function(s) { return s.pcr_coi || 0; });
  // Hard cap at 3.0 — early session spikes (CE COI near zero) cause 4+ readings
  // which compress the rest of the chart. Cap display at 3.0, clip in hY().
  var COI_DISPLAY_MAX = 3.0;
  var validCOI = coiVals.filter(function(v) { return v > 0 && v <= COI_DISPLAY_MAX; });
  var hRef     = 1.0;

  var hMin = 0, hMax = 0;
  if (validCOI.length >= 4) {
    var sorted  = validCOI.slice().sort(function(a,b){ return a-b; });
    var median  = sorted[Math.floor(sorted.length * 0.5)];
    var spread  = Math.max(0.3, sorted[Math.floor(sorted.length * 0.9)] - sorted[Math.floor(sorted.length * 0.1)]);
    hMin = Math.max(0, Math.min(hRef - 0.2, median - spread * 0.8));
    hMax = Math.min(COI_DISPLAY_MAX, Math.max(hRef + 0.3, median + spread * 1.2));
  } else {
    hMin = 0.5; hMax = 2.5;
  }
  // Always show 0.8 and 1.2 reference levels
  hMin = Math.min(hMin, 0.7);
  hMax = Math.max(hMax, 1.4);
  var hRange = hMax - hMin || 1;
  function hRefY() { return hBot - ((hRef - hMin) / hRange) * Hh; }
  function hY(v)   {
    var clipped = Math.max(hMin, Math.min(hMax, v));
    return hBot - ((clipped - hMin) / hRange) * Hh;
  }

  // ── Price Y-axis nice ticks ───────────────────────────────────────────────
  function niceTicks(lo, hi, count) {
    var r   = hi - lo || 1;
    var raw = r / count;
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var stp = Math.ceil(raw / mag) * mag;
    var st  = Math.ceil(lo / stp) * stp;
    var out = [];
    for (var v = st; v <= hi + stp * 0.01; v = Math.round((v + stp) * 1000) / 1000) {
      out.push(v);
      if (out.length > 10) break;
    }
    return out;
  }
  var pTicks = niceTicks(pMin, pMax, 6);

  // COI PCR right-axis ticks
  var cTicks = niceTicks(hMin, hMax, 5);

  // ── Time labels ───────────────────────────────────────────────────────────
  var timeSeries = snaps.map(function(s) {
    var t = String(s.time || '').padStart(4, '0');
    return t.length === 4 ? t.slice(0,2) + ':' + t.slice(2) : String(s.time || '');
  });
  var xLabels = [];
  if (n > 0) {
    var every = Math.max(1, Math.floor(n / 8));
    for (var ti = 0; ti < n; ti += every) xLabels.push({ i: ti, t: timeSeries[ti] });
    if (!xLabels.length || xLabels[xLabels.length-1].i !== n-1)
      xLabels.push({ i: n-1, t: timeSeries[n-1] });
  }

  // ── Last values ───────────────────────────────────────────────────────────
  var lastSnap  = snaps[n-1] || {};
  var lastClose = close(lastSnap);
  var firstClose= close(snaps[0] || {});
  var sessionUp = lastClose >= firstClose;
  var lastCOI   = lastSnap.pcr_coi || 0;
  var lastVwap  = lastSnap.vwap    || 0;
  var coiColor  = lastCOI > 1.2 ? '#22c55e' : lastCOI < 0.8 ? '#ef4444' : '#94a3b8';

  // ── Mouse ─────────────────────────────────────────────────────────────────
  function onMouseMove(e) {
    if (!svgRef.current || n < 2) return;
    var rect  = svgRef.current.getBoundingClientRect();
    var scaleX = W / rect.width;
    var mx    = (e.clientX - rect.left) * scaleX;
    var relX  = mx - padL;
    if (relX < 0 || relX > cW) { setHover(null); return; }
    var idx = Math.round((relX / cW) * (n - 1));
    idx = Math.max(0, Math.min(n - 1, idx));
    setHover({ idx: idx, x: xOf(idx) });
  }

  var hSnap = hover !== null ? (snaps[hover.idx] || {}) : null;
  var hC     = hSnap ? close(hSnap) : 0;
  var hCOI   = hSnap ? (hSnap.pcr_coi || 0) : 0;
  var hVwap  = hSnap ? (hSnap.vwap    || 0) : 0;
  var hFutV  = hSnap ? (hSnap.fut_vol  || 0) : 0;
  var hTime = hover !== null ? (timeSeries[hover.idx] || '') : '';
  var hX    = hover ? hover.x : 0;
  // Tooltip
  var ttW = 160, ttH = 70;
  var ttX = hX + 14;
  var ttY = cTop + 8;
  if (ttX + ttW > W - padR - 4) ttX = hX - ttW - 14;

  if (n < 1) {
    return (
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12,
                    padding: '32px', textAlign: 'center', color: '#475569', fontSize: 13 }}>
        <p style={{ margin: '0 0 6px', fontSize: 15, color: '#64748b' }}>Collecting data…</p>
        <p style={{ margin: 0, fontSize: 11, color: '#334155' }}>Chart available after ~10 minutes of market open</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#0d1117', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #1e293b',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
            {symbol} · COI Put-Call Ratio
          </p>
          <p style={{ fontSize: 10, color: '#475569', margin: '2px 0 0' }}>
            {hasPriceData
              ? 'Candlestick · VWAP · COI PCR histogram · 3-min snapshots'
              : 'COI PCR histogram · price chart loads from NSE · 3-min snapshots'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          {/* Legend */}
          {[
            { col: '#22c55e', w: 10, h: 10, label: 'Bullish candle' },
            { col: '#ef4444', w: 10, h: 10, label: 'Bearish candle' },
            { col: '#0ea5e9', dash: true, label: 'VWAP' },
            { col: '#22c55e', w: 10, h: 6,  label: 'Fut Vol ↑' },
            { col: '#ef4444', w: 10, h: 6,  label: 'Fut Vol ↓' },
          ].map(function(l, i) {
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {l.dash
                  ? <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke={l.col} strokeWidth="1.5" strokeDasharray="4,3"/></svg>
                  : <div style={{ width: l.w, height: l.h, background: l.col, borderRadius: 2 }} />
                }
                <span style={{ fontSize: 10, color: '#64748b' }}>{l.label}</span>
              </div>
            );
          })}
          <div style={{ width: 1, height: 24, background: '#1e293b' }} />
          {lastClose > 0 && (
            <div>
              <p style={{ fontSize: 9, color: '#475569', margin: '0 0 1px', textTransform: 'uppercase', fontWeight: 600 }}>LTP</p>
              <span style={{ fontSize: 14, fontWeight: 800, color: sessionUp ? '#22c55e' : '#ef4444' }}>
                {lastClose.toLocaleString()}
              </span>
            </div>
          )}
          {lastCOI > 0 && (
            <div>
              <p style={{ fontSize: 9, color: '#475569', margin: '0 0 1px', textTransform: 'uppercase', fontWeight: 600 }}>COI PCR</p>
              <span style={{ fontSize: 14, fontWeight: 800, color: coiColor }}>{lastCOI.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── SVG ── */}
      <div style={{ overflowX: 'auto' }}>
        <svg
          ref={svgRef}
          width="100%"
          viewBox={'0 0 ' + W + ' ' + svgH}
          style={{ display: 'block', minWidth: 480, cursor: 'crosshair' }}
          onMouseMove={onMouseMove}
          onMouseLeave={function() { setHover(null); }}
        >
          <defs>
            <clipPath id="candleClip">
              <rect x={padL} y={cTop} width={cW} height={Hc} />
            </clipPath>
            <clipPath id="histClip">
              <rect x={padL} y={hTop} width={cW} height={Hh} />
            </clipPath>
            <clipPath id="volClip">
              <rect x={padL} y={vTop} width={cW} height={Hv} />
            </clipPath>
          </defs>

          {/* ── Candle panel — only when price data available ── */}
          {hasPriceData && <rect x={padL} y={cTop} width={cW} height={Hc} fill="#0d1117" />}

          {/* Price grid lines + candles + VWAP — only when price data available */}
          {hasPriceData && pTicks.map(function(v, i) {
            var y = pY(v);
            if (y < cTop || y > cBot) return null;
            return (
              <g key={i}>
                <line x1={padL} y1={y} x2={padL+cW} y2={y}
                      stroke="#1e293b" strokeWidth="1" />
                <text x={padL+cW+6} y={y+4} fill="#475569" fontSize="10"
                      textAnchor="start" fontFamily="monospace">
                  {v >= 10000 ? Math.round(v).toLocaleString() : v.toFixed(0)}
                </text>
              </g>
            );
          })}

          {hasPriceData && vwapPoints && (
            <polyline points={vwapPoints} fill="none" stroke="#0ea5e9"
                      strokeWidth="1.5" strokeDasharray="5,3" opacity="0.8"
                      clipPath="url(#candleClip)" />
          )}

          {/* Candlesticks */}
          {snaps.map(function(s, i) {
            var o = open_(s), c = close(s), h_ = high(s), l_ = low(s);
            if (!c) return null;
            var isUp    = c >= o;
            var col     = isUp ? '#22c55e' : '#ef4444';
            var bodyTop = pY(Math.max(o, c));
            var bodyBot = pY(Math.min(o, c));
            var bodyH   = Math.max(3, bodyBot - bodyTop);
            var wickTop = pY(h_);
            var wickBot = pY(l_);
            var x       = xOf(i);
            return (
              <g key={i} clipPath="url(#candleClip)">
                <line x1={x} y1={wickTop} x2={x} y2={wickBot}
                      stroke={col} strokeWidth="1" opacity="0.9" />
                <rect x={x - barW/2} y={bodyTop} width={barW} height={bodyH}
                      fill={isUp ? col : col} stroke={col}
                      strokeWidth={bodyH < 2 ? 0 : 0.5}
                      opacity={hover && hover.idx === i ? 1 : 0.9}
                      rx="0.5" />
              </g>
            );
          })}

          {/* Current price label on right axis */}
          {lastClose > 0 && (function() {
            var y   = pY(lastClose);
            var col = sessionUp ? '#22c55e' : '#ef4444';
            if (y < cTop || y > cBot) return null;
            return (
              <g>
                <line x1={padL} y1={y} x2={padL+cW} y2={y}
                      stroke={col} strokeWidth="0.5" strokeDasharray="3,3" opacity="0.5" />
                <rect x={padL+cW+2} y={y-9} width={padR-4} height={18}
                      fill={col} rx="3" />
                <text x={padL+cW+6} y={y+4} fill="#fff" fontSize="10"
                      fontFamily="monospace" fontWeight="700">
                  {Math.round(lastClose).toLocaleString()}
                </text>
              </g>
            );
          })()}

          {/* ── Histogram panel background ── */}
          <rect x={padL} y={hTop} width={cW} height={Hh} fill="#080c12" />

          {/* Histogram zero line */}
          <line x1={padL} y1={hRefY()} x2={padL+cW} y2={hRefY()}
                stroke="#334155" strokeWidth="1" />
          <text x={padL+cW+6} y={hRefY()+4} fill="#475569" fontSize="9"
                fontFamily="monospace">1.0</text>

          {/* COI PCR line */}
          {(function() {
            var pts = snaps.map(function(s, i) {
              var v = s.pcr_coi || 0;
              return v > 0 ? (xOf(i).toFixed(1) + ',' + hY(v).toFixed(1)) : null;
            }).filter(Boolean).join(' ');
            if (!pts) return null;
            var lastV   = snaps.map(function(s){ return s.pcr_coi||0; }).filter(Boolean);
            var lastVal = lastV[lastV.length-1] || 0;
            var lineCol = lastVal > 1.2 ? '#22c55e' : lastVal < 0.8 ? '#ef4444' : '#f59e0b';
            // Fill under the line from the 1.0 reference
            var fillPts = snaps.map(function(s, i) {
              var v = s.pcr_coi || 0;
              return v > 0 ? (xOf(i).toFixed(1) + ',' + hY(v).toFixed(1)) : null;
            }).filter(Boolean);
            var firstX = fillPts.length ? fillPts[0].split(',')[0] : padL;
            var lastX  = fillPts.length ? fillPts[fillPts.length-1].split(',')[0] : padL+cW;
            var refY   = hRefY().toFixed(1);
            var fillD  = pts + ' ' + lastX + ',' + refY + ' ' + firstX + ',' + refY;
            return (
              <g clipPath="url(#histClip)">
                <polygon points={fillD} fill={lineCol} opacity="0.1" />
                <polyline points={pts} fill="none" stroke={lineCol}
                          strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                {/* Last value dot */}
                {(function() {
                  var lastIdx = snaps.length - 1;
                  while (lastIdx >= 0 && !snaps[lastIdx].pcr_coi) lastIdx--;
                  if (lastIdx < 0) return null;
                  return <circle cx={xOf(lastIdx)} cy={hY(snaps[lastIdx].pcr_coi)} r="3.5" fill={lineCol} />;
                })()}
                {/* Hover dot */}
                {hover !== null && snaps[hover.idx] && snaps[hover.idx].pcr_coi > 0 && (
                  <circle cx={xOf(hover.idx)} cy={hY(snaps[hover.idx].pcr_coi)}
                          r="4" fill="#fff" stroke={lineCol} strokeWidth="2" />
                )}
              </g>
            );
          })()}

          {/* COI PCR right-axis ticks */}
          {cTicks.map(function(v, i) {
            var y = hY(v);
            if (y < hTop || y > hBot) return null;
            return (
              <text key={i} x={padL+cW+6} y={y+4} fill="#334155" fontSize="9"
                    fontFamily="monospace">{v.toFixed(1)}</text>
            );
          })}

          {/* Current COI label */}
          {lastCOI > 0 && (function() {
            var y   = hY(lastCOI);
            var col = lastCOI > 1.2 ? '#22c55e' : lastCOI < 0.8 ? '#ef4444' : '#94a3b8';
            if (y < hTop || y > hBot) return null;
            return (
              <g>
                <rect x={padL+cW+2} y={y-9} width={padR-4} height={18}
                      fill={col} rx="3" />
                <text x={padL+cW+6} y={y+4} fill="#fff" fontSize="10"
                      fontFamily="monospace" fontWeight="700">
                  {lastCOI.toFixed(2)}
                </text>
              </g>
            );
          })()}

          {/* ── Panel divider: candles / PCR ── */}
          <line x1={padL} y1={cBot + Hgap/2} x2={padL+cW} y2={cBot + Hgap/2}
                stroke="#1e293b" strokeWidth="1" />

          {/* ── Volume panel ── */}
          <rect x={padL} y={vTop} width={cW} height={Hv} fill="#080c12" />

          {/* Volume zero line */}
          <line x1={padL} y1={vBot} x2={padL+cW} y2={vBot} stroke="#1e293b" strokeWidth="1" />

          {/* Futures volume bars — coloured by candle direction */}
          {snaps.map(function(s, i) {
            var fv  = s.fut_vol || 0;
            if (!fv) return null;
            var isUp = (s.close || s.price || 0) >= (s.open || s.close || s.price || 0);
            var col  = isUp ? '#22c55e' : '#ef4444';
            var x    = xOf(i);
            var hov  = hover && hover.idx === i;
            return (
              <rect key={i} x={x - barW/2} y={vY(fv)} width={barW}
                    height={Math.max(1, vBot - vY(fv))}
                    fill={col} opacity={hov ? 1 : 0.65}
                    clipPath="url(#volClip)" rx="0.5" />
            );
          })}

          {/* Volume panel label */}
          <text x={padL + 6} y={vTop + 14} fill="#475569" fontSize="9"
                fontFamily="sans-serif" fontWeight="600">
            FUTURES VOL
          </text>

          {/* Volume max label on right */}
          {maxVol > 0 && (
            <text x={padL+cW+5} y={vTop+12} fill="#334155" fontSize="9" fontFamily="monospace">
              {maxVol >= 100000 ? (maxVol/100000).toFixed(1)+'L' : maxVol >= 1000 ? (maxVol/1000).toFixed(0)+'K' : maxVol}
            </text>
          )}

          {/* Panel divider: PCR / volume ── */}
          <line x1={padL} y1={hBot + Hgap/2} x2={padL+cW} y2={hBot + Hgap/2}
                stroke="#1e293b" strokeWidth="1" />

          {/* ── Axis borders ── */}
          <line x1={padL} y1={cTop}  x2={padL}    y2={cBot}  stroke="#1e293b" strokeWidth="1" />
          <line x1={padL+cW} y1={cTop}  x2={padL+cW} y2={cBot}  stroke="#1e293b" strokeWidth="1" />
          <line x1={padL} y1={hTop}  x2={padL}    y2={hBot}  stroke="#1e293b" strokeWidth="1" />
          <line x1={padL+cW} y1={hTop}  x2={padL+cW} y2={hBot}  stroke="#1e293b" strokeWidth="1" />
          <line x1={padL} y1={vTop}  x2={padL}    y2={vBot}  stroke="#1e293b" strokeWidth="1" />
          <line x1={padL+cW} y1={vTop}  x2={padL+cW} y2={vBot}  stroke="#1e293b" strokeWidth="1" />

          {/* ── X-axis time labels — below volume panel ── */}
          {xLabels.map(function(tl, i) {
            var x = xOf(tl.i);
            return (
              <g key={i}>
                <line x1={x} y1={vBot} x2={x} y2={vBot+5} stroke="#1e293b" strokeWidth="1" />
                <text x={x} y={vBot+18} fill="#475569" fontSize="10"
                      textAnchor="middle" fontFamily="sans-serif">{tl.t}</text>
              </g>
            );
          })}

          {/* ── Crosshair ── */}
          {hover !== null && (
            <g>
              {/* Vertical line across all three panels */}
              <line x1={hX} y1={cTop}  x2={hX} y2={cBot}
                    stroke="#60a5fa" strokeWidth="1" strokeDasharray="4,3" opacity="0.5" />
              <line x1={hX} y1={hTop}  x2={hX} y2={hBot}
                    stroke="#60a5fa" strokeWidth="1" strokeDasharray="4,3" opacity="0.5" />
              <line x1={hX} y1={vTop}  x2={hX} y2={vBot}
                    stroke="#60a5fa" strokeWidth="1" strokeDasharray="4,3" opacity="0.5" />
              {/* Horizontal price line */}
              {hC > 0 && pY(hC) >= cTop && pY(hC) <= cBot && (
                <line x1={padL} y1={pY(hC)} x2={padL+cW} y2={pY(hC)}
                      stroke="#60a5fa" strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
              )}
              {/* Tooltip */}
              <rect x={ttX} y={ttY} width={ttW} height={70}
                    fill="#0f172a" stroke="#334155" strokeWidth="1" rx="6" opacity="0.95" />
              {/* Time */}
              <text x={ttX+10} y={ttY+16} fill="#94a3b8" fontSize="11"
                    fontWeight="600" fontFamily="sans-serif">{hTime}</text>
              {/* COI PCR */}
              <text x={ttX+10} y={ttY+36} fill="#64748b" fontSize="11" fontFamily="sans-serif">COI PCR</text>
              <text x={ttX+ttW-10} y={ttY+36}
                    fill={hCOI > 1.2 ? '#22c55e' : hCOI < 0.8 ? '#ef4444' : '#94a3b8'}
                    fontSize="13" fontFamily="monospace" fontWeight="800" textAnchor="end">
                {hCOI > 0 ? hCOI.toFixed(2) : '—'}
              </text>
              {/* Fut Vol */}
              <text x={ttX+10} y={ttY+56} fill="#64748b" fontSize="11" fontFamily="sans-serif">Fut Vol</text>
              <text x={ttX+ttW-10} y={ttY+56} fill="#94a3b8"
                    fontSize="11" fontFamily="monospace" textAnchor="end">
                {hFutV > 0 ? (hFutV >= 100000 ? (hFutV/100000).toFixed(1)+'L' : hFutV >= 1000 ? (hFutV/1000).toFixed(0)+'K' : String(hFutV)) : '—'}
              </text>
            </g>
          )}

        </svg>
      </div>

      {/* ── Footer ── */}
      <div style={{ padding: '8px 20px', borderTop: '1px solid #1e293b',
                    display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center',
                    background: '#080c12' }}>
        <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>COI PCR &gt;1.2 — Put COI dominant · bullish</span>
        <span style={{ fontSize: 10, color: '#475569' }}>~1.0 neutral</span>
        <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>COI PCR &lt;0.8 — Call COI dominant · bearish</span>
        <span style={{ fontSize: 10, color: '#334155', marginLeft: 'auto' }}>{n} candles · 3-min</span>
      </div>
    </div>
  );
}


function OTMPositioning(props) {
  var chain          = props.chain          || [];   // full_chain rows — each has strike, is_atm, ce_iv, pe_iv, ce_oi, pe_oi, ce_chg_oi, pe_chg_oi
  var strikeHistory  = props.strikeHistory  || [];   // [{time, strikes:{[strike]:{ce_iv,pe_iv,ce_oi,pe_oi,...}}}]
  var vix            = props.vix            || 0;    // India VIX current value
  var atm            = props.atm            || 0;    // ATM strike

  // ── helpers ────────────────────────────────────────────────────────────────
  function fmtOI(n) {
    if (!n && n !== 0) return '—';
    var sign = n < 0 ? '-' : '+';
    var abs  = Math.abs(n);
    if (abs >= 100000) return sign + (abs / 100000).toFixed(1) + 'L';
    if (abs >= 1000)   return sign + (abs / 1000).toFixed(0) + 'K';
    return (n >= 0 ? '+' : '') + n;
  }

  function pct(val, base) {
    if (!base || base === 0) return 0;
    return ((val - base) / Math.abs(base)) * 100;
  }

  // ── select OTM strikes: ATM ±5 (11 strikes total) ──────────────────────────
  // chain is sorted by strike; find ATM index then pick neighbours
  var sorted   = chain.slice().sort(function(a, b) { return a.strike - b.strike; });
  var atmIdx   = sorted.findIndex(function(r) { return r.strike === atm; });
  if (atmIdx < 0) atmIdx = sorted.findIndex(function(r) { return r.is_atm; });

  var indices  = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
  var strikes  = indices
    .map(function(offset) { return sorted[atmIdx + offset]; })
    .filter(Boolean);

  // ── B1: locked 10:00–10:15 baseline (first snapshot at or after 10:00) ────
  // We derive B1 from strikeHistory: average of snapshots between 10:00–10:15
  var b1Snaps = strikeHistory.filter(function(s) {
    return s.time >= '10:00' && s.time <= '10:15';
  });
  // Fallback: use first snapshot if none in window yet
  if (b1Snaps.length === 0 && strikeHistory.length > 0) b1Snaps = [strikeHistory[0]];

  function getB1IV(strike, side) {
    if (b1Snaps.length === 0) return null;
    var vals = b1Snaps.map(function(s) {
      var e = s.strikes ? s.strikes[String(strike)] : null;
      if (!e || typeof e !== 'object') return null;
      return side === 'ce' ? (e.ce_iv || null) : (e.pe_iv || null);
    }).filter(function(v) { return v !== null; });
    if (vals.length === 0) return null;
    return vals.reduce(function(a, b) { return a + b; }, 0) / vals.length;
  }

  // ── B2: rolling 45-min baseline (last 15 snapshots @ 3-min = 45 min) ──────
  var b2Snaps = strikeHistory.slice(-15);

  function getB2IV(strike, side) {
    if (b2Snaps.length === 0) return null;
    var vals = b2Snaps.map(function(s) {
      var e = s.strikes ? s.strikes[String(strike)] : null;
      if (!e || typeof e !== 'object') return null;
      return side === 'ce' ? (e.ce_iv || null) : (e.pe_iv || null);
    }).filter(function(v) { return v !== null; });
    if (vals.length === 0) return null;
    return vals.reduce(function(a, b) { return a + b; }, 0) / vals.length;
  }

  // ── B2 OI baseline: OI at session open (first snapshot) ──────────────────
  var firstSnap = strikeHistory.length > 0 ? strikeHistory[0] : null;

  function getOpenOI(strike, side) {
    if (!firstSnap) return null;
    var e = firstSnap.strikes ? firstSnap.strikes[String(strike)] : null;
    if (!e || typeof e !== 'object') return null;
    return side === 'ce' ? (e.ce_oi || null) : (e.pe_oi || null);
  }

  // ── IV direction: tick-to-tick delta (last 2 snapshots) ─────────────────
  // Used for display arrow only — driver uses B1Dev as primary signal
  function ivDir(strike, side) {
    if (strikeHistory.length < 2) return '→';
    var last2  = strikeHistory.slice(-2);
    var prev   = last2[0].strikes ? last2[0].strikes[String(strike)] : null;
    var curr   = last2[1].strikes ? last2[1].strikes[String(strike)] : null;
    if (!prev || !curr || typeof prev !== 'object' || typeof curr !== 'object') return '→';
    var prevIV = side === 'ce' ? (prev.ce_iv || 0) : (prev.pe_iv || 0);
    var currIV = side === 'ce' ? (curr.ce_iv || 0) : (curr.pe_iv || 0);
    var diff   = currIV - prevIV;
    if (diff > 1)    return '↑↑';
    if (diff > 0.2)  return '↑';
    if (diff < -1)   return '↓↓';
    if (diff < -0.2) return '↓';
    return '→';
  }

  // ── Driver: OI + IV matrix using B1Dev as primary IV signal ──────────────
  // B1Dev = how far current IV has moved from the 10:00–10:15 session baseline.
  // This is more reliable than tick-to-tick delta which is noisy at 3-min resolution.
  // Tick delta used as secondary confirmation when B1Dev is ambiguous.
  //
  // IV direction classification (B1Dev primary, tick delta secondary):
  //   IV UP   = B1Dev > +2%   OR  (B1Dev > 0 AND tick delta > 0.2)
  //   IV DOWN = B1Dev < -2%   OR  (B1Dev < 0 AND tick delta < -0.2)
  //   IV FLAT = everything else
  //
  // OI direction:
  //   OI UP   = chgOI > 500  (fresh contracts being added)
  //   OI DOWN = chgOI < -500 (contracts being removed)
  //
  // Matrix:
  //   BUY    = OI↑ + IV↑  → buyer lifting ask, premium rising
  //   COVER  = OI↓ + IV↑  → writer forced to exit, IV rising despite OI falling = momentum
  //   WRITE  = OI↑ + IV↓  → writer selling, premium falling = hostile to buyer
  //   UNWIND = OI↓ + IV↓  → longs exiting, no interest
  function driver(row, side) {
    var iv    = side === 'ce' ? (row.ce_iv || 0) : (row.pe_iv || 0);
    var b1iv  = getB1IV(row.strike, side);
    var b1Dev = (b1iv && b1iv > 0) ? ((iv - b1iv) / b1iv) * 100 : 0;
    var tick  = ivDir(row.strike, side);
    var tickUp = tick === '↑' || tick === '↑↑';
    var tickDn = tick === '↓' || tick === '↓↓';

    // IV direction — B1Dev primary
    var ivUp = b1Dev > 2  || (b1Dev > 0   && tickUp);
    var ivDn = b1Dev < -2 || (b1Dev < 0   && tickDn);

    var chgOI = side === 'ce' ? (row.ce_chg_oi || 0) : (row.pe_chg_oi || 0);
    var oiUp  = chgOI > 500;
    var oiDn  = chgOI < -500;

    if (oiUp && ivUp)  return { label: 'BUY',    color: side === 'ce' ? '#4ade80' : '#f87171', bias: side === 'ce' ? 'bullish' : 'bearish', buyerFriendly: true  };
    if (oiDn && ivUp)  return { label: 'COVER',  color: '#f59e0b',                             bias: side === 'ce' ? 'bullish' : 'bearish', buyerFriendly: true  };
    if (oiUp && ivDn)  return { label: 'WRITE',  color: '#64748b',                             bias: 'hostile',                             buyerFriendly: false };
    if (oiDn && ivDn)  return { label: 'UNWIND', color: '#334155',                             bias: 'hostile',                             buyerFriendly: false };
    // OI flat but IV has strong session signal — classify by IV alone
    if (!oiUp && !oiDn && ivUp) return { label: 'IV↑',   color: side === 'ce' ? '#4ade8088' : '#f8717188', bias: side === 'ce' ? 'bullish' : 'bearish', buyerFriendly: true  };
    if (!oiUp && !oiDn && ivDn) return { label: 'IV↓',   color: '#64748b88',                               bias: 'hostile',                             buyerFriendly: false };
    return { label: '—', color: '#334155', bias: 'neutral', buyerFriendly: false };
  }

  function scoreComponent(val, thresholds) {
    var pts = 0;
    thresholds.forEach(function(t) { if (val >= t.min) pts = t.pts; });
    return pts;
  }

  // ── Streak: consecutive snapshots with IV above B2 baseline ──────────────
  function getStreak(strike, side) {
    if (strikeHistory.length < 2) return 0;
    var count = 0;
    var snaps = strikeHistory.slice().reverse();
    for (var i = 0; i < snaps.length; i++) {
      var e  = snaps[i].strikes ? snaps[i].strikes[String(strike)] : null;
      if (!e || typeof e !== 'object') break;
      var iv = side === 'ce' ? (e.ce_iv || 0) : (e.pe_iv || 0);
      var b2 = getB2IV(strike, side);
      if (b2 && iv > b2) { count++; } else { break; }
    }
    return count;
  }

  // ── BPI: Buyer Pressure Index (0–100) ─────────────────────────────────────
  // Scores ONLY buyer-friendly conditions: BUY and COVER drivers.
  // WRITE and UNWIND score 0 — they are hostile to option buyers.
  //
  // Components (max 100):
  //   IV rising above B1 (session baseline)   0–25 pts  — IV demand vs whole day
  //   IV rising above B2 (recent baseline)    0–25 pts  — IV demand recently
  //   OI accumulation from open               0–20 pts  — position size building
  //   OI velocity (chg_oi this snapshot)      0–15 pts  — speed of entry
  //   IV rising streak (consecutive snaps)    0–15 pts  — sustained demand
  function computePPI(row, side) {
    var iv     = side === 'ce' ? (row.ce_iv || 0) : (row.pe_iv || 0);
    var vix_   = vix || 1;
    var normIV = iv / vix_;

    var b1iv   = getB1IV(row.strike, side);
    var b2iv   = getB2IV(row.strike, side);
    var b1Norm = b1iv ? b1iv / vix_ : null;
    var b2Norm = b2iv ? b2iv / vix_ : null;

    // Signed deviations — positive means IV is ABOVE baseline (buyer-friendly)
    var b1DevSigned = b1Norm ? pct(normIV, b1Norm) : 0;
    var b2DevSigned = b2Norm ? pct(normIV, b2Norm) : 0;

    // Determine driver
    var drv = driver(row, side);

    // If driver is hostile to buyers (WRITE or UNWIND), score 0
    // Buyer should not trade into falling IV regardless of OI
    if (!drv.buyerFriendly && drv.label !== '—') return 0;

    // IV score: only count POSITIVE deviations (IV above baseline = demand exists)
    // Negative deviation = IV falling = bad for buyers, scores 0
    var b1IVup = Math.max(0, b1DevSigned);
    var b2IVup = Math.max(0, b2DevSigned);

    var b1Score = scoreComponent(b1IVup, [{min:0.5,pts:5},{min:1.5,pts:10},{min:3,pts:16},{min:5,pts:20},{min:8,pts:25}]);
    var b2Score = scoreComponent(b2IVup, [{min:0.5,pts:5},{min:1.5,pts:10},{min:3,pts:16},{min:5,pts:20},{min:8,pts:25}]);

    // OI accumulation from session open (position size)
    var openOI = getOpenOI(row.strike, side);
    var currOI = side === 'ce' ? (row.ce_oi || 0) : (row.pe_oi || 0);
    var cumOI  = openOI ? currOI - openOI : 0;
    var cumPct = openOI && openOI > 0 ? (cumOI / openOI) * 100 : 0;
    // For COVER driver, OI is falling — that's still bullish/bearish so use abs
    var oiScore = scoreComponent(Math.abs(cumPct), [{min:0.5,pts:4},{min:2,pts:8},{min:5,pts:14},{min:10,pts:20}]);

    // OI velocity (speed of entry/exit this snapshot)
    var chgOI    = side === 'ce' ? (row.ce_chg_oi || 0) : (row.pe_chg_oi || 0);
    var velScore = scoreComponent(Math.abs(chgOI), [{min:300,pts:3},{min:1000,pts:7},{min:3000,pts:11},{min:7000,pts:15}]);

    // IV rising streak — only counts when IV is genuinely above B2
    var streak      = getStreak(row.strike, side);
    var streakScore = scoreComponent(streak, [{min:2,pts:3},{min:4,pts:7},{min:6,pts:11},{min:8,pts:15}]);

    return Math.min(100, b1Score + b2Score + oiScore + velScore + streakScore);
  }



  // ── Skew shape — combines current gap + IV direction trend ──────────────────
  // FLAT + IV rising on OTM  → accumulation (bullish for CE, bearish for PE)
  // FLAT + IV falling on OTM → surface compressing, no strong signal
  // STEEP + IV rising on ATM → ATM being bid, event/fear pricing
  function skewShape(sidesRows, side) {
    var atmRow  = sidesRows.find(function(r) { return r.strike === atm || r.is_atm; });
    if (!atmRow) return null;
    var atmIV   = side === 'ce' ? (atmRow.ce_iv || 0) : (atmRow.pe_iv || 0);
    var otmRows = sidesRows.filter(function(r) { return r.strike !== atm && !r.is_atm; });
    if (otmRows.length === 0) return null;
    var avgOTM  = otmRows.reduce(function(s, r) {
      return s + (side === 'ce' ? (r.ce_iv || 0) : (r.pe_iv || 0));
    }, 0) / otmRows.length;
    var gap = atmIV - avgOTM;

    // Check IV trend from history: compare last 2 snapshots for OTM avg IV
    var ivTrend = 'flat';
    if (strikeHistory.length >= 2) {
      var prev = strikeHistory[strikeHistory.length - 2];
      var curr = strikeHistory[strikeHistory.length - 1];
      var prevOTMivs = otmRows.map(function(r) {
        var e = prev.strikes ? prev.strikes[String(r.strike)] : null;
        return (e && typeof e === 'object') ? (side === 'ce' ? (e.ce_iv || 0) : (e.pe_iv || 0)) : 0;
      }).filter(function(v) { return v > 0; });
      var currOTMivs = otmRows.map(function(r) {
        var e = curr.strikes ? curr.strikes[String(r.strike)] : null;
        return (e && typeof e === 'object') ? (side === 'ce' ? (e.ce_iv || 0) : (e.pe_iv || 0)) : 0;
      }).filter(function(v) { return v > 0; });
      if (prevOTMivs.length > 0 && currOTMivs.length > 0) {
        var prevAvg = prevOTMivs.reduce(function(a,b){return a+b;},0) / prevOTMivs.length;
        var currAvg = currOTMivs.reduce(function(a,b){return a+b;},0) / currOTMivs.length;
        if (currAvg > prevAvg + 0.1) ivTrend = 'rising';
        else if (currAvg < prevAvg - 0.1) ivTrend = 'falling';
      }
    }

    // Shape label combines gap + trend
    if (gap < 1) {
      if (ivTrend === 'rising')  return 'FLAT↑'; // OTM IV rising toward ATM = accumulation
      if (ivTrend === 'falling') return 'FLAT↓'; // OTM IV falling = writing/compression
      return 'FLAT';
    }
    if (gap < 3) return 'NORMAL';
    return 'STEEP';
  }

  // ── Panel verdict ─────────────────────────────────────────────────────────
  // Uses driver bias to determine true directional intent:
  //   CE BUY / PE WRITE  → BULLISH (buyers entering calls, writers defending below)
  //   PE BUY / CE WRITE  → BEARISH (buyers entering puts, writers capping upside)
  //   CE WRITE + CE BUY  → mixed CE activity
  function panelVerdict(rows) {
    var ceRows = rows.filter(function(r) { return r.strike > atm; });
    var peRows = rows.filter(function(r) { return r.strike < atm; });

    // Buyer-focused: only rows where BPI >= 35 AND driver is buyer-friendly
    function rowBias(r, side) {
      var score = computePPI(r, side);
      if (score < 35) return null;
      var drv = driver(r, side);
      // Only BUY and COVER are actionable for buyers
      if (!drv.buyerFriendly) return null;
      return drv.bias;
    }

    var ceBiases = ceRows.map(function(r) { return rowBias(r, 'ce'); }).filter(Boolean);
    var peBiases = peRows.map(function(r) { return rowBias(r, 'pe'); }).filter(Boolean);

    // Count bullish vs bearish signals across both sides
    var bullCount = 0, bearCount = 0;
    ceBiases.concat(peBiases).forEach(function(b) {
      if (b === 'bullish') bullCount++;
      if (b === 'bearish') bearCount++;
    });

    var ceScores = ceRows.map(function(r) { return computePPI(r, 'ce'); });
    var peScores = peRows.map(function(r) { return computePPI(r, 'pe'); });
    var ceAvg    = ceScores.length ? ceScores.reduce(function(a,b){return a+b;},0)/ceScores.length : 0;
    var peAvg    = peScores.length ? peScores.reduce(function(a,b){return a+b;},0)/peScores.length : 0;
    var strength = function(avg) { return avg >= 70 ? 'STRONG' : avg >= 40 ? 'MODERATE' : 'WEAK'; };
    var topAvg   = Math.max(ceAvg, peAvg);

    var total = bullCount + bearCount;
    if (total === 0) {
      return { text: 'NO SIGNIFICANT POSITIONING DETECTED', bias: '—', strength: '—', color: '#475569', state: 'none' };
    }

    // Need clear majority (60%+) to fire a directional verdict
    if (bullCount >= 2 && bullCount > bearCount) {
      // Which strikes are driving the bullish signal
      var bullStrikes = ceRows.filter(function(r) { return rowBias(r,'ce') === 'bullish'; })
        .concat(peRows.filter(function(r) { return rowBias(r,'pe') === 'bullish'; }))
        .map(function(r) { return r.strike; });
      // Distinguish BUY vs COVER for richer verdict text
      var ceBuyCount  = ceRows.filter(function(r){ var d=driver(r,'ce'); return d.label==='BUY'   && computePPI(r,'ce')>=35; }).length;
      var ceCovCount  = ceRows.filter(function(r){ var d=driver(r,'ce'); return d.label==='COVER' && computePPI(r,'ce')>=35; }).length;
      var peBuyCount  = peRows.filter(function(r){ var d=driver(r,'pe'); return d.label==='BUY'   && computePPI(r,'pe')>=35; }).length;
      var peCovCount  = peRows.filter(function(r){ var d=driver(r,'pe'); return d.label==='COVER' && computePPI(r,'pe')>=35; }).length;
      var bullDriver  = (ceCovCount > 0 && ceBuyCount === 0) ? 'CALL SHORT COVERING' :
                        (ceBuyCount > 0) ? 'CALL BUYING' : 'PUT WRITING UNWINDING';
      return {
        text: bullDriver + ' — WATCH ' + bullStrikes.join('–'),
        bias: 'BULLISH', strength: strength(topAvg),
        color: '#4ade80', state: topAvg >= 70 ? 'high' : 'early',
      };
    }
    if (bearCount >= 2 && bearCount > bullCount) {
      var bearStrikes = ceRows.filter(function(r) { return rowBias(r,'ce') === 'bearish'; })
        .concat(peRows.filter(function(r) { return rowBias(r,'pe') === 'bearish'; }))
        .map(function(r) { return r.strike; });
      var peBuyC  = peRows.filter(function(r){ var d=driver(r,'pe'); return d.label==='BUY'   && computePPI(r,'pe')>=35; }).length;
      var peCovC  = peRows.filter(function(r){ var d=driver(r,'pe'); return d.label==='COVER' && computePPI(r,'pe')>=35; }).length;
      var ceBuyC  = ceRows.filter(function(r){ var d=driver(r,'ce'); return d.label==='BUY'   && computePPI(r,'ce')>=35; }).length;
      var ceCovC  = ceRows.filter(function(r){ var d=driver(r,'ce'); return d.label==='COVER' && computePPI(r,'ce')>=35; }).length;
      var bearDriver = (peCovC > 0 && peBuyC === 0) ? 'PUT SHORT COVERING' :
                       (peBuyC > 0) ? 'PUT BUYING' : 'CALL WRITING UNWINDING';
      return {
        text: bearDriver + ' — WATCH ' + bearStrikes.join('–'),
        bias: 'BEARISH', strength: strength(topAvg),
        color: '#f87171', state: topAvg >= 70 ? 'high' : 'early',
      };
    }
    // Mixed signals
    return {
      text: 'MIXED SIGNALS — BOTH SIDES ACTIVE',
      bias: 'NEUTRAL', strength: '—', color: '#f59e0b', state: 'early',
    };
  }

  // ── Dominance ratio ───────────────────────────────────────────────────────
  function dominance(rows) {
    var ceRows   = rows.filter(function(r) { return r.strike > atm; });
    var peRows   = rows.filter(function(r) { return r.strike < atm; });
    var ceTotal  = ceRows.reduce(function(s,r){ return s + computePPI(r, 'ce'); }, 0);
    var peTotal  = peRows.reduce(function(s,r){ return s + computePPI(r, 'pe'); }, 0);
    var tot      = ceTotal + peTotal || 1;
    return { cePct: Math.round((ceTotal/tot)*100), pePct: Math.round((peTotal/tot)*100) };
  }

  // ── Glossary ───────────────────────────────────────────────────────────────
  var [openGloss, setOpenGloss] = React.useState(null);
  var glossary = [
    { term: 'Norm IV',   full: 'Normalised Implied Volatility',           desc: 'Strike IV divided by India VIX. Removes market-wide fear so you can isolate strike-specific demand. Comparable across strikes and days.' },
    { term: 'vs B1',     full: 'Deviation from Settled Open (10:00–10:15)', desc: 'How much Norm IV has moved from the 10:00–10:15 settled baseline. High B1 deviation means the move is significant vs the whole session.' },
    { term: 'vs B2',     full: 'Deviation from Rolling 45-min Baseline',  desc: 'How much Norm IV has moved in the last 45 mins. High B2 = fresh and active. High B1 + high B2 = sustained institutional accumulation.' },
    { term: 'Cum OI Δ',  full: 'Cumulative OI Change from 9:15 Open',     desc: 'Total net OI added since open. Not snapshot-to-snapshot — this is the full session picture. Sustained build = institutional, not retail.' },
    { term: 'Dir',       full: 'IV Direction (last 3-min snapshot)',       desc: '↑↑ rising fast (>1%), ↑ rising slowly, → flat, ↓ falling, ↓↓ falling fast. Velocity matters more than absolute level.' },
    { term: 'Driver',    full: 'OI + IV Matrix — Buyer Perspective',       desc: 'BUY = OI↑ + IV↑ → buyer lifting the ask, best entry signal. COVER = OI↓ + IV↑ → writers forced to exit, strong momentum. WRITE = OI↑ + IV↓ → writers selling, IV falling — avoid buying here. UNWIND = OI↓ + IV↓ → longs leaving, no interest.' },
    { term: 'Streak',    full: 'Consecutive Snapshots with IV Above B2',   desc: 'How many 3-min snapshots in a row show IV above the 45-min baseline. Only counts when driver is buyer-friendly. 4+ snaps = sustained demand = high confidence.' },
    { term: 'BPI',       full: 'Buyer Pressure Index (0–100)',             desc: 'Scores ONLY buyer-friendly conditions (BUY + COVER drivers). WRITE and UNWIND score 0 — falling IV is hostile to buyers. Components: IV above B1 (25pts) + IV above B2 (25pts) + OI size (20pts) + OI velocity (15pts) + Streak (15pts).' },
    { term: 'State',     full: 'Signal State',                             desc: '⚪ None: no buyer signal. 🟡 WATCH (35–69): buyer activity building, not yet confirmed. 🟢 CALL BUY / 🔴 PUT BUY (70+): strong buyer footprint, IV rising, OI confirming.' },
    { term: 'CE / PE',   full: 'Call / Put Option',                        desc: 'CE = Call (buyer profits if price rises). PE = Put (buyer profits if price falls). OTM CE accumulation → upside positioning. OTM PE accumulation → downside/hedge.' },
    { term: 'Skew',      full: 'Volatility Skew Shape',                    desc: 'FLAT↑ = OTM IV rising toward ATM = active accumulation. FLAT↓ = OTM IV falling = writing/compression. FLAT = stable. NORMAL = standard smile. STEEP = heavy protection demand.' },
    { term: 'Dominance', full: 'CE vs PE Positioning Pressure Share',      desc: 'PPI-weighted share of total pressure across all strikes. CE 70%+ = clear bullish lean. PE 70%+ = clear bearish lean. Near 50/50 = balanced or event-driven.' },
  ];

  if (!chain.length || !atm) return null;

  var ceShape    = skewShape(strikes.filter(function(r){return r.strike >= atm;}), 'ce');
  var peShape    = skewShape(strikes.filter(function(r){return r.strike <= atm;}), 'pe');

  // ── Diagnostic: log per-strike driver data to console ──────────────────────
  // ── IV Environment indicator ─────────────────────────────────────────────
  // Compares current avg IV (CE and PE separately) against B1 baseline
  // Tells buyer whether conditions are favourable overall
  var ivEnv = (function() {
    var ceStrikes = strikes.filter(function(r) { return r && r.strike > atm; });
    var peStrikes = strikes.filter(function(r) { return r && r.strike < atm; });
    function avgDev(rows, side) {
      var vals = rows.map(function(r) {
        var iv   = side === 'ce' ? (r.ce_iv || 0) : (r.pe_iv || 0);
        var b1iv = getB1IV(r.strike, side);
        if (!b1iv || b1iv === 0) return null;
        return ((iv - b1iv) / b1iv) * 100;
      }).filter(function(v) { return v !== null; });
      if (!vals.length) return null;
      return vals.reduce(function(a,b){return a+b;},0) / vals.length;
    }
    var ceAvgDev   = avgDev(ceStrikes, 'ce');
    var peAvgDev   = avgDev(peStrikes, 'pe');
    var ceDev      = ceAvgDev !== null ? ceAvgDev : 0;
    var peDev      = peAvgDev !== null ? peAvgDev : 0;
    var overallDev = (ceDev + peDev) / 2;

    // ── Detect CE/PE divergence — directional surface repricing ──────────────
    // CE IV rising + PE IV falling = surface repricing BULLISH
    //   → call demand + put supply = upside positioning
    // PE IV rising + CE IV falling = surface repricing BEARISH
    //   → put demand + call supply = downside positioning
    var DIVG_THRESH = 3; // each side must be at least 3% away from baseline
    var ceBullish   = ceDev >  DIVG_THRESH;
    var ceBearish   = ceDev < -DIVG_THRESH;
    var peBullish   = peDev < -DIVG_THRESH; // PE IV falling = put writing = bullish
    var peBearish   = peDev >  DIVG_THRESH; // PE IV rising  = put buying  = bearish

    if (ceBullish && peBullish) {
      return {
        label: 'REPRICING BULLISH', color: '#4ade80', icon: '📈',
        desc: 'CE IV +' + ceDev.toFixed(1) + '% vs B1 · PE IV ' + peDev.toFixed(1) + '% vs B1 — call demand + put supply = upside positioning',
        divergence: 'bullish', ceDev: ceDev, peDev: peDev,
      };
    }
    if (peBearish && ceBearish) {
      return {
        label: 'REPRICING BEARISH', color: '#f87171', icon: '📉',
        desc: 'PE IV +' + peDev.toFixed(1) + '% vs B1 · CE IV ' + ceDev.toFixed(1) + '% vs B1 — put demand + call supply = downside positioning',
        divergence: 'bearish', ceDev: ceDev, peDev: peDev,
      };
    }
    // No divergence — overall read
    if (overallDev > 1.5)  return { label: 'EXPANDING',   color: '#4ade80', desc: 'IV above session baseline — buyer conditions present',    icon: '↑',  divergence: null, ceDev: ceDev, peDev: peDev };
    if (overallDev > 0.3)  return { label: 'RISING',      color: '#a3e635', desc: 'IV drifting above baseline — watch for confirmation',     icon: '↗',  divergence: null, ceDev: ceDev, peDev: peDev };
    if (overallDev < -1.5) return { label: 'COMPRESSING', color: '#f87171', desc: 'IV well below baseline — writer dominant, avoid buying',  icon: '↓',  divergence: null, ceDev: ceDev, peDev: peDev };
    if (overallDev < -0.3) return { label: 'FALLING',     color: '#f59e0b', desc: 'IV drifting below baseline — caution for buyers',         icon: '↘',  divergence: null, ceDev: ceDev, peDev: peDev };
    return { label: 'NEUTRAL', color: '#64748b', desc: 'IV flat near baseline — no clear buyer or writer edge', icon: '→', divergence: null, ceDev: ceDev, peDev: peDev };
  })();

  // ── Confluence zones ──────────────────────────────────────────────────────
  // Find consecutive adjacent strikes where driver is buyer-friendly on same side
  var confluenceZones = (function() {
    var zones = [];
    // CE side — strikes above ATM, sorted ascending
    var ceStrikes = strikes.filter(function(r) { return r && r.strike > atm; })
                           .sort(function(a,b) { return a.strike - b.strike; });
    // PE side — strikes below ATM, sorted descending (closest first)
    var peStrikes = strikes.filter(function(r) { return r && r.strike < atm; })
                           .sort(function(a,b) { return b.strike - a.strike; });

    // Find buyer-friendly zones (BUY + COVER with IV above B1)
    function findBuyerZones(rows, side) {
      var current = [];
      rows.forEach(function(row) {
        var drv   = driver(row, side);
        var b1iv  = getB1IV(row.strike, side);
        var curIV = side === 'ce' ? (row.ce_iv || 0) : (row.pe_iv || 0);
        // IV must be above B1 for buyer zone — confirms demand not just noise
        if (drv.buyerFriendly && b1iv && curIV > b1iv) {
          current.push({ row: row, drv: drv, type: 'buyer' });
        } else {
          if (current.length >= 1) zones.push({ side: side, rows: current.slice(), type: 'buyer' });
          current = [];
        }
      });
      if (current.length >= 1) zones.push({ side: side, rows: current.slice(), type: 'buyer' });
    }

    // Find writer zones (WRITE + UNWIND with IV below B1)
    // These are important for buyers because:
    //   CE WRITE zone = call writers capping upside = resistance = bearish
    //   PE WRITE zone = put writers building support = bullish confirmation
    //   CE UNWIND zone = call longs exiting = bearish momentum losing
    //   PE UNWIND zone = put longs exiting = bullish (bears giving up)
    function findWriterZones(rows, side) {
      var current = [];
      rows.forEach(function(row) {
        var drv   = driver(row, side);
        var b1iv  = getB1IV(row.strike, side);
        var curIV = side === 'ce' ? (row.ce_iv || 0) : (row.pe_iv || 0);
        // IV must be below B1 for writer zone
        if (!drv.buyerFriendly && drv.label !== '—' && b1iv && curIV < b1iv) {
          current.push({ row: row, drv: drv, type: 'writer' });
        } else {
          if (current.length >= 2) zones.push({ side: side, rows: current.slice(), type: 'writer' });
          current = [];
        }
      });
      if (current.length >= 2) zones.push({ side: side, rows: current.slice(), type: 'writer' });
    }

    findBuyerZones(ceStrikes, 'ce');
    findBuyerZones(peStrikes, 'pe');
    findWriterZones(ceStrikes, 'ce');
    findWriterZones(peStrikes, 'pe');

    // Enrich each zone
    zones.forEach(function(z) {
      var oppSide = z.side === 'ce' ? 'pe' : 'ce';
      z.strikes   = z.rows.map(function(i){ return i.row.strike; });

      if (z.type === 'buyer') {
        var buyCount   = z.rows.filter(function(i){ return i.drv.label === 'BUY' || i.drv.label === 'IV↑'; }).length;
        var coverCount = z.rows.filter(function(i){ return i.drv.label === 'COVER'; }).length;
        z.driverLabel  = coverCount > buyCount ? 'SHORT COVERING' : 'BUYING';
        z.bias         = z.side === 'ce' ? 'BULLISH' : 'BEARISH';
        z.color        = z.side === 'ce' ? '#4ade80' : '#f87171';
        // Opposite side confirmation: writer on opp side = confirms direction
        var confirmCount = 0, contradictCount = 0;
        z.rows.forEach(function(item) {
          var oppDrv = driver(item.row, oppSide);
          if (!oppDrv.buyerFriendly && oppDrv.label !== '—') confirmCount++;
          if (oppDrv.buyerFriendly) contradictCount++;
        });
        z.confirmed    = confirmCount >= Math.ceil(z.rows.length / 2);
        z.contradicted = contradictCount >= Math.ceil(z.rows.length / 2);
        z.confirmNote  = z.confirmed ? '✓ opposite side confirms' : z.contradicted ? '⚠ opposite side contradicts' : '';
      } else {
        // Writer zone — interpret for buyer
        var dominantDriver = z.rows.filter(function(i){ return i.drv.label === 'WRITE'; }).length
                           > z.rows.filter(function(i){ return i.drv.label === 'UNWIND'; }).length
                           ? 'WRITE' : 'UNWIND';
        if (z.side === 'ce') {
          // CE WRITE = call resistance building = bearish
          // CE UNWIND = call longs leaving = bearish momentum
          z.driverLabel = dominantDriver === 'WRITE' ? 'CALL WRITING' : 'CALL UNWINDING';
          z.bias        = 'BEARISH';
          z.color       = '#f87171';
          z.confirmNote = 'resistance building — upside capped';
        } else {
          // PE WRITE = put support building = bullish
          // PE UNWIND = put longs leaving = bulls exiting puts = bullish
          z.driverLabel = dominantDriver === 'WRITE' ? 'PUT WRITING' : 'PUT UNWINDING';
          z.bias        = 'BULLISH';
          z.color       = '#4ade80';
          z.confirmNote = dominantDriver === 'WRITE' ? 'support building — downside protected' : 'bears giving up — bullish';
        }
        z.confirmed    = false;
        z.contradicted = false;
      }
    });

    // Sort: buyer zones first, then writer zones; within each group by zone size desc
    zones.sort(function(a, b) {
      if (a.type !== b.type) return a.type === 'buyer' ? -1 : 1;
      return b.rows.length - a.rows.length;
    });

    return zones;
  })();

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            📡 OTM Positioning — Option Buyer View
          </p>
          <p style={{ fontSize: 10, color: '#475569', margin: 0 }}>
            ATM ±5 · CE &amp; PE OI, COI, IV vs B1/B2, Driver · 3-min snapshots · BUY &amp; COVER highlighted
          </p>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* IV Environment */}
          <div style={{ padding: '6px 12px', borderRadius: 8, background: ivEnv.color + '12', border: '1px solid ' + ivEnv.color + '33' }}>
            <p style={{ fontSize: 9, color: '#475569', margin: '0 0 2px', fontWeight: 700, textTransform: 'uppercase' }}>IV ENVIRONMENT</p>
            <span style={{ fontSize: 12, fontWeight: 800, color: ivEnv.color }}>{ivEnv.icon} {ivEnv.label}</span>
          </div>
          <div style={{ width: 1, height: 32, background: '#1e293b' }} />
          {/* Skew */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 9, color: '#475569', margin: '0 0 1px', fontWeight: 700, textTransform: 'uppercase' }}>CE SKEW</p>
            <span style={{ fontSize: 11, fontWeight: 700, color: ceShape === 'FLAT↑' ? '#4ade80' : ceShape === 'FLAT↓' ? '#f87171' : '#64748b' }}>{ceShape || '—'}</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 9, color: '#475569', margin: '0 0 1px', fontWeight: 700, textTransform: 'uppercase' }}>PE SKEW</p>
            <span style={{ fontSize: 11, fontWeight: 700, color: peShape === 'FLAT↑' ? '#f87171' : peShape === 'FLAT↓' ? '#4ade80' : '#64748b' }}>{peShape || '—'}</span>
          </div>
          <div style={{ width: 1, height: 32, background: '#1e293b' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 9, color: '#475569', margin: '0 0 1px', fontWeight: 700, textTransform: 'uppercase' }}>VIX</p>
            <span style={{ fontSize: 13, fontWeight: 800, color: vix > 20 ? '#f87171' : vix > 15 ? '#f59e0b' : '#4ade80' }}>{vix > 0 ? vix.toFixed(2) : '—'}</span>
          </div>
        </div>
      </div>

      {/* ── IV Environment description ── */}
      <div style={{ padding: '7px 20px', background: ivEnv.color + '08', borderBottom: '1px solid #1e293b' }}>
        <span style={{ fontSize: 11, color: ivEnv.color }}>{ivEnv.desc}</span>
      </div>

      {/* ── Confluence Zones ── */}
      {confluenceZones.length > 0 && (
        <div style={{ padding: '10px 20px', borderBottom: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 9, color: '#475569', margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              OI Confluence Zones
            </p>
            {/* Surface repricing banner if divergence detected */}
            {ivEnv.divergence && (
              <span style={{ fontSize: 11, fontWeight: 700, color: ivEnv.color,
                             padding: '2px 10px', borderRadius: 4,
                             background: ivEnv.color + '15', border: '1px solid ' + ivEnv.color + '44' }}>
                {ivEnv.icon} SURFACE REPRICING {ivEnv.divergence.toUpperCase()}
                <span style={{ fontSize: 9, fontWeight: 400, color: '#64748b', marginLeft: 8 }}>
                  CE {ivEnv.ceDev > 0 ? '+' : ''}{ivEnv.ceDev.toFixed(1)}% · PE {ivEnv.peDev > 0 ? '+' : ''}{ivEnv.peDev.toFixed(1)}% vs B1
                </span>
              </span>
            )}
          </div>
          {confluenceZones.map(function(z, i) {
            var isBuyer  = z.type === 'buyer';
            var icon     = isBuyer
              ? (z.side === 'ce' ? '📈' : '📉')
              : (z.bias === 'BULLISH' ? '🛡' : '🚧');
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px',
                                    background: z.color + (isBuyer ? '0d' : '06'),
                                    border: '1px solid ' + z.color + (isBuyer ? '44' : '22'),
                                    borderLeft: '3px solid ' + z.color + (isBuyer ? '' : '88'),
                                    borderRadius: 6, flexWrap: 'wrap' }}>
                {/* Type badge */}
                <span style={{ fontSize: 9, fontWeight: 700, color: isBuyer ? z.color : '#64748b',
                               padding: '1px 6px', borderRadius: 3,
                               background: isBuyer ? z.color + '20' : '#1e293b',
                               border: '1px solid ' + (isBuyer ? z.color + '44' : '#334155'),
                               textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {isBuyer ? (z.side === 'ce' ? 'CALL' : 'PUT') : z.side.toUpperCase()}
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: isBuyer ? z.color : '#94a3b8' }}>
                  {icon} {z.driverLabel}
                </span>
                <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                  {z.strikes.join(' · ')}
                </span>
                <span style={{ fontSize: 10, color: '#475569' }}>
                  {z.rows.length} strike{z.rows.length > 1 ? 's' : ''}
                </span>
                {z.confirmNote && (
                  <span style={{ fontSize: 10, color: isBuyer ? z.color : '#64748b',
                                 padding: '1px 7px', borderRadius: 4,
                                 background: isBuyer ? z.color + '15' : '#1e293b',
                                 border: '1px solid ' + (isBuyer ? z.color + '33' : '#334155') }}>
                    {z.confirmNote}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Raw Data Table: CE | STRIKE | PE ── */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#0d1424' }}>
              <th colSpan={5} style={{ padding: '7px 10px', color: '#f87171', fontWeight: 700, textAlign: 'center', fontSize: 10, letterSpacing: '0.08em', borderBottom: '2px solid #f8717133' }}>
                ◀ CALLS (CE)
              </th>
              <th style={{ padding: '7px 14px', color: '#60a5fa', fontWeight: 700, textAlign: 'center', fontSize: 10, letterSpacing: '0.08em', borderBottom: '2px solid #60a5fa33', background: '#0a1020' }}>
                STRIKE
              </th>
              <th colSpan={5} style={{ padding: '7px 10px', color: '#4ade80', fontWeight: 700, textAlign: 'center', fontSize: 10, letterSpacing: '0.08em', borderBottom: '2px solid #4ade8033' }}>
                PUTS (PE) ▶
              </th>
            </tr>
            <tr style={{ background: '#1a2332' }}>
              {/* CE headers — reading inward toward strike */}
              <th style={{ padding: '6px 10px', color: '#f87171', fontWeight: 600, textAlign: 'left',  fontSize: 9, whiteSpace: 'nowrap' }}>Driver</th>
              <th style={{ padding: '6px 10px', color: '#f87171', fontWeight: 600, textAlign: 'right', fontSize: 9, whiteSpace: 'nowrap' }}>IV · B1 · B2</th>
              <th style={{ padding: '6px 10px', color: '#f87171', fontWeight: 600, textAlign: 'right', fontSize: 9, whiteSpace: 'nowrap' }}>COI</th>
              <th style={{ padding: '6px 10px', color: '#f87171', fontWeight: 600, textAlign: 'right', fontSize: 9, whiteSpace: 'nowrap' }}>Cum OI</th>
              <th style={{ padding: '6px 10px', color: '#f87171', fontWeight: 600, textAlign: 'right', fontSize: 9, whiteSpace: 'nowrap', borderRight: '2px solid #1e293b' }}>OI</th>
              {/* Strike */}
              <th style={{ padding: '6px 14px', color: '#475569', fontWeight: 600, textAlign: 'center', fontSize: 9, background: '#0a1020' }}>
                <span style={{ display: 'block', fontSize: 8, color: '#334155' }}>VIX {vix > 0 ? vix.toFixed(1) : '—'}</span>
              </th>
              {/* PE headers — reading outward from strike */}
              <th style={{ padding: '6px 10px', color: '#4ade80', fontWeight: 600, textAlign: 'left',  fontSize: 9, whiteSpace: 'nowrap', borderLeft: '2px solid #1e293b' }}>OI</th>
              <th style={{ padding: '6px 10px', color: '#4ade80', fontWeight: 600, textAlign: 'left',  fontSize: 9, whiteSpace: 'nowrap' }}>Cum OI</th>
              <th style={{ padding: '6px 10px', color: '#4ade80', fontWeight: 600, textAlign: 'left',  fontSize: 9, whiteSpace: 'nowrap' }}>COI</th>
              <th style={{ padding: '6px 10px', color: '#4ade80', fontWeight: 600, textAlign: 'left',  fontSize: 9, whiteSpace: 'nowrap' }}>IV · B1 · B2</th>
              <th style={{ padding: '6px 10px', color: '#4ade80', fontWeight: 600, textAlign: 'right', fontSize: 9, whiteSpace: 'nowrap' }}>Driver</th>
            </tr>
          </thead>
          <tbody>
            {strikes.map(function(row) {
              if (!row) return null;
              var isATM  = row.strike === atm || row.is_atm;
              var rowBg  = isATM ? 'rgba(96,165,250,0.06)' : 'transparent';

              // ── compute all raw values ──
              function mkSide(side) {
                var iv      = side === 'ce' ? (row.ce_iv || 0) : (row.pe_iv || 0);
                var oi      = side === 'ce' ? (row.ce_oi || 0) : (row.pe_oi || 0);
                var coi     = side === 'ce' ? (row.ce_chg_oi || 0) : (row.pe_chg_oi || 0);
                var b1iv    = getB1IV(row.strike, side);
                var b2iv    = getB2IV(row.strike, side);
                var b1Dev   = (b1iv && b1iv > 0) ? ((iv - b1iv) / b1iv) * 100 : null;
                var b2Dev   = (b2iv && b2iv > 0) ? ((iv - b2iv) / b2iv) * 100 : null;
                var openOI  = getOpenOI(row.strike, side);
                var cumOI   = (openOI && openOI > 0) ? oi - openOI : null;
                var drv     = isATM ? { label: '—', color: '#334155', buyerFriendly: false } : driver(row, side);
                var ivD     = isATM ? '→' : ivDir(row.strike, side);
                return { iv: iv, oi: oi, coi: coi, b1Dev: b1Dev, b2Dev: b2Dev, cumOI: cumOI, drv: drv, ivD: ivD };
              }

              var ce = mkSide('ce');
              var pe = mkSide('pe');

              // Highlight row if either side is buyer-friendly with IV above B1
              var ceActive = !isATM && ce.drv.buyerFriendly && ce.b1Dev !== null && ce.b1Dev > 0;
              var peActive = !isATM && pe.drv.buyerFriendly && pe.b1Dev !== null && pe.b1Dev > 0;
              var rowHighlight = ceActive ? 'rgba(74,222,128,0.04)' : peActive ? 'rgba(248,113,113,0.04)' : rowBg;

              // Color helpers
              function coiColor(v, side) {
                // For buyers: COI positive on CE = call demand, negative on PE = put demand being removed
                if (v === 0) return '#334155';
                if (side === 'ce') return v > 0 ? '#4ade80' : '#f87171';
                return v > 0 ? '#4ade80' : '#f87171';
              }
              function devColor(v, side) {
                // Positive deviation (IV above baseline) = green for both
                // Negative = red — IV falling is bad for buyers
                if (v === null) return '#334155';
                if (v > 1.5) return '#4ade80';
                if (v > 0)   return '#a3e635';
                if (v > -1)  return '#f59e0b';
                return '#f87171';
              }
              function oisize(n) {
                if (!n && n !== 0) return '—';
                var a = Math.abs(n);
                if (a >= 10000000) return (n/10000000).toFixed(1)+'Cr';
                if (a >= 100000)   return (n/100000).toFixed(1)+'L';
                if (a >= 1000)     return (n/1000).toFixed(0)+'K';
                return String(n);
              }
              function coiFmt(n) {
                if (!n && n !== 0) return '—';
                var s = n > 0 ? '+' : '';
                var a = Math.abs(n);
                if (a >= 100000) return s+(a/100000).toFixed(1)+'L';
                if (a >= 1000)   return s+(a/1000).toFixed(0)+'K';
                return s+n;
              }
              function cumFmt(n) {
                if (n === null) return '—';
                var s = n > 0 ? '+' : '';
                var a = Math.abs(n);
                if (a >= 100000) return s+(a/100000).toFixed(1)+'L';
                if (a >= 1000)   return s+(a/1000).toFixed(0)+'K';
                return s+n;
              }
              function devFmt(v) {
                if (v === null) return '—';
                return (v > 0 ? '+' : '') + v.toFixed(1) + '%';
              }
              function ivFmt(v) { return v > 0 ? v.toFixed(1)+'%' : '—'; }

              // Driver cell — buyer-friendly drivers get color, others grey
              function drvCell(drv, ivD, side) {
                var label = drv.label;
                var ivDColor = ivD === '↑↑' || ivD === '↑' ? '#4ade80' : ivD === '↓↓' || ivD === '↓' ? '#f87171' : '#475569';
                if (label === '—') return (
                  <span style={{ color: '#334155', fontSize: 10 }}>— {ivD}</span>
                );
                var col = drv.buyerFriendly
                  ? (side === 'ce' ? '#4ade80' : '#f87171')
                  : '#475569';
                return (
                  <span>
                    <span style={{ fontSize: 11, fontWeight: drv.buyerFriendly ? 800 : 400, color: col,
                                   padding: drv.buyerFriendly ? '1px 5px' : '0',
                                   background: drv.buyerFriendly ? col+'15' : 'transparent',
                                   borderRadius: 3, border: drv.buyerFriendly ? '1px solid '+col+'44' : 'none' }}>
                      {label}
                    </span>
                    <span style={{ fontSize: 10, color: ivDColor, marginLeft: 4 }}>{ivD}</span>
                  </span>
                );
              }

              return (
                <tr key={row.strike} style={{ background: rowHighlight, borderBottom: '1px solid #1e293b22',
                                              borderLeft: ceActive ? '2px solid #4ade8033' : peActive ? '2px solid #f8717133' : '2px solid transparent' }}>

                  {/* ── CE side (Driver | IV·B1·B2 | COI | CumOI | OI) ── */}
                  <td style={{ padding: '8px 10px', textAlign: 'left', borderRight: '1px solid #1e293b22' }}>
                    {isATM ? <span style={{ color: '#334155', fontSize: 10 }}>—</span> : drvCell(ce.drv, ce.ivD, 'ce')}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', borderRight: '1px solid #1e293b22' }}>
                    {isATM ? <span style={{ color: '#334155', fontFamily: 'monospace', fontSize: 11 }}>—</span> : (
                      <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
                        <span style={{ color: '#94a3b8' }}>{ivFmt(ce.iv)}</span>
                        <span style={{ color: '#1e293b', margin: '0 2px' }}>·</span>
                        <span style={{ color: devColor(ce.b1Dev, 'ce'), fontWeight: ce.b1Dev !== null && Math.abs(ce.b1Dev) > 1 ? 700 : 400 }}>{devFmt(ce.b1Dev)}</span>
                        <span style={{ color: '#1e293b', margin: '0 2px' }}>·</span>
                        <span style={{ color: devColor(ce.b2Dev, 'ce'), fontWeight: ce.b2Dev !== null && Math.abs(ce.b2Dev) > 1 ? 700 : 400 }}>{devFmt(ce.b2Dev)}</span>
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontSize: 11,
                               color: coiColor(ce.coi, 'ce'), fontWeight: Math.abs(ce.coi) > 1000 ? 700 : 400,
                               borderRight: '1px solid #1e293b22' }}>
                    {coiFmt(ce.coi)}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontSize: 11,
                               color: ce.cumOI !== null ? (ce.cumOI > 0 ? '#4ade80' : ce.cumOI < 0 ? '#f87171' : '#475569') : '#334155',
                               fontWeight: ce.cumOI !== null && Math.abs(ce.cumOI) > 5000 ? 700 : 400,
                               borderRight: '1px solid #1e293b22' }}>
                    {cumFmt(ce.cumOI)}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#f87171', fontWeight: 600,
                               fontSize: 11, borderRight: '2px solid #1e293b' }}>
                    {oisize(ce.oi)}
                  </td>

                  {/* ── STRIKE ── */}
                  <td style={{ padding: '8px 14px', textAlign: 'center', background: isATM ? 'rgba(96,165,250,0.1)' : '#0a1020',
                               borderLeft: '2px solid #1e293b', borderRight: '2px solid #1e293b' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: isATM ? '#60a5fa' : '#f1f5f9' }}>
                      {row.strike.toLocaleString()}
                    </span>
                    {isATM && <span style={{ display: 'block', fontSize: 8, color: '#60a5fa', fontWeight: 700, letterSpacing: '0.06em' }}>ATM</span>}
                  </td>

                  {/* ── PE side (OI | CumOI | COI | IV·B1·B2 | Driver) ── */}
                  <td style={{ padding: '8px 10px', textAlign: 'left', color: '#4ade80', fontWeight: 600,
                               fontSize: 11, borderLeft: '2px solid #1e293b', borderRight: '1px solid #1e293b22' }}>
                    {oisize(pe.oi)}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'left', fontFamily: 'monospace', fontSize: 11,
                               color: pe.cumOI !== null ? (pe.cumOI > 0 ? '#4ade80' : pe.cumOI < 0 ? '#f87171' : '#475569') : '#334155',
                               fontWeight: pe.cumOI !== null && Math.abs(pe.cumOI) > 5000 ? 700 : 400,
                               borderRight: '1px solid #1e293b22' }}>
                    {cumFmt(pe.cumOI)}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'left', fontFamily: 'monospace', fontSize: 11,
                               color: coiColor(pe.coi, 'pe'), fontWeight: Math.abs(pe.coi) > 1000 ? 700 : 400,
                               borderRight: '1px solid #1e293b22' }}>
                    {coiFmt(pe.coi)}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'left', borderRight: '1px solid #1e293b22' }}>
                    {isATM ? <span style={{ color: '#334155', fontFamily: 'monospace', fontSize: 11 }}>—</span> : (
                      <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
                        <span style={{ color: '#94a3b8' }}>{ivFmt(pe.iv)}</span>
                        <span style={{ color: '#1e293b', margin: '0 2px' }}>·</span>
                        <span style={{ color: devColor(pe.b1Dev, 'pe'), fontWeight: pe.b1Dev !== null && Math.abs(pe.b1Dev) > 1 ? 700 : 400 }}>{devFmt(pe.b1Dev)}</span>
                        <span style={{ color: '#1e293b', margin: '0 2px' }}>·</span>
                        <span style={{ color: devColor(pe.b2Dev, 'pe'), fontWeight: pe.b2Dev !== null && Math.abs(pe.b2Dev) > 1 ? 700 : 400 }}>{devFmt(pe.b2Dev)}</span>
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                    {isATM ? <span style={{ color: '#334155', fontSize: 10 }}>—</span> : drvCell(pe.drv, pe.ivD, 'pe')}
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Footer: how to read ── */}
      <div style={{ padding: '10px 20px', borderTop: '1px solid #1e293b', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'BUY',    color: '#4ade80', desc: 'OI↑ + IV↑  — buyer lifting ask, best entry' },
          { label: 'COVER',  color: '#f59e0b', desc: 'OI↓ + IV↑  — writers forced to exit, strong momentum' },
          { label: 'IV↑',    color: '#4ade8088', desc: 'IV above B1, OI flat — demand building, no fresh OI yet' },
          { label: 'WRITE',  color: '#475569', desc: 'OI↑ + IV↓  — writer selling, avoid buying here' },
          { label: 'UNWIND', color: '#334155', desc: 'OI↓ + IV↓  — longs exiting, no buyer interest' },
          { label: 'IV↓',    color: '#64748b88', desc: 'IV below B1, OI flat — supply building, writers active' },
        ].map(function(d) {
          return (
            <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: d.color, padding: '1px 6px',
                             background: d.color+'15', borderRadius: 3, border: '1px solid '+d.color+'44' }}>
                {d.label}
              </span>
              <span style={{ fontSize: 10, color: '#475569' }}>{d.desc}</span>
            </div>
          );
        })}
      </div>

      {/* ── Glossary ── */}
      <div style={{ borderTop: '1px solid #1e293b', padding: '12px 20px' }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#475569', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Glossary — tap to expand
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 5 }}>
          {[
            { term: 'IV',        desc: 'Implied Volatility at this strike right now. Rising IV = premium being bid up = demand. Falling IV = premium being sold = supply.' },
            { term: 'B1',        desc: 'IV deviation from the 10:00–10:15 settled baseline. Positive = IV above session start. Green = demand building vs whole day.' },
            { term: 'B2',        desc: 'IV deviation from the rolling 45-min average. Positive = IV rising recently. Both B1 and B2 positive = sustained demand.' },
            { term: 'COI',       desc: 'Change in Open Interest this snapshot. Fresh contracts entering. High positive COI with rising IV = genuine new buying.' },
            { term: 'Cum OI',    desc: 'Total OI change from 9:15 open. Session-level picture — tells you how much position has built overall, not just this tick.' },
            { term: 'OI',        desc: 'Total open interest at this strike. Large OI = institutionally significant level. Signals at high-OI strikes matter more.' },
            { term: 'Driver',    desc: 'BUY: OI↑+IV↑ — buyer active. COVER: OI↓+IV↑ — writers exiting under pressure. WRITE: OI↑+IV↓ — writer active, avoid buying. UNWIND: OI↓+IV↓ — longs leaving.' },
            { term: 'Confluence',desc: 'Multiple adjacent strikes showing the same buyer signal. 2+ strikes aligned = institutional zone, not single-strike noise. Confirmed = opposite side agrees.' },
          ].map(function(item, i) {
            var isOpen = openGloss === i;
            return (
              <div key={i} onClick={function() { setOpenGloss(isOpen ? null : i); }}
                style={{ background: isOpen ? 'rgba(96,165,250,0.05)' : '#0f172a',
                         border: '1px solid '+(isOpen ? '#334155' : '#1e293b'),
                         borderRadius: 6, padding: '7px 10px', cursor: 'pointer', transition: 'all 0.15s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: isOpen ? '#60a5fa' : '#94a3b8', fontFamily: 'monospace' }}>{item.term}</span>
                  <span style={{ color: '#334155', fontSize: 11 }}>{isOpen ? '−' : '+'}</span>
                </div>
                {isOpen && <p style={{ fontSize: 11, color: '#64748b', margin: '6px 0 0', lineHeight: 1.6, borderTop: '1px solid #1e293b', paddingTop: 6 }}>{item.desc}</p>}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

// ─── End OTMPositioning ──────────────────────────────────────────────────────

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
    if (Math.abs(n) >= 100000) return (n / 100000).toFixed(1) + 'L';
    if (Math.abs(n) >= 1000)   return (n / 1000).toFixed(0) + 'K';
    return n;
  }

  function fmtCOI(n) {
    if (!n && n !== 0) return '—';
    var sign = n < 0 ? '-' : '+';
    var abs  = Math.abs(n);
    if (abs >= 100000) return sign + (abs / 100000).toFixed(1) + 'L';
    if (abs >= 1000)   return sign + (abs / 1000).toFixed(0) + 'K';
    return (n >= 0 ? '+' : '') + n;
  }

  function StrikeCard(p) {
    var item      = p.item;
    var side      = p.side;
    var rank      = p.rank;
    var borderCol = side === 'call' ? '#f87171' : '#4ade80';
    var sideLabel = side === 'call' ? 'CALL' : 'PUT';
    var maxScore  = 65;
    var scorePct  = Math.min((item.score / maxScore) * 100, 100);
    var scoreCol  = item.score >= 40 ? '#4ade80' : item.score >= 20 ? '#f59e0b' : '#f87171';
    var myCOICol  = (item.chg_oi || 0) >= 0 ? '#4ade80' : '#f87171';
    var oppCOICol = (item.opp_chgoi || 0) >= 0 ? '#4ade80' : '#f87171';

    return (
      <div style={{
        background:   '#0f172a',
        border:       '1px solid ' + borderCol + '44',
        borderLeft:   '3px solid ' + borderCol,
        borderRadius: 10,
        padding:      '14px 16px',
        flex:         1,
        minWidth:     210,
        maxWidth:     320,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#334155' }}>#{rank}</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9' }}>{item.strike}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: borderCol + '22', color: borderCol }}>
                {sideLabel}
              </span>
            </div>
            <span style={{ fontSize: 10, color: '#475569' }}>
              {item.otm_pct}% OTM · ₹{item.ltp} LTP
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: scoreCol, margin: 0 }}>{item.score}</p>
            <p style={{ fontSize: 9, color: '#475569', margin: 0 }}>score</p>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
          <div style={{ background: '#1e293b', borderRadius: 6, padding: '6px 10px' }}>
            <p style={{ fontSize: 9, color: '#64748b', margin: '0 0 2px', fontWeight: 700 }}>VOLUME</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{fmtVol(item.volume)}</p>
          </div>
          <div style={{ background: '#1e293b', borderRadius: 6, padding: '6px 10px' }}>
            <p style={{ fontSize: 9, color: '#64748b', margin: '0 0 2px', fontWeight: 700 }}>IV</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: item.iv > 28 ? '#f87171' : '#f59e0b', margin: 0 }}>
              {item.iv}%
              {item.iv_rising && <span style={{ fontSize: 9, color: '#f87171', marginLeft: 3 }}>↑</span>}
            </p>
          </div>
          <div style={{ background: '#1e293b', borderRadius: 6, padding: '6px 10px' }}>
            <p style={{ fontSize: 9, color: '#64748b', margin: '0 0 2px', fontWeight: 700 }}>
              {side === 'call' ? 'CE COI' : 'PE COI'}
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: myCOICol, margin: 0 }}>
              {fmtCOI(item.chg_oi)}
            </p>
          </div>
          <div style={{ background: '#1e293b', borderRadius: 6, padding: '6px 10px' }}>
            <p style={{ fontSize: 9, color: '#64748b', margin: '0 0 2px', fontWeight: 700 }}>
              {side === 'call' ? 'PE COI (opp)' : 'CE COI (opp)'}
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: oppCOICol, margin: 0 }}>
              {fmtCOI(item.opp_chgoi)}
            </p>
          </div>
        </div>

        {/* Score bar */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ height: 4, background: '#1e293b', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: scorePct + '%', height: '100%', background: scoreCol, borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Reasons */}
        {item.reason && item.reason !== '—' && (
          <p style={{ fontSize: 10, color: '#475569', margin: 0, lineHeight: 1.6 }}>
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
          <p style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🎯 Top Strikes for Option Buyers
          </p>
          <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>
            OTM only · High volume · Low writer activity · Opposite side writing pressure · Moderate IV
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
        <p style={{ fontSize: 12, color: '#475569', margin: '0 0 16px' }}>
          No qualifying calls — all OTM calls either writer-dominated or IV too high
        </p>
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
        <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>
          No qualifying puts — all OTM puts either writer-dominated or IV too high
        </p>
      ) : (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {topPuts.map(function(item, i) {
            return <StrikeCard key={item.strike + '-put'} item={item} side="put" rank={i + 1} />;
          })}
        </div>
      )}

      <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid #1e293b' }}>
        <p style={{ fontSize: 10, color: '#334155', margin: 0 }}>
          OTM only (0.3–3.5% from spot) · Score = volume + writer activity + opposite-side pressure + IV · Not financial advice
        </p>
      </div>
    </div>
  );
}
function PreTradeModal(props) {
  var data     = props.data     || {};
  var overview = props.overview || {};
  var symbol   = props.symbol   || 'NIFTY';
  var onClose  = props.onClose;

  var [checks, setChecks] = React.useState({ sl: false, target: false, notChasing: false, noEvent: false });
  var [news, setNews]     = React.useState([]);

  React.useEffect(function() {
    fetch('http://localhost:3001/api/news')
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (!Array.isArray(d)) return;
        var keywords = [
          'fed','fomc','rate hike','rate cut','inflation','cpi','gdp',
          'recession','market crash','sell off','selloff','dow jones','nasdaq 100',
          'crude oil','brent','dollar index','rupee falls','rupee rises','bond yield',
          'powell','interest rate','monetary policy','tariff','trade war',
          'global markets','us markets','asian markets','european markets',
          'bear market','bull market','volatility','vix','nifty falls','nifty rises',
          'sensex falls','sensex rises','rbi rate','rbi policy','rbi governor',
          'foreign investors','fii','rate decision','stock market today',
          'markets fall','markets rise','s&p 500','treasury'
        ];
        var excludeKeywords = [
          'top gainers','top losers','gainers & losers','q4 result','q3 result',
          'board meeting','dividend','ipo','buyback','bonus share','stock split',
          'sets board','declares result','quarterly result','sets record date'
        ];
        var filtered = d.filter(function(item) {
          var text = (item.title + ' ' + (item.summary || '')).toLowerCase();
          var hasKeyword = keywords.some(function(k) { return text.includes(k); });
          var isExcluded = excludeKeywords.some(function(k) { return text.includes(k); });
          return hasKeyword && isExcluded === false;
        });
        setNews(filtered.slice(0, 8));
      })
      .catch(function() {});
  }, []);

  function toggleCheck(key) {
    setChecks(function(prev) { return Object.assign({}, prev, { [key]: !prev[key] }); });
  }

  // 9 indices — each gets its own mini chart widget injected into its ref
  var indices = [
    { sym: 'FOREXCOM:SPX500', label: 'S&P 500',     group: 'US' },
    { sym: 'FOREXCOM:DJI',    label: 'Dow Jones',   group: 'US' },
    { sym: 'FOREXCOM:EU50',   label: 'EU Stoxx 50', group: 'Europe' },
    { sym: 'SPREADEX:FTSE',   label: 'FTSE 100',    group: 'Europe' },
  ];

  var chartRefs = React.useRef([]);

  React.useEffect(function() {
    indices.forEach(function(idx, i) {
      var el = chartRefs.current[i];
      if (!el) return;
      el.innerHTML = '';
      var container = document.createElement('div');
      container.className = 'tradingview-widget-container';
      container.style.height = '100%';
      var inner = document.createElement('div');
      inner.className = 'tradingview-widget-container__widget';
      inner.style.height = '100%';
      container.appendChild(inner);
      var script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.async = true;
      script.innerHTML = JSON.stringify({
        symbol:           idx.sym,
        interval:         '15',
        timezone:         'Asia/Kolkata',
        theme:            'dark',
        style:            '1',
        locale:           'en',
        toolbar_bg:       '#0a1628',
        enable_publishing: false,
        hide_top_toolbar: true,
        hide_legend:      true,
        save_image:       false,
        container_id:     'tv_' + i,
        width:            '100%',
        height:           220,
        isTransparent:    true,
        backgroundColor:  'rgba(10,22,40,0)',
        gridColor:        'rgba(30,41,59,0.5)',
        studies:          ['VWAP@tv-basicstudies'],
      });
      container.appendChild(script);
      el.appendChild(container);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived conditions from existing data
  var vix       = overview['VIX'] || {};
  var breadth   = overview['breadth'] || {};
  var niftyData = overview['NIFTY'] || {};

  var ivHist    = data.iv_history || [];
  var ivLast    = ivHist.length >= 2 ? ivHist[ivHist.length - 1] : null;
  var ivPrev    = ivHist.length >= 2 ? ivHist[ivHist.length - 2] : null;

  // PCR COI trend — last 4 readings
  var pcrHist   = data.pcr_history || [];
  var pcrLast4  = pcrHist.slice(-4);
  var pcrNow    = data.pcr_total || 0;
  var pcrTrend  = pcrLast4.length >= 2
    ? (pcrLast4[pcrLast4.length-1].pcr > pcrLast4[0].pcr ? 'up' : 'down')
    : 'flat';

  // IV signal from last snapshot
  var ivSignal = null;
  if (ivLast && ivPrev) {
    var spotUp  = (ivLast.spot || 0) > (ivPrev.spot || 0);
    var spotDn  = (ivLast.spot || 0) < (ivPrev.spot || 0);
    var ceUp    = ivLast.ce_iv > ivPrev.ce_iv;
    var peDn    = ivLast.pe_iv < ivPrev.pe_iv;
    var peUp    = ivLast.pe_iv > ivPrev.pe_iv;
    var ceDn    = ivLast.ce_iv < ivPrev.ce_iv;
    if      (spotUp && ceUp && peDn)  ivSignal = 'BREAKOUT';
    else if (spotDn && peUp && ceDn)  ivSignal = 'BREAKDOWN';
    else if (spotUp && ceDn && peUp)  ivSignal = 'TRAP RALLY';
    else if (spotDn && peDn && ceUp)  ivSignal = 'TRAP FALL';
    else if (spotUp && ceUp && peUp)  ivSignal = 'CAUTIOUS RALLY';
    else if (spotDn && peUp && ceUp)  ivSignal = 'CAUTIOUS FALL';
    else if (spotUp && ceDn && peDn)  ivSignal = 'WEAK RALLY';
    else if (spotDn && peDn && ceDn)  ivSignal = 'WEAK SELLING';
  }

  // Expiry days
  var tDays = data.top_strikes ? data.top_strikes.T_days : null;

  // Condition helpers
  function condColor(type) {
    if (type === 'green') return '#4ade80';
    if (type === 'amber') return '#f59e0b';
    return '#f87171';
  }
  function condBg(type) {
    if (type === 'green') return 'rgba(74,222,128,0.1)';
    if (type === 'amber') return 'rgba(245,158,11,0.1)';
    return 'rgba(248,113,113,0.1)';
  }

  // VIX condition
  var vixVal   = vix.last || 0;
  var vixType  = vixVal === 0 ? 'amber' : vixVal < 13 ? 'green' : vixVal < 20 ? 'amber' : 'red';
  var vixLabel = vixVal === 0 ? 'No data' : vixVal < 13 ? 'Low fear — options cheap' : vixVal < 20 ? 'Moderate — normal' : 'High fear — options expensive';

  // PCR condition
  var pcrType  = pcrNow > 1.2 ? 'green' : pcrNow > 0.8 ? 'amber' : 'red';
  var pcrLabel = (pcrNow > 1.2 ? 'Bullish' : pcrNow > 0.8 ? 'Neutral' : 'Bearish') + ' · PCR ' + pcrNow + ' trending ' + pcrTrend;

  // IV signal condition
  var ivType  = !ivSignal ? 'amber'
              : (ivSignal === 'BREAKOUT' || ivSignal === 'BREAKDOWN') ? 'green'
              : (ivSignal === 'TRAP RALLY' || ivSignal === 'TRAP FALL') ? 'red'
              : 'amber';
  var ivLabel = ivSignal || 'Not enough data (need 2+ snapshots)';

  // Breadth condition
  var adRatio  = breadth.ad_ratio || 0;
  var breadthType  = adRatio > 2 ? 'green' : adRatio > 0.8 ? 'amber' : 'red';
  var breadthLabel = breadth.advances
    ? 'A:' + breadth.advances + ' D:' + breadth.declines + ' · ' + (breadth.breadth || 'Neutral')
    : 'No data';

  // Expiry condition
  var expiryType  = tDays === null ? 'amber' : tDays > 5 ? 'green' : tDays > 1 ? 'amber' : 'red';
  var expiryLabel = tDays === null ? 'Unknown'
                  : tDays > 5 ? tDays + ' days to expiry — theta manageable'
                  : tDays > 1 ? tDays + ' days — theta accelerating, reduce size'
                  : 'Expiry day / tomorrow — extreme theta risk';

  // VWAP condition (from nifty overview)
  var niftyLast  = niftyData.last || 0;
  var niftyHigh  = niftyData.high || 0;
  var niftyLow   = niftyData.low  || 0;
  var vwapApprox = niftyHigh > 0 && niftyLow > 0 ? Math.round((niftyHigh + niftyLow + niftyLast) / 3) : 0;
  var vwapType   = vwapApprox === 0 ? 'amber' : niftyLast > vwapApprox ? 'green' : niftyLast < vwapApprox ? 'red' : 'amber';
  var vwapLabel  = vwapApprox > 0
    ? 'Spot ' + niftyLast + ' vs approx VWAP ' + vwapApprox + (niftyLast > vwapApprox ? ' — above VWAP' : ' — below VWAP')
    : 'Use Futures Dashboard for accurate VWAP';

  var crude      = overview['CRUDE'] || {};
  var crudeVal   = crude.last || 0;
  var crudeChg   = crude.pct_change || 0;
  var crudeLabel = crudeVal > 0
    ? '$' + crudeVal + ' · ' + (crudeChg > 0 ? '+' : '') + crudeChg + '% · '
      + (crudeChg > 2 ? 'Sharp rise — inflation risk for India' : crudeChg < -2 ? 'Falling — positive for India' : 'Stable — neutral')
    : 'No data';


  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.75)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}
    onClick={function(e) { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#0f172a', border: '1px solid #334155', borderRadius: 16,
        width: '98vw', maxWidth: 1600, maxHeight: '95vh', overflowY: 'auto',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '16px 20px', borderBottom: '1px solid #1e293b' }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>⚡ Pre-Trade Check — {symbol}</p>
            <p style={{ fontSize: 11, color: '#475569', margin: '3px 0 0' }}>Verify before entering. Click outside to close.</p>
          </div>
          <button onClick={onClose}
            style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
                     padding: '6px 14px', color: '#94a3b8', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
            ✕ Close
          </button>
        </div>

        {/* Global Indices — TradingView Mini Charts */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e293b' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: '0 0 4px',
                       textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Global Markets — Live Intraday Charts
          </p>
          <p style={{ fontSize: 10, color: '#334155', margin: '0 0 12px' }}>
            GIFT Nifty most relevant pre-market · During trading hours focus on S&P 500 + DAX direction
          </p>
          {['US', 'Europe'].map(function(group) {
            return (
              <div key={group} style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#475569', margin: '0 0 8px',
                             textTransform: 'uppercase', letterSpacing: '0.06em' }}>{group}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {indices.filter(function(idx) { return idx.group === group; }).map(function(idx, i) {
                    var globalIdx = indices.findIndex(function(x) { return x.sym === idx.sym; });
                    return (
                      <div key={idx.sym} style={{ background: '#0a1628', borderRadius: 8,
                                                   border: '1px solid #1e293b', overflow: 'hidden' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8',
                                     margin: 0, padding: '6px 10px 0', textAlign: 'center' }}>
                          {idx.label}
                        </p>
                        <div ref={function(el) { chartRefs.current[globalIdx] = el; }}
                             style={{ height: 220 }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── TIER 1: BLOCKERS ─────────────────────────────── */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 13 }}>🚫</span>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#f87171', margin: 0,
                         textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Blockers — any red here, do not trade
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            {/* Time of day */}
            {(function() {
              var now   = new Date();
              var h     = now.getHours();
              var m     = now.getMinutes();
              var mins  = h * 60 + m;
              var type, label, detail;
              if (mins < 9*60+15)  { type = 'amber'; label = 'Pre-market'; detail = 'Market not open yet'; }
              else if (mins < 9*60+45)  { type = 'red';   label = '9:15–9:45 AM'; detail = 'Opening volatility — wide spreads, avoid buying'; }
              else if (mins < 11*60+30) { type = 'green';  label = '9:45–11:30 AM'; detail = 'Best window — most directional moves happen here'; }
              else if (mins < 13*60+30) { type = 'amber'; label = '11:30–1:30 PM'; detail = 'Lunch lull — choppy, reduce size'; }
              else if (mins < 14*60+30) { type = 'green';  label = '1:30–2:30 PM'; detail = 'Second best window — good for directional trades'; }
              else if (mins < 15*60+15) { type = 'amber'; label = '2:30–3:15 PM'; detail = 'FII closing moves — can be sharp, be careful'; }
              else if (mins < 15*60+30) { type = 'red';   label = '3:15–3:30 PM'; detail = 'Last 15 min — wild swings, avoid new entries'; }
              else                      { type = 'amber'; label = 'After market'; detail = 'Market closed'; }
              var col = condColor(type); var bg = condBg(type);
              return (
                <div style={{ background: bg, border: '1px solid ' + col + '33', borderLeft: '3px solid ' + col, borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Time of Day</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: col }}>{label}</span>
                  </div>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{detail}</p>
                </div>
              );
            })()}

            {/* VIX */}
            {(function() {
              var col = condColor(vixType); var bg = condBg(vixType);
              return (
                <div style={{ background: bg, border: '1px solid ' + col + '33', borderLeft: '3px solid ' + col, borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>India VIX</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: col }}>{vixVal > 0 ? vixVal : '—'}</span>
                  </div>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{vixLabel}</p>
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── TIER 2: DIRECTION ────────────────────────────── */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13 }}>📊</span>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', margin: 0,
                         textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Direction — is there a clear edge?
            </p>
          </div>
          <p style={{ fontSize: 10, color: '#334155', margin: '0 0 12px 21px' }}>
            2 of 3 green → trade in the direction signals indicate · 1 of 3 → half size · 0 → wait
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {/* IV Signal */}
            {(function() {
              var col = condColor(ivType); var bg = condBg(ivType);
              return (
                <div style={{ background: bg, border: '1px solid ' + col + '33', borderLeft: '3px solid ' + col, borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>IV Signal</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: col }}>{ivSignal || '—'}</span>
                  </div>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{ivLabel}</p>
                </div>
              );
            })()}
            {/* PCR COI */}
            {(function() {
              var col = condColor(pcrType); var bg = condBg(pcrType);
              return (
                <div style={{ background: bg, border: '1px solid ' + col + '33', borderLeft: '3px solid ' + col, borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>PCR (OI)</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: col }}>{pcrNow || '—'}</span>
                  </div>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{pcrLabel}</p>
                </div>
              );
            })()}
            {/* VWAP */}
            {(function() {
              var col = condColor(vwapType); var bg = condBg(vwapType);
              return (
                <div style={{ background: bg, border: '1px solid ' + col + '33', borderLeft: '3px solid ' + col, borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>VWAP Position</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: col }}>{niftyLast > vwapApprox ? 'Above' : niftyLast < vwapApprox ? 'Below' : '—'}</span>
                  </div>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{vwapLabel}</p>
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── TIER 3: CONTEXT ──────────────────────────────── */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 13 }}>🌍</span>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', margin: 0,
                         textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Context — affects size, not direction
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {[
              { label: 'Market Breadth', type: breadthType,  value: adRatio > 0 ? adRatio + 'x' : '—', detail: breadthLabel },

              { label: 'USD/INR',        type: (function() { var u = overview['USDINR'] || {}; return u.is_up ? 'red' : u.last ? 'green' : 'amber'; })(),
                                         value: (function() { var u = overview['USDINR'] || {}; return u.last ? u.last : '—'; })(),
                                         detail: (function() { var u = overview['USDINR'] || {}; return u.last ? (u.is_up ? 'INR weakening — FII selling pressure, headwind for bulls' : 'INR strengthening — FII buying, tailwind for bulls') : 'No data'; })() },
            ].map(function(c, i) {
              var col = condColor(c.type); var bg = condBg(c.type);
              return (
                <div key={i} style={{ background: bg, border: '1px solid ' + col + '33', borderLeft: '3px solid ' + col, borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{c.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: col }}>{c.value}</span>
                  </div>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{c.detail}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── TIER 4: MY TRADE CHECKLIST ───────────────────── */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 13 }}>📋</span>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', margin: 0,
                         textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              My Trade — tick all before clicking buy
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {[
              { key: 'noEvent',    label: 'No major event in next 60 min',   desc: 'RBI, Fed, GDP, election results — check economic calendar' },
              { key: 'sl',         label: 'Stop loss defined',                desc: 'Know your max loss before entering. No stop = no trade.' },
              { key: 'target',     label: 'Target defined (min 1:2 R:R)',     desc: 'If risking ₹5,000, target must be ₹10,000+' },
              { key: 'notChasing', label: 'Not chasing the move',             desc: 'Has the move already happened? Buying after +80pts is usually wrong.' },
            ].map(function(item) {
              var checked = checks[item.key];
              return (
                <div key={item.key}
                     onClick={function() { toggleCheck(item.key); }}
                     style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 14px',
                              background: checked ? 'rgba(74,222,128,0.08)' : '#1e293b',
                              border: '1px solid ' + (checked ? '#4ade8033' : '#334155'),
                              borderLeft: '3px solid ' + (checked ? '#4ade80' : '#475569'),
                              borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
                                background: checked ? '#4ade80' : 'transparent',
                                border: '2px solid ' + (checked ? '#4ade80' : '#475569'),
                                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {checked && <span style={{ fontSize: 11, color: '#0f172a', fontWeight: 900, lineHeight: 1 }}>✓</span>}
                  </div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: checked ? '#4ade80' : '#94a3b8', margin: '0 0 2px' }}>{item.label}</p>
                    <p style={{ fontSize: 10, color: '#475569', margin: 0 }}>{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {/* All checked summary */}
          {(function() {
            var allChecked = checks.sl && checks.target && checks.notChasing && checks.noEvent;
            var count = [checks.sl, checks.target, checks.notChasing, checks.noEvent].filter(Boolean).length;
            var color = allChecked ? '#4ade80' : count >= 2 ? '#f59e0b' : '#f87171';
            var msg   = allChecked ? 'All checks passed — you are ready to trade' : count + '/4 checked — complete all before entering';
            return (
              <div style={{ marginTop: 10, padding: '10px 14px', background: color + '10',
                            border: '1px solid ' + color + '33', borderRadius: 8,
                            display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{allChecked ? '✅' : '⏳'}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: color }}>{msg}</span>
              </div>
            );
          })()}
        </div>

        {/* ── KEY EVENTS CALENDAR ──────────────────────────── */}
        {(function() {
          var today = new Date();
          var todayStr = today.toISOString().split('T')[0];

          // IST offset = +5:30

          // Known high-impact events for India — updated for 2026
          // F&O expiry = every Thursday, monthly = last Thursday
          function getNextThursdays(count) {
            var result = [];
            var d = new Date();
            d.setHours(0,0,0,0);
            while (result.length < count) {
              d.setDate(d.getDate() + 1);
              if (d.getDay() === 4) { // Thursday
                result.push(new Date(d));
              }
            }
            return result;
          }

          var thursdays = getNextThursdays(8);

          // Determine if a Thursday is monthly (last Thursday of that month)
          function isMonthlyExpiry(date) {
            var d = new Date(date);
            d.setDate(d.getDate() + 7);
            return d.getMonth() !== date.getMonth();
          }

          var events = [
            // Recurring F&O expiries
            ...thursdays.map(function(d) {
              var monthly = isMonthlyExpiry(d);
              return {
                date:   d.toISOString().split('T')[0],
                time:   '03:30 PM',
                event:  monthly ? 'Monthly F&O Expiry' : 'Weekly F&O Expiry',
                impact: monthly ? 'high' : 'medium',
                country:'IN',
                note:   monthly ? 'Monthly options expire — high volatility in last hour' : 'Weekly options expire — avoid buying after 2 PM',
              };
            }),
            // Known RBI MPC 2026 dates (published by RBI annually)
            { date: '2026-04-07', time: '10:00 AM', event: 'RBI MPC Decision',    impact: 'high', country: 'IN', note: 'Rate decision + policy statement. IV spikes before, crushes after.' },
            { date: '2026-06-06', time: '10:00 AM', event: 'RBI MPC Decision',    impact: 'high', country: 'IN', note: 'Rate decision + policy statement. IV spikes before, crushes after.' },
            { date: '2026-08-06', time: '10:00 AM', event: 'RBI MPC Decision',    impact: 'high', country: 'IN', note: 'Rate decision + policy statement. IV spikes before, crushes after.' },
            // US events that affect India
            { date: '2026-05-06', time: '11:30 PM', event: 'US FOMC Decision',    impact: 'high', country: 'US', note: 'Fed rate decision. India markets gap up/down next morning.' },
            { date: '2026-06-17', time: '11:30 PM', event: 'US FOMC Decision',    impact: 'high', country: 'US', note: 'Fed rate decision. India markets gap up/down next morning.' },
            // Monthly recurring
            { date: '2026-04-11', time: '05:30 PM', event: 'India CPI Inflation', impact: 'medium', country: 'IN', note: 'Higher than expected CPI = RBI hawkish = bearish for markets' },
            { date: '2026-05-13', time: '05:30 PM', event: 'India CPI Inflation', impact: 'medium', country: 'IN', note: 'Higher than expected CPI = RBI hawkish = bearish for markets' },
          ];

          // Sort by date, filter next 14 days
          var cutoff = new Date();
          cutoff.setDate(cutoff.getDate() + 14);
          var upcoming = events
            .filter(function(e) { return e.date >= todayStr && new Date(e.date) <= cutoff; })
            .sort(function(a, b) { return a.date.localeCompare(b.date); });

          var todayEvents = upcoming.filter(function(e) { return e.date === todayStr; });
          var futureEvents = upcoming.filter(function(e) { return e.date > todayStr; });

          function impactColor(impact) {
            return impact === 'high' ? '#f87171' : impact === 'medium' ? '#f59e0b' : '#4ade80';
          }

          function fmtDate(dateStr) {
            var d = new Date(dateStr + 'T00:00:00');
            var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
            var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            var diff = Math.round((d - new Date(todayStr + 'T00:00:00')) / 86400000);
            var label = diff === 1 ? 'Tomorrow' : diff === 0 ? 'Today' : days[d.getDay()] + ' ' + d.getDate() + ' ' + months[d.getMonth()];
            return label;
          }

          return (
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 13 }}>📅</span>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', margin: 0,
                             textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Key Events — next 14 days
                </p>
              </div>

              {/* Today's events — highlighted as blocker */}
              {todayEvents.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#f87171', margin: '0 0 6px',
                               textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    ⚠️ Today — review before trading
                  </p>
                  {todayEvents.map(function(e, i) {
                    return (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start',
                                            padding: '8px 12px', background: 'rgba(248,113,113,0.1)',
                                            border: '1px solid #f8717133', borderLeft: '3px solid #f87171',
                                            borderRadius: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                                       background: impactColor(e.impact) + '22', color: impactColor(e.impact),
                                       whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {e.country} · {e.impact.toUpperCase()}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{e.event}</span>
                            <span style={{ fontSize: 11, color: '#64748b' }}>{e.time}</span>
                          </div>
                          <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0' }}>{e.note}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {todayEvents.length === 0 && (
                <div style={{ padding: '8px 12px', background: 'rgba(74,222,128,0.08)',
                              border: '1px solid #4ade8033', borderRadius: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 600 }}>✓ No major events today</span>
                </div>
              )}

              {/* Upcoming events */}
              {futureEvents.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {futureEvents.slice(0, 8).map(function(e, i) {
                    var col = impactColor(e.impact);
                    return (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center',
                                            padding: '7px 12px', background: '#1e293b',
                                            border: '1px solid #334155', borderRadius: 8 }}>
                        <span style={{ fontSize: 10, color: '#475569', minWidth: 70, flexShrink: 0 }}>{fmtDate(e.date)}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                                       background: col + '18', color: col, flexShrink: 0, minWidth: 60, textAlign: 'center' }}>
                          {e.country} · {e.impact === 'high' ? 'HIGH' : e.impact === 'medium' ? 'MED' : 'LOW'}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#f1f5f9', flex: 1 }}>{e.event}</span>
                        <span style={{ fontSize: 10, color: '#475569', flexShrink: 0 }}>{e.time}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <p style={{ fontSize: 9, color: '#334155', margin: '10px 0 0' }}>
                F&O expiry dates auto-calculated · RBI MPC + FOMC dates for 2026 · Times in IST
              </p>
            </div>
          );
        })()}

        {/* ── LIVE NEWS FEED ───────────────────────────────── */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 13 }}>📰</span>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', margin: 0,
                         textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Latest Market News
            </p>
          </div>
          {news.length === 0 ? (
            <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>Loading news...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {news.map(function(item, i) {
                var isGlobal = item.region === 'GLOBAL';
                var tagCol   = isGlobal ? '#60a5fa' : '#f59e0b';
                var ago      = item.published_at
                  ? (function() {
                      var diff = Math.floor((Date.now() - new Date(item.published_at)) / 60000);
                      return diff < 60 ? diff + 'm ago' : Math.floor(diff/60) + 'h ago';
                    })()
                  : '';
                return (
                  <a key={i} href={item.url || '#'} target="_blank" rel="noreferrer"
                     style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 12px',
                              background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
                              textDecoration: 'none', transition: 'border-color 0.15s' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
                                   background: tagCol + '18', color: tagCol, flexShrink: 0, marginTop: 1 }}>
                      {item.source || 'NEWS'}
                    </span>
                    <span style={{ fontSize: 11, color: '#cbd5e1', flex: 1, lineHeight: 1.5 }}>
                      {item.title}
                    </span>
                    {ago && <span style={{ fontSize: 9, color: '#475569', flexShrink: 0, marginTop: 2 }}>{ago}</span>}
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* X / Twitter — Quick Links */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #1e293b' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: '0 0 12px',
                       textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Market Feeds — Open on X
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { handle: 'RedboxWire',     label: 'Redbox Wire',        desc: 'Breaking macro news' },
              { handle: 'markets',        label: 'Bloomberg Markets',   desc: 'Bloomberg live updates' },
              { handle: 'KobeissiLetter', label: 'Kobeissi Letter',    desc: 'Market flows + data' },
              { handle: 'zerohedge',      label: 'ZeroHedge',          desc: 'Market commentary' },
              { handle: 'elerianm',       label: 'Mohamed El-Erian',   desc: 'Fed, rates, macro' },
              { handle: 'unusual_whales', label: 'Unusual Whales',     desc: 'Options flow' },
            ].map(function(feed) {
              return (
                <a key={feed.handle}
                   href={'https://x.com/' + feed.handle}
                   target="_blank" rel="noreferrer"
                   style={{ display: 'flex', flexDirection: 'column', gap: 2,
                            padding: '10px 14px', background: '#1e293b',
                            border: '1px solid #334155', borderRadius: 8,
                            textDecoration: 'none', minWidth: 160, flex: 1,
                            transition: 'border-color 0.15s', cursor: 'pointer' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa' }}>@{feed.handle}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#f1f5f9' }}>{feed.label}</span>
                  <span style={{ fontSize: 10, color: '#475569' }}>{feed.desc}</span>
                </a>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}



// ── Intraday Trend Table (from /api/futures-dashboard) ───────────────────────

function fmtTime(t) {
  if (!t) return '—';
  var s = String(t).padStart(4, '0');
  return s.slice(0, 2) + ':' + s.slice(2);
}

function vwapSigCol(sig) {
  if (sig === 'BUY')  return '#4ade80';
  if (sig === 'SELL') return '#f87171';
  return '#f59e0b';
}

function IntradayTable(props) {
  var history     = props.history     || [];
  var strikeRange = props.strikeRange || 'full';
  var atm         = props.atm         || 0;
  var symbol      = props.symbol      || 'NIFTY';
  var step        = symbol === 'BANKNIFTY' ? 100 : 50;
  var isFiltered  = strikeRange !== 'full' && atm > 0;
  var rangeN      = isFiltered ? parseInt(strikeRange, 10) : 0;

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

  function fmtN(n) {
    if (!n && n !== 0) return '—';
    var sign = n < 0 ? '-' : '';
    var abs  = Math.abs(n);
    if (abs >= 10000000) return sign + (abs / 10000000).toFixed(2) + 'Cr';
    if (abs >= 100000)   return sign + (abs / 100000).toFixed(1) + 'L';
    if (abs >= 1000)     return sign + (abs / 1000).toFixed(0) + 'K';
    return String(n);
  }

  function fmtDiffN(n) {
    if (!n && n !== 0) return '—';
    var abs = Math.abs(n);
    if (abs >= 10000000) return (n > 0 ? '+' : '') + (n / 10000000).toFixed(2) + 'Cr';
    if (abs >= 100000)   return (n > 0 ? '+' : '') + (n / 100000).toFixed(1) + 'L';
    if (abs >= 1000)     return (n > 0 ? '+' : '') + (n / 1000).toFixed(0) + 'K';
    return (n > 0 ? '+' : '') + n;
  }

  // Recompute totals from per-strike breakdown if filter is active
  function computeRow(snap) {
    if (!isFiltered || !snap.strikes || !Object.keys(snap.strikes).length) {
      return {
        call_vol: snap.call_vol || 0,
        put_vol:  snap.put_vol  || 0,
        diff:     snap.diff     || 0,
        pcr:      snap.pcr      || 0,
        pcr_coi:  snap.pcr_coi  || 0,
      };
    }
    var snapAtm = snap.atm || atm;
    var lo = snapAtm - rangeN * step;
    var hi = snapAtm + rangeN * step;
    var ce_vol = 0, pe_vol = 0, ce_coi = 0, pe_coi = 0, ce_oi = 0, pe_oi = 0;
    Object.keys(snap.strikes).forEach(function(k) {
      var s = parseInt(k, 10);
      if (s < lo || s > hi) return;
      var r = snap.strikes[k];
      ce_vol += (r.ce_vol    || 0);
      pe_vol += (r.pe_vol    || 0);
      ce_coi += (r.ce_chg_oi || 0);
      pe_coi += (r.pe_chg_oi || 0);
      ce_oi  += (r.ce_oi     || 0);
      pe_oi  += (r.pe_oi     || 0);
    });
    var diff    = pe_vol - ce_vol;
    var pcr     = ce_oi  > 0 ? Math.round((pe_oi  / ce_oi)  * 100) / 100 : 0;
    var pcr_coi = ce_coi > 0 ? Math.round((pe_coi / ce_coi) * 100) / 100 : 0;
    return { call_vol: ce_vol, put_vol: pe_vol, diff: diff, pcr: pcr, pcr_coi: pcr_coi };
  }

  var rangeLabel = isFiltered ? 'ATM ±' + rangeN + ' · ' + (rangeN*2+1) + ' strikes' : 'Full Chain';

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isFiltered && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#60a5fa',
                           padding: '2px 8px', borderRadius: 4,
                           background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)' }}>
              {rangeLabel}
            </span>
          )}
          <span style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>USE DATA AFTER 10:30 AM</span>
        </div>
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
                <span style={{ display: 'block', fontSize: 9, color: '#475569', fontWeight: 400 }}>{rangeLabel}</span>
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
              var row        = computeRow(snap);
              var isFirst    = i === 0;
              var prev       = history[i + 1];
              var prevRow    = prev ? computeRow(prev) : null;
              var diffVal    = row.diff;
              var pcrUp      = prevRow && row.pcr > prevRow.pcr;
              var pcrDown    = prevRow && row.pcr < prevRow.pcr;
              var pcrArrow   = pcrUp ? ' ↑' : pcrDown ? ' ↓' : '';
              var pcrCol     = row.pcr > 1.2 ? '#4ade80' : row.pcr < 0.8 ? '#f87171' : '#f59e0b';
              var coiPcr     = row.pcr_coi;
              var coiPcrCol  = coiPcr > 1.2 ? '#4ade80' : coiPcr > 0 && coiPcr < 0.8 ? '#f87171' : '#f59e0b';
              var coiPcrUp   = prevRow && coiPcr > prevRow.pcr_coi;
              var coiPcrDown = prevRow && coiPcr < prevRow.pcr_coi;
              var coiArrow   = coiPcrUp ? ' ↑' : coiPcrDown ? ' ↓' : '';
              var diffCol    = diffVal > 0 ? '#4ade80' : diffVal < 0 ? '#f87171' : '#64748b';
              var priceCol   = snap.price > snap.vwap ? '#4ade80' : snap.price < snap.vwap ? '#f87171' : '#f1f5f9';

              // Recompute option signal from filtered values
              var optSig = snap.opt_signal;
              if (isFiltered) {
                optSig = (coiPcr > 1.2 && row.put_vol > row.call_vol) ? 'BUY'
                       : (coiPcr < 0.8 && coiPcr > 0 && row.call_vol > row.put_vol) ? 'SELL'
                       : 'NEUTRAL';
              }

              return (
                <tr key={i} style={{
                  background:   isFirst ? 'rgba(96,165,250,0.07)' : 'transparent',
                  borderBottom: '1px solid #1e293b22',
                  opacity:      isFirst ? 1 : Math.max(0.45, 1 - i * 0.025),
                }}>
                  <td style={{ padding: '9px 14px', fontWeight: isFirst ? 700 : 500,
                               color: isFirst ? '#f1f5f9' : '#94a3b8', whiteSpace: 'nowrap' }}>
                    {fmtTime(snap.time)}
                    {isFirst && <span style={{ display: 'block', fontSize: 8, color: '#4ade80', fontWeight: 700 }}>LATEST</span>}
                  </td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: '#f87171', fontWeight: 600 }}>{fmtN(row.call_vol)}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: '#4ade80', fontWeight: 600 }}>{fmtN(row.put_vol)}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: diffCol, fontWeight: 700 }}>{fmtDiffN(diffVal)}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'center', color: pcrCol, fontWeight: 700 }}>
                    {row.pcr > 0 ? row.pcr.toFixed(2) : '—'}
                    <span style={{ fontSize: 10, color: pcrUp ? '#4ade80' : pcrDown ? '#f87171' : '#64748b' }}>{pcrArrow}</span>
                  </td>
                  <td style={{ padding: '9px 14px', textAlign: 'center', color: coiPcrCol, fontWeight: 700 }}>
                    {coiPcr > 0 ? coiPcr.toFixed(2) : '—'}
                    <span style={{ fontSize: 10, color: coiPcrUp ? '#4ade80' : coiPcrDown ? '#f87171' : '#64748b' }}>{coiArrow}</span>
                  </td>
                  <td style={{ padding: '9px 14px', textAlign: 'center', borderLeft: '1px solid #1e293b' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: vwapSigCol(optSig) }}>{optSig}</span>
                  </td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: '#60a5fa', fontWeight: 600,
                               borderLeft: '1px solid #1e293b' }}>{snap.vwap || '—'}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: priceCol, fontWeight: 700 }}>{snap.price || '—'}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: vwapSigCol(snap.vwap_signal) }}>{snap.vwap_signal}</span>
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

// ─────────────────────────────────────────────────────────────────────────────

// ── OI Zone Analysis (ATM ±7 = 15 strikes) ──────────────────────────────────
function ZoneSplit(props) {
  var chain  = props.chain  || [];
  var atm    = props.atm    || 0;
  var symbol = props.symbol || 'NIFTY';
  var step   = symbol === 'BANKNIFTY' ? 100 : 50;

  if (!chain.length || !atm) return null;

  // 5 zones using ATM ±7 chain (15 strikes)
  // Deep OTM: ±6-7 (2 each side = 4 strikes)
  // OTM:      ±3-5 (3 each side = 6 strikes)
  // ATM:      ±0-2 (5 strikes)
  var zoneDefs = [
    { key: 'deep_ce', label: 'Deep OTM Calls', sub: 'ATM +6 to +7 · 2 strikes', side: 'ce', minD: 6, maxD: 7, dir:  1 },
    { key: 'otm_ce',  label: 'OTM Calls',      sub: 'ATM +3 to +5 · 3 strikes', side: 'ce', minD: 3, maxD: 5, dir:  1 },
    { key: 'atm',     label: 'ATM Zone',        sub: 'ATM ±2 · 5 strikes',       side: 'both', minD: 0, maxD: 2, dir: 0 },
    { key: 'otm_pe',  label: 'OTM Puts',        sub: 'ATM -3 to -5 · 3 strikes', side: 'pe', minD: 3, maxD: 5, dir: -1 },
    { key: 'deep_pe', label: 'Deep OTM Puts',   sub: 'ATM -6 to -7 · 2 strikes', side: 'pe', minD: 6, maxD: 7, dir: -1 },
  ];

  function getRows(minD, maxD, dir) {
    return chain.filter(function(r) {
      var dist = Math.abs(r.strike - atm) / step;
      return dist >= minD && dist <= maxD &&
        (dir === 0 || (dir > 0 && r.strike > atm) || (dir < 0 && r.strike < atm));
    });
  }

  function sumSide(rows, side) {
    var oi  = rows.reduce(function(s,r) { return s + (side==='ce' ? (r.ce_oi||0) : side==='pe' ? (r.pe_oi||0) : (r.ce_oi||0)+(r.pe_oi||0)); }, 0);
    var coi = rows.reduce(function(s,r) { return s + (side==='ce' ? (r.ce_chg_oi||0) : side==='pe' ? (r.pe_chg_oi||0) : (r.ce_chg_oi||0)+(r.pe_chg_oi||0)); }, 0);
    return { oi: oi, coi: coi, count: rows.length };
  }

  function fmtN(n) {
    var a=Math.abs(n), sg=n<0?'-':'+';
    if(a>=10000000) return sg+(a/10000000).toFixed(1)+'Cr';
    if(a>=100000)   return sg+(a/100000).toFixed(1)+'L';
    if(a>=1000)     return sg+(a/1000).toFixed(0)+'K';
    return sg+a;
  }
  function fmtAbs(n) {
    if(n>=10000000) return (n/10000000).toFixed(1)+'Cr';
    if(n>=100000)   return (n/100000).toFixed(1)+'L';
    if(n>=1000)     return (n/1000).toFixed(0)+'K';
    return n;
  }
  function arrow(coi, isDeep) {
    var th = isDeep ? 100000 : 250000;
    if(coi > th*2) return '↑↑'; if(coi > th) return '↑';
    if(coi < -th*2) return '↓↓'; if(coi < -th) return '↓';
    return '→';
  }
  function arrowCol(coi, side) {
    var up=coi>0, dn=coi<0;
    return side==='ce' ? (up?'#f87171':dn?'#4ade80':'#475569') : (up?'#4ade80':dn?'#f87171':'#475569');
  }

  var zData = zoneDefs.map(function(z) {
    var rows = getRows(z.minD, z.maxD, z.dir);
    return {
      z:    z,
      ce:   (z.side==='pe')   ? null : sumSide(rows, 'ce'),
      pe:   (z.side==='ce')   ? null : sumSide(rows, 'pe'),
      both: (z.side==='both') ? sumSide(rows, 'both') : null,
    };
  });

  // Reading logic
  var deepCeCOI = zData[0].ce ? zData[0].ce.coi : 0;
  var otmCeCOI  = zData[1].ce ? zData[1].ce.coi : 0;
  var otmPeCOI  = zData[3].pe ? zData[3].pe.coi : 0;
  var deepPeCOI = zData[4].pe ? zData[4].pe.coi : 0;

  var reading, rCol, rDesc;
  if (otmCeCOI < -200000 && otmPeCOI > 200000) {
    reading='⚡ BREAKOUT SETUP'; rCol='#4ade80';
    rDesc='Call writers covering resistance + put writers building support. Institutions positioning for upside. Consider buying calls on pullback to VWAP.';
  } else if (otmPeCOI < -200000 && otmCeCOI > 200000) {
    reading='⚡ BREAKDOWN SETUP'; rCol='#f87171';
    rDesc='Put writers abandoning support + call writers reinforcing resistance. Institutions positioning for downside. Consider buying puts on bounce to VWAP.';
  } else if (otmCeCOI > 200000 && otmPeCOI > 200000) {
    reading='↔ RANGE BOUND'; rCol='#f59e0b';
    rDesc='Institutions selling both OTM calls and puts — they expect no major move. Avoid directional bets, this favors option sellers.';
  } else if (deepCeCOI > 100000 && otmCeCOI < 0) {
    reading='🟣 SPECULATIVE CALL BUYING'; rCol='#a78bfa';
    rDesc='Deep OTM call buying while OTM resistance crumbling. Speculative bullish bet — momentum trade possible with confirmation.';
  } else if (deepPeCOI > 100000 && otmPeCOI < 0) {
    reading='🟣 SPECULATIVE PUT BUYING'; rCol='#a78bfa';
    rDesc='Deep OTM put buying while OTM support crumbling. Speculative bearish bet — momentum short possible with confirmation.';
  } else if (otmCeCOI > 200000) {
    reading='🔴 RESISTANCE BUILDING'; rCol='#f87171';
    rDesc='OTM call writers reinforcing ceiling. Upside capped until CE COI starts unwinding. Sell calls at resistance or wait for unwind.';
  } else if (otmPeCOI > 200000) {
    reading='🟢 SUPPORT BUILDING'; rCol='#4ade80';
    rDesc='OTM put writers reinforcing floor. Downside protected. Buy dips near support level.';
  } else {
    reading='NEUTRAL'; rCol='#64748b';
    rDesc='No clear institutional signal. Zones are balanced — wait for a clear directional setup before entering.';
  }

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #1e293b' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: 0,
                     textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          OI Zone Analysis — {symbol} @ {atm} · ATM ±7 (15 strikes)
        </p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#1e293b' }}>
              <th style={{ padding: '7px 12px', color: '#f87171', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>CE OI</th>
              <th style={{ padding: '7px 10px', color: '#f87171', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>CE COI</th>
              <th style={{ padding: '7px 6px',  color: '#f87171', textAlign: 'center', fontWeight: 600 }}>CE ↕</th>
              <th style={{ padding: '7px 20px', color: '#f1f5f9', textAlign: 'center', fontWeight: 700 }}>Zone</th>
              <th style={{ padding: '7px 6px',  color: '#4ade80', textAlign: 'center', fontWeight: 600 }}>PE ↕</th>
              <th style={{ padding: '7px 10px', color: '#4ade80', textAlign: 'left',  fontWeight: 600, whiteSpace: 'nowrap' }}>PE COI</th>
              <th style={{ padding: '7px 12px', color: '#4ade80', textAlign: 'left',  fontWeight: 600, whiteSpace: 'nowrap' }}>PE OI</th>
            </tr>
          </thead>
          <tbody>
            {zData.map(function(zd, i) {
              var isAtm  = zd.z.key === 'atm';
              var isDeep = zd.z.key === 'deep_ce' || zd.z.key === 'deep_pe';
              var bg     = isAtm ? 'rgba(96,165,250,0.07)' : 'transparent';
              var ceC    = zd.ce   ? zd.ce.coi   : zd.both ? zd.both.coi : null;
              var peC    = zd.pe   ? zd.pe.coi   : zd.both ? zd.both.coi : null;
              var ceOI   = zd.ce   ? zd.ce.oi    : zd.both ? zd.both.oi  : null;
              var peOI   = zd.pe   ? zd.pe.oi    : zd.both ? zd.both.oi  : null;
              return (
                <tr key={i} style={{ background: bg, borderBottom: '1px solid #1e293b22' }}>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#f87171', fontWeight: 600 }}>
                    {ceOI != null ? fmtAbs(ceOI) : '—'}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600,
                               color: ceC!=null ? (ceC>0?'#f87171':ceC<0?'#4ade80':'#64748b') : '#334155' }}>
                    {ceC != null ? fmtN(ceC) : '—'}
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                    {ceC != null && <span style={{ fontSize: 14, fontWeight: 800, color: arrowCol(ceC,'ce') }}>{arrow(ceC,isDeep)}</span>}
                  </td>
                  <td style={{ padding: '8px 20px', textAlign: 'center' }}>
                    <span style={{ fontSize: isAtm?12:11, fontWeight: isAtm?700:500, color: isAtm?'#60a5fa':'#94a3b8' }}>
                      {zd.z.label}
                    </span>
                    <span style={{ display: 'block', fontSize: 9, color: '#334155' }}>{zd.z.sub}</span>
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                    {peC != null && <span style={{ fontSize: 14, fontWeight: 800, color: arrowCol(peC,'pe') }}>{arrow(peC,isDeep)}</span>}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600,
                               color: peC!=null ? (peC>0?'#4ade80':peC<0?'#f87171':'#64748b') : '#334155' }}>
                    {peC != null ? fmtN(peC) : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'left', color: '#4ade80', fontWeight: 600 }}>
                    {peOI != null ? fmtAbs(peOI) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Reading */}
      <div style={{ padding: '10px 20px', background: rCol+'08', borderTop: '1px solid #1e293b',
                    borderLeft: '3px solid ' + rCol }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: rCol }}>{reading}</span>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.6 }}>{rDesc}</p>
      </div>

      <div style={{ padding: '6px 20px', fontSize: 9, color: '#334155' }}>
        CE ↑ red = call writing (resistance) · CE ↓ green = call unwind (bullish) · PE ↑ green = put writing (support) · PE ↓ red = put unwind (bearish) · ↑↑/↓↓ = strong sustained move
      </div>
    </div>
  );
}


// ── Alert System ─────────────────────────────────────────────────────────────
// ── Strike Monitor — live scoreboard, sits below ZoneSplit ───────────────────
function StrikeMonitor(props) {
  var chain   = props.chain   || [];
  var atm     = props.atm     || 0;
  var spot    = props.spot    || atm;
  var symbol  = props.symbol  || 'NIFTY';
  var alerts  = props.alerts  || [];
  var inline  = props.inline  || false;

  if (!chain.length || !atm) return null;

  var MIN_OI = 50000;
  var step   = symbol === 'BANKNIFTY' ? 100 : 50;

  function fmtOI(n) {
    if (!n) return '—';
    if (n >= 10000000) return (n/10000000).toFixed(1)+'Cr';
    if (n >= 100000)   return (n/100000).toFixed(1)+'L';
    if (n >= 1000)     return (n/1000).toFixed(0)+'K';
    return n;
  }
  function fmtCOI(n) {
    if (!n && n !== 0) return '—';
    var a = Math.abs(n), s = n > 0 ? '+' : '-';
    if (a >= 100000) return s+(a/100000).toFixed(1)+'L';
    if (a >= 1000)   return s+(a/1000).toFixed(0)+'K';
    return s+a;
  }

  var active = chain
    .filter(function(r) { return (r.ce_oi||0) > MIN_OI || (r.pe_oi||0) > MIN_OI; })
    .sort(function(a,b) { return b.strike - a.strike; });

  // Latest alert state per strike+side (last 30 min)
  var stateMap = {};
  var cutoff   = Date.now() - 30*60*1000;
  alerts.filter(function(a) { return a.symbol===symbol && a.ts && a.ts>cutoff && a.strike && a.side; })
    .forEach(function(a) {
      var k = a.strike+'|'+a.side;
      if (!stateMap[k] || a.ts > stateMap[k].ts) stateMap[k] = a;
    });

  // Build relative COI/OI ratios across ALL active strikes for both sides
  // so confidence% is ranked relative to peers, not a fixed threshold
  var relRatios = [];
  active.forEach(function(r) {
    ['ce','pe'].forEach(function(side) {
      var oi  = side==='ce' ? (r.ce_oi||0)      : (r.pe_oi||0);
      var coi = side==='ce' ? (r.ce_chg_oi||0)  : (r.pe_chg_oi||0);
      if (oi >= MIN_OI) relRatios.push(Math.abs(coi) / oi);
    });
  });
  relRatios.sort(function(a,b){return a-b;});

  function relPct(absRatio) {
    // Percentile rank of this ratio vs all active strikes right now
    if (!relRatios.length) return null;
    var below = relRatios.filter(function(v){return v < absRatio;}).length;
    var pct   = Math.round((below / relRatios.length) * 100);
    // Always show — min 40% so even lower-ranked strikes display a number
    return Math.max(40, pct);
  }

  function getSignal(row, side) {
    var coi = side==='ce' ? (row.ce_chg_oi||0) : (row.pe_chg_oi||0);
    var oi  = side==='ce' ? (row.ce_oi||0)     : (row.pe_oi||0);
    if (oi < MIN_OI) return null;
    var st = stateMap[row.strike+'|'+side];
    var sigLabel, sigCol, sigBg;
    if (st) {
      sigLabel = st.dir==='unwind' ? 'UNWIND ↓' : 'WRITING ↑';
      sigCol   = side==='ce'
        ? (st.dir==='unwind' ? '#4ade80' : '#f87171')
        : (st.dir==='unwind' ? '#f87171' : '#4ade80');
      sigBg    = sigCol + '18';
    } else {
      var rel = oi > 0 ? Math.abs(coi)/oi : 0;
      if (rel < 0.005) { sigLabel='—';         sigCol='#334155'; sigBg='transparent'; }
      else if (coi > 0){ sigLabel='WRITING ↑'; sigCol=side==='ce'?'#f87171':'#4ade80'; sigBg='transparent'; }
      else             { sigLabel='UNWIND ↓';  sigCol=side==='ce'?'#4ade80':'#f87171'; sigBg='transparent'; }
    }
    // Relative confidence — rank this strike vs all active strikes right now
    var ratio    = oi > 0 ? Math.abs(coi) / oi : 0;
    var pctVal   = st ? st.pct : (sigLabel !== '—' ? relPct(ratio) : null);
    return { label:sigLabel, col:sigCol, bg:sigBg, pct:pctVal, coi:coi, oi:oi };
  }

  var wrapper = inline
    ? { background:'transparent', border:'none', borderRadius:0, overflow:'hidden' }
    : { background:'#0f172a', border:'1px solid #1e293b', borderRadius:12, overflow:'hidden' };

  return (
    <div style={wrapper}>
      {!inline && (
        <div style={{ padding:'12px 20px', borderBottom:'1px solid #1e293b', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <p style={{ fontSize:11, fontWeight:700, color:'#64748b', margin:0, textTransform:'uppercase', letterSpacing:'0.05em' }}>
              Strike Monitor — {symbol} @ {atm}
            </p>
            <p style={{ fontSize:10, color:'#334155', margin:'2px 0 0' }}>
              {active.length} active strikes · OI &gt; 50K · signals from alert history (last 30 min)
            </p>
          </div>
          <div style={{ display:'flex', gap:14, fontSize:10, color:'#475569' }}>
            <span><span style={{ color:'#f87171' }}>■</span> CE WRITE &nbsp;<span style={{ color:'#4ade80' }}>■</span> CE UNWIND</span>
            <span><span style={{ color:'#4ade80' }}>■</span> PE WRITE &nbsp;<span style={{ color:'#f87171' }}>■</span> PE UNWIND</span>
          </div>
        </div>
      )}

      <div style={{ overflowX:'auto', maxHeight: inline ? 400 : 520, overflowY:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
          <thead style={{ position:'sticky', top:0, zIndex:1 }}>
            <tr style={{ background:'#1e293b' }}>
              <th style={{ padding:'7px 10px', color:'#f87171', textAlign:'right',  fontWeight:600, whiteSpace:'nowrap' }}>CE OI</th>
              <th style={{ padding:'7px 10px', color:'#f87171', textAlign:'right',  fontWeight:600, whiteSpace:'nowrap' }}>CE COI</th>
              <th style={{ padding:'7px 12px', color:'#f87171', textAlign:'right',  fontWeight:600, whiteSpace:'nowrap' }}>CE Signal</th>
              <th style={{ padding:'7px 6px',  color:'#f87171', textAlign:'right',  fontWeight:600, whiteSpace:'nowrap' }}>Conf%</th>
              <th style={{ padding:'7px 16px', color:'#f1f5f9', textAlign:'center', fontWeight:700 }}>Strike</th>
              <th style={{ padding:'7px 6px',  color:'#4ade80', textAlign:'left',   fontWeight:600, whiteSpace:'nowrap' }}>Conf%</th>
              <th style={{ padding:'7px 12px', color:'#4ade80', textAlign:'left',   fontWeight:600, whiteSpace:'nowrap' }}>PE Signal</th>
              <th style={{ padding:'7px 10px', color:'#4ade80', textAlign:'left',   fontWeight:600, whiteSpace:'nowrap' }}>PE COI</th>
              <th style={{ padding:'7px 10px', color:'#4ade80', textAlign:'left',   fontWeight:600, whiteSpace:'nowrap' }}>PE OI</th>
            </tr>
          </thead>
          <tbody>
            {active.map(function(row) {
              var ce   = getSignal(row, 'ce');
              var pe   = getSignal(row, 'pe');
              var isAtm  = row.strike === atm;
              var isNear = Math.abs(row.strike - atm) <= step * 2;
              var bg   = isAtm ? 'rgba(96,165,250,0.10)' : isNear ? 'rgba(96,165,250,0.03)' : 'transparent';
              return (
                <tr key={row.strike} style={{ background:bg, borderBottom:'1px solid #1e293b22' }}>
                  <td style={{ padding:'7px 10px', textAlign:'right', color:'#f87171', fontWeight:600 }}>{ce?fmtOI(ce.oi):'—'}</td>
                  <td style={{ padding:'7px 10px', textAlign:'right', fontWeight:600, color:ce&&ce.coi>0?'#f87171':ce&&ce.coi<0?'#4ade80':'#334155' }}>{ce?fmtCOI(ce.coi):'—'}</td>
                  <td style={{ padding:'5px 12px', textAlign:'right' }}>
                    {ce && ce.label !== '—'
                      ? <span style={{ padding:'2px 8px', borderRadius:4, fontSize:10, fontWeight:700, color:ce.col, background:ce.bg, border:'1px solid '+ce.col+'44' }}>{ce.label}</span>
                      : <span style={{ color:'#334155' }}>—</span>}
                  </td>
                  <td style={{ padding:'7px 6px', textAlign:'right' }}>
                    {ce && ce.pct
                      ? <span style={{ fontSize:10, fontWeight:700, color:ce.pct>=92?'#4ade80':ce.pct>=82?'#f59e0b':'#64748b' }}>{ce.pct}%</span>
                      : <span style={{ color:'#334155', fontSize:10 }}>—</span>}
                  </td>
                  <td style={{ padding:'7px 16px', textAlign:'center' }}>
                    <span style={{ fontSize:isAtm?13:12, fontWeight:isAtm?800:600, color:isAtm?'#60a5fa':'#94a3b8' }}>{row.strike}</span>
                    {isAtm && <span style={{ display:'block', fontSize:8, color:'#60a5fa', fontWeight:700 }}>ATM</span>}
                  </td>
                  <td style={{ padding:'7px 6px', textAlign:'left' }}>
                    {pe && pe.pct
                      ? <span style={{ fontSize:10, fontWeight:700, color:pe.pct>=92?'#4ade80':pe.pct>=82?'#f59e0b':'#64748b' }}>{pe.pct}%</span>
                      : <span style={{ color:'#334155', fontSize:10 }}>—</span>}
                  </td>
                  <td style={{ padding:'5px 12px', textAlign:'left' }}>
                    {pe && pe.label !== '—'
                      ? <span style={{ padding:'2px 8px', borderRadius:4, fontSize:10, fontWeight:700, color:pe.col, background:pe.bg, border:'1px solid '+pe.col+'44' }}>{pe.label}</span>
                      : <span style={{ color:'#334155' }}>—</span>}
                  </td>
                  <td style={{ padding:'7px 10px', textAlign:'left', fontWeight:600, color:pe&&pe.coi>0?'#4ade80':pe&&pe.coi<0?'#f87171':'#334155' }}>{pe?fmtCOI(pe.coi):'—'}</td>
                  <td style={{ padding:'7px 10px', textAlign:'left', color:'#4ade80', fontWeight:600 }}>{pe?fmtOI(pe.oi):'—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!inline && (
        <div style={{ padding:'6px 20px', fontSize:9, color:'#334155', lineHeight:1.8 }}>
          CE WRITE = call writers adding (resistance) · CE UNWIND = call writers covering (bullish) ·
          PE WRITE = put writers adding (support) · PE UNWIND = put writers covering (bearish) ·
          Conf% = percentile rank vs today · signals from last 30 min of alert history
        </div>
      )}
    </div>
  );
}


function AlertSystem(props) {
  var chain     = props.chain     || [];
  var chainBN   = props.chainBN   || [];
  var atmNifty  = props.atmNifty  || 0;
  var atmBN     = props.atmBN     || 0;
  var spotNifty = props.spotNifty || atmNifty;
  var spotBN    = props.spotBN    || atmBN;
  var alerts    = props.alerts    || [];
  var onAlerts  = props.onAlerts;
  var onClear   = props.onClear;

  var [open, setOpen]           = React.useState(false);
  var [toast, setToast]         = React.useState(null);
  var [tab, setTab]             = React.useState('feed');
  var [symFilter, setSymFilter] = React.useState('NIFTY');

  var chainHistRef   = React.useRef([]);
  var chainHistBNRef = React.useRef([]);
  var distRef        = React.useRef({});
  var stateRef       = React.useRef({});

  var MIN_OI      = 50000;
  var MIN_SAMPLES = 5;  // 5 samples = 15 min before percentile fully calibrated
  var ALERT_PCT   = 75;
  var HIGH_PCT    = 92;

  function pctRank(dist, val) {
    if (!dist || dist.length < 2) return 0;  // just need 2 points for a comparison
    var a = Math.abs(val);
    return Math.round(dist.filter(function(v){return v<a;}).length / dist.length * 100);
  }
  function addDist(key, val) {
    if (!distRef.current[key]) distRef.current[key] = [];
    distRef.current[key].push(Math.abs(val));
    if (distRef.current[key].length > 80) distRef.current[key].shift();
  }
  function fmt(n) {
    var a=Math.abs(n);
    return (n>0?'+':'-')+(a>=100000?(a/100000).toFixed(1)+'L':a>=1000?(a/1000).toFixed(0)+'K':a);
  }
  function nowStr() {
    var d=new Date();
    return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0');
  }
  function getOIRank(ch, strike, side) {
    var sorted=ch.filter(function(r){return (side==='ce'?(r.ce_oi||0):(r.pe_oi||0))>MIN_OI;})
                 .sort(function(a,b){return side==='ce'?b.ce_oi-a.ce_oi:b.pe_oi-a.pe_oi;});
    for (var i=0;i<sorted.length;i++) if(sorted[i].strike===strike) return i+1;
    return 99;
  }

  function computeStateChange(histArr, atm, spot, sym, fired) {
    if (histArr.length < 2) return;
    var latest = histArr[histArr.length-1].chain;
    var past3  = histArr.length>=4  ? histArr[histArr.length-4].chain  : histArr[0].chain;
    var past10 = histArr.length>=11 ? histArr[histArr.length-11].chain : null;
    var open   = histArr[0].chain;
    function toMap(ch){var m={};ch.forEach(function(r){m[r.strike]=r;});return m;}
    var p3Map=toMap(past3), p10Map=past10?toMap(past10):null, openMap=toMap(open);

    var topCE=latest.filter(function(r){return (r.ce_oi||0)>MIN_OI;}).sort(function(a,b){return b.ce_oi-a.ce_oi;}).slice(0,5);
    var topPE=latest.filter(function(r){return (r.pe_oi||0)>MIN_OI;}).sort(function(a,b){return b.pe_oi-a.pe_oi;}).slice(0,5);
    var atmRows=latest.filter(function(r){return Math.abs(r.strike-atm)<=((sym==='BANKNIFTY'?100:50)*2);});
    var watchMap={};
    topCE.forEach(function(r){watchMap[r.strike]=watchMap[r.strike]||{};watchMap[r.strike].ce=true;});
    topPE.forEach(function(r){watchMap[r.strike]=watchMap[r.strike]||{};watchMap[r.strike].pe=true;});
    atmRows.forEach(function(r){watchMap[r.strike]=watchMap[r.strike]||{};watchMap[r.strike].ce=true;watchMap[r.strike].pe=true;});

    Object.keys(watchMap).forEach(function(sk) {
      var strike=parseInt(sk);
      var now=latest.find(function(r){return r.strike===strike;});
      if (!now) return;

      ['ce','pe'].forEach(function(side) {
        if (!watchMap[sk][side]) return;
        var nowOI=side==='ce'?(now.ce_oi||0):(now.pe_oi||0);
        if (nowOI<MIN_OI) return;
        var nowCOI=side==='ce'?(now.ce_chg_oi||0):(now.pe_chg_oi||0);
        var p3r=p3Map[strike], p10r=p10Map?p10Map[strike]:null, openR=openMap[strike];
        var d3  =p3r  ?nowCOI-(side==='ce'?(p3r.ce_chg_oi||0):(p3r.pe_chg_oi||0)):0;
        var d10 =p10r ?nowCOI-(side==='ce'?(p10r.ce_chg_oi||0):(p10r.pe_chg_oi||0)):0;
        var dOpen=openR?nowCOI-(side==='ce'?(openR.ce_chg_oi||0):(openR.pe_chg_oi||0)):0;
        var primaryDelta=p10r?d10:d3;
        var floor=Math.max(10000,nowOI*0.01);  // 1% of OI, min 10K
        var stk=sym+'|'+strike+'|'+side;

        if (Math.abs(primaryDelta)<floor) {
          if (stateRef.current[stk]&&stateRef.current[stk].state!=='neutral')
            stateRef.current[stk]={state:'neutral',pct:0,ts:Date.now()};
          return;
        }

        var dk=stk;
        addDist(dk,primaryDelta);
        var dist=distRef.current[dk];
        var pct=pctRank(dist,primaryDelta);
        if (pct<ALERT_PCT) return;

        var newState=primaryDelta>0?'writing':'unwind';
        var prevSt=stateRef.current[dk]||{state:'neutral',pct:0,ts:0};
        var stateChanged=prevSt.state!==newState;
        var escalated=!stateChanged&&pct>=prevSt.pct+8&&pct>=HIGH_PCT;
        if (!stateChanged&&!escalated) return;
        stateRef.current[dk]={state:newState,pct:pct,ts:Date.now()};

        var isCE=side==='ce', isUnwind=newState==='unwind';
        var oiRank=getOIRank(latest,strike,side);
        var rankTag=oiRank<=3?'#'+oiRank+(isCE?' Resistance':' Support'):strike===atm?'ATM':'';
        var emoji,type,desc;
        if (isCE&&isUnwind)  {emoji='🟢';type='CE UNWIND — '+strike;  desc='Call writers covering at '+strike+(rankTag?' ('+rankTag+')':'')+'. Resistance crumbling — watch for breakout above.';}
        else if (isCE)       {emoji='🔴';type='CE WRITING — '+strike;  desc='Fresh call writing at '+strike+(rankTag?' ('+rankTag+')':'')+'. Resistance strengthening — upside capped here.';}
        else if (isUnwind)   {emoji='🔴';type='PE UNWIND — '+strike;   desc='Put writers covering at '+strike+(rankTag?' ('+rankTag+')':'')+'. Support crumbling — watch for breakdown below.';}
        else                 {emoji='🟢';type='PE WRITING — '+strike;  desc='Fresh put writing at '+strike+(rankTag?' ('+rankTag+')':'')+'. Support strengthening — dips defended here.';}

        var note=escalated?' [ESCALATION]':stateChanged&&prevSt.state!=='neutral'?' [REVERSAL from '+(prevSt.state==='writing'?'WRITING':'UNWIND')+']':'';
        fired.push({
          id:Date.now()+Math.random(), ts:Date.now(), time:nowStr(), symbol:sym,
          strike:strike, side:side, dir:newState, type:type, emoji:emoji,
          desc:desc+note, oi:nowOI, delta:fmt(primaryDelta), fromOpen:fmt(dOpen),
          pct:pct, score:pct, oiRank:oiRank, tag:rankTag,
          level:stateChanged?(prevSt.state!=='neutral'?'REVERSAL':'NEW'):'ESCALATION',
          samples:dist?dist.length:0,
        });
      });
    });
  }

  React.useEffect(function() {
    if (chain.length)   {chainHistRef.current.push({chain:chain,ts:Date.now()});   if(chainHistRef.current.length>42) chainHistRef.current.shift();}
    if (chainBN.length) {chainHistBNRef.current.push({chain:chainBN,ts:Date.now()});if(chainHistBNRef.current.length>42) chainHistBNRef.current.shift();}
    var fired=[];
    computeStateChange(chainHistRef.current,   atmNifty, spotNifty, 'NIFTY',     fired);
    computeStateChange(chainHistBNRef.current, atmBN,    spotBN,    'BANKNIFTY', fired);
    if (fired.length) {
      console.log('[Alerts] fired:', fired.length, fired.map(function(a){return a.type+'('+a.pct+'%)';}).join(', '));
      onAlerts&&onAlerts(fired);
      var best=fired.reduce(function(a,b){return b.pct>a.pct?b:a;},fired[0]);
      setToast(best);
      var t=setTimeout(function(){setToast(null);},10000);
      return function(){clearTimeout(t);};
    } else {
      console.log('[Alerts] checked, none fired. hist NIFTY:', chainHistRef.current.length, 'BN:', chainHistBNRef.current.length);
    }
  }, [chain, chainBN]); // eslint-disable-line react-hooks/exhaustive-deps

  function confCol(pct) { return pct>=HIGH_PCT?'#4ade80':pct>=ALERT_PCT?'#f59e0b':'#64748b'; }
  function confBar(pct) {
    var s=Math.max(0,Math.min(10,Math.round((pct-ALERT_PCT)/(100-ALERT_PCT)*10)));
    var col=confCol(pct), b='';
    for(var i=0;i<10;i++) b+=i<s?'█':'░';
    return {bars:b,col:col};
  }
  function borderCol(a) {
    return a.side==='ce'?(a.dir==='unwind'?'#4ade80':'#f87171'):(a.dir==='unwind'?'#f87171':'#4ade80');
  }

  function AlertCard(p) {
    var a=p.a, cb=confBar(a.pct||0), bc=borderCol(a);
    var lvlCol=a.level==='REVERSAL'?'#a78bfa':a.level==='ESCALATION'?'#f59e0b':'#60a5fa';
    return (
      <div style={{marginBottom:8,padding:'10px 14px',background:'#1e293b',borderRadius:8,border:'1px solid #334155',borderLeft:'3px solid '+bc}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
          <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
            <span style={{fontSize:13}}>{a.emoji}</span>
            <span style={{fontSize:12,fontWeight:800,color:bc}}>{a.type}</span>
            {a.level&&<span style={{fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:3,background:lvlCol+'22',color:lvlCol}}>{a.level}</span>}
          </div>
          <div style={{display:'flex',gap:5,alignItems:'center',flexShrink:0}}>
            <span style={{fontSize:9,color:'#60a5fa',fontWeight:600}}>{a.symbol}</span>
            <span style={{fontSize:9,color:'#475569'}}>{a.time}</span>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
          <span style={{fontFamily:'monospace',fontSize:11,color:cb.col,letterSpacing:1}}>{cb.bars}</span>
          <span style={{fontSize:12,fontWeight:800,color:cb.col}}>{a.pct}% confidence</span>
        </div>
        <p style={{fontSize:10,color:'#94a3b8',margin:'0 0 4px',lineHeight:1.5}}>{a.desc}</p>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <span style={{fontSize:9,color:'#475569'}}>COI Δ {a.delta}</span>
          {a.fromOpen&&<span style={{fontSize:9,color:'#475569'}}>from open: {a.fromOpen}</span>}
          <span style={{fontSize:9,color:'#475569'}}>{a.samples} samples</span>
          {a.oiRank<=5&&<span style={{fontSize:9,color:'#f59e0b'}}>#{a.oiRank} OI strike</span>}
        </div>
      </div>
    );
  }

  // Strike View groups
  var strikeGroups={};
  alerts.forEach(function(a) {
    if(!a.strike) return;
    var k=a.symbol+'|'+a.strike+'|'+a.side;
    if(!strikeGroups[k]) strikeGroups[k]={key:k,symbol:a.symbol,strike:a.strike,side:a.side,tag:a.tag,alerts:[],lastPct:0};
    strikeGroups[k].alerts.push(a);
    if((a.pct||0)>strikeGroups[k].lastPct) strikeGroups[k].lastPct=a.pct||0;
  });
  var groupList=Object.values(strikeGroups).sort(function(a,b){return b.lastPct-a.lastPct;});

  var alertBtn = (
    <button onClick={function(){setOpen(true);}}
      style={{background:'#1e293b',border:'1px solid '+(alerts.length?'#f59e0b':'#334155'),
              borderRadius:8,padding:'6px 14px',color:alerts.length?'#f59e0b':'#64748b',
              fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
      🔔 Alerts
      {alerts.length>0&&<span style={{background:'#f59e0b',color:'#0f172a',borderRadius:10,padding:'1px 6px',fontSize:10,fontWeight:800}}>{alerts.length}</span>}
    </button>
  );

  return (
    <>
      {/* Toast */}
      {toast&&(
        <div onClick={function(){setOpen(true);setToast(null);}}
          style={{position:'fixed',top:80,right:20,zIndex:2000,cursor:'pointer',maxWidth:400,
                  background:'#1e293b',border:'1px solid #334155',borderLeft:'3px solid '+borderCol(toast),
                  borderRadius:10,padding:'12px 16px',boxShadow:'0 8px 32px rgba(0,0,0,0.7)'}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:10}}>
            <div style={{flex:1}}>
              <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:4}}>
                <span style={{fontSize:13}}>{toast.emoji}</span>
                <span style={{fontSize:12,fontWeight:800,color:borderCol(toast)}}>{toast.type}</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                <span style={{fontFamily:'monospace',fontSize:11,color:confBar(toast.pct).col}}>{confBar(toast.pct).bars}</span>
                <span style={{fontSize:12,fontWeight:800,color:confBar(toast.pct).col}}>{toast.pct}% confidence</span>
              </div>
              <p style={{fontSize:11,color:'#94a3b8',margin:'0 0 4px',lineHeight:1.4}}>{toast.desc}</p>
              <div style={{display:'flex',gap:8}}>
                <span style={{fontSize:9,color:'#60a5fa',fontWeight:600}}>{toast.symbol}</span>
                <span style={{fontSize:9,color:'#475569'}}>{toast.time}</span>
                <span style={{fontSize:9,color:'#475569'}}>Δ {toast.delta}</span>
              </div>
            </div>
            <button onClick={function(e){e.stopPropagation();setToast(null);}}
              style={{background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:14,padding:0,flexShrink:0}}>✕</button>
          </div>
        </div>
      )}

      {/* Drawer */}
      {open&&(
        <div style={{position:'fixed',top:0,right:0,bottom:0,width:500,zIndex:1500,
                     background:'#0a1628',borderLeft:'1px solid #334155',
                     display:'flex',flexDirection:'column',boxShadow:'-8px 0 40px rgba(0,0,0,0.7)'}}>
          {/* Header */}
          <div style={{padding:'14px 20px',borderBottom:'1px solid #1e293b'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <div>
                <p style={{fontSize:14,fontWeight:700,color:'#f1f5f9',margin:0}}>🔔 Alert Log</p>
                <p style={{fontSize:10,color:'#475569',margin:'2px 0 0'}}>{alerts.length} alerts · state-change only · confidence = percentile rank</p>
              </div>
              <button onClick={function(){setOpen(false);}}
                style={{background:'#1e293b',border:'1px solid #334155',borderRadius:8,padding:'5px 10px',color:'#94a3b8',cursor:'pointer',fontSize:11}}>✕</button>
            </div>

            {/* Symbol filter — only for monitor tab */}
            {tab==='monitor'&&(
              <div style={{display:'flex',gap:6,marginBottom:8}}>
                {['NIFTY','BANKNIFTY'].map(function(s){
                  return <button key={s} onClick={function(){setSymFilter(s);}}
                    style={{padding:'3px 10px',borderRadius:4,fontSize:10,fontWeight:600,cursor:'pointer',
                            background:symFilter===s?'#8b5cf6':'#1e293b',color:symFilter===s?'#fff':'#64748b',
                            border:'1px solid '+(symFilter===s?'#8b5cf6':'#334155')}}>{s}</button>;
                })}
              </div>
            )}

            {/* Tabs */}
            <div style={{display:'flex',borderRadius:8,overflow:'hidden',border:'1px solid #334155'}}>
              {[['feed','📡 Live Feed'],['strikes','📊 Strike View'],['monitor','📋 Strike Monitor']].map(function(t){
                return <button key={t[0]} onClick={function(){setTab(t[0]);}}
                  style={{flex:1,padding:'6px',fontSize:11,fontWeight:600,cursor:'pointer',border:'none',
                          background:tab===t[0]?'#1e293b':'transparent',color:tab===t[0]?'#f1f5f9':'#475569'}}>{t[1]}</button>;
              })}
            </div>
          </div>

          {/* Content */}
          <div style={{flex:1,overflowY:'auto',padding:tab==='monitor'?0:'10px 14px'}}>
            {tab==='monitor' ? (
              <StrikeMonitor
                chain={symFilter==='BANKNIFTY'?(chainBN):(chain)}
                atm={symFilter==='BANKNIFTY'?(atmBN):(atmNifty)}
                spot={symFilter==='BANKNIFTY'?(spotBN):(spotNifty)}
                symbol={symFilter}
                alerts={alerts}
                inline={true}
              />
            ) : alerts.length===0 ? (
              <p style={{color:'#475569',fontSize:12,textAlign:'center',marginTop:40}}>No alerts yet · watching for state changes at key strikes</p>
            ) : tab==='feed' ? (
              <div>{alerts.map(function(a){return <AlertCard key={a.id} a={a}/>;})}</div>
            ) : (
              <div>
                {groupList.map(function(g){
                  var isCE=g.side==='ce', lastAlert=g.alerts[0], isUnwind=lastAlert&&lastAlert.dir==='unwind';
                  var bc=isCE?(isUnwind?'#4ade80':'#f87171'):(isUnwind?'#f87171':'#4ade80');
                  var cb=confBar(g.lastPct);
                  return (
                    <div key={g.key} style={{marginBottom:12,border:'1px solid #1e293b',borderRadius:10,overflow:'hidden'}}>
                      <div style={{padding:'8px 14px',background:'#1e293b',borderLeft:'3px solid '+bc,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <div style={{display:'flex',gap:8,alignItems:'center'}}>
                          <span style={{fontSize:12,fontWeight:700,color:bc}}>{g.side.toUpperCase()} — {g.strike}</span>
                          <span style={{fontSize:10,color:'#64748b'}}>{g.symbol} {g.tag}</span>
                          <span style={{fontSize:11,fontWeight:700,color:isUnwind?'#f87171':'#4ade80'}}>{isUnwind?'↓ UNWIND':'↑ WRITING'}</span>
                        </div>
                        <div style={{display:'flex',gap:6,alignItems:'center'}}>
                          <span style={{fontFamily:'monospace',fontSize:9,color:cb.col}}>{cb.bars}</span>
                          <span style={{fontSize:10,fontWeight:800,color:cb.col}}>{g.lastPct}%</span>
                          <span style={{fontSize:9,color:'#475569'}}>{g.alerts.length}×</span>
                        </div>
                      </div>
                      <div style={{padding:'6px 10px',display:'flex',flexDirection:'column',gap:3}}>
                        {g.alerts.map(function(a){
                          var acb=confBar(a.pct||0), aIsUnwind=a.dir==='unwind';
                          return (
                            <div key={a.id} style={{display:'flex',gap:8,alignItems:'center',padding:'4px 8px',borderRadius:4,borderLeft:'2px solid '+(aIsUnwind?'#f87171':'#4ade80')}}>
                              <span style={{fontSize:10,color:'#475569',minWidth:36}}>{a.time}</span>
                              <span style={{fontSize:9,fontWeight:700,color:acb.col,minWidth:36}}>{a.pct}%</span>
                              <span style={{fontSize:9,fontWeight:700,color:aIsUnwind?'#f87171':'#4ade80'}}>{aIsUnwind?'↓':'↑'}</span>
                              <span style={{fontSize:9,color:'#475569'}}>{a.delta}</span>
                              {a.level&&<span style={{fontSize:8,color:'#a78bfa'}}>{a.level}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{padding:'10px 14px',borderTop:'1px solid #1e293b',display:'flex',gap:8}}>
            <button onClick={function(){
              if(!alerts.length) return;
              var csv='Time,Symbol,Level,Strike,Side,Direction,Alert,Confidence%,OI_Rank,Delta,FromOpen,Samples,Description\n'+
                alerts.map(function(a){return[a.time,a.symbol,a.level||'',a.strike||'',a.side||'',a.dir||'',a.type,a.pct||'',a.oiRank||'',a.delta,a.fromOpen||'',a.samples||'','"'+a.desc+'"'].join(',');}).join('\n');
              var blob=new Blob([csv],{type:'text/csv'});
              var url=URL.createObjectURL(blob);
              var el=document.createElement('a');el.href=url;el.download='alerts_'+new Date().toISOString().slice(0,10)+'.csv';el.click();
            }} style={{flex:1,padding:'7px',background:'#1e293b',border:'1px solid #334155',borderRadius:8,color:'#94a3b8',cursor:'pointer',fontSize:11,fontWeight:600}}>
              📥 Export
            </button>
            <button onClick={function(){onClear&&onClear();}}
              style={{flex:1,padding:'7px',background:'#1e293b',border:'1px solid #334155',borderRadius:8,color:'#f87171',cursor:'pointer',fontSize:11,fontWeight:600}}>
              🗑 Clear All
            </button>
          </div>
        </div>
      )}

      {alertBtn}
    </>
  );
}


export default function Options() {
  var { user }  = useAuth();
  var navigate  = useNavigate();
  var [symbol, setSymbol]         = useState('NIFTY');
  var [bnData, setBnData]         = useState(null); // eslint-disable-line no-unused-vars
  var [data, setData]             = useState(null);
  var [overview, setOverview]     = useState({});
  var [loading, setLoading]       = useState(false);
  var [lastUpdate, setLastUpdate] = useState(null);
  var [showPreTrade, setShowPreTrade] = useState(false);
  var _alertKey = 'mt_alerts_' + new Date().toISOString().slice(0,10);
  var [alerts, setAlerts] = useState(function() {
    try {
      var s = localStorage.getItem(_alertKey);
      if (!s) return [];
      var parsed = JSON.parse(s);
      return parsed.filter(function(a) {
        return a.pct && a.pct >= 75 && a.strike && a.side && a.dir;
      });
    } catch(e) { return []; }
  });

  var intervalRef                 = useRef(null);
  var dashIntervalRef             = useRef(null);
  var [dashData, setDashData]     = useState(null);
  var [strikeRange, setStrikeRange] = useState('full'); // 'full' | '1'..'15'

  useEffect(function() {
    try { localStorage.setItem(_alertKey, JSON.stringify(alerts.slice(0,200))); }
    catch(e){}
  }, [alerts]); // eslint-disable-line react-hooks/exhaustive-deps
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

  function fetchDashboard(sym) {
    fetch('http://localhost:3001/api/futures-dashboard?symbol=' + sym)
      .then(function(r) { return r.json(); })
      .then(function(d) { if (d && !d.error) setDashData(d); })
      .catch(function(e) { console.error('[Options] dashboard fetch:', e); });
  }

  useEffect(function() {
    if (!hasOptions) return;
    fetchOverview();
    overviewRef.current = setInterval(fetchOverview, 180000);
    return function() { clearInterval(overviewRef.current); };
  }, [hasOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  function isMarketOpen() {
    var now = new Date();
    // Convert to IST (UTC+5:30)
    var ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    var day = ist.getUTCDay(); // 0=Sun, 6=Sat
    if (day === 0 || day === 6) return false;
    var h = ist.getUTCHours(), m = ist.getUTCMinutes();
    var mins = h * 60 + m;
    return mins >= 555 && mins < 930; // 9:15 AM to 3:30 PM IST
  }

  useEffect(function() {
    if (!hasOptions) return;
    setLoading(true);
    setData(null);
    prevPCRRef.current = {};
    fetchSym(symbol, setData);
    fetchSym('BANKNIFTY', setBnData);
    fetchDashboard(symbol);
    clearInterval(intervalRef.current);
    clearInterval(dashIntervalRef.current);
    intervalRef.current = setInterval(function() {
      if (!isMarketOpen()) {
        clearInterval(intervalRef.current);
        clearInterval(dashIntervalRef.current);
        return;
      }
      fetchSym(symbol, setData);
      fetchSym('BANKNIFTY', setBnData);
      fetchDashboard(symbol);
    }, 180000);
    return function() {
      clearInterval(intervalRef.current);
      clearInterval(dashIntervalRef.current);
    };
  }, [symbol, hasOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Strike range filter — compute filtered OIBar data from full_chain ──────
  var filteredData = React.useMemo(function() {
    if (!data) return data;
    var fullChain = data.full_chain || data.chain || [];
    var atm       = data.atm_strike || 0;
    if (strikeRange === 'full' || !atm || !fullChain.length) return data;

    var range = parseInt(strikeRange, 10);
    var step  = symbol === 'BANKNIFTY' ? 100 : 50;
    var lo    = atm - range * step;
    var hi    = atm + range * step;
    var filtered = fullChain.filter(function(r) {
      return r.strike >= lo && r.strike <= hi;
    });

    var total_ce_oi  = 0, total_pe_oi  = 0;
    var total_ce_vol = 0, total_pe_vol = 0;
    var total_ce_coi = 0, total_pe_coi = 0;
    filtered.forEach(function(r) {
      total_ce_oi  += (r.ce_oi      || 0);
      total_pe_oi  += (r.pe_oi      || 0);
      total_ce_vol += (r.ce_vol     || 0);
      total_pe_vol += (r.pe_vol     || 0);
      total_ce_coi += (r.ce_chg_oi  || 0);
      total_pe_coi += (r.pe_chg_oi  || 0);
    });

    var pcr_total = total_ce_oi > 0 ? Math.round((total_pe_oi / total_ce_oi) * 100) / 100 : 0;
    var sentiment = pcr_total > 1.2 ? 'Bullish' : pcr_total < 0.8 ? 'Bearish' : 'Neutral';

    return Object.assign({}, data, {
      total_ce_oi:   total_ce_oi,
      total_pe_oi:   total_pe_oi,
      total_ce_vol:  total_ce_vol,
      total_pe_vol:  total_pe_vol,
      total_ce_coi:  total_ce_coi,
      total_pe_coi:  total_pe_coi,
      pcr_total:     pcr_total,
      sentiment_total: sentiment,
    });
  }, [data, strikeRange, symbol]);

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
            <span style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block', background: isMarketOpen() ? '#4ade80' : '#f59e0b' }} />
            <span style={{ fontSize: 12, color: isMarketOpen() ? '#94a3b8' : '#f59e0b' }}>
              {!isMarketOpen() ? 'Market closed · paused' : lastUpdate ? 'Updated ' + lastUpdate : loading ? 'Loading...' : 'Waiting'}
            </span>
          </div>
          <button
            onClick={function() { setShowPreTrade(true); }}
            style={{ background: '#7c3aed', border: '1px solid #7c3aed', borderRadius: 8, padding: '6px 16px',
                     color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em' }}
          >
            ⚡ Pre-Trade Check
          </button>
          <AlertSystem
            chain={data ? (data.full_chain || data.chain || []) : []}
            chainBN={bnData ? (bnData.full_chain || bnData.chain || []) : []}
            atmNifty={data ? (data.atm_strike || 0) : 0}
            atmBN={bnData ? (bnData.atm_strike || 0) : 0}
            spotNifty={data ? (data.spot_price || 0) : 0}
            spotBN={bnData ? (bnData.spot_price || 0) : 0}
            alerts={alerts}
            onAlerts={function(fired) { setAlerts(function(prev) { return fired.concat(prev).slice(0,200); }); }}
            onClear={function() {
              setAlerts([]);
              try { localStorage.removeItem(_alertKey); } catch(e){}
            }}
          />
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

          <div style={{ display: 'flex', gap: 20, alignItems: 'center', padding: '12px 20px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>{data.symbol}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#60a5fa' }}>{data.spot_price}</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>Expiry: <b style={{ color: '#f1f5f9' }}>{data.expiry}</b></span>
            <span style={{ fontSize: 12, color: '#64748b' }}>ATM: <b style={{ color: '#60a5fa' }}>{data.atm_strike}</b></span>
            <div style={{ width: 1, height: 20, background: '#1e293b' }} />
            {data.support && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: '#4ade80', fontWeight: 700, textTransform: 'uppercase' }}>Support</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#4ade80' }}>{data.support}</span>
                <span style={{ fontSize: 10, color: '#334155' }}>(Max PE OI)</span>
              </div>
            )}
            {data.resistance && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: '#f87171', fontWeight: 700, textTransform: 'uppercase' }}>Resistance</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#f87171' }}>{data.resistance}</span>
                <span style={{ fontSize: 10, color: '#334155' }}>(Max CE OI)</span>
              </div>
            )}
            <span style={{ fontSize: 11, color: '#334155', marginLeft: 'auto' }}>⏱ {data.timestamp}</span>
          </div>

          {(data.unwind_alerts || []).length > 0 && (
            <UnwindAlerts alerts={data.unwind_alerts} />
          )}

          {/* ── Strike Range Filter ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                        padding: '10px 16px', background: '#0f172a',
                        border: '1px solid #1e293b', borderRadius: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#475569',
                           textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Strike Range
            </span>
            {['full', '1','2','3','4','5','6','7','8','9','10','11','12','13','14','15'].map(function(v) {
              var isActive = strikeRange === v;
              var label    = v === 'full' ? 'Full Chain' : 'ATM ±' + v;
              return (
                <button key={v} onClick={function() { setStrikeRange(v); }}
                  style={{
                    padding:      '4px 12px',
                    borderRadius: 6,
                    border:       '1px solid ' + (isActive ? '#60a5fa' : '#1e293b'),
                    background:   isActive ? '#60a5fa18' : 'transparent',
                    color:        isActive ? '#60a5fa' : '#475569',
                    fontSize:     11,
                    fontWeight:   isActive ? 700 : 500,
                    cursor:       'pointer',
                    whiteSpace:   'nowrap',
                    transition:   'all 0.12s',
                  }}>
                  {label}
                </button>
              );
            })}
            {strikeRange !== 'full' && (
              <span style={{ fontSize: 10, color: '#334155', marginLeft: 4 }}>
                · {parseInt(strikeRange)*2+1} strikes · {symbol === 'BANKNIFTY' ? 'step 100' : 'step 50'}
              </span>
            )}
          </div>

          <IntradayTable
            history={dashData ? (dashData.intraday_history || []) : []}
            strikeRange={strikeRange}
            atm={data ? (data.atm_strike || 0) : 0}
            symbol={symbol}
          />

          <OIBar data={filteredData || data} />

          <PCRChart
            candles={symbol === 'NIFTY' ? (overview['nifty_candles'] || []) : (overview['banknifty_candles'] || [])}
            pcrHistory={data.pcr_intraday_3m || []}
            dashHist={dashData ? (dashData.intraday_history || []) : []}
            symbol={symbol}
          />

          <ZoneSplit
            chain={data.chain || []}
            atm={data.atm_strike || 0}
            symbol={symbol}
          />

          <StrikeMonitor
            chain={data.full_chain || data.chain || []}
            atm={data.atm_strike || 0}
            spot={data.spot_price || 0}
            symbol={symbol}
            alerts={alerts}
          />

          <FiveStrikeTable
            rows={data.five_strike_rows || []}
            pcr={data.pcr_5strike || 0}
            sentiment={data.sentiment_5strike || 'Neutral'}
            ceCOI={data.five_ce_coi}
            peCOI={data.five_pe_coi}
            history={data.pcr_history || []}
            strikeHistory={data.strike_pcr_history || []}
          />

          <IVDashboard history={data.iv_history || []} symbol={symbol} tDays={data.top_strikes ? data.top_strikes.T_days : null} />

          <OTMPositioning
            chain={data.full_chain || data.chain || []}
            strikeHistory={data.strike_pcr_history || []}
            vix={(overview["VIX"] || {}).last || 0}
            atm={data.atm_strike || 0}
          />
          {data.top_strikes && <TopStrikesSection data={data} />}


          <OIActivityTable
            chain={data.chain || []}
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

      {showPreTrade && (
        <PreTradeModal
          data={data}
          overview={overview}
          symbol={symbol}
          onClose={function() { setShowPreTrade(false); }}
        />
      )}
    </div>
  );
}