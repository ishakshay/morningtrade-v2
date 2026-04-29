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
  var strikeIVHistory = props.strikeIVHistory || [];
  var atm             = props.atm || 0;

  // Strike picker state — default to ATM, persists across renders
  var [selectedStrike, setSelectedStrike] = React.useState(0);

  // Auto-set selectedStrike to ATM when ATM first becomes available, or when it shifts
  React.useEffect(function() {
    if (atm && (!selectedStrike || Math.abs(selectedStrike - atm) > 500)) {
      setSelectedStrike(atm);
    }
  }, [atm]); // eslint-disable-line react-hooks/exhaustive-deps

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
        // ── Build the strike list (ATM±5) and pick the right data source ──
        var step = 50;
        if (strikeIVHistory.length > 0 && strikeIVHistory[strikeIVHistory.length - 1].step) {
          step = strikeIVHistory[strikeIVHistory.length - 1].step;
        } else if (symbol === 'BANKNIFTY') {
          step = 100;
        }
        var strikeList = [];
        if (atm) {
          for (var k = -5; k <= 5; k++) strikeList.push(atm + k * step);
        }

        var pickedStrike = selectedStrike || atm;
        var isAtmSelected = !atm || pickedStrike === atm;

        // Source rows: when ATM is selected, use original ATM-only history (it has spread/ratios pre-computed).
        // When a non-ATM strike is selected, derive rows from strikeIVHistory.
        var rows;
        if (isAtmSelected) {
          if (history.length < 2) return null;
          rows = history.slice().reverse();
        } else {
          if (strikeIVHistory.length < 2) {
            // Not enough per-strike data yet — show a warmup message
            return (
              <div style={{ padding: '14px 20px', borderTop: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: 0,
                               textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    IV Spread + Demand — Full Day · every 3 min
                  </p>
                  {strikeList.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: '#64748b', marginRight: 4, fontWeight: 600 }}>STRIKE</span>
                      {strikeList.map(function(s) {
                        var isAtm = s === atm;
                        var isSel = s === pickedStrike;
                        return (
                          <button key={s} onClick={function() { setSelectedStrike(s); }}
                            style={{
                              background: isSel ? (isAtm ? '#f59e0b' : '#60a5fa') : '#1e293b',
                              color: isSel ? '#0f172a' : (isAtm ? '#f59e0b' : '#94a3b8'),
                              border: '1px solid ' + (isSel ? 'transparent' : (isAtm ? '#f59e0b44' : '#334155')),
                              borderRadius: 4, padding: '4px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                              fontFamily: 'inherit', minWidth: 52, textAlign: 'center',
                            }}>
                            {s}{isAtm && <span style={{ marginLeft: 3, fontSize: 9 }}>●</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <p style={{ fontSize: 12, color: '#64748b', margin: 0, padding: '24px 0', textAlign: 'center' }}>
                  Strike {pickedStrike} — collecting data ({strikeIVHistory.length}/2 readings). Updates every 3 minutes.
                </p>
              </div>
            );
          }
          rows = strikeIVHistory.slice().reverse().map(function(snap) {
            var s = snap.strikes && snap.strikes[pickedStrike];
            // Put-call parity: CE and PE on the same strike+expiry have the same
            // IV (theoretically). For deep ITM strikes the backend's IV solver
            // often fails on the ITM side (strike below ATM → CE deep ITM →
            // ce_iv missing; strike above ATM → PE deep ITM → pe_iv missing).
            // Backfill the missing side using the OTM side's IV. Mark it so
            // the cell renderer can show a small "parity" hint.
            var rawCe = s ? (s.ce_iv || 0) : 0;
            var rawPe = s ? (s.pe_iv || 0) : 0;
            var ceFromParity = false, peFromParity = false;
            if (rawCe <= 0 && rawPe > 0) { rawCe = rawPe; ceFromParity = true; }
            else if (rawPe <= 0 && rawCe > 0) { rawPe = rawCe; peFromParity = true; }
            return {
              time:    snap.time,
              spot:    snap.spot,
              vix:     snap.vix,
              ce_iv:   rawCe,
              pe_iv:   rawPe,
              ce_ltp:  s ? s.ce_ltp : 0,
              pe_ltp:  s ? s.pe_ltp : 0,
              ce_from_parity: ceFromParity,
              pe_from_parity: peFromParity,
            };
          });
        }

        return (
          <div style={{ padding: '14px 20px', borderTop: '1px solid #1e293b' }}>

            {/* Header + strike picker */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: 0,
                           textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                IV Spread + Demand — Full Day · every 3 min
                {pickedStrike && atm && (function() {
                  if (isAtmSelected) {
                    return <span style={{ marginLeft: 8, color: '#f59e0b', fontWeight: 700 }}>· {pickedStrike} ATM</span>;
                  }
                  var diff = Math.round((pickedStrike - atm) / (step || 50));
                  var label = diff > 0 ? 'ATM+' + diff : 'ATM' + diff;
                  return <span style={{ marginLeft: 8, color: '#60a5fa', fontWeight: 700 }}>· {pickedStrike} <span style={{ fontSize: 9, color: '#64748b' }}>({label})</span></span>;
                })()}
              </p>
              {strikeList.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: '#64748b', marginRight: 4, fontWeight: 600 }}>STRIKE</span>
                  {strikeList.map(function(s) {
                    var isAtm = s === atm;
                    var isSel = s === pickedStrike;
                    return (
                      <button key={s} onClick={function() { setSelectedStrike(s); }}
                        style={{
                          background: isSel ? (isAtm ? '#f59e0b' : '#60a5fa') : '#1e293b',
                          color: isSel ? '#0f172a' : (isAtm ? '#f59e0b' : '#94a3b8'),
                          border: '1px solid ' + (isSel ? 'transparent' : (isAtm ? '#f59e0b44' : '#334155')),
                          borderRadius: 4, padding: '4px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                          fontFamily: 'inherit', minWidth: 52, textAlign: 'center',
                        }}>
                        {s}{isAtm && <span style={{ marginLeft: 3, fontSize: 9 }}>●</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

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
                          {snap.ce_from_parity && ceR != null && (
                            <span title="Backfilled from PE IV via put-call parity (CE deep ITM)"
                                  style={{ fontSize: 9, color: '#a78bfa', marginLeft: 3, fontWeight: 700 }}>p</span>
                          )}
                          {ceDir && <span style={{ fontSize: 10, color: ceColor, marginLeft: 4, fontWeight: 700 }}>{ceDir}</span>}
                        </td>
                        <td style={{ padding: '6px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <span style={{ color: peR != null && peR > 1.0 ? '#4ade80' : '#64748b',
                                         fontWeight: peR != null && peR > 1.0 ? 700 : 400 }}>
                            {peR != null ? peR.toFixed(3) : '—'}
                          </span>
                          {snap.pe_from_parity && peR != null && (
                            <span title="Backfilled from CE IV via put-call parity (PE deep ITM)"
                                  style={{ fontSize: 9, color: '#a78bfa', marginLeft: 3, fontWeight: 700 }}>p</span>
                          )}
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
                  <p style={{ fontSize: 10, color: '#475569', margin: '0 0 2px', lineHeight: 1.5 }}>
                    Both ratios falling → IV crush in progress — premium collapsing, no edge in buying options.
                  </p>
                  <p style={{ fontSize: 10, color: '#475569', margin: '4px 0 0', lineHeight: 1.5 }}>
                    <span style={{ color: '#a78bfa', fontWeight: 700 }}>p</span> next to a value — backfilled from the OTM side via put-call parity (deep ITM IV is unreliable; same-strike IVs are theoretically equal).
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

// ─── Volume Analysis Panel + Spike Detector ─────────────────────────────────

function _vfmt(n) {
  if (!n) return '0';
  var abs = Math.abs(n);
  if (abs >= 10000000) return (n / 10000000).toFixed(2) + 'Cr';
  if (abs >= 100000)   return (n / 100000).toFixed(1) + 'L';
  if (abs >= 1000)     return (n / 1000).toFixed(0) + 'K';
  return String(n);
}

function _buildupColor(b) {
  if (b === 'long_buildup')   return '#4ade80';
  if (b === 'short_covering') return '#86efac';
  if (b === 'short_buildup')  return '#f87171';
  if (b === 'long_unwinding') return '#fca5a5';
  if (b === 'churn')          return '#94a3b8';
  return '#475569';
}

function _buildupLabel(b) {
  if (b === 'long_buildup')   return 'Long Buildup';
  if (b === 'short_buildup')  return 'Short Buildup';
  if (b === 'short_covering') return 'Short Covering';
  if (b === 'long_unwinding') return 'Long Unwinding';
  if (b === 'churn')          return 'Churn';
  return 'Quiet';
}

function _voiBg(label) {
  if (label === 'position_building') return 'rgba(74,222,128,0.12)';
  if (label === 'balanced')          return 'rgba(245,158,11,0.10)';
  if (label === 'mixed')             return 'rgba(148,163,184,0.10)';
  if (label === 'churn')             return 'rgba(248,113,113,0.10)';
  return 'transparent';
}

function _smartScoreColor(s) {
  if (s >= 70) return '#4ade80';
  if (s >= 50) return '#f59e0b';
  return '#94a3b8';
}

function VolumeAnalysisPanel(props) {
  var v = props.volume;
  if (!v || !v.top_volume_strikes) {
    return (
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 24, color: '#64748b', fontSize: 13, marginBottom: 16 }}>
        Volume analytics warming up…
      </div>
    );
  }

  var ceVolPct = v.total_ce_volume / Math.max(v.total_ce_volume + v.total_pe_volume, 1) * 100;
  var pePct    = 100 - ceVolPct;
  var churnCol = v.churn_pct < 50 ? '#4ade80' : v.churn_pct < 75 ? '#f59e0b' : '#f87171';

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Volume Analysis
          </h3>
          <p style={{ margin: '3px 0 0', fontSize: 10, color: '#475569' }}>
            ATM ±10 strikes · {v.snapshot_time} IST · {(v.tod_window || '').replace(/_/g, ' ')}
          </p>
        </div>
        <span style={{ fontSize: 9, color: '#475569', fontStyle: 'italic' }}>
          Volume = activity · OI = commitment
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, marginBottom: 18 }}>

        <div style={{ background: '#020617', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 }}>
            Volume Split (Calls vs Puts)
          </div>
          <div style={{ display: 'flex', height: 22, borderRadius: 4, overflow: 'hidden', background: '#1e293b' }}>
            <div style={{ width: ceVolPct + '%', background: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff' }}>
              {ceVolPct >= 12 ? 'CE ' + ceVolPct.toFixed(0) + '%' : ''}
            </div>
            <div style={{ width: pePct + '%', background: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#0f172a' }}>
              {pePct >= 12 ? 'PE ' + pePct.toFixed(0) + '%' : ''}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: '#94a3b8' }}>
            <span>{_vfmt(v.total_ce_volume)} CE</span>
            <span style={{ color: v.ce_pe_volume_ratio > 1.2 ? '#f87171' : v.ce_pe_volume_ratio < 0.83 ? '#4ade80' : '#94a3b8', fontWeight: 700 }}>
              CE/PE: {v.ce_pe_volume_ratio}
            </span>
            <span>{_vfmt(v.total_pe_volume)} PE</span>
          </div>
        </div>

        <div style={{ background: '#020617', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 700 }}>CE V/OI</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f87171' }}>{v.ce_voi_ratio}</div>
          <div style={{ fontSize: 9, color: '#475569' }}>
            {v.ce_voi_ratio < 1.5 ? 'Position' : v.ce_voi_ratio < 3 ? 'Balanced' : v.ce_voi_ratio < 4 ? 'Mixed' : 'Churn'}
          </div>
        </div>

        <div style={{ background: '#020617', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 700 }}>PE V/OI</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#4ade80' }}>{v.pe_voi_ratio}</div>
          <div style={{ fontSize: 9, color: '#475569' }}>
            {v.pe_voi_ratio < 1.5 ? 'Position' : v.pe_voi_ratio < 3 ? 'Balanced' : v.pe_voi_ratio < 4 ? 'Mixed' : 'Churn'}
          </div>
        </div>

        <div style={{ background: '#020617', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 700 }}>Session Churn</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: churnCol }}>{v.churn_pct}%</div>
          <div style={{ fontSize: 9, color: '#475569' }}>
            {v.churn_pct < 50 ? 'Real positioning' : v.churn_pct < 75 ? 'Mixed flow' : 'Mostly day-trade'}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 }}>
        Top 5 Strikes by Volume — Buildup &amp; Smart Money
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ background: '#020617' }}>
            <th style={{ textAlign: 'left',   padding: '8px 10px', color: '#94a3b8', fontWeight: 700, fontSize: 10 }}>Strike</th>
            <th style={{ textAlign: 'center', padding: '8px 10px', color: '#f87171', fontWeight: 700, fontSize: 10 }}>CE Buildup</th>
            <th style={{ textAlign: 'right',  padding: '8px 10px', color: '#94a3b8', fontWeight: 700, fontSize: 10 }}>CE V/OI</th>
            <th style={{ textAlign: 'right',  padding: '8px 10px', color: '#94a3b8', fontWeight: 700, fontSize: 10 }}>CE Vol</th>
            <th style={{ textAlign: 'right',  padding: '8px 10px', color: '#94a3b8', fontWeight: 700, fontSize: 10 }}>PE Vol</th>
            <th style={{ textAlign: 'right',  padding: '8px 10px', color: '#94a3b8', fontWeight: 700, fontSize: 10 }}>PE V/OI</th>
            <th style={{ textAlign: 'center', padding: '8px 10px', color: '#4ade80', fontWeight: 700, fontSize: 10 }}>PE Buildup</th>
            <th style={{ textAlign: 'center', padding: '8px 10px', color: '#94a3b8', fontWeight: 700, fontSize: 10 }}>SM Score</th>
          </tr>
        </thead>
        <tbody>
          {v.top_volume_strikes.map(function(s) {
            var isAtm = s.strike === v.atm;
            return (
              <tr key={s.strike} style={{ borderBottom: '1px solid #1e293b22', background: isAtm ? 'rgba(245,158,11,0.05)' : 'transparent' }}>
                <td style={{ padding: '9px 10px', fontWeight: 800, color: '#f1f5f9' }}>
                  {s.strike}
                  {isAtm && <span style={{ marginLeft: 6, fontSize: 8, padding: '2px 5px', background: 'rgba(245,158,11,0.2)', color: '#f59e0b', borderRadius: 3, fontWeight: 700 }}>ATM</span>}
                </td>
                <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: _buildupColor(s.ce.buildup), padding: '3px 7px', borderRadius: 4, background: _voiBg(s.ce.voi_label) }}>
                    {_buildupLabel(s.ce.buildup)}
                  </span>
                </td>
                <td style={{ padding: '9px 10px', textAlign: 'right', color: '#cbd5e1', fontWeight: 700 }}>{s.ce.voi_ratio}</td>
                <td style={{ padding: '9px 10px', textAlign: 'right', color: '#94a3b8' }}>{_vfmt(s.ce.volume)}</td>
                <td style={{ padding: '9px 10px', textAlign: 'right', color: '#94a3b8' }}>{_vfmt(s.pe.volume)}</td>
                <td style={{ padding: '9px 10px', textAlign: 'right', color: '#cbd5e1', fontWeight: 700 }}>{s.pe.voi_ratio}</td>
                <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: _buildupColor(s.pe.buildup), padding: '3px 7px', borderRadius: 4, background: _voiBg(s.pe.voi_label) }}>
                    {_buildupLabel(s.pe.buildup)}
                  </span>
                </td>
                <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: _smartScoreColor(s.smart_money_score) }}>
                    {s.smart_money_score}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: 12, padding: '10px 12px', background: '#020617', borderRadius: 6, fontSize: 10, color: '#64748b', lineHeight: 1.6 }}>
        <strong style={{ color: '#94a3b8' }}>How to read:</strong>{' '}
        V/OI &lt; 1.5 = position building (high conviction) ·
        1.5–3 = balanced ·
        &gt; 4 = churn (ignore for structure).
        Smart Money Score weighs V/OI, ΔOI conversion, time-of-day, and strike distance.{' '}
        <strong style={{ color: '#cbd5e1' }}>≥ 70 = likely institutional.</strong>
      </div>
    </div>
  );
}

function VolumeSpikePanel(props) {
  var samples      = props.samples      || 0;     // chainHistory length
  var minSamples   = props.minSamples   || 6;     // need 6 to compute 5 deltas
  var spikes       = props.spikes       || [];
  var threshold    = props.threshold    || 1.5;
  var setThreshold = props.setThreshold;
  var sessionPhase = props.sessionPhase || 'live';  // 'open-noise', 'live', 'closed'

  if (samples < minSamples) {
    return (
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 800, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Volume Spike Detector
        </h3>
        <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
          Warming up — need {minSamples - samples} more snapshot(s) to establish baseline. ({samples}/{minSamples})
        </p>
      </div>
    );
  }

  var phaseNote = sessionPhase === 'open-noise'
                ? 'Suppressing first 20 min of session (open is structurally noisy)'
                : sessionPhase === 'closed'
                ? 'Market closed · showing latest detection'
                : null;

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Volume Spike Detector
          </h3>
          <p style={{ margin: '3px 0 0', fontSize: 10, color: '#475569' }}>
            Strikes with delta volume &gt; {threshold}× rolling avg · {samples} snapshots in baseline
          </p>
          {phaseNote && (
            <p style={{ margin: '3px 0 0', fontSize: 10, color: '#f59e0b' }}>⏳ {phaseNote}</p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#64748b' }}>Threshold</span>
          <select
            value={threshold}
            onChange={function(e) { if (setThreshold) setThreshold(parseFloat(e.target.value)); }}
            style={{ background: '#020617', color: '#f1f5f9', border: '1px solid #1e293b', borderRadius: 4, padding: '4px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
          >
            <option value={1.5}>1.5×</option>
            <option value={2}>2×</option>
            <option value={3}>3×</option>
            <option value={5}>5×</option>
          </select>
        </div>
      </div>

      {spikes.length === 0 ? (
        <div style={{ padding: '24px 12px', textAlign: 'center', color: '#475569', fontSize: 12 }}>
          No volume spikes above {threshold}× this snapshot. Tape is quiet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {spikes.map(function(spike, i) {
            var sideCol = spike.side === 'CE' ? '#f87171' : '#4ade80';
            var sideBg  = spike.side === 'CE' ? 'rgba(248,113,113,0.10)' : 'rgba(74,222,128,0.10)';
            var aggrCol = spike.aggression === 'writer' ? '#f87171' :
                          spike.aggression === 'buyer'  ? '#4ade80' :
                          spike.aggression === 'unwind' ? '#94a3b8' : '#64748b';
            var aggrLabel = spike.aggression === 'writer' ? 'Writer aggression (sold to bid)' :
                            spike.aggression === 'buyer'  ? 'Buyer aggression (lifted offer)' :
                            spike.aggression === 'unwind' ? 'Position unwind (OI down)' :
                            'Neutral two-sided';
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px 50px 90px 80px 1fr 70px 60px', gap: 10, alignItems: 'center', padding: '9px 12px', background: sideBg, borderRadius: 6, borderLeft: '3px solid ' + sideCol }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9' }}>
                  {spike.strike}
                  {spike.is_atm && <span style={{ marginLeft: 4, fontSize: 8, color: '#f59e0b' }}>●</span>}
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: sideCol }}>{spike.side}</div>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9' }}>{spike.multiple.toFixed(1)}×</span>
                  <span style={{ fontSize: 9, color: '#64748b', marginLeft: 4 }}>avg</span>
                </div>
                <div style={{ fontSize: 11, color: '#cbd5e1' }}>
                  +{_vfmt(spike.delta_volume)}
                  <span style={{ fontSize: 9, color: '#64748b', marginLeft: 3 }}>vol</span>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: aggrCol }}>{aggrLabel}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                    {_buildupLabel(spike.buildup)} · ΔOI {spike.delta_oi >= 0 ? '+' : ''}{_vfmt(spike.delta_oi)}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: '#64748b' }}>{spike.time}</div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: _smartScoreColor(spike.sm_score) }}>{spike.sm_score}</span>
                  <div style={{ fontSize: 8, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SM Score</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 12, padding: '10px 12px', background: '#020617', borderRadius: 6, fontSize: 10, color: '#64748b', lineHeight: 1.6 }}>
        <strong style={{ color: '#94a3b8' }}>Reading the tape:</strong>{' '}
        <span style={{ color: '#f87171' }}>Writer aggression</span> at a strike = that strike often becomes S/R (~65-70% hit rate same-day on Indian indices).{' '}
        <span style={{ color: '#4ade80' }}>Buyer aggression</span> = directional bet, lower hit rate but faster moves when right.
        Deep OTM spikes are usually retail FOMO — weight the SM Score heavily.
      </div>
    </div>
  );
}

// ─── TV Events Panel — events streamed from TradingView Pine Script via ──────
// the local webhook receiver (/api/tv/webhook → /api/tv/events). Shows the
// strongest signal per bar emitted by the NIFTY Option Volume Flow Tracker
// indicator. Polls /api/tv/events every 5s using since={lastSeenId} for
// efficient incremental fetch.
function TVEventsPanel(props) {
  var events     = props.events     || [];
  var configured = props.configured;
  var lastErr    = props.lastErr;

  function sigInterpretation(sig, side, buyerRead) {
    // Translate the Pine signal codes to a buyer-perspective read
    if (sig === 'AB+') {
      return side === 'CE'
        ? '🟢 EXTREME CALL BUYING — call buyers paying up · CE-friendly · z≥3'
        : '🔴 EXTREME PUT BUYING — put buyers paying up · PE-friendly · z≥3';
    }
    if (sig === 'AB') {
      return side === 'CE'
        ? '🟢 Aggressive call buying — CE-friendly · z≥2'
        : '🔴 Aggressive put buying — PE-friendly · z≥2';
    }
    if (sig === 'AS+') {
      return side === 'CE'
        ? '🟠 EXTREME CALL SELLING — writers active · resistance forming · z≥3'
        : '🟢 EXTREME PUT SELLING — writers active · support forming · z≥3';
    }
    if (sig === 'AS') {
      return side === 'CE'
        ? '🟠 Aggressive call selling — writers active · z≥2'
        : '🟢 Aggressive put selling — writers active · z≥2';
    }
    return '— neutral';
  }

  function sigColor(sig, side) {
    var bull = side === 'CE' ? (sig === 'AB' || sig === 'AB+') : (sig === 'AS' || sig === 'AS+');
    var bear = side === 'CE' ? (sig === 'AS' || sig === 'AS+') : (sig === 'AB' || sig === 'AB+');
    if (bull) return '#4ade80';
    if (bear) return '#f87171';
    return '#94a3b8';
  }

  function biasColor(verdict) {
    if (verdict === 'BULLISH++') return '#4ade80';
    if (verdict === 'BULLISH')   return '#a3e635';
    if (verdict === 'BEARISH++') return '#f87171';
    if (verdict === 'BEARISH')   return '#f59e0b';
    return '#64748b';
  }

  function fmtAgo(receivedMs) {
    if (!receivedMs) return '—';
    var s = Math.max(0, Math.floor((Date.now() - receivedMs) / 1000));
    if (s < 60)   return s + 's ago';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    return Math.floor(s / 3600) + 'h ago';
  }

  // Show newest first
  var ordered = events.slice().reverse();

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span style={{ background: '#a78bfa', color: '#0f172a', padding: '2px 6px', borderRadius: 3, fontSize: 9, marginRight: 8, fontWeight: 800 }}>LIVE</span>
            Volume Analysis
          </h3>
          <p style={{ margin: '3px 0 0', fontSize: 10, color: '#475569' }}>
            Real-time Z-score volume spikes from TradingView · arrives on bar close · {ordered.length} buffered
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                         background: configured && !lastErr ? '#4ade80' : configured && lastErr ? '#f59e0b' : '#64748b',
                         boxShadow: configured && !lastErr ? '0 0 6px #4ade80aa' : 'none' }} />
          <span style={{ fontSize: 10, color: configured && !lastErr ? '#4ade80' : configured && lastErr ? '#f59e0b' : '#64748b', fontWeight: 600 }}>
            {!configured ? 'NOT CONFIGURED' : lastErr ? 'POLL ERROR' : 'LIVE'}
          </span>
        </div>
      </div>

      {!configured && (
        <div style={{ padding: '14px 16px', background: 'rgba(100,116,139,0.08)', border: '1px solid #334155', borderRadius: 6, fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>
          <strong style={{ color: '#cbd5e1' }}>Not connected to TradingView yet.</strong>{' '}
          Set <code style={{ background: '#020617', padding: '1px 5px', borderRadius: 3, fontSize: 10 }}>TV_WEBHOOK_SECRET</code> in your backend env,
          add the webhook section to your Pine Script, expose your local server via ngrok, and create a TradingView alert pointing at the public URL.
          See <code style={{ background: '#020617', padding: '1px 5px', borderRadius: 3, fontSize: 10 }}>tv_integration/SETUP.md</code> for the full setup.
        </div>
      )}

      {configured && ordered.length === 0 && (
        <div style={{ padding: '24px 12px', textAlign: 'center', color: '#475569', fontSize: 12 }}>
          Connected · awaiting first event from TradingView. Events fire on bar close when any strike Z ≥ 2.5 or bias |%| ≥ 45.
        </div>
      )}

      {ordered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 380, overflowY: 'auto' }}>
          {ordered.map(function(e) {
            var sCol = sigColor(e.sig, e.side);
            var sBg  = sCol === '#4ade80' ? 'rgba(74,222,128,0.08)'
                     : sCol === '#f87171' ? 'rgba(248,113,113,0.08)'
                     : 'rgba(148,163,184,0.05)';
            var biasC = biasColor(e.bias_verdict);
            var interp = sigInterpretation(e.sig, e.side, e.buyer_read);
            return (
              <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '70px 60px 80px 1fr 90px 70px',
                                        gap: 10, alignItems: 'center', padding: '9px 12px',
                                        background: sBg, borderRadius: 6, borderLeft: '3px solid ' + sCol }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9' }}>{e.strike}</div>
                  <div style={{ fontSize: 9, color: '#64748b' }}>{e.tf}-min</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: sCol }}>{e.side}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: sCol }}>{e.sig || '—'}</div>
                  <div style={{ fontSize: 9, color: '#64748b' }}>z={e.z != null ? Number(e.z).toFixed(1) : '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#cbd5e1' }}>{interp}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                    LTP ₹{e.ltp != null ? Number(e.ltp).toFixed(1) : '—'}
                    {e.delta_pct != null && <span> · Δ{e.delta_pct > 0 ? '+' : ''}{Math.round(e.delta_pct)}%</span>}
                    {' · spot '}{e.spot}
                    {' · bias '}<span style={{ color: biasC, fontWeight: 700 }}>{e.bias_verdict}</span>
                    {e.bias_flip && <span style={{ color: '#f59e0b', marginLeft: 4 }}> · 🔄 FLIP</span>}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: '#64748b' }}>{e.ts ? e.ts.slice(11, 16) : ''}</div>
                <div style={{ fontSize: 10, color: '#475569', textAlign: 'right' }}>{fmtAgo(e.received_ms)}</div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 12, padding: '10px 12px', background: '#020617', borderRadius: 6, fontSize: 10, color: '#64748b', lineHeight: 1.6 }}>
        <strong style={{ color: '#94a3b8' }}>Reading the codes:</strong>{' '}
        <span style={{ color: '#4ade80' }}>AB / AB+</span> = aggressive buying (premium up + Z ≥ 2 / 3) ·{' '}
        <span style={{ color: '#f87171' }}>AS / AS+</span> = aggressive selling (premium down + Z ≥ 2 / 3).{' '}
        For an option buyer: CE-AB or PE-AS = call buyers favored · PE-AB or CE-AS = put buyers favored.
        Bias is page-wide CE vs PE pressure across all 14 strike-sides on TV.
      </div>
    </div>
  );
}


// Mirrors UnwindAlerts styling. Shows the most recent / highest-SM-score
// volume spike chips. Filtered: only SM >= 60 spikes from the latest snapshot.

function VolumeSpikeBanner(props) {
  var spikes = (props.spikes || []).filter(function(s) { return s.sm_score >= 60; });
  if (spikes.length === 0) return null;

  // Deduplicate by strike+side, keeping the highest SM score
  var byKey = {};
  spikes.forEach(function(s) {
    var k = s.strike + '_' + s.side;
    if (!byKey[k] || byKey[k].sm_score < s.sm_score) byKey[k] = s;
  });
  var deduped = Object.keys(byKey).map(function(k) { return byKey[k]; })
                                    .sort(function(a, b) { return b.sm_score - a.sm_score; })
                                    .slice(0, 8);

  return (
    <div style={{ background: '#0f172a', border: '1px solid #f59e0b44', borderRadius: 12, padding: '14px 20px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 16 }}>⚡</span>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Unusual Volume Activity
        </p>
        <span style={{ fontSize: 11, color: '#64748b' }}>
          {deduped.length} strike{deduped.length === 1 ? '' : 's'} with smart-money footprint detected
        </span>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {deduped.map(function(s, i) {
          var sideCol = s.side === 'CE' ? '#f87171' : '#4ade80';
          var aggrIcon = s.aggression === 'writer' ? '✍️' :
                         s.aggression === 'buyer'  ? '🎯' :
                         s.aggression === 'unwind' ? '↩️' : '•';
          return (
            <div key={i} style={{ background: '#1e293b', borderRadius: 8, padding: '8px 14px', border: '1px solid ' + sideCol + '44', minWidth: 130 }}>
              <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 2px', fontWeight: 600 }}>
                {aggrIcon} {s.side} · {s.multiple.toFixed(1)}× avg vol
              </p>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9', margin: '0 0 2px' }}>
                {s.strike}
                {s.is_atm && <span style={{ marginLeft: 4, fontSize: 8, color: '#f59e0b' }}>●</span>}
              </p>
              <p style={{ fontSize: 11, fontWeight: 700, color: sideCol, margin: 0 }}>
                SM {s.sm_score} · {_buildupLabel(s.buildup)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ─── Macro Context Panels — IV Regime, Option Flow CVD, Spot Context ──────

// ─── IV vs Realized Vol — buyer's macro question ──────────────────────────────
// Rich/fair/cheap regime indicator. RICH = buyers overpaying for vol that's
// not materializing. CHEAP = buyers getting a discount.
//
// Inputs:
//   ivHistory       — [{ce_iv, pe_iv, avg_iv, ...}] 3-min snapshots
//   intradayHistory — [{time, price, ...}] 3-min snapshots
//   symbol          — 'NIFTY' or 'BANKNIFTY'
//
// Caveat: "RV" here is computed from today's session 3-min returns, annualized.
// For a true 5-day RV comparator the backend would need to provide multi-session
// price history. Today's session RV is a reasonable proxy when 30+ bars exist.
function IVRegimeBadge(props) {
  var ivHistory       = props.ivHistory       || [];
  var intradayHistory = props.intradayHistory || [];

  // Need enough bars for stable RV — at least ~30 (90 min)
  if (ivHistory.length < 2 || intradayHistory.length < 30) {
    return (
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12,
                    padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          IV vs RV Regime
        </span>
        <span style={{ fontSize: 12, color: '#334155' }}>
          ⏳ Building data — need 30+ intraday bars (~90 min) for RV stability
        </span>
      </div>
    );
  }

  // ── Compute today's session RV from 3-min log returns ────────────────────
  // Reverse-chronological → chronological for math sanity
  var ordered = intradayHistory.slice().reverse();
  var prices = ordered.map(function(s) { return s.price || 0; }).filter(function(p) { return p > 0; });
  if (prices.length < 30) {
    return null;  // shouldn't happen given above guard
  }
  var logRets = [];
  for (var i = 1; i < prices.length; i++) {
    if (prices[i-1] > 0 && prices[i] > 0) {
      logRets.push(Math.log(prices[i] / prices[i-1]));
    }
  }
  var mean = logRets.reduce(function(a, b) { return a + b; }, 0) / Math.max(logRets.length, 1);
  var variance = logRets.reduce(function(a, b) { return a + (b - mean) * (b - mean); }, 0) / Math.max(logRets.length - 1, 1);
  var stdev = Math.sqrt(variance);
  // Bars per trading day = 75 (6.25 hrs × 60 / 5)... actually 3-min = ~125 bars.
  // Trading-day count: 9:15 to 15:30 = 375 min / 3 = 125 bars/day.
  // Annualization: stdev × sqrt(125 × 252) = stdev × sqrt(31500)
  var rvAnnual = stdev * Math.sqrt(125 * 252) * 100;  // as %

  // ── Current IV ──
  var lastIV = ivHistory[ivHistory.length - 1];
  var ivAtm  = lastIV.avg_iv || ((lastIV.ce_iv + lastIV.pe_iv) / 2);

  // ── Spread ──
  var spread = ivAtm - rvAnnual;
  var regime, regimeColor, regimeNote;
  if (spread > 4) {
    regime      = 'RICH';
    regimeColor = '#f87171';
    regimeNote  = 'IV well above realized — buyers overpaying for vol that isn\u2019t materializing';
  } else if (spread > 1.5) {
    regime      = 'MILDLY RICH';
    regimeColor = '#f59e0b';
    regimeNote  = 'IV above realized — slight premium for buyers';
  } else if (spread > -1.5) {
    regime      = 'FAIR';
    regimeColor = '#a3e635';
    regimeNote  = 'IV roughly aligned with realized — neutral conditions';
  } else if (spread > -4) {
    regime      = 'MILDLY CHEAP';
    regimeColor = '#60a5fa';
    regimeNote  = 'IV below realized — modest buyer edge';
  } else {
    regime      = 'CHEAP';
    regimeColor = '#4ade80';
    regimeNote  = 'IV well below realized — vol is discounted, buyer market';
  }

  // Daily move expectation from IV
  var dailyMovePct = ivAtm / Math.sqrt(252);
  var lastPrice = prices[prices.length - 1];
  var dailyMovePts = lastPrice * (dailyMovePct / 100);

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b',
                  borderLeft: '4px solid ' + regimeColor, borderRadius: 12,
                  padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <div style={{ minWidth: 130 }}>
        <p style={{ fontSize: 9, color: '#475569', margin: '0 0 3px',
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          IV vs RV Regime
        </p>
        <span style={{ fontSize: 18, fontWeight: 900, color: regimeColor }}>{regime}</span>
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 9, color: '#475569', margin: '0 0 2px', fontWeight: 700, textTransform: 'uppercase' }}>ATM IV</p>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8' }}>{ivAtm.toFixed(1)}%</span>
        </div>
        <div>
          <p style={{ fontSize: 9, color: '#475569', margin: '0 0 2px', fontWeight: 700, textTransform: 'uppercase' }}>Session RV</p>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8' }}>{rvAnnual.toFixed(1)}%</span>
        </div>
        <div>
          <p style={{ fontSize: 9, color: '#475569', margin: '0 0 2px', fontWeight: 700, textTransform: 'uppercase' }}>IV-RV</p>
          <span style={{ fontSize: 14, fontWeight: 800, color: regimeColor }}>{spread > 0 ? '+' : ''}{spread.toFixed(1)}</span>
        </div>
        <div>
          <p style={{ fontSize: 9, color: '#475569', margin: '0 0 2px', fontWeight: 700, textTransform: 'uppercase' }}>Implied Daily Move</p>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#60a5fa' }}>±{dailyMovePts.toFixed(0)}</span>
          <span style={{ fontSize: 10, color: '#475569', marginLeft: 4 }}>({dailyMovePct.toFixed(2)}%)</span>
        </div>
      </div>
      <p style={{ fontSize: 11, color: regimeColor, margin: 0, flex: 1, minWidth: 180, lineHeight: 1.5 }}>{regimeNote}</p>
    </div>
  );
}

// ─── Cumulative Option Flow Delta (CVD analog for options) ───────────────────
// True CVD requires aggressor tape data we don't have. Instead, use cumulative
// (PE_vol - CE_vol) which captures option-side directional positioning. Plot
// against price to detect divergences:
//   Price ↑ + Flow ↑   → confirmed up-move
//   Price ↑ + Flow ↓   → BEARISH DIVERGENCE — call buyers exhausting / put writers
//   Price ↓ + Flow ↓   → confirmed down-move
//   Price ↓ + Flow ↑   → BULLISH DIVERGENCE — put buyers exhausting / call writers
// ─── Option Flow Decomposition — premium-aware buyer/writer separation ───────
// Replaces the naive cumulative (PE_vol - CE_vol) CVD with a proper four-quadrant
// classification per strike, per bar, per side. Each (ΔOI sign × ΔLTP sign) maps
// to one of: Call/Put Buying, Writing, Short Covering, or Long Unwinding. Each
// quadrant has a known directional implication, so we can sum bullish vs bearish
// contributors instead of conflating them.
//
// Inputs:
//   strikeHistory — strike_pcr_history snapshots: [{time, strikes:{[strike]:{ce_oi,pe_oi,ce_ltp,pe_ltp,...}}}]
//   atm           — current ATM strike
//   symbol        — 'NIFTY' or 'BANKNIFTY' (for noise threshold)
//
// Why strike_pcr_history (and not intraday_history): we need per-strike LTP per
// snapshot to read the premium move that disambiguates buyer flow from writer
// flow. strike_pcr_history has it; intraday_history.strikes only has OI/vol.
function OptionFlowDecomp(props) {
  var strikeHistory = props.strikeHistory || [];
  var atm           = props.atm           || 0;
  var symbol        = props.symbol        || 'NIFTY';

  if (strikeHistory.length < 4 || !atm) {
    return (
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12,
                    padding: '14px 20px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 4px',
                    textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Option Flow Decomposition
        </p>
        <p style={{ fontSize: 12, color: '#334155', margin: 0 }}>
          Building data — need 4+ strike snapshots and ATM strike
        </p>
      </div>
    );
  }

  // ── Configuration ──────────────────────────────────────────────────────────
  var step       = symbol === 'BANKNIFTY' ? 100 : 50;
  var noiseFloor = symbol === 'BANKNIFTY' ? 800  : 1500;   // |ΔOI| floor per strike per bar
  var ltpFloor   = 0.05;                                    // |ΔLTP| floor (₹) — below = noise
  var freshWt    = 1.0;                                     // weight for fresh positioning
  var closeWt    = 0.5;                                     // weight for closing flow (covering/unwinding)

  // Strikes in scope: ATM ±5
  var scopeStrikes = [];
  for (var off = -5; off <= 5; off++) scopeStrikes.push(atm + off * step);

  // ── Classify a (side, dOI, dLTP) into a flow type ──
  // Returns { type, bullish, bearish, weight } where bullish/bearish are
  // multiplied by |dOI| × weight to get the contribution.
  function classify(side, dOI, dLTP) {
    if (Math.abs(dOI) < noiseFloor || Math.abs(dLTP) < ltpFloor) return null;
    var oiUp = dOI > 0, oiDn = dOI < 0;
    var ltpUp = dLTP > 0, ltpDn = dLTP < 0;
    var mag = Math.abs(dOI);

    if (side === 'CE') {
      if (oiUp && ltpUp) return { type: 'Call Buying',         bullish: mag * freshWt, bearish: 0,             code: 'CB' };
      if (oiUp && ltpDn) return { type: 'Call Writing',        bullish: 0,             bearish: mag * freshWt, code: 'CW' };
      if (oiDn && ltpUp) return { type: 'Call Short Covering', bullish: mag * closeWt, bearish: 0,             code: 'CSC' };
      if (oiDn && ltpDn) return { type: 'Call Long Unwinding', bullish: 0,             bearish: mag * closeWt, code: 'CLU' };
    } else {
      if (oiUp && ltpUp) return { type: 'Put Buying',          bullish: 0,             bearish: mag * freshWt, code: 'PB' };
      if (oiUp && ltpDn) return { type: 'Put Writing',         bullish: mag * freshWt, bearish: 0,             code: 'PW' };
      if (oiDn && ltpUp) return { type: 'Put Short Covering',  bullish: 0,             bearish: mag * closeWt, code: 'PSC' };
      if (oiDn && ltpDn) return { type: 'Put Long Unwinding',  bullish: mag * closeWt, bearish: 0,             code: 'PLU' };
    }
    return null;
  }

  // ── Walk consecutive snapshots, decompose each bar ─────────────────────────
  var bars = [];   // [{time, bullish, bearish, contributions:[{strike,side,type,mag,weight}]}]
  for (var i = 1; i < strikeHistory.length; i++) {
    var prev = strikeHistory[i - 1];
    var curr = strikeHistory[i];
    if (!prev.strikes || !curr.strikes) continue;

    var bull = 0, bear = 0;
    var contribs = [];

    scopeStrikes.forEach(function(strike) {
      var pE = prev.strikes[String(strike)];
      var cE = curr.strikes[String(strike)];
      if (!pE || !cE || typeof pE !== 'object' || typeof cE !== 'object') return;

      ['CE', 'PE'].forEach(function(side) {
        var oiKey  = side === 'CE' ? 'ce_oi'  : 'pe_oi';
        var ltpKey = side === 'CE' ? 'ce_ltp' : 'pe_ltp';
        var pOI  = pE[oiKey]  || 0;
        var cOI  = cE[oiKey]  || 0;
        var pLTP = pE[ltpKey] || 0;
        var cLTP = cE[ltpKey] || 0;
        if (!pOI || !cOI || !pLTP || !cLTP) return;
        var dOI  = cOI  - pOI;
        var dLTP = cLTP - pLTP;
        var cls  = classify(side, dOI, dLTP);
        if (!cls) return;
        bull += cls.bullish;
        bear += cls.bearish;
        contribs.push({ strike: strike, side: side, type: cls.type, code: cls.code, mag: Math.abs(dOI), dLTP: dLTP });
      });
    });

    bars.push({ time: curr.time, bullish: bull, bearish: bear, net: bull - bear, contributions: contribs });
  }

  if (bars.length < 2) {
    return (
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12,
                    padding: '14px 20px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 4px',
                    textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Option Flow Decomposition
        </p>
        <p style={{ fontSize: 12, color: '#334155', margin: 0 }}>
          Decomposing — collecting more bars
        </p>
      </div>
    );
  }

  // ── Cumulative net flow over session ──
  var cum = 0;
  bars.forEach(function(b) { cum += b.net; b.cum = cum; });
  var lastCum = bars[bars.length - 1].cum;

  // ── Divergence detection: compare slope of cum flow vs slope of "spot" ──
  // We don't have spot directly here, but we have ATM strike movement (atm shifts
  // when spot moves enough). A cleaner read is: compare last 4 bars' net flow
  // direction vs cumulative ATM strike change. Simpler: just look at the cum's
  // recent slope vs its longer-term direction.
  function slope(vals) {
    if (vals.length < 2) return 0;
    return vals[vals.length - 1] - vals[0];
  }
  var lookback = Math.min(6, bars.length);
  var recentBars = bars.slice(-lookback);
  var recentCum  = slope(recentBars.map(function(b) { return b.cum; }));
  var olderBars  = bars.slice(-lookback * 2, -lookback);
  var olderCum   = olderBars.length > 0 ? slope(olderBars.map(function(b) { return b.cum; })) : 0;

  // Classification thresholds
  var FLOW_DEAD = noiseFloor * 2;
  var stateLabel, stateColor, stateNote;
  if (Math.abs(recentCum) < FLOW_DEAD && Math.abs(lastCum) < FLOW_DEAD * 3) {
    stateLabel = 'NEUTRAL FLOW';
    stateColor = '#64748b';
    stateNote  = 'No clear directional positioning · waiting for break';
  } else if (recentCum > FLOW_DEAD && olderCum < -FLOW_DEAD) {
    stateLabel = 'BULLISH REVERSAL';
    stateColor = '#4ade80';
    stateNote  = 'Flow turning bullish after bearish stretch · institutional rotation';
  } else if (recentCum < -FLOW_DEAD && olderCum > FLOW_DEAD) {
    stateLabel = 'BEARISH REVERSAL';
    stateColor = '#f87171';
    stateNote  = 'Flow turning bearish after bullish stretch · institutional rotation';
  } else if (lastCum > FLOW_DEAD * 3 && recentCum > 0) {
    stateLabel = 'SUSTAINED BULLISH';
    stateColor = '#4ade80';
    stateNote  = 'Cumulative bullish positioning · CE buyers and PE writers driving';
  } else if (lastCum < -FLOW_DEAD * 3 && recentCum < 0) {
    stateLabel = 'SUSTAINED BEARISH';
    stateColor = '#f87171';
    stateNote  = 'Cumulative bearish positioning · PE buyers and CE writers driving';
  } else if (recentCum > FLOW_DEAD) {
    stateLabel = 'BULLISH FLOW';
    stateColor = '#a3e635';
    stateNote  = 'Recent bars net bullish';
  } else if (recentCum < -FLOW_DEAD) {
    stateLabel = 'BEARISH FLOW';
    stateColor = '#f59e0b';
    stateNote  = 'Recent bars net bearish';
  } else {
    stateLabel = 'MIXED';
    stateColor = '#a78bfa';
    stateNote  = 'Conflicting flows across strikes';
  }

  // ── Last bar breakdown — what's happening right now ────────────────────────
  var lastBar = bars[bars.length - 1];
  var typeAggregates = {};  // type → total mag
  lastBar.contributions.forEach(function(c) {
    if (!typeAggregates[c.code]) typeAggregates[c.code] = { type: c.type, code: c.code, total: 0, count: 0, strikes: [] };
    typeAggregates[c.code].total += c.mag;
    typeAggregates[c.code].count += 1;
    typeAggregates[c.code].strikes.push(c.strike);
  });
  var lastBarRows = Object.keys(typeAggregates)
    .map(function(k) { return typeAggregates[k]; })
    .sort(function(a, b) { return b.total - a.total; });

  function typeColor(code) {
    // Bullish codes
    if (code === 'CB' || code === 'PW' || code === 'CSC' || code === 'PLU') return '#4ade80';
    // Bearish codes
    return '#f87171';
  }
  function typeIcon(code) {
    if (code === 'CB')  return '📈';
    if (code === 'PW')  return '🛡';
    if (code === 'CSC') return '⚡';
    if (code === 'PLU') return '↘';
    if (code === 'PB')  return '📉';
    if (code === 'CW')  return '🚧';
    if (code === 'PSC') return '⚡';
    if (code === 'CLU') return '↗';
    return '·';
  }
  function fmtMag(n) {
    var a = Math.abs(n);
    if (a >= 100000) return (n > 0 ? '+' : '') + (n / 100000).toFixed(1) + 'L';
    if (a >= 1000)   return (n > 0 ? '+' : '') + (n / 1000).toFixed(0) + 'K';
    return (n > 0 ? '+' : '') + n;
  }

  // ── Chart: cumulative net flow as area, with bullish/bearish stacked bars ──
  var w = 700, h = 140, padL = 50, padR = 60, padT = 12, padB = 22;
  var cW = w - padL - padR, cH = h - padT - padB;

  var cums    = bars.map(function(b) { return b.cum; });
  var fMin    = Math.min.apply(null, cums.concat([0]));
  var fMax    = Math.max.apply(null, cums.concat([0]));
  var fAbsMax = Math.max(Math.abs(fMin), Math.abs(fMax)) || 1;

  function px(i)    { return padL + (i / Math.max(bars.length - 1, 1)) * cW; }
  function pyCum(v) { return padT + cH/2 - (v / fAbsMax) * (cH/2); }

  var cumPts = bars.map(function(b, i) { return px(i) + ',' + pyCum(b.cum); }).join(' ');
  var cumColor = lastCum >= 0 ? '#4ade80' : '#f87171';
  var fillPts = padL + ',' + pyCum(0) + ' ' + cumPts + ' ' + (padL + cW) + ',' + pyCum(0);

  // Per-bar net mini bars (stacked bullish vs bearish)
  var barW = (cW / bars.length) * 0.6;

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b',
                  borderLeft: '4px solid ' + stateColor, borderRadius: 12,
                  padding: '14px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', margin: '0 0 2px',
                      textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Option Flow Decomposition · Premium-Aware
          </p>
          <p style={{ fontSize: 9, color: '#475569', margin: 0 }}>
            ATM ±5 strikes · classifies each (ΔOI × ΔLTP) into Buyer/Writer/Cover/Unwind · separates flow types instead of conflating volume
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: stateColor, padding: '3px 10px', borderRadius: 6,
                         background: stateColor + '15', border: '1px solid ' + stateColor + '44' }}>
            {stateLabel}
          </span>
          <p style={{ fontSize: 10, color: '#64748b', margin: '4px 0 0' }}>
            Cum Net Flow: <span style={{ color: cumColor, fontWeight: 700 }}>{fmtMag(lastCum)}</span>
          </p>
        </div>
      </div>

      <p style={{ fontSize: 11, color: stateColor, margin: '0 0 10px', lineHeight: 1.5 }}>{stateNote}</p>

      {/* Cumulative net flow chart */}
      <svg width={w} height={h} viewBox={'0 0 ' + w + ' ' + h} style={{ width: '100%', maxWidth: w }}>
        {/* Per-bar bullish (green) and bearish (red) bars */}
        {bars.map(function(b, i) {
          var x  = px(i) - barW / 2;
          var bullH = (b.bullish / fAbsMax) * (cH / 2);
          var bearH = (b.bearish / fAbsMax) * (cH / 2);
          var zero  = pyCum(0);
          return (
            <g key={i}>
              {bullH > 0 && <rect x={x} y={zero - bullH} width={barW} height={bullH} fill="#4ade80" opacity="0.35" />}
              {bearH > 0 && <rect x={x} y={zero}         width={barW} height={bearH} fill="#f87171" opacity="0.35" />}
            </g>
          );
        })}

        {/* Zero line */}
        <line x1={padL} y1={pyCum(0)} x2={padL + cW} y2={pyCum(0)}
              stroke="#334155" strokeWidth="1" />

        {/* Cumulative line */}
        <polygon points={fillPts} fill={cumColor} opacity="0.10" />
        <polyline points={cumPts} fill="none" stroke={cumColor} strokeWidth="2" />

        {/* Y-axis labels */}
        <text x={padL - 4} y={pyCum(fAbsMax) + 3}  fill="#4ade80" fontSize="9" textAnchor="end" fontFamily="monospace">+{(fAbsMax/1000).toFixed(0)}K</text>
        <text x={padL - 4} y={pyCum(0) + 3}        fill="#475569" fontSize="9" textAnchor="end" fontFamily="monospace">0</text>
        <text x={padL - 4} y={pyCum(-fAbsMax) + 3} fill="#f87171" fontSize="9" textAnchor="end" fontFamily="monospace">-{(fAbsMax/1000).toFixed(0)}K</text>

        {/* Right-side cum value */}
        <text x={padL + cW + 4} y={pyCum(lastCum) + 3} fill={cumColor} fontSize="10" fontWeight="700" fontFamily="monospace">cum</text>

        {/* X-axis */}
        <text x={padL}      y={h - 6} fill="#475569" fontSize="9" fontFamily="monospace">{bars[0].time || ''}</text>
        <text x={padL + cW} y={h - 6} fill="#475569" fontSize="9" textAnchor="end" fontFamily="monospace">{lastBar.time || ''}</text>

        {/* Legend */}
        <g transform={'translate(' + (padL + 8) + ', ' + (padT + 4) + ')'}>
          <rect width="3" height="10" fill="#4ade80" opacity="0.5" />
          <text x="8" y="9" fill="#94a3b8" fontSize="10">Bullish flow</text>
          <rect x="80" width="3" height="10" fill="#f87171" opacity="0.5" />
          <text x="88" y="9" fill="#94a3b8" fontSize="10">Bearish flow</text>
          <rect x="170" width="3" height="10" fill={cumColor} />
          <text x="178" y="9" fill="#94a3b8" fontSize="10">Cumulative net</text>
        </g>
      </svg>

      {/* ── Last bar breakdown — what's driving the most recent move ── */}
      <div style={{ marginTop: 12 }}>
        <p style={{ fontSize: 9, color: '#475569', margin: '0 0 6px',
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Latest Bar ({lastBar.time}) — Flow Composition
          {lastBarRows.length === 0 && <span style={{ marginLeft: 8, color: '#334155', fontWeight: 400 }}>· no flow above noise threshold</span>}
        </p>
        {lastBarRows.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
            {lastBarRows.map(function(row) {
              var col = typeColor(row.code);
              return (
                <div key={row.code} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                                             background: '#1e293b', borderRadius: 6,
                                             borderLeft: '3px solid ' + col }}>
                  <span style={{ fontSize: 14 }}>{typeIcon(row.code)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: col }}>{row.type}</p>
                    <p style={{ margin: 0, fontSize: 9, color: '#64748b' }}>
                      {row.count} strike{row.count > 1 ? 's' : ''} · {row.strikes.slice(0, 4).join(', ')}{row.strikes.length > 4 ? '…' : ''}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: col, fontFamily: 'monospace' }}>
                    {fmtMag(row.total)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p style={{ fontSize: 9, color: '#334155', margin: '10px 0 0', lineHeight: 1.5 }}>
        Bullish: Call Buying (ΔOI↑ ΔLTP↑) · Put Writing (ΔOI↑ ΔLTP↓) · Call Short Covering (ΔOI↓ ΔLTP↑, ½ wt) · Put Long Unwinding (ΔOI↓ ΔLTP↓, ½ wt)<br/>
        Bearish: Put Buying · Call Writing · Put Short Covering (½ wt) · Call Long Unwinding (½ wt)<br/>
        Noise floor: |ΔOI| ≥ {noiseFloor.toLocaleString()} per strike per bar · |ΔLTP| ≥ ₹{ltpFloor}
      </p>
    </div>
  );
}

// ─── Spot Context — volume profile + key intraday levels ─────────────────────
// Builds a session volume profile from intraday_history snapshots, identifies
// POC (point of control), VAH/VAL (value area high/low containing 70% of vol),
// today's high/low, and shows where spot sits relative to each. This tells
// the buyer whether their entry is at a structural level or in chop.
function SpotContext(props) {
  var intradayHistory = props.intradayHistory || [];
  var spot            = props.spot || 0;
  var symbol          = props.symbol || 'NIFTY';

  if (intradayHistory.length < 10 || !spot) {
    return (
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12,
                    padding: '14px 20px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 4px',
                    textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Spot Context — Session Levels
        </p>
        <p style={{ fontSize: 12, color: '#334155', margin: 0 }}>
          Building intraday profile — need 10+ snapshots
        </p>
      </div>
    );
  }

  // ── Build volume profile ──────────────────────────────────────────────────
  // Bin price into buckets, sum (call_vol + put_vol) per bucket.
  var binSize = symbol === 'BANKNIFTY' ? 50 : 25;
  var bins = {};
  var allPrices = [];
  intradayHistory.forEach(function(s) {
    var p = s.price || 0;
    if (!p) return;
    allPrices.push(p);
    var key = Math.floor(p / binSize) * binSize;
    var v   = (s.call_vol || 0) + (s.put_vol || 0);
    bins[key] = (bins[key] || 0) + v;
  });

  if (allPrices.length === 0) return null;

  var hi = Math.max.apply(null, allPrices);
  var lo = Math.min.apply(null, allPrices);

  // POC = bin with max volume
  var binKeys = Object.keys(bins).map(function(k) { return parseInt(k, 10); }).sort(function(a, b) { return a - b; });
  var pocBin = binKeys[0], pocVol = 0;
  binKeys.forEach(function(k) { if (bins[k] > pocVol) { pocVol = bins[k]; pocBin = k; } });

  // VAH/VAL: expand from POC outward until 70% of total volume captured
  var totalVol = binKeys.reduce(function(a, k) { return a + bins[k]; }, 0);
  var target = totalVol * 0.7;
  var captured = pocVol;
  var lowIdx  = binKeys.indexOf(pocBin);
  var highIdx = lowIdx;
  while (captured < target && (lowIdx > 0 || highIdx < binKeys.length - 1)) {
    var canDown = lowIdx > 0;
    var canUp   = highIdx < binKeys.length - 1;
    var volDown = canDown ? bins[binKeys[lowIdx - 1]]  : -1;
    var volUp   = canUp   ? bins[binKeys[highIdx + 1]] : -1;
    if (volDown >= volUp && canDown) { lowIdx--; captured += volDown; }
    else if (canUp)                  { highIdx++; captured += volUp; }
    else if (canDown)                { lowIdx--; captured += volDown; }
    else break;
  }
  var val = binKeys[lowIdx];
  var vah = binKeys[highIdx] + binSize;  // top edge of last bin
  var poc = pocBin + binSize / 2;        // middle of POC bin

  // ── Distance from spot to each level ──
  function diff(level) { return Math.round(spot - level); }
  var levels = [
    { name: 'Today High', value: hi,  d: diff(hi),  type: 'H' },
    { name: 'VAH',        value: vah, d: diff(vah), type: 'V' },
    { name: 'POC',        value: poc, d: diff(poc), type: 'P' },
    { name: 'VAL',        value: val, d: diff(val), type: 'V' },
    { name: 'Today Low',  value: lo,  d: diff(lo),  type: 'L' },
  ];

  // ── Classify spot position ──
  var nearThresh = symbol === 'BANKNIFTY' ? 60 : 25;
  var contextLabel = '';
  var contextColor = '#64748b';
  if (Math.abs(spot - hi) <= nearThresh) {
    contextLabel = 'AT SESSION HIGH — resistance, breakout watch';
    contextColor = '#f59e0b';
  } else if (Math.abs(spot - lo) <= nearThresh) {
    contextLabel = 'AT SESSION LOW — support, breakdown watch';
    contextColor = '#f59e0b';
  } else if (Math.abs(spot - vah) <= nearThresh) {
    contextLabel = 'AT VAH — value-area resistance';
    contextColor = '#f87171';
  } else if (Math.abs(spot - val) <= nearThresh) {
    contextLabel = 'AT VAL — value-area support';
    contextColor = '#4ade80';
  } else if (Math.abs(spot - poc) <= nearThresh) {
    contextLabel = 'AT POC — magnet level, low directional edge';
    contextColor = '#a78bfa';
  } else if (spot > vah) {
    contextLabel = 'ABOVE VAH — accepted higher, bullish bias';
    contextColor = '#4ade80';
  } else if (spot < val) {
    contextLabel = 'BELOW VAL — accepted lower, bearish bias';
    contextColor = '#f87171';
  } else {
    contextLabel = 'INSIDE VALUE AREA — chop risk, no structural edge';
    contextColor = '#64748b';
  }

  // ── Profile chart (horizontal bars stacked vertically by price) ──
  var maxBinVol = Math.max.apply(null, binKeys.map(function(k) { return bins[k]; }));
  var w = 280, h = 200, padL = 50, padR = 12, padT = 8, padB = 8;
  var cW = w - padL - padR, cH = h - padT - padB;
  var hiBin = binKeys[binKeys.length - 1] + binSize;
  var loBin = binKeys[0];
  var priceRange = hiBin - loBin || 1;

  function py(price) { return padT + cH - ((price - loBin) / priceRange) * cH; }

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b',
                  borderLeft: '4px solid ' + contextColor, borderRadius: 12,
                  padding: '14px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', margin: '0 0 2px',
                      textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Spot Context — Session Volume Profile
          </p>
          <p style={{ fontSize: 9, color: '#475569', margin: 0 }}>
            Spot {spot.toLocaleString()} · POC, VAH/VAL from today's intraday volume
          </p>
        </div>
        <span style={{ fontSize: 12, fontWeight: 800, color: contextColor, padding: '4px 12px', borderRadius: 6,
                       background: contextColor + '15', border: '1px solid ' + contextColor + '44' }}>
          {contextLabel}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Volume profile chart */}
        <svg width={w} height={h} viewBox={'0 0 ' + w + ' ' + h}>
          {/* Value area shading */}
          <rect x={padL} y={py(vah)} width={cW} height={py(val) - py(vah)}
                fill="#a78bfa" opacity="0.06" />

          {/* Volume bars */}
          {binKeys.map(function(k) {
            var v = bins[k];
            var barW = (v / maxBinVol) * cW;
            var y = py(k + binSize);
            var height = py(k) - py(k + binSize);
            var isPOC = k === pocBin;
            var col = isPOC ? '#a78bfa' : (k >= val && k < vah ? '#60a5fa' : '#475569');
            return (
              <rect key={k} x={padL} y={y + 1} width={barW} height={Math.max(1, height - 2)}
                    fill={col} opacity={isPOC ? 0.95 : 0.55} />
            );
          })}

          {/* Spot line */}
          <line x1={padL} y1={py(spot)} x2={padL + cW} y2={py(spot)}
                stroke="#facc15" strokeWidth="1.5" strokeDasharray="4,3" />
          <text x={padL + cW + 2} y={py(spot) + 3} fill="#facc15" fontSize="9" fontWeight="700" fontFamily="monospace">
            spot
          </text>

          {/* POC label */}
          <text x={padL - 4} y={py(poc) + 3} fill="#a78bfa" fontSize="9" fontFamily="monospace" textAnchor="end" fontWeight="700">POC</text>
          <text x={padL - 4} y={py(vah) + 3} fill="#60a5fa" fontSize="9" fontFamily="monospace" textAnchor="end">VAH</text>
          <text x={padL - 4} y={py(val) + 3} fill="#60a5fa" fontSize="9" fontFamily="monospace" textAnchor="end">VAL</text>
          <text x={padL - 4} y={py(hi) + 3}  fill="#475569" fontSize="9" fontFamily="monospace" textAnchor="end">H</text>
          <text x={padL - 4} y={py(lo) + 3}  fill="#475569" fontSize="9" fontFamily="monospace" textAnchor="end">L</text>
        </svg>

        {/* Levels table */}
        <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {levels.map(function(lv) {
            var col = lv.type === 'P' ? '#a78bfa'
                    : lv.type === 'V' ? '#60a5fa'
                    : '#94a3b8';
            var dCol = '#94a3b8';
            return (
              <div key={lv.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
                                          background: '#1e293b', borderRadius: 6, fontSize: 11 }}>
                <span style={{ color: col, fontWeight: 700, minWidth: 80 }}>{lv.name}</span>
                <span style={{ color: '#f1f5f9', fontFamily: 'monospace', fontWeight: 600, minWidth: 70 }}>
                  {Math.round(lv.value).toLocaleString()}
                </span>
                <span style={{ color: dCol, fontFamily: 'monospace' }}>
                  {lv.d > 0 ? '↓' : lv.d < 0 ? '↑' : '·'}{Math.abs(lv.d)}
                </span>
                <span style={{ color: '#475569', fontSize: 9 }}>
                  {lv.d === 0 ? 'at spot' : lv.d > 0 ? 'pts below spot' : 'pts above spot'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <p style={{ fontSize: 9, color: '#334155', margin: '10px 0 0' }}>
        POC = highest-volume price · Value Area = 70% of session volume around POC · {binSize}-pt bins
      </p>
    </div>
  );
}

// ─── OTM Positioning Intelligence ───────────────────────────────────────────

function OTMPositioning(props) {
  var chain          = props.chain          || [];   // full_chain rows — strike, is_atm, ce_iv, pe_iv, ce_oi, pe_oi, ce_chg_oi, pe_chg_oi, ce_ltp, pe_ltp
  var strikeHistory  = props.strikeHistory  || [];   // [{time, strikes:{[strike]:{ce_iv,pe_iv,ce_oi,pe_oi,ce_ltp,pe_ltp,...}}}]
  var vix            = props.vix            || 0;    // India VIX current value
  var atm            = props.atm            || 0;    // ATM strike

  // ── React hooks (must run on every render, before any early return) ───────
  var [openGloss, setOpenGloss] = React.useState(null);

  // ── helpers ────────────────────────────────────────────────────────────────
  function pct(val, base) {
    if (!base || base === 0) return 0;
    return ((val - base) / Math.abs(base)) * 100;
  }
  function median(arr) {
    if (!arr || arr.length === 0) return null;
    var a = arr.slice().sort(function(x, y) { return x - y; });
    var m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m-1] + a[m]) / 2;
  }

  // ── select OTM strikes: ATM ±5 (11 strikes total) ──────────────────────────
  var sorted   = chain.slice().sort(function(a, b) { return a.strike - b.strike; });
  var atmIdx   = sorted.findIndex(function(r) { return r.strike === atm; });
  if (atmIdx < 0) atmIdx = sorted.findIndex(function(r) { return r.is_atm; });

  // Bail rather than scan wrong strikes — was a silent correctness bug
  if (atmIdx < 0) {
    if (!chain.length || !atm) return null;
    return (
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>📡 OTM Positioning — ATM strike not found in chain. Waiting for next snapshot.</p>
      </div>
    );
  }

  var indices  = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
  var strikes  = indices
    .map(function(offset) { return sorted[atmIdx + offset]; })
    .filter(Boolean);

  // ── B1: locked 10:00–10:15 baseline — IV and LTP ──────────────────────────
  // Baseline must be stable: require at least 3 snapshots in the window before
  // any signal fires. Before that, return state: 'warming up'.
  var b1Snaps = strikeHistory.filter(function(s) {
    return typeof s.time === 'string' && s.time >= '10:00' && s.time <= '10:15';
  });
  var warmingUp = b1Snaps.length < 3;

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
  function getB1LTP(strike, side) {
    if (b1Snaps.length === 0) return null;
    var vals = b1Snaps.map(function(s) {
      var e = s.strikes ? s.strikes[String(strike)] : null;
      if (!e || typeof e !== 'object') return null;
      return side === 'ce' ? (e.ce_ltp || null) : (e.pe_ltp || null);
    }).filter(function(v) { return v !== null && v > 0; });
    if (vals.length === 0) return null;
    return vals.reduce(function(a, b) { return a + b; }, 0) / vals.length;
  }

  // ── B2: rolling 45-min baseline — exclude current snapshot (no look-ahead) ─
  // Use prior 15 snapshots (not including the current one) as baseline. Was
  // previously slice(-15) which included the bar being tested against itself.
  var b2Snaps = strikeHistory.length > 1
    ? strikeHistory.slice(Math.max(0, strikeHistory.length - 16), -1)
    : [];

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

  // ── OI baseline: OI at session open (first snapshot) ──────────────────────
  var firstSnap = strikeHistory.length > 0 ? strikeHistory[0] : null;
  function getOpenOI(strike, side) {
    if (!firstSnap) return null;
    var e = firstSnap.strikes ? firstSnap.strikes[String(strike)] : null;
    if (!e || typeof e !== 'object') return null;
    return side === 'ce' ? (e.ce_oi || null) : (e.pe_oi || null);
  }

  // ── IV tick direction — relative threshold scaled by IV level ─────────────
  // Old code used absolute IV-pct thresholds (>0.2, >1) which are too tight on
  // high-IV strikes and too loose on low-IV deep OTM. Now scaled to iv level.
  function ivDir(strike, side) {
    if (strikeHistory.length < 2) return '→';
    var last2  = strikeHistory.slice(-2);
    var prev   = last2[0].strikes ? last2[0].strikes[String(strike)] : null;
    var curr   = last2[1].strikes ? last2[1].strikes[String(strike)] : null;
    if (!prev || !curr || typeof prev !== 'object' || typeof curr !== 'object') return '→';
    var prevIV = side === 'ce' ? (prev.ce_iv || 0) : (prev.pe_iv || 0);
    var currIV = side === 'ce' ? (curr.ce_iv || 0) : (curr.pe_iv || 0);
    if (prevIV <= 0) return '→';
    var rel = (currIV - prevIV) / prevIV;  // relative change
    if (rel >  0.05) return '↑↑';   // >5% relative jump
    if (rel >  0.012) return '↑';   // >1.2% relative
    if (rel < -0.05) return '↓↓';
    if (rel < -0.012) return '↓';
    return '→';
  }

  // ── OI thresholds — scaled by symbol (NIFTY 75-lot vs BANKNIFTY 15-lot) ────
  // Use larger absolute thresholds than the old 500-contract floor. NIFTY F&O
  // contracts move in much larger steps; 500 is well within MM hedge noise.
  // For BANKNIFTY, scale appropriately to its smaller absolute OI.
  var symFromAtm = atm > 30000 ? 'BANKNIFTY' : 'NIFTY';
  var OI_FRESH   = symFromAtm === 'BANKNIFTY' ? 1500 : 3000;  // chgOI threshold
  var OI_STRONG  = symFromAtm === 'BANKNIFTY' ? 5000 : 10000;

  // ── Driver: BUYER ACTION matrix ────────────────────────────────────────────
  // The old matrix returned OI/IV state labels (BUY/COVER/WRITE/UNWIND). This
  // mixed writer-perspective events with buyer-perspective signals. New matrix
  // returns BUYER ACTION:
  //
  //   ENTER  = OI↑ + IV↑  → fresh buyers + premium expanding, best entry
  //   WAIT   = OI↓ + IV↑  → squeeze in progress, premium already lifted, wait
  //                          for OI to rebuild before chasing
  //   AVOID  = OI↑ + IV↓  → writers active, premium contracting, fading buyers
  //   SKIP   = OI↓ + IV↓  → ambiguous (longs giving up vs writers profit-taking)
  //   NOISE  = OI flat + IV↑  → MM quote shading, not real demand
  //   DECAY  = OI flat + IV↓  → normal theta, no signal
  //
  // IV direction uses B1Dev (session deviation) as primary, tick as secondary.
  // Both must agree in sign for IV up/down — fixes the "+0.1% B1Dev with tick↑
  // = BUY" noise band.
  function driver(row, side) {
    var iv    = side === 'ce' ? (row.ce_iv || 0) : (row.pe_iv || 0);
    var b1iv  = getB1IV(row.strike, side);
    var b1Dev = (b1iv && b1iv > 0) ? ((iv - b1iv) / b1iv) * 100 : 0;
    var tick  = ivDir(row.strike, side);
    var tickUp = tick === '↑' || tick === '↑↑';
    var tickDn = tick === '↓' || tick === '↓↓';

    // IV direction: require magnitude AND consistency
    // Up: B1Dev > 1% AND (tick rising OR B1Dev > 3%)
    // This eliminates the asymmetric ">0 && tick" noise zone.
    var ivUp = b1Dev > 1  && (tickUp || b1Dev > 3);
    var ivDn = b1Dev < -1 && (tickDn || b1Dev < -3);

    var chgOI = side === 'ce' ? (row.ce_chg_oi || 0) : (row.pe_chg_oi || 0);
    var oiUp  = chgOI >  OI_FRESH;
    var oiDn  = chgOI < -OI_FRESH;

    // Buyer-action matrix
    if (oiUp && ivUp)  return { action: 'ENTER',  bias: side === 'ce' ? 'bullish' : 'bearish', tier: 'primary',   note: 'fresh buyers + premium expanding' };
    if (oiDn && ivUp)  return { action: 'WAIT',   bias: side === 'ce' ? 'bullish' : 'bearish', tier: 'caution',   note: 'squeeze in progress — wait for OI to rebuild' };
    if (oiUp && ivDn)  return { action: 'AVOID',  bias: 'hostile',                              tier: 'hostile',   note: 'writers active — premium contracting' };
    if (oiDn && ivDn)  return { action: 'SKIP',   bias: 'ambiguous',                            tier: 'ambiguous', note: 'longs exiting OR writers taking profit — no edge' };
    if (!oiUp && !oiDn && ivUp) return { action: 'NOISE', bias: 'neutral', tier: 'noise', note: 'IV up but OI flat — likely quote shading' };
    if (!oiUp && !oiDn && ivDn) return { action: 'DECAY', bias: 'neutral', tier: 'noise', note: 'IV down but OI flat — normal theta' };
    return { action: '—', bias: 'neutral', tier: 'none', note: '' };
  }

  // Color table for driver actions — only ENTER gets the side color (full
  // strength). Everything else is amber/grey because the buyer should not
  // treat any other state as actionable.
  function actionColor(action, side) {
    if (action === 'ENTER') return side === 'ce' ? '#4ade80' : '#f87171';
    if (action === 'WAIT')  return '#f59e0b';   // amber — be patient
    if (action === 'AVOID') return '#94a3b8';   // grey — premium fading
    if (action === 'SKIP')  return '#475569';   // dim — ambiguous
    if (action === 'NOISE' || action === 'DECAY') return '#334155';  // dimmest
    return '#334155';
  }

  function scoreComponent(val, thresholds) {
    var pts = 0;
    thresholds.forEach(function(t) { if (val >= t.min) pts = t.pts; });
    return pts;
  }

  // ── Streak: consecutive snapshots with IV above prior B2 (look-ahead-free) ─
  function getStreak(strike, side) {
    if (strikeHistory.length < 3) return 0;
    var count = 0;
    var snaps = strikeHistory.slice().reverse();
    var missTolerance = 1;  // tolerate 1 missing snap before breaking
    var misses = 0;
    for (var i = 0; i < snaps.length; i++) {
      var e  = snaps[i].strikes ? snaps[i].strikes[String(strike)] : null;
      if (!e || typeof e !== 'object') {
        misses++;
        if (misses > missTolerance) break;
        continue;
      }
      var iv = side === 'ce' ? (e.ce_iv || 0) : (e.pe_iv || 0);
      // Compute B2 from snapshots OLDER than snaps[i] — no look-ahead
      var olderSnaps = snaps.slice(i + 1, i + 16);
      var olderVals = olderSnaps.map(function(s) {
        var en = s.strikes ? s.strikes[String(strike)] : null;
        if (!en || typeof en !== 'object') return null;
        return side === 'ce' ? (en.ce_iv || null) : (en.pe_iv || null);
      }).filter(function(v) { return v !== null; });
      if (olderVals.length === 0) break;
      var olderB2 = olderVals.reduce(function(a, b) { return a + b; }, 0) / olderVals.length;
      if (iv > olderB2) { count++; misses = 0; } else { break; }
    }
    return count;
  }

  // ── Time-of-day theta pressure ─────────────────────────────────────────────
  // After 14:00 IST, scale Entry Score down. After 15:00, scale further. Theta
  // and gamma effects make signals less reliable late in the session.
  function thetaMultiplier() {
    var nowMin = (function() {
      var d = new Date();
      // IST = UTC+5:30
      var utcMins = d.getUTCHours() * 60 + d.getUTCMinutes();
      var istMins = (utcMins + 330) % 1440;
      return istMins;
    })();
    if (nowMin >= 15 * 60)            return 0.50;  // after 15:00
    if (nowMin >= 14 * 60 + 30)       return 0.65;  // after 14:30
    if (nowMin >= 14 * 60)            return 0.80;  // after 14:00
    if (nowMin >= 13 * 60)            return 0.92;  // after 13:00
    return 1.00;                                    // before 13:00
  }
  var theta = thetaMultiplier();

  // ── Entry Score (0–100) ────────────────────────────────────────────────────
  // Replaces BPI. Scores ONLY ENTER and (capped) WAIT actions.
  //
  // Components (max 100, before theta scaling):
  //   IV above B1 (session)               0–25 pts
  //   IV above B2 (recent)                0–25 pts
  //   OI build from open                  0–20 pts
  //   OI velocity (chg_oi this snap)      0–15 pts
  //   IV rising streak                    0–15 pts
  //
  //   WAIT cap: 40 pts (squeeze entries are not full ENTER signals)
  //   Theta multiplier applied at the end (0.5–1.0 based on time of day)
  function computeEntryScore(row, side) {
    if (warmingUp) return 0;

    var drv = driver(row, side);
    if (drv.action !== 'ENTER' && drv.action !== 'WAIT') return 0;

    var iv     = side === 'ce' ? (row.ce_iv || 0) : (row.pe_iv || 0);
    var b1iv   = getB1IV(row.strike, side);
    var b2iv   = getB2IV(row.strike, side);
    var b1Dev  = b1iv ? pct(iv, b1iv) : 0;
    var b2Dev  = b2iv ? pct(iv, b2iv) : 0;

    // Only count POSITIVE deviations
    var b1IVup = Math.max(0, b1Dev);
    var b2IVup = Math.max(0, b2Dev);

    var b1Score = scoreComponent(b1IVup, [{min:0.5,pts:5},{min:1.5,pts:10},{min:3,pts:16},{min:5,pts:20},{min:8,pts:25}]);
    var b2Score = scoreComponent(b2IVup, [{min:0.5,pts:5},{min:1.5,pts:10},{min:3,pts:16},{min:5,pts:20},{min:8,pts:25}]);

    // OI accumulation from open
    var openOI = getOpenOI(row.strike, side);
    var currOI = side === 'ce' ? (row.ce_oi || 0) : (row.pe_oi || 0);
    var cumOI  = openOI ? currOI - openOI : 0;
    var cumPct = openOI && openOI > 0 ? (cumOI / openOI) * 100 : 0;
    // For ENTER we want positive cumOI; for WAIT (OI falling) use abs since
    // the "rebuild" happens later — partial credit for prior build now exiting
    var oiScore = scoreComponent(Math.abs(cumPct), [{min:0.5,pts:4},{min:2,pts:8},{min:5,pts:14},{min:10,pts:20}]);

    // OI velocity
    var chgOI    = side === 'ce' ? (row.ce_chg_oi || 0) : (row.pe_chg_oi || 0);
    var velScore = scoreComponent(Math.abs(chgOI),
      symFromAtm === 'BANKNIFTY'
        ? [{min:1500,pts:3},{min:5000,pts:7},{min:15000,pts:11},{min:30000,pts:15}]
        : [{min:3000,pts:3},{min:10000,pts:7},{min:25000,pts:11},{min:50000,pts:15}]);

    // Streak
    var streak      = getStreak(row.strike, side);
    var streakScore = scoreComponent(streak, [{min:2,pts:3},{min:4,pts:7},{min:6,pts:11},{min:8,pts:15}]);

    var raw = b1Score + b2Score + oiScore + velScore + streakScore;
    if (drv.action === 'WAIT') raw = Math.min(40, raw);  // cap WAIT entries
    return Math.round(Math.min(100, raw) * theta);
  }

  // ── Premium economics — what the buyer actually pays ──────────────────────
  // Returns LTP now, LTP at B1 baseline, ₹ change, and % change. This is what
  // a buyer cares about — not IV percentage moves on deep OTM strikes that
  // produce ₹2 of P&L.
  function premiumEcon(row, side) {
    var nowLtp = side === 'ce' ? (row.ce_ltp || 0) : (row.pe_ltp || 0);
    var b1Ltp  = getB1LTP(row.strike, side);
    if (!nowLtp || !b1Ltp) return { now: nowLtp, b1: b1Ltp, abs: null, pct: null };
    var abs = nowLtp - b1Ltp;
    var pc  = (abs / b1Ltp) * 100;
    return { now: nowLtp, b1: b1Ltp, abs: abs, pct: pc };
  }

  // ── Skew shape — combines current gap + IV direction trend ────────────────
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

    if (gap < 1) {
      if (ivTrend === 'rising')  return 'FLAT↑'; // OTM IV rising = buyer accumulation on this side
      if (ivTrend === 'falling') return 'FLAT↓'; // OTM IV falling = writing/compression
      return 'FLAT';
    }
    if (gap < 3) return 'NORMAL';
    return 'STEEP';
  }

  // ── Glossary ───────────────────────────────────────────────────────────────
  var glossary = [
    { term: 'Action',     desc: 'ENTER (OI↑ + IV↑): fresh buyers + premium expanding — primary entry. WAIT (OI↓ + IV↑): squeeze in progress, easy money already moved — wait for OI to rebuild before chasing. AVOID (OI↑ + IV↓): writers active — premium contracting against you. SKIP (OI↓ + IV↓): ambiguous — could be longs giving up or writers profit-taking. NOISE/DECAY: OI flat — not actionable.' },
    { term: 'Entry Score', desc: '0–100 buyer-perspective score. Only ENTER (full credit) and WAIT (capped at 40) score points. Components: IV above B1 baseline (25), IV above B2 recent (25), OI build (20), OI velocity (15), IV rising streak (15). Scaled down after 14:00 IST as theta and gamma effects degrade signal reliability.' },
    { term: 'Premium Δ',  desc: 'Rupee change in option premium (LTP) since the 10:00–10:15 session baseline. This is what a buyer actually pays vs would have paid earlier. ₹+40 means the same option costs you ₹40 more now than at the baseline.' },
    { term: 'B1',         desc: 'IV deviation from the 10:00–10:15 settled baseline. Requires at least 3 snapshots in the window before signals fire — earlier than that, the panel shows WARMING UP.' },
    { term: 'B2',         desc: 'IV deviation from the rolling 45-min average (excluding the current bar — no look-ahead bias). Fresh, sustained moves show high B2.' },
    { term: 'COI',        desc: 'Change in Open Interest this snapshot. Threshold: NIFTY ±3000, BANKNIFTY ±1500. Smaller moves are MM hedge-rebalancing noise, not real positioning.' },
    { term: 'Cum OI',     desc: 'Total OI change from 9:15 open. Sustained build = institutional. Single-snapshot spikes without cumulative build = ephemeral.' },
    { term: 'OI Confluence', desc: 'Two or more adjacent strikes on the same side with the same buyer-friendly action. Single-strike signals do not qualify — pure noise filter. Confirmed = opposite side has WRITE activity at adjacent strikes (defended floor/ceiling).' },
    { term: 'Theta drag', desc: 'Multiplier applied to Entry Score based on time of day. Before 13:00 IST: 1.00. After 14:00: 0.80. After 14:30: 0.65. After 15:00: 0.50. Late-session signals are less reliable due to forced gamma effects.' },
    { term: 'Skew',       desc: 'FLAT↑ = OTM IV rising toward ATM = active accumulation on this side. FLAT↓ = OTM IV falling = writing. NORMAL/STEEP = standard or fear-driven.' },
  ];

  if (!chain.length || !atm) return null;

  var ceShape    = skewShape(strikes.filter(function(r){return r.strike >= atm;}), 'ce');
  var peShape    = skewShape(strikes.filter(function(r){return r.strike <= atm;}), 'pe');

  // ── IV Environment — median (not mean) to resist single-strike outliers ──
  var ivEnv = (function() {
    if (warmingUp) return { label: 'WARMING UP', color: '#64748b', icon: '⏳', desc: 'Building 10:00–10:15 baseline (need 3 snapshots) — signals start firing after 10:18.', divergence: null, ceDev: 0, peDev: 0 };

    var ceStrikes = strikes.filter(function(r) { return r && r.strike > atm; });
    var peStrikes = strikes.filter(function(r) { return r && r.strike < atm; });
    function devs(rows, side) {
      return rows.map(function(r) {
        var iv   = side === 'ce' ? (r.ce_iv || 0) : (r.pe_iv || 0);
        var b1iv = getB1IV(r.strike, side);
        if (!b1iv || b1iv === 0) return null;
        return ((iv - b1iv) / b1iv) * 100;
      }).filter(function(v) { return v !== null; });
    }
    var ceDev = median(devs(ceStrikes, 'ce'));
    var peDev = median(devs(peStrikes, 'pe'));
    if (ceDev === null) ceDev = 0;
    if (peDev === null) peDev = 0;
    var overallDev = (ceDev + peDev) / 2;

    // Surface repricing detector
    var DIVG_THRESH = 3;
    var ceBullish   = ceDev >  DIVG_THRESH;
    var ceBearish   = ceDev < -DIVG_THRESH;
    var peBullish   = peDev < -DIVG_THRESH;  // PE IV falling = bullish
    var peBearish   = peDev >  DIVG_THRESH;  // PE IV rising  = bearish

    if (ceBullish && peBullish) {
      return {
        label: 'REPRICING BULLISH', color: '#4ade80', icon: '📈',
        desc: 'CE IV +' + ceDev.toFixed(1) + '% vs B1 · PE IV ' + peDev.toFixed(1) + '% vs B1 — call demand + put supply',
        divergence: 'bullish', ceDev: ceDev, peDev: peDev,
      };
    }
    if (peBearish && ceBearish) {
      return {
        label: 'REPRICING BEARISH', color: '#f87171', icon: '📉',
        desc: 'PE IV +' + peDev.toFixed(1) + '% vs B1 · CE IV ' + ceDev.toFixed(1) + '% vs B1 — put demand + call supply',
        divergence: 'bearish', ceDev: ceDev, peDev: peDev,
      };
    }
    if (overallDev > 1.5)  return { label: 'EXPANDING',   color: '#4ade80', desc: 'IV above session baseline — buyer conditions present',    icon: '↑',  divergence: null, ceDev: ceDev, peDev: peDev };
    if (overallDev > 0.3)  return { label: 'RISING',      color: '#a3e635', desc: 'IV drifting above baseline — watch for confirmation',     icon: '↗',  divergence: null, ceDev: ceDev, peDev: peDev };
    if (overallDev < -1.5) return { label: 'COMPRESSING', color: '#f87171', desc: 'IV well below baseline — writer dominant, avoid buying',  icon: '↓',  divergence: null, ceDev: ceDev, peDev: peDev };
    if (overallDev < -0.3) return { label: 'FALLING',     color: '#f59e0b', desc: 'IV drifting below baseline — caution for buyers',         icon: '↘',  divergence: null, ceDev: ceDev, peDev: peDev };
    return { label: 'NEUTRAL', color: '#64748b', desc: 'IV flat near baseline — no clear edge for buyers', icon: '→', divergence: null, ceDev: ceDev, peDev: peDev };
  })();

  // ── Confluence zones — buyer-strict (≥2 ENTER strikes) ────────────────────
  // Removed PE UNWIND zones (ambiguous without spot context). Writer zones
  // require WRITE specifically (not any non-buyer-friendly), and their bias
  // is reported as informational floor/ceiling, not as a buyer entry signal.
  var confluenceZones = (function() {
    if (warmingUp) return [];

    var zones = [];
    var ceStrikes = strikes.filter(function(r) { return r && r.strike > atm; })
                           .sort(function(a,b) { return a.strike - b.strike; });
    var peStrikes = strikes.filter(function(r) { return r && r.strike < atm; })
                           .sort(function(a,b) { return b.strike - a.strike; });

    // ENTER zones — ≥2 adjacent strikes, must have IV above B1 (real demand)
    function findEntryZones(rows, side) {
      var current = [];
      rows.forEach(function(row) {
        var drv   = driver(row, side);
        var b1iv  = getB1IV(row.strike, side);
        var curIV = side === 'ce' ? (row.ce_iv || 0) : (row.pe_iv || 0);
        if (drv.action === 'ENTER' && b1iv && curIV > b1iv) {
          current.push({ row: row, drv: drv, type: 'enter' });
        } else {
          if (current.length >= 2) zones.push({ side: side, rows: current.slice(), type: 'enter' });
          current = [];
        }
      });
      if (current.length >= 2) zones.push({ side: side, rows: current.slice(), type: 'enter' });
    }

    // WRITE zones — strict: only WRITE action, not AVOID/SKIP. ≥2 adjacent.
    // These are informational (floor/ceiling), not buyer entries.
    function findWriteZones(rows, side) {
      var current = [];
      rows.forEach(function(row) {
        var drv   = driver(row, side);
        var b1iv  = getB1IV(row.strike, side);
        var curIV = side === 'ce' ? (row.ce_iv || 0) : (row.pe_iv || 0);
        if (drv.action === 'AVOID' && b1iv && curIV < b1iv) {  // AVOID = OI↑+IV↓ = writer building
          current.push({ row: row, drv: drv, type: 'write' });
        } else {
          if (current.length >= 2) zones.push({ side: side, rows: current.slice(), type: 'write' });
          current = [];
        }
      });
      if (current.length >= 2) zones.push({ side: side, rows: current.slice(), type: 'write' });
    }

    findEntryZones(ceStrikes, 'ce');
    findEntryZones(peStrikes, 'pe');
    findWriteZones(ceStrikes, 'ce');
    findWriteZones(peStrikes, 'pe');

    // Enrich zones
    zones.forEach(function(z) {
      var oppSide = z.side === 'ce' ? 'pe' : 'ce';
      z.strikes   = z.rows.map(function(i){ return i.row.strike; });

      if (z.type === 'enter') {
        z.driverLabel = z.side === 'ce' ? 'CALL ENTRY' : 'PUT ENTRY';
        z.bias        = z.side === 'ce' ? 'BULLISH' : 'BEARISH';
        z.color       = z.side === 'ce' ? '#4ade80' : '#f87171';
        // Confirmation: opposite side must show WRITE specifically (defended
        // floor/ceiling) — was previously "any non-buyer-friendly" which let
        // ambiguous SKIP/UNWIND drivers count as confirmation.
        var confirmCount = 0, contradictCount = 0;
        z.rows.forEach(function(item) {
          var oppDrv = driver(item.row, oppSide);
          if (oppDrv.action === 'AVOID') confirmCount++;       // opposite-side WRITE = confirms
          if (oppDrv.action === 'ENTER') contradictCount++;    // opposite-side ENTER = contradicts
        });
        z.confirmed    = confirmCount >= Math.ceil(z.rows.length / 2);
        z.contradicted = contradictCount >= Math.ceil(z.rows.length / 2);
        z.confirmNote  = z.confirmed ? '✓ opposite side WRITE confirms' : z.contradicted ? '⚠ opposite side ENTER contradicts' : '';
      } else {
        // WRITE zone — informational floor/ceiling
        if (z.side === 'ce') {
          z.driverLabel = 'CALL WRITING';
          z.bias        = 'CEILING';   // resistance, not directly bearish
          z.color       = '#94a3b8';
          z.confirmNote = 'resistance building above — informational';
        } else {
          z.driverLabel = 'PUT WRITING';
          z.bias        = 'FLOOR';     // support, not directly bullish
          z.color       = '#94a3b8';
          z.confirmNote = 'support building below — informational';
        }
        z.confirmed    = false;
        z.contradicted = false;
      }
    });

    // Sort: ENTER zones first, then WRITE zones; within each group by size desc
    zones.sort(function(a, b) {
      if (a.type !== b.type) return a.type === 'enter' ? -1 : 1;
      return b.rows.length - a.rows.length;
    });

    return zones;
  })();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            📡 OTM Positioning — Option Buyer View
          </p>
          <p style={{ fontSize: 10, color: '#475569', margin: 0 }}>
            ATM ±5 · Entry Score, Action, Premium Δ · 3-min snapshots · ENTER signals only at confluence ≥2
          </p>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* IV Environment */}
          <div style={{ padding: '6px 12px', borderRadius: 8, background: ivEnv.color + '12', border: '1px solid ' + ivEnv.color + '33' }}>
            <p style={{ fontSize: 9, color: '#475569', margin: '0 0 2px', fontWeight: 700, textTransform: 'uppercase' }}>IV ENVIRONMENT</p>
            <span style={{ fontSize: 12, fontWeight: 800, color: ivEnv.color }}>{ivEnv.icon} {ivEnv.label}</span>
          </div>
          <div style={{ width: 1, height: 32, background: '#1e293b' }} />
          {/* Theta drag */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 9, color: '#475569', margin: '0 0 1px', fontWeight: 700, textTransform: 'uppercase' }}>THETA</p>
            <span style={{ fontSize: 11, fontWeight: 700, color: theta >= 0.95 ? '#4ade80' : theta >= 0.80 ? '#a3e635' : theta >= 0.65 ? '#f59e0b' : '#f87171' }}>
              ×{theta.toFixed(2)}
            </span>
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
            var isEnter  = z.type === 'enter';
            var icon     = isEnter
              ? (z.side === 'ce' ? '📈' : '📉')
              : (z.bias === 'FLOOR' ? '🛡' : '🚧');
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px',
                                    background: z.color + (isEnter ? '0d' : '06'),
                                    border: '1px solid ' + z.color + (isEnter ? '44' : '22'),
                                    borderLeft: '3px solid ' + z.color + (isEnter ? '' : '88'),
                                    borderRadius: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: isEnter ? z.color : '#64748b',
                               padding: '1px 6px', borderRadius: 3,
                               background: isEnter ? z.color + '20' : '#1e293b',
                               border: '1px solid ' + (isEnter ? z.color + '44' : '#334155'),
                               textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {isEnter ? (z.side === 'ce' ? 'CALL' : 'PUT') : z.side.toUpperCase()}
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: isEnter ? z.color : '#94a3b8' }}>
                  {icon} {z.driverLabel}
                </span>
                <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                  {z.strikes.join(' · ')}
                </span>
                <span style={{ fontSize: 10, color: '#475569' }}>
                  {z.rows.length} strike{z.rows.length > 1 ? 's' : ''}
                </span>
                {z.confirmNote && (
                  <span style={{ fontSize: 10, color: isEnter ? z.color : '#64748b',
                                 padding: '1px 7px', borderRadius: 4,
                                 background: isEnter ? z.color + '15' : '#1e293b',
                                 border: '1px solid ' + (isEnter ? z.color + '33' : '#334155') }}>
                    {z.confirmNote}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Warming-up banner ── */}
      {warmingUp && (
        <div style={{ padding: '10px 20px', borderBottom: '1px solid #1e293b', background: 'rgba(100,116,139,0.06)' }}>
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
            ⏳ WARMING UP — building 10:00–10:15 baseline ({b1Snaps.length}/3 snapshots collected). Drivers and Entry Scores will fire after 10:18 IST.
          </span>
        </div>
      )}

      {/* ── Raw Data Table: CE | STRIKE | PE ── */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#0d1424' }}>
              <th colSpan={6} style={{ padding: '7px 10px', color: '#f87171', fontWeight: 700, textAlign: 'center', fontSize: 10, letterSpacing: '0.08em', borderBottom: '2px solid #f8717133' }}>
                ◀ CALLS (CE)
              </th>
              <th style={{ padding: '7px 14px', color: '#60a5fa', fontWeight: 700, textAlign: 'center', fontSize: 10, letterSpacing: '0.08em', borderBottom: '2px solid #60a5fa33', background: '#0a1020' }}>
                STRIKE
              </th>
              <th colSpan={6} style={{ padding: '7px 10px', color: '#4ade80', fontWeight: 700, textAlign: 'center', fontSize: 10, letterSpacing: '0.08em', borderBottom: '2px solid #4ade8033' }}>
                PUTS (PE) ▶
              </th>
            </tr>
            <tr style={{ background: '#1a2332' }}>
              {/* CE headers — reading inward toward strike */}
              <th style={{ padding: '6px 10px', color: '#f87171', fontWeight: 600, textAlign: 'left',  fontSize: 9, whiteSpace: 'nowrap' }}>Action</th>
              <th style={{ padding: '6px 10px', color: '#f87171', fontWeight: 600, textAlign: 'right', fontSize: 9, whiteSpace: 'nowrap' }}>Score</th>
              <th style={{ padding: '6px 10px', color: '#f87171', fontWeight: 600, textAlign: 'right', fontSize: 9, whiteSpace: 'nowrap' }}>IV · B1 · B2</th>
              <th style={{ padding: '6px 10px', color: '#f87171', fontWeight: 600, textAlign: 'right', fontSize: 9, whiteSpace: 'nowrap' }}>Premium · Δ</th>
              <th style={{ padding: '6px 10px', color: '#f87171', fontWeight: 600, textAlign: 'right', fontSize: 9, whiteSpace: 'nowrap' }}>COI · Cum</th>
              <th style={{ padding: '6px 10px', color: '#f87171', fontWeight: 600, textAlign: 'right', fontSize: 9, whiteSpace: 'nowrap', borderRight: '2px solid #1e293b' }}>OI</th>
              {/* Strike */}
              <th style={{ padding: '6px 14px', color: '#475569', fontWeight: 600, textAlign: 'center', fontSize: 9, background: '#0a1020' }}>
                <span style={{ display: 'block', fontSize: 8, color: '#334155' }}>VIX {vix > 0 ? vix.toFixed(1) : '—'}</span>
              </th>
              {/* PE headers — reading outward from strike */}
              <th style={{ padding: '6px 10px', color: '#4ade80', fontWeight: 600, textAlign: 'left',  fontSize: 9, whiteSpace: 'nowrap', borderLeft: '2px solid #1e293b' }}>OI</th>
              <th style={{ padding: '6px 10px', color: '#4ade80', fontWeight: 600, textAlign: 'left',  fontSize: 9, whiteSpace: 'nowrap' }}>COI · Cum</th>
              <th style={{ padding: '6px 10px', color: '#4ade80', fontWeight: 600, textAlign: 'left',  fontSize: 9, whiteSpace: 'nowrap' }}>Premium · Δ</th>
              <th style={{ padding: '6px 10px', color: '#4ade80', fontWeight: 600, textAlign: 'left',  fontSize: 9, whiteSpace: 'nowrap' }}>IV · B1 · B2</th>
              <th style={{ padding: '6px 10px', color: '#4ade80', fontWeight: 600, textAlign: 'left',  fontSize: 9, whiteSpace: 'nowrap' }}>Score</th>
              <th style={{ padding: '6px 10px', color: '#4ade80', fontWeight: 600, textAlign: 'right', fontSize: 9, whiteSpace: 'nowrap' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {strikes.map(function(row) {
              if (!row) return null;
              var isATM  = row.strike === atm || row.is_atm;
              var rowBg  = isATM ? 'rgba(96,165,250,0.06)' : 'transparent';

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
                var drv     = isATM ? { action: '—', bias: 'neutral', tier: 'none', note: '' } : driver(row, side);
                var ivD     = isATM ? '→' : ivDir(row.strike, side);
                var prem    = isATM ? { now: side === 'ce' ? (row.ce_ltp||0) : (row.pe_ltp||0), b1: null, abs: null, pct: null } : premiumEcon(row, side);
                var score   = isATM ? 0 : computeEntryScore(row, side);
                return { iv: iv, oi: oi, coi: coi, b1Dev: b1Dev, b2Dev: b2Dev, cumOI: cumOI, drv: drv, ivD: ivD, prem: prem, score: score };
              }

              var ce = mkSide('ce');
              var pe = mkSide('pe');

              // Highlight row if either side has ENTER action
              var ceActive = !isATM && ce.drv.action === 'ENTER';
              var peActive = !isATM && pe.drv.action === 'ENTER';
              var rowHighlight = ceActive ? 'rgba(74,222,128,0.05)' : peActive ? 'rgba(248,113,113,0.05)' : rowBg;

              // Color helpers
              function coiColor(v) {
                if (v === 0) return '#334155';
                return v > 0 ? '#4ade80' : '#f87171';
              }
              function devColor(v) {
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
              function premFmt(v) {
                if (!v && v !== 0) return '—';
                if (v >= 100) return '₹' + v.toFixed(0);
                return '₹' + v.toFixed(1);
              }
              function premDeltaFmt(abs, pc) {
                if (abs === null) return '—';
                var s = abs > 0 ? '+' : '';
                var aStr = Math.abs(abs) >= 100 ? abs.toFixed(0) : abs.toFixed(1);
                return s + '₹' + aStr + ' (' + (pc > 0 ? '+' : '') + pc.toFixed(0) + '%)';
              }
              function premDeltaColor(abs) {
                if (abs === null || abs === 0) return '#334155';
                if (abs > 0) return '#4ade80';
                return '#f87171';
              }
              function scoreColor(s) {
                if (s >= 70) return '#4ade80';
                if (s >= 40) return '#a3e635';
                if (s >= 20) return '#f59e0b';
                return '#475569';
              }
              function scoreFmt(s) {
                if (s === 0) return '—';
                return String(s);
              }

              // Action cell — buyer-action label with color tier
              function actionCell(drv, ivD, side) {
                if (drv.action === '—') {
                  return <span style={{ color: '#334155', fontSize: 10 }}>— {ivD}</span>;
                }
                var col   = actionColor(drv.action, side);
                var ivDColor = ivD === '↑↑' || ivD === '↑' ? '#4ade80' : ivD === '↓↓' || ivD === '↓' ? '#f87171' : '#475569';
                var bold  = drv.action === 'ENTER';
                return (
                  <span>
                    <span style={{ fontSize: 11, fontWeight: bold ? 800 : 600, color: col,
                                   padding: bold ? '1px 5px' : '1px 4px',
                                   background: bold ? col+'15' : 'transparent',
                                   borderRadius: 3,
                                   border: bold ? '1px solid '+col+'44' : '1px solid '+col+'22' }}>
                      {drv.action}
                    </span>
                    <span style={{ fontSize: 10, color: ivDColor, marginLeft: 4 }}>{ivD}</span>
                  </span>
                );
              }

              return (
                <tr key={row.strike} style={{ background: rowHighlight, borderBottom: '1px solid #1e293b22',
                                              borderLeft: ceActive ? '2px solid #4ade8055' : peActive ? '2px solid #f8717155' : '2px solid transparent' }}>

                  {/* ── CE side ── */}
                  <td style={{ padding: '8px 10px', textAlign: 'left', borderRight: '1px solid #1e293b22' }}>
                    {isATM ? <span style={{ color: '#334155', fontSize: 10 }}>—</span> : actionCell(ce.drv, ce.ivD, 'ce')}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', borderRight: '1px solid #1e293b22' }}>
                    {isATM ? <span style={{ color: '#334155', fontSize: 11 }}>—</span> : (
                      <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 800, color: scoreColor(ce.score) }}>
                        {scoreFmt(ce.score)}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', borderRight: '1px solid #1e293b22' }}>
                    {isATM ? <span style={{ color: '#334155', fontFamily: 'monospace', fontSize: 11 }}>—</span> : (
                      <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
                        <span style={{ color: '#94a3b8' }}>{ivFmt(ce.iv)}</span>
                        <span style={{ color: '#1e293b', margin: '0 2px' }}>·</span>
                        <span style={{ color: devColor(ce.b1Dev), fontWeight: ce.b1Dev !== null && Math.abs(ce.b1Dev) > 1 ? 700 : 400 }}>{devFmt(ce.b1Dev)}</span>
                        <span style={{ color: '#1e293b', margin: '0 2px' }}>·</span>
                        <span style={{ color: devColor(ce.b2Dev), fontWeight: ce.b2Dev !== null && Math.abs(ce.b2Dev) > 1 ? 700 : 400 }}>{devFmt(ce.b2Dev)}</span>
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', borderRight: '1px solid #1e293b22' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
                      <span style={{ color: '#94a3b8' }}>{premFmt(ce.prem.now)}</span>
                      <span style={{ color: '#1e293b', margin: '0 3px' }}>·</span>
                      <span style={{ color: premDeltaColor(ce.prem.abs), fontWeight: ce.prem.abs !== null && Math.abs(ce.prem.abs) > 5 ? 700 : 400 }}>
                        {premDeltaFmt(ce.prem.abs, ce.prem.pct)}
                      </span>
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontSize: 11, borderRight: '1px solid #1e293b22' }}>
                    <span style={{ color: coiColor(ce.coi), fontWeight: Math.abs(ce.coi) > OI_FRESH ? 700 : 400 }}>{coiFmt(ce.coi)}</span>
                    <span style={{ color: '#1e293b', margin: '0 3px' }}>·</span>
                    <span style={{ color: ce.cumOI !== null ? (ce.cumOI > 0 ? '#4ade80' : ce.cumOI < 0 ? '#f87171' : '#475569') : '#334155',
                                   fontWeight: ce.cumOI !== null && Math.abs(ce.cumOI) > OI_STRONG ? 700 : 400 }}>
                      {cumFmt(ce.cumOI)}
                    </span>
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

                  {/* ── PE side ── */}
                  <td style={{ padding: '8px 10px', textAlign: 'left', color: '#4ade80', fontWeight: 600,
                               fontSize: 11, borderLeft: '2px solid #1e293b', borderRight: '1px solid #1e293b22' }}>
                    {oisize(pe.oi)}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'left', fontFamily: 'monospace', fontSize: 11, borderRight: '1px solid #1e293b22' }}>
                    <span style={{ color: coiColor(pe.coi), fontWeight: Math.abs(pe.coi) > OI_FRESH ? 700 : 400 }}>{coiFmt(pe.coi)}</span>
                    <span style={{ color: '#1e293b', margin: '0 3px' }}>·</span>
                    <span style={{ color: pe.cumOI !== null ? (pe.cumOI > 0 ? '#4ade80' : pe.cumOI < 0 ? '#f87171' : '#475569') : '#334155',
                                   fontWeight: pe.cumOI !== null && Math.abs(pe.cumOI) > OI_STRONG ? 700 : 400 }}>
                      {cumFmt(pe.cumOI)}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'left', borderRight: '1px solid #1e293b22' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
                      <span style={{ color: '#94a3b8' }}>{premFmt(pe.prem.now)}</span>
                      <span style={{ color: '#1e293b', margin: '0 3px' }}>·</span>
                      <span style={{ color: premDeltaColor(pe.prem.abs), fontWeight: pe.prem.abs !== null && Math.abs(pe.prem.abs) > 5 ? 700 : 400 }}>
                        {premDeltaFmt(pe.prem.abs, pe.prem.pct)}
                      </span>
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'left', borderRight: '1px solid #1e293b22' }}>
                    {isATM ? <span style={{ color: '#334155', fontFamily: 'monospace', fontSize: 11 }}>—</span> : (
                      <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
                        <span style={{ color: '#94a3b8' }}>{ivFmt(pe.iv)}</span>
                        <span style={{ color: '#1e293b', margin: '0 2px' }}>·</span>
                        <span style={{ color: devColor(pe.b1Dev), fontWeight: pe.b1Dev !== null && Math.abs(pe.b1Dev) > 1 ? 700 : 400 }}>{devFmt(pe.b1Dev)}</span>
                        <span style={{ color: '#1e293b', margin: '0 2px' }}>·</span>
                        <span style={{ color: devColor(pe.b2Dev), fontWeight: pe.b2Dev !== null && Math.abs(pe.b2Dev) > 1 ? 700 : 400 }}>{devFmt(pe.b2Dev)}</span>
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'left', borderRight: '1px solid #1e293b22' }}>
                    {isATM ? <span style={{ color: '#334155', fontSize: 11 }}>—</span> : (
                      <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 800, color: scoreColor(pe.score) }}>
                        {scoreFmt(pe.score)}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                    {isATM ? <span style={{ color: '#334155', fontSize: 10 }}>—</span> : actionCell(pe.drv, pe.ivD, 'pe')}
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Footer: action legend ── */}
      <div style={{ padding: '10px 20px', borderTop: '1px solid #1e293b', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'ENTER', color: '#4ade80', desc: 'OI↑ + IV↑  — fresh buyers + premium expanding · primary entry' },
          { label: 'WAIT',  color: '#f59e0b', desc: 'OI↓ + IV↑  — squeeze in progress · wait for OI rebuild' },
          { label: 'AVOID', color: '#94a3b8', desc: 'OI↑ + IV↓  — writers active · premium contracting' },
          { label: 'SKIP',  color: '#475569', desc: 'OI↓ + IV↓  — ambiguous · longs exiting OR profit-taking' },
          { label: 'NOISE', color: '#334155', desc: 'OI flat + IV↑  — quote shading · not real demand' },
          { label: 'DECAY', color: '#334155', desc: 'OI flat + IV↓  — normal theta · no signal' },
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
          {glossary.map(function(item, i) {
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
  var [volumeData, setVolumeData]           = useState(null);
  var [volumeHistory, setVolumeHistory]     = useState([]);   // (legacy) backend top_volume_strikes history
  var [chainHistory, setChainHistory]       = useState([]);   // per-strike volume snapshots from data.full_chain (gap-free)
  var [tvEvents, setTvEvents]               = useState([]);   // events streamed from TradingView via /api/tv/events
  var [tvConfigured, setTvConfigured]       = useState(false);
  var [tvLastErr, setTvLastErr]             = useState(null);
  var tvLastSeenIdRef                        = useRef(0);
  var [spikeThreshold, setSpikeThreshold]   = useState(1.5);
  var alertedSpikesRef = useRef({});  // { 'NIFTY_24700_CE': true } — dedupe per session per symbol+strike+side
  var [strikeIVHistory, setStrikeIVHistory] = useState([]);   // per-strike IV snapshots for ATM±5 picker

  // ── Compute volume spikes from chainHistory (gap-free per-strike volume) ──
  // Replaces the prior algorithm which relied on backend's top_volume_strikes
  // — that list was N-strikes-wide and changed each snapshot, so a strike that
  // just spiked into prominence had a baseline of mostly missing data and was
  // silently skipped (the `prior.length < 3` guard).
  //
  // chainHistory has every strike, every snapshot, no gaps. We compute per-bar
  // delta_volume = ce_vol[t] - ce_vol[t-1] (chain returns cumulative session
  // volume), then test the latest delta against the prior N deltas.
  var volumeSpikes = React.useMemo(function() {
    if (!chainHistory || chainHistory.length < 6) return [];

    // Skip first 20 minutes of session — open is structurally noisy and produces
    // false spikes against an artificially low baseline.
    var nowIst = new Date(Date.now() + 5.5 * 3600 * 1000);
    var minsIST = nowIst.getUTCHours() * 60 + nowIst.getUTCMinutes();
    var inOpenNoise = minsIST >= 555 && minsIST < 575;  // 9:15 to 9:35 IST
    if (inOpenNoise) return [];

    var current = chainHistory[chainHistory.length - 1];
    var atm = current.atm || 0;

    // Symbol-aware absolute floor: ignore spikes where current delta is too small
    // to matter regardless of multiple. NIFTY ATM strikes typically do 5K-50K
    // contracts per 3-min bar; BANKNIFTY ATM strikes smaller absolute numbers.
    var symFromAtm = atm > 30000 ? 'BANKNIFTY' : 'NIFTY';
    var ABS_FLOOR  = symFromAtm === 'BANKNIFTY' ? 200 : 500;
    var MIN_AVG    = 30;   // floor on baseline avg; below this we're effectively dividing by ~0

    // Walk all strikes present in current snapshot
    var strikes = Object.keys(current.strikes || {});
    var out = [];

    strikes.forEach(function(strikeKey) {
      var strike = parseInt(strikeKey, 10);

      ['ce', 'pe'].forEach(function(side) {
        var volKey = side + '_vol';

        // Build the cumulative-volume time series for this strike+side from history
        var cumSeries = chainHistory.map(function(snap) {
          var s = snap.strikes && snap.strikes[strikeKey];
          return s ? (s[volKey] || 0) : null;
        });

        // Derive per-bar delta series from cumulative
        var deltaSeries = [];
        for (var i = 1; i < cumSeries.length; i++) {
          var a = cumSeries[i - 1], b = cumSeries[i];
          if (a == null || b == null) { deltaSeries.push(null); continue; }
          // Delta should be non-negative (cumulative). Negative = data anomaly
          // (e.g. session reset, broker resync). Treat as null instead of using.
          var d = b - a;
          deltaSeries.push(d >= 0 ? d : null);
        }

        if (deltaSeries.length < 5) return;
        var currentDelta = deltaSeries[deltaSeries.length - 1];
        if (currentDelta == null || currentDelta < ABS_FLOOR) return;

        // Baseline = mean of prior deltas (last 8, excluding current). Zero
        // deltas are valid data — they mean "this strike was quiet" — and
        // should drag the average down so a real spike registers.
        var prior = deltaSeries.slice(-9, -1).filter(function(x) { return x != null; });
        if (prior.length < 4) return;
        var avgRaw = prior.reduce(function(a, b) { return a + b; }, 0) / prior.length;
        var avg = Math.max(avgRaw, MIN_AVG);
        var multiple = currentDelta / avg;
        if (multiple < spikeThreshold) return;

        // Compute aggression from current snapshot's chg_oi and ltp move
        var sNow  = current.strikes[strikeKey];
        var sPrev = chainHistory[chainHistory.length - 2].strikes[strikeKey];
        var dOI   = sNow ? (side === 'ce' ? sNow.ce_chg_oi : sNow.pe_chg_oi) || 0 : 0;
        var dLTP  = (sNow && sPrev)
                  ? ((side === 'ce' ? sNow.ce_ltp : sNow.pe_ltp) - (side === 'ce' ? sPrev.ce_ltp : sPrev.pe_ltp))
                  : 0;
        var aggression = 'neutral';
        if (dLTP > 0.5 && dOI > 0)  aggression = 'buyer';
        if (dLTP < -0.5 && dOI > 0) aggression = 'writer';
        if (dOI < 0)                aggression = 'unwind';

        // Buildup classification (price × OI on this snapshot)
        var buildup = 'neutral';
        if (dOI > 0 && dLTP > 0.05) buildup = 'long_buildup';
        else if (dOI > 0 && dLTP < -0.05) buildup = 'short_buildup';
        else if (dOI < 0 && dLTP > 0.05) buildup = 'short_covering';
        else if (dOI < 0 && dLTP < -0.05) buildup = 'long_unwinding';

        // Smart-money score: weighted by multiple, ATM proximity, and
        // OI-confirmed nature of the flow.
        var step       = symFromAtm === 'BANKNIFTY' ? 100 : 50;
        var atmDist    = Math.abs(strike - atm) / step;
        var atmFactor  = atmDist <= 1 ? 1.0
                       : atmDist <= 3 ? 0.85
                       : atmDist <= 5 ? 0.65
                       :                 0.40;
        var aggrFactor = aggression === 'writer' ? 1.0    // writers usually pin = strong S/R signal
                       : aggression === 'buyer'  ? 0.85
                       : aggression === 'unwind' ? 0.55
                       :                            0.45;
        var multFactor = Math.min(multiple / 3, 1.5);     // diminishing returns above 3×
        var smRaw      = 70 * atmFactor * aggrFactor * multFactor;
        var smScore    = Math.min(100, Math.round(smRaw));

        out.push({
          strike: strike,
          side: side.toUpperCase(),
          time: current.time,
          multiple: multiple,
          delta_volume: currentDelta,
          delta_oi: dOI,
          buildup: buildup,
          aggression: aggression,
          sm_score: smScore,
          is_atm: !!sNow.is_atm,
        });
      });
    });

    out.sort(function(a, b) { return b.sm_score - a.sm_score; });
    return out;
  }, [chainHistory, spikeThreshold]);

  // ── Strike IV history: backend collects all 11 strikes every 3 min in
  // refresh_options(). We just fetch + cache to localStorage so reload doesn't
  // wipe the day's data and switching strikes shows immediate history.
  function fetchStrikeIVHistory(sym) {
    fetch('http://localhost:3001/api/strike-iv-history?symbol=' + sym)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d && d.history) {
          setStrikeIVHistory(d.history);
          try {
            var key = 'mt_strike_iv_' + sym + '_' + new Date().toISOString().slice(0, 10);
            localStorage.setItem(key, JSON.stringify(d.history));
          } catch (e) {}
        }
      })
      .catch(function(e) { console.error('[Options] strike-iv fetch:', e); });
  }

  // Load cached history immediately on symbol change so the picker shows
  // history even before the first backend fetch completes
  useEffect(function() {
    if (!symbol) return;
    try {
      var key = 'mt_strike_iv_' + symbol + '_' + new Date().toISOString().slice(0, 10);
      var cached = localStorage.getItem(key);
      if (cached) {
        var parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) setStrikeIVHistory(parsed);
      }
    } catch (e) {}
  }, [symbol]);

  useEffect(function() {
    try { localStorage.setItem(_alertKey, JSON.stringify(alerts.slice(0,200))); }
    catch(e){}
  }, [alerts]); // eslint-disable-line react-hooks/exhaustive-deps
  var overviewRef                 = useRef(null);
  var prevPCRRef                  = useRef({});

  // ── TV webhook events polling ────────────────────────────────────────────
  // Polls the local Flask /api/tv/events endpoint every 5 seconds for events
  // pushed by the TradingView Pine Script via /api/tv/webhook. Uses
  // since=<lastSeenId> for efficient incremental fetch — server returns only
  // new events. Sets tvConfigured based on /api/tv/health to drive the panel
  // empty-state UI.
  useEffect(function() {
    if (!hasOptions) return;
    var aborted = false;

    function checkHealth() {
      fetch('http://localhost:3001/api/tv/health')
        .then(function(r) { return r.json(); })
        .then(function(d) { if (!aborted) setTvConfigured(!!(d && d.configured)); })
        .catch(function() { if (!aborted) setTvConfigured(false); });
    }

    function pollEvents() {
      var url = 'http://localhost:3001/api/tv/events?since=' + tvLastSeenIdRef.current + '&limit=50';
      fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (aborted) return;
          if (d && d.ok && Array.isArray(d.events)) {
            if (d.events.length > 0) {
              tvLastSeenIdRef.current = d.latest_id;
              setTvEvents(function(prev) {
                var next = prev.concat(d.events);
                return next.slice(-100);   // cap last 100 events on the client
              });
            }
            setTvLastErr(null);
          }
        })
        .catch(function(e) {
          if (!aborted) setTvLastErr(String(e));
        });
    }

    checkHealth();
    pollEvents();
    var healthInt = setInterval(checkHealth, 30000);
    var pollInt   = setInterval(pollEvents, 5000);

    return function() {
      aborted = true;
      clearInterval(healthInt);
      clearInterval(pollInt);
    };
  }, [hasOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Push new volume spikes into the existing AlertSystem ─────────────────
  // Filters: SM score >= 60 (institutional-quality), ATM ±5 strikes only,
  //          dedupe by symbol+strike+side per session.
  // Alert shape matches existing OI alerts so AlertCard renders correctly.
  useEffect(function() {
    if (!volumeSpikes || volumeSpikes.length === 0) return;

    var spotForRange = (volumeData && volumeData.spot) ||
                       (data && data.spot_price) || 0;
    var stepGuess = symbol === 'BANKNIFTY' ? 100 : 50;
    var maxDist   = 5 * stepGuess;

    var fired = [];
    volumeSpikes.forEach(function(s) {
      if (s.sm_score < 60) return;
      if (spotForRange && Math.abs(s.strike - spotForRange) > maxDist) return;

      var key = symbol + '_' + s.strike + '_' + s.side;
      if (alertedSpikesRef.current[key]) return;
      alertedSpikesRef.current[key] = true;

      var isCE = s.side === 'CE';
      var emoji = s.aggression === 'writer' ? '✍️' :
                  s.aggression === 'buyer'  ? '🎯' :
                  s.aggression === 'unwind' ? '↩️' : '⚡';

      var aggrText = s.aggression === 'writer' ? 'writer aggression (sold to bid)' :
                     s.aggression === 'buyer'  ? 'buyer aggression (lifted offer)' :
                     s.aggression === 'unwind' ? 'position unwind (OI down)' :
                     'two-sided flow';

      var sideLabel = isCE ? 'CE' : 'PE';
      var biasNote = '';
      if (isCE && s.aggression === 'writer') biasNote = ' Resistance building at this level.';
      else if (isCE && s.aggression === 'buyer')  biasNote = ' Directional call buying — upside expectation.';
      else if (!isCE && s.aggression === 'writer') biasNote = ' Support building at this level.';
      else if (!isCE && s.aggression === 'buyer')  biasNote = ' Directional put buying — downside expectation.';

      var fmtVolForDesc = function(n) {
        var a = Math.abs(n);
        if (a >= 100000) return (n / 100000).toFixed(1) + 'L';
        if (a >= 1000)   return (n / 1000).toFixed(0) + 'K';
        return String(n);
      };

      fired.push({
        id:       Date.now() + Math.random(),
        ts:       Date.now(),
        time:     s.time,
        symbol:   symbol,
        strike:   s.strike,
        side:     isCE ? 'ce' : 'pe',
        dir:      'spike',
        type:     'VOL SPIKE — ' + s.strike + ' ' + sideLabel,
        emoji:    emoji,
        desc:     s.multiple.toFixed(1) + '× rolling avg volume on ' + sideLabel + ' at ' + s.strike +
                  ' (+' + fmtVolForDesc(s.delta_volume) + ' contracts) — ' + aggrText + '.' + biasNote,
        oi:       0,
        delta:    '+' + fmtVolForDesc(s.delta_volume),
        fromOpen: '',
        pct:      Math.round(s.sm_score),
        score:    Math.round(s.sm_score),
        oiRank:   '',
        tag:      s.is_atm ? 'ATM' : '',
        level:    s.sm_score >= 75 ? 'HIGH-CONVICTION' : 'NEW',
        samples:  chainHistory.length,
      });
    });

    if (fired.length) {
      console.log('[VolumeSpike] firing', fired.length, 'new alerts:', fired.map(function(a){return a.type;}).join(', '));
      setAlerts(function(prev) { return fired.concat(prev).slice(0, 200); });
    }
  }, [volumeSpikes, symbol]); // eslint-disable-line react-hooks/exhaustive-deps

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
          // Snapshot the chain into chainHistory for spike detection. Only
          // append when this fetch is for the active symbol AND going into the
          // main `data` state (setter === setData) — when active symbol is
          // BANKNIFTY, both fetchSym calls have sym==='BANKNIFTY' but only one
          // is for the main data; the other is for setBnData (overview-only).
          if (sym === symbol && setter === setData) {
            var chain = d.full_chain || d.chain || [];
            if (chain.length) {
              var nowIst = new Date(Date.now() + 5.5 * 3600 * 1000);
              var hh = String(nowIst.getUTCHours()).padStart(2, '0');
              var mm = String(nowIst.getUTCMinutes()).padStart(2, '0');
              var snap = { time: hh + ':' + mm, atm: d.atm_strike || 0, strikes: {} };
              chain.forEach(function(r) {
                if (!r || !r.strike) return;
                snap.strikes[String(r.strike)] = {
                  ce_vol:    r.ce_vol    || 0,
                  pe_vol:    r.pe_vol    || 0,
                  ce_oi:     r.ce_oi     || 0,
                  pe_oi:     r.pe_oi     || 0,
                  ce_chg_oi: r.ce_chg_oi || 0,
                  pe_chg_oi: r.pe_chg_oi || 0,
                  ce_ltp:    r.ce_ltp    || 0,
                  pe_ltp:    r.pe_ltp    || 0,
                  is_atm:    !!r.is_atm,
                };
              });
              setChainHistory(function(prev) {
                var next = prev.concat([snap]);
                return next.slice(-40);   // cap ~2hr
              });
            }
          }
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

  function fetchVolumeAnalysis(sym) {
    fetch('http://localhost:3001/api/volume/analysis?symbol=' + sym)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d && !d.error) {
          setVolumeData(d);
          setVolumeHistory(function(prev) {
            var next = prev.concat([d]);
            return next.slice(-40);   // cap at ~2hr of session history
          });
        }
      })
      .catch(function(e) { console.error('[Options] volume fetch:', e); });
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
    setVolumeData(null);
    setVolumeHistory([]);   // reset (legacy) top-volume history when switching symbol
    setChainHistory([]);    // reset chain-derived spike history when switching symbol
    alertedSpikesRef.current = {};   // reset spike dedupe so alerts can re-fire on new symbol
    setStrikeIVHistory([]);   // reset per-strike IV history on symbol switch
    prevPCRRef.current = {};
    fetchSym(symbol, setData);
    fetchSym('BANKNIFTY', setBnData);
    fetchDashboard(symbol);
    fetchVolumeAnalysis(symbol);
    fetchStrikeIVHistory(symbol);
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
      fetchVolumeAnalysis(symbol);
      fetchStrikeIVHistory(symbol);
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

          <VolumeSpikeBanner spikes={volumeSpikes} />

          <TVEventsPanel
            events={tvEvents}
            configured={tvConfigured}
            lastErr={tvLastErr}
          />

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

          <IVDashboard history={data.iv_history || []} symbol={symbol} tDays={data.top_strikes ? data.top_strikes.T_days : null} strikeIVHistory={strikeIVHistory} atm={data.atm_strike || 0} />

          {/* ── Macro context for option buyers ── */}
          <IVRegimeBadge
            ivHistory={data.iv_history || []}
            intradayHistory={dashData ? (dashData.intraday_history || []) : []}
            symbol={symbol}
          />

          <SpotContext
            intradayHistory={dashData ? (dashData.intraday_history || []) : []}
            spot={data.spot_price || 0}
            symbol={symbol}
          />

          <OptionFlowDecomp
            strikeHistory={data.strike_pcr_history || []}
            atm={data.atm_strike || 0}
            symbol={symbol}
          />

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

          <VolumeAnalysisPanel volume={volumeData} />

          <VolumeSpikePanel
            samples={chainHistory.length}
            minSamples={6}
            sessionPhase={(function() {
              var ist = new Date(Date.now() + 5.5 * 3600 * 1000);
              var m = ist.getUTCHours() * 60 + ist.getUTCMinutes();
              if (m >= 555 && m < 575) return 'open-noise';
              if (m < 555 || m >= 930) return 'closed';
              return 'live';
            })()}
            spikes={volumeSpikes}
            threshold={spikeThreshold}
            setThreshold={setSpikeThreshold}
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