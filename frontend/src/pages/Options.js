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
  var last6 = history.slice(-6).reverse();

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

  var decisions = getDecision();

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

      {/* Premium decay — only if LTP data available */}
      {hasPremium && (
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e293b' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Premium decay — ATM LTP history (newest → oldest)</p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, background: '#1e293b', borderRadius: 8, padding: '10px 14px', borderLeft: '3px solid ' + (ceDecaying ? '#f87171' : '#4ade80') }}>
              <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 2px', fontWeight: 700 }}>CE LTP now</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#f87171', margin: '0 0 2px' }}>₹{ceLtpNow.toFixed(2)}</p>
              {ceFromOpen !== null && <p style={{ fontSize: 11, color: ceDecaying ? '#f87171' : '#4ade80', margin: '0 0 2px' }}>{ceFromOpen > 0 ? '+' : ''}{ceFromOpen} from open {ceDecaying ? '↓ decaying' : '↑ expanding'}</p>}
              {ceRate !== null && <p style={{ fontSize: 10, color: '#475569', margin: 0 }}>Rate: {ceRate > 0 ? '+' : ''}{ceRate} per reading</p>}
            </div>
            <div style={{ flex: 1, background: '#1e293b', borderRadius: 8, padding: '10px 14px', borderLeft: '3px solid ' + (peDecaying ? '#f87171' : '#4ade80') }}>
              <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 2px', fontWeight: 700 }}>PE LTP now</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#4ade80', margin: '0 0 2px' }}>₹{peLtpNow.toFixed(2)}</p>
              {peFromOpen !== null && <p style={{ fontSize: 11, color: peDecaying ? '#f87171' : '#4ade80', margin: '0 0 2px' }}>{peFromOpen > 0 ? '+' : ''}{peFromOpen} from open {peDecaying ? '↓ decaying' : '↑ expanding'}</p>}
              {peRate !== null && <p style={{ fontSize: 10, color: '#475569', margin: 0 }}>Rate: {peRate > 0 ? '+' : ''}{peRate} per reading</p>}
            </div>
          </div>

          {/* LTP history table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#1e293b' }}>
                  <th style={{ padding: '6px 12px', color: '#64748b', textAlign: 'left', fontWeight: 600 }}></th>
                  {last6.map(function(snap, i) {
                    return <th key={i} style={{ padding: '6px 10px', color: i === 0 ? '#f1f5f9' : '#475569', textAlign: 'center', fontWeight: i === 0 ? 700 : 500 }}>{i === 0 ? 'Now' : snap.time}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #1e293b22' }}>
                  <td style={{ padding: '8px 12px', color: '#f87171', fontWeight: 700 }}>CE LTP</td>
                  {last6.map(function(snap, i) {
                    var val  = snap.ce_ltp || 0;
                    var next = i < last6.length - 1 ? (last6[i + 1].ce_ltp || 0) : null;
                    var arr  = next !== null ? (val > next ? '↑' : val < next ? '↓' : '') : '';
                    var col  = arr === '↑' ? '#4ade80' : arr === '↓' ? '#f87171' : '#f87171';
                    return (
                      <td key={i} style={{ padding: '8px 10px', textAlign: 'center', background: i === 0 ? 'rgba(248,113,113,0.1)' : 'transparent', fontWeight: i === 0 ? 700 : 400, color: '#f87171', borderRadius: i === 0 ? 4 : 0 }}>
                        {val > 0 ? val.toFixed(1) : '—'}{arr && <span style={{ fontSize: 9, color: col, marginLeft: 2 }}>{arr}</span>}
                      </td>
                    );
                  })}
                </tr>
                <tr style={{ borderBottom: '1px solid #1e293b22' }}>
                  <td style={{ padding: '8px 12px', color: '#4ade80', fontWeight: 700 }}>PE LTP</td>
                  {last6.map(function(snap, i) {
                    var val  = snap.pe_ltp || 0;
                    var next = i < last6.length - 1 ? (last6[i + 1].pe_ltp || 0) : null;
                    var arr  = next !== null ? (val > next ? '↑' : val < next ? '↓' : '') : '';
                    var col  = arr === '↑' ? '#4ade80' : arr === '↓' ? '#f87171' : '#4ade80';
                    return (
                      <td key={i} style={{ padding: '8px 10px', textAlign: 'center', background: i === 0 ? 'rgba(74,222,128,0.1)' : 'transparent', fontWeight: i === 0 ? 700 : 400, color: '#4ade80', borderRadius: i === 0 ? 4 : 0 }}>
                        {val > 0 ? val.toFixed(1) : '—'}{arr && <span style={{ fontSize: 9, color: col, marginLeft: 2 }}>{arr}</span>}
                      </td>
                    );
                  })}
                </tr>
                <tr style={{ borderBottom: '1px solid #1e293b22' }}>
                  <td style={{ padding: '8px 12px', color: '#94a3b8', fontWeight: 700 }}>CE IV</td>
                  {last6.map(function(snap, i) {
                    return (
                      <td key={i} style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b', fontWeight: i === 0 ? 700 : 400 }}>
                        {snap.ce_iv ? snap.ce_iv.toFixed(1) + '%' : '—'}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td style={{ padding: '8px 12px', color: '#94a3b8', fontWeight: 700 }}>PE IV</td>
                  {last6.map(function(snap, i) {
                    return (
                      <td key={i} style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b', fontWeight: i === 0 ? 700 : 400 }}>
                        {snap.pe_iv ? snap.pe_iv.toFixed(1) + '%' : '—'}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Decision summary */}
      {decisions && decisions.length > 0 && (
        <div style={{ padding: '14px 20px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Decision summary</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {decisions.map(function(d, i) {
              return (
                <div key={i} style={{ background: d.bg, border: '1px solid ' + d.border, borderLeft: '3px solid ' + d.color, borderRadius: 8, padding: '10px 14px' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: d.color, margin: '0 0 4px' }}>{d.title}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>{d.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* IV Conviction Signal — 4-snapshot scoring */}
      {(function() {
        if (history.length < 4) return null;

        var last4       = history.slice(-4);
        var bullScore   = 0;
        var bearScore   = 0;
        var snapDetails = [];

        for (var i = 1; i < last4.length; i++) {
          var cur  = last4[i];
          var prv  = last4[i - 1];

          var spotCur   = cur.spot  || 0;
          var spotPrv   = prv.spot  || 0;
          var ceIvCur   = cur.ce_iv || 0;
          var ceIvPrv   = prv.ce_iv || 0;
          var peIvCur   = cur.pe_iv || 0;
          var peIvPrv   = prv.pe_iv || 0;

          var priceUp   = spotCur > spotPrv;
          var priceDown = spotCur < spotPrv;
          var ceIvUp    = ceIvCur > ceIvPrv;
          var peIvUp    = peIvCur > peIvPrv;

          var snapBull  = 0;
          var snapBear  = 0;

          if (priceUp   && ceIvUp)  snapBull += 1;  // call buyers active
          if (priceUp   && !peIvUp) snapBull += 1;  // puts abandoned
          if (priceDown && peIvUp)  snapBear += 1;  // put buyers active
          if (priceDown && !ceIvUp) snapBear += 1;  // calls abandoned

          bullScore += snapBull;
          bearScore += snapBear;

          snapDetails.push({
            time:      cur.time,
            priceUp:   priceUp,
            priceDown: priceDown,
            ceIvUp:    ceIvUp,
            peIvUp:    peIvUp,
            bull:      snapBull,
            bear:      snapBear,
            spot:      spotCur,
            ceIv:      ceIvCur,
            peIv:      peIvCur,
          });
        }

        // max = 3 transitions × 2 conditions = 6
        var maxScore = 6;
        var signal, color, bg, border, title, body;

        if (bullScore >= 5) {
          signal = 'STRONG BREAKOUT';
          color = '#4ade80'; bg = 'rgba(74,222,128,0.08)'; border = '#4ade8033';
          title = 'Strong breakout conviction — ' + bullScore + '/' + maxScore;
          body  = 'Price rising with CE IV expanding and PE IV contracting across ' + bullScore + ' of ' + maxScore + ' checks. Call buyers aggressive, put writers relaxed. High probability resistance breaks.';
        } else if (bullScore >= 3) {
          signal = 'MODERATE BREAKOUT';
          color = '#86efac'; bg = 'rgba(134,239,172,0.08)'; border = '#86efac33';
          title = 'Moderate breakout conviction — ' + bullScore + '/' + maxScore;
          body  = 'Price moving up with mixed IV confirmation. ' + bullScore + '/' + maxScore + ' checks bullish. Resistance may be tested but not fully confirmed — watch for CE IV to sustain above PE IV.';
        } else if (bearScore >= 5) {
          signal = 'STRONG BREAKDOWN';
          color = '#f87171'; bg = 'rgba(248,113,113,0.08)'; border = '#f8717133';
          title = 'Strong breakdown conviction — ' + bearScore + '/' + maxScore;
          body  = 'Price falling with PE IV expanding and CE IV contracting across ' + bearScore + ' of ' + maxScore + ' checks. Put buyers aggressive, call writers relaxed. High probability support breaks.';
        } else if (bearScore >= 3) {
          signal = 'MODERATE BREAKDOWN';
          color = '#fca5a5'; bg = 'rgba(252,165,165,0.08)'; border = '#fca5a533';
          title = 'Moderate breakdown conviction — ' + bearScore + '/' + maxScore;
          body  = 'Price moving down with mixed IV confirmation. ' + bearScore + '/' + maxScore + ' checks bearish. Support may be tested but not fully confirmed — watch for PE IV to sustain expansion.';
        } else if (bullScore > 0 && bullScore === bearScore) {
          signal = 'CONFLICTED';
          color = '#f59e0b'; bg = 'rgba(245,158,11,0.08)'; border = '#f59e0b33';
          title = 'Conflicted IV signals — ' + bullScore + ' bull / ' + bearScore + ' bear';
          body  = 'IV signals are mixed — neither side showing sustained conviction. Avoid directional bets until IV aligns with price direction.';
        } else {
          signal = 'LOW CONVICTION';
          color = '#64748b'; bg = 'rgba(100,116,139,0.06)'; border = '#64748b33';
          title = 'Low IV conviction — bull ' + bullScore + ' · bear ' + bearScore + ' (of ' + maxScore + ')';
          body  = 'IV not confirming price direction. Price may be flat or IV moving independently of price. No strong breakout or breakdown signal.';
        }

        return (
          <div style={{ padding: '14px 20px', borderTop: '1px solid #1e293b' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: '0 0 10px',
                         textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              IV Conviction Signal — last 4 snapshots
            </p>

            {/* Main signal card */}
            <div style={{ background: bg, border: '1px solid ' + border, borderLeft: '3px solid ' + color,
                          borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: color }}>{signal}</span>
                <div style={{ flex: 1, height: 5, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: (Math.max(bullScore, bearScore) / maxScore * 100) + '%',
                                height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s' }} />
                </div>
                <span style={{ fontSize: 11, color: color, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {Math.max(bullScore, bearScore)}/{maxScore}
                </span>
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, color: color, margin: '0 0 4px' }}>{title}</p>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>{body}</p>
            </div>

            {/* Per-snapshot breakdown */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {snapDetails.map(function(s, i) {
                var priceCol   = s.priceUp ? '#4ade80' : s.priceDown ? '#f87171' : '#64748b';
                var priceArrow = s.priceUp ? '↑' : s.priceDown ? '↓' : '→';
                var ceCol      = s.ceIvUp ? '#f87171' : '#4ade80';
                var peCol      = s.peIvUp ? '#f87171' : '#4ade80';
                var scoreBg    = s.bull > 0 ? 'rgba(74,222,128,0.1)' : s.bear > 0 ? 'rgba(248,113,113,0.1)' : '#1e293b';
                return (
                  <div key={i} style={{ background: scoreBg, borderRadius: 8, padding: '8px 12px',
                                        border: '1px solid #334155', minWidth: 80, flex: 1 }}>
                    <p style={{ fontSize: 9, color: '#475569', margin: '0 0 5px', fontWeight: 700 }}>{s.time}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 10, color: priceCol, fontWeight: 700 }}>
                        {priceArrow} {s.spot ? s.spot.toFixed(0) : '—'}
                      </span>
                      <span style={{ fontSize: 9, color: ceCol }}>CE IV {s.ceIvUp ? '↑' : '↓'} {s.ceIv.toFixed(1)}%</span>
                      <span style={{ fontSize: 9, color: peCol }}>PE IV {s.peIvUp ? '↑' : '↓'} {s.peIv.toFixed(1)}%</span>
                      <span style={{ fontSize: 9, fontWeight: 700, marginTop: 2,
                                     color: s.bull > 0 ? '#4ade80' : s.bear > 0 ? '#f87171' : '#64748b' }}>
                        {s.bull > 0 ? '+' + s.bull + ' bull' : s.bear > 0 ? '+' + s.bear + ' bear' : 'neutral'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <p style={{ fontSize: 9, color: '#334155', margin: '10px 0 0' }}>
              Price↑ + CE IV↑ = +1 bull · Price↑ + PE IV↓ = +1 bull · Price↓ + PE IV↑ = +1 bear · Price↓ + CE IV↓ = +1 bear · Max 6pts · Strong ≥5 · Moderate ≥3
            </p>
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
  var pcr             = props.pcr             || 0;
  var sentiment       = props.sentiment       || 'Neutral';
  var ceCOI           = props.ceCOI           || 0;
  var peCOI           = props.peCOI           || 0;
  var history         = props.history         || [];
  var strikeHistory   = props.strikeHistory   || [];
  var reversedHistory = strikeHistory.slice().reverse();
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

  var last12 = history.slice(-12);

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e293b' }}>

        {/* Title + current PCR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ATM ± 5 Strikes — COI PCR · Vol Bias
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: color }}>{pcr.toFixed(2)}</span>
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

        {/* COI PCR trend pills */}
        {last12.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#475569', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              COI PCR Trend — Last {last12.length} readings (every 3 min)
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {last12.map(function(snap, i) {
                var val     = snap.pcr_5strike || 0;
                var col     = pcrColor(val);
                var isLast  = i === last12.length - 1;
                var prevVal = i > 0 ? (last12[i - 1].pcr_5strike || 0) : null;
                var arrow   = prevVal === null ? '' : val > prevVal ? ' ↑' : val < prevVal ? ' ↓' : ' →';
                var arrowCol = prevVal === null ? '#64748b' : val > prevVal ? '#4ade80' : val < prevVal ? '#f87171' : '#64748b';
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        padding: '6px 10px', background: isLast ? col + '22' : '#1e293b',
                                        border: '1px solid ' + (isLast ? col + '66' : '#334155'),
                                        borderRadius: 8, minWidth: 52 }}>
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

      {/* Strike table — Strike | Vol Bias (now) | COI PCR (now) | 12 historical snapshots each showing PCR + vol diff */}
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
              <th style={{ padding: '8px 14px', color: '#f1f5f9', textAlign: 'center', fontWeight: 700, whiteSpace: 'nowrap' }}>Strike</th>
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
              var pcrCol = pcrColor(row.pcr_coi);

              var volDiff  = (row.pe_vol || 0) - (row.ce_vol || 0);
              var volTotal = (row.pe_vol || 0) + (row.ce_vol || 0);
              var domPct   = volTotal > 0 ? Math.round((Math.abs(volDiff) / volTotal) * 100) : 0;
              var isBal    = volTotal === 0 || domPct < 10;
              var isPEDom  = volDiff > 0;
              var volCol   = isBal ? '#64748b' : isPEDom ? '#4ade80' : '#f87171';
              var volLabel = isBal ? 'Balanced' : isPEDom ? 'PE Dom' : 'CE Dom';

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

                  {/* Strike */}
                  <td style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 700,
                               fontSize: 13, color: isATM ? '#60a5fa' : '#f1f5f9', whiteSpace: 'nowrap' }}>
                    {row.strike}
                    {isATM && <span style={{ display: 'block', fontSize: 9, color: '#60a5fa', fontWeight: 600 }}>ATM</span>}
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
                    var pcr_h   = entry && typeof entry === 'object' ? entry.pcr_coi  : (typeof entry === 'number' ? entry : null);
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
        Vol Bias: PE Dom = put side more active · CE Dom = call side more active · Each historical column shows COI PCR (top) + Vol Diff PE−CE (bottom)
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

// Paste this into Options.js right before: export default function Options()

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
  }, []);

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
  var crudeType  = crudeVal === 0 ? 'amber' : crudeChg > 2 ? 'red' : crudeChg < -2 ? 'green' : 'amber';
  var crudeLabel = crudeVal > 0
    ? '$' + crudeVal + ' · ' + (crudeChg > 0 ? '+' : '') + crudeChg + '% · '
      + (crudeChg > 2 ? 'Sharp rise — inflation risk for India' : crudeChg < -2 ? 'Falling — positive for India' : 'Stable — neutral')
    : 'No data';

  var conditions = [
    { label: 'India VIX',       type: vixType,     value: vixVal > 0 ? vixVal : '—',    detail: vixLabel },
    { label: 'PCR (OI)',        type: pcrType,      value: pcrNow || '—',                detail: pcrLabel },
    { label: 'IV Signal',       type: ivType,       value: ivSignal || '—',              detail: ivLabel },
    { label: 'Market Breadth',  type: breadthType,  value: adRatio > 0 ? adRatio + 'x' : '—', detail: breadthLabel },
    { label: 'VWAP Position',   type: vwapType,     value: niftyLast > vwapApprox ? 'Above' : niftyLast < vwapApprox ? 'Below' : '—', detail: vwapLabel },
    { label: 'Expiry Risk',     type: expiryType,   value: tDays !== null ? tDays + 'd' : '—', detail: expiryLabel },
  ];

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
          function toIST(dateStr, timeIST) {
            return dateStr + ' ' + timeIST + ' IST';
          }

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

export default function Options() {
  var { user }  = useAuth();
  var navigate  = useNavigate();
  var [symbol, setSymbol]         = useState('NIFTY');
  var [data, setData]             = useState(null);
  var [bnData, setBnData]         = useState(null);
  var [overview, setOverview]     = useState({});
  var [loading, setLoading]       = useState(false);
  var [lastUpdate, setLastUpdate] = useState(null);
  var [showPreTrade, setShowPreTrade] = useState(false);
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
            onClick={function() { setShowPreTrade(true); }}
            style={{ background: '#7c3aed', border: '1px solid #7c3aed', borderRadius: 8, padding: '6px 16px',
                     color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em' }}
          >
            ⚡ Pre-Trade Check
          </button>
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

          <OIBar data={data} />
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