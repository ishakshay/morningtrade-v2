import { useState, useEffect, useRef } from 'react';
import DataDisclaimer, { LegalDisclaimer } from '../components/DataDisclaimer';
import PageTitle from '../components/PageTitle';
import Paywall from '../components/Paywall';

var COUNTRIES = [
  { code: 'PL', label: 'Poland'  },
  { code: 'DE', label: 'Germany' },
  { code: 'IN', label: 'India'   },
];

function getTickerInfo(symbol) {
  var ticker = symbol
    .replace('.WA', '')
    .replace('.DE', '')
    .replace('.NS', '')
    .replace(/-/g, '_')
    .replace(/&/g, '_');
  var exchange = symbol.includes('.WA') ? 'GPW' : symbol.includes('.NS') ? 'NSE' : 'XETR';
  var tvUrl    = 'https://www.tradingview.com/symbols/' + exchange + '-' + ticker + '/';
  return { ticker: ticker, tvUrl: tvUrl };
}

function SectorBar(props) {
  var sector  = props.sector;
  var max     = props.max;
  var onClick = props.onClick;
  var active  = props.active;
  var isUp    = sector.avg_change >= 0;
  var barPct  = max === 0 ? 0 : (Math.abs(sector.avg_change) / Math.abs(max)) * 100;

  return (
    <div
      onClick={onClick}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', minWidth: 70 }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: isUp ? '#4ade80' : '#f87171' }}>
        {isUp ? '+' : ''}{sector.avg_change.toFixed(2)}%
      </div>
      <div style={{ width: 40, height: 120, background: '#1e293b', borderRadius: 4, display: 'flex', alignItems: isUp ? 'flex-end' : 'flex-start', overflow: 'hidden', border: active ? '2px solid #60a5fa' : '2px solid transparent' }}>
        <div style={{ width: '100%', height: barPct + '%', background: isUp ? '#16a34a' : '#dc2626', borderRadius: 4, minHeight: 4, transition: 'height 0.5s' }} />
      </div>
      <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {sector.name.toUpperCase()}
      </div>
    </div>
  );
}

function SectorPanel(props) {
  var sector = props.sector;
  var active = props.active;
  var [search, setSearch] = useState('');

  var upCount   = sector.up_count   || 0;
  var downCount = sector.down_count || 0;
  var total     = sector.stock_count || 1;
  var upPct     = Math.round((upCount / total) * 100);
  var downPct   = 100 - upPct;
  var panelId   = 'sector-' + sector.name.toLowerCase().replace(/\s+/g, '-');

  var filtered = (sector.stocks || []).filter(function(s) {
    return !search ||
      s.symbol.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div
      id={panelId}
      style={{
        background:    '#0f172a',
        border:        active ? '1px solid #60a5fa' : '1px solid #1e293b',
        borderRadius:  12,
        padding:       16,
        display:       'flex',
        flexDirection: 'column',
        gap:           12,
        transition:    'border-color 0.3s',
        scrollMarginTop: 24,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{sector.name.toUpperCase()}</span>
          <span style={{ fontSize: 10, background: '#dc2626', color: '#fff', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>LIVE</span>
        </div>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={function(e) { setSearch(e.target.value); }}
          style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#f1f5f9', outline: 'none', width: 120 }}
        />
      </div>

      <div style={{ position: 'relative', height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: upPct + '%', background: '#16a34a', borderRadius: 3 }} />
        <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: downPct + '%', background: '#dc2626', borderRadius: 3 }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#4ade80' }}>{upCount} stocks ({upPct.toFixed(2)}% Up)</span>
        <span style={{ fontSize: 12, color: '#f87171' }}>{downCount} stocks ({downPct.toFixed(2)}% Down)</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 60px 50px', gap: 4, padding: '4px 0', borderBottom: '1px solid #1e293b' }}>
        <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>Symbol</span>
        <span style={{ fontSize: 11, color: '#475569', fontWeight: 600, textAlign: 'right' }}>Price</span>
        <span style={{ fontSize: 11, color: '#475569', fontWeight: 600, textAlign: 'right' }}>%</span>
        <span style={{ fontSize: 11, color: '#475569', fontWeight: 600, textAlign: 'right' }}>Signal</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 320, overflowY: 'auto' }}>
        {filtered.map(function(stock) {
          var info = getTickerInfo(stock.symbol);
          var isUp = stock.percent_change >= 0;
          return (
            <div
              key={stock.symbol}
              onClick={function() { window.open(info.tvUrl, '_blank'); }}
              style={{ display: 'grid', gridTemplateColumns: '1fr 80px 60px 50px', gap: 4, padding: '6px 4px', borderRadius: 4, cursor: 'pointer', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{info.ticker}</span>
                <span style={{ fontSize: 10, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{stock.name}</span>
              </div>
              <span style={{ fontSize: 12, color: '#cbd5e1', textAlign: 'right' }}>{stock.price.toFixed(2)}</span>
              <span style={{ fontSize: 11, fontWeight: 700, textAlign: 'right', padding: '2px 6px', borderRadius: 4, background: isUp ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.15)', color: isUp ? '#4ade80' : '#f87171' }}>
                {isUp ? '+' : ''}{stock.percent_change.toFixed(2)}
              </span>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{ color: isUp ? '#4ade80' : '#f87171', fontSize: 14 }}>{isUp ? '▲' : '▼'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SectorScope() {
  var wsRef = useRef(null);
  var [allData, setAllData]         = useState({});
  var [connected, setConnected]     = useState(false);
  var [lastUpdated, setLastUpdated] = useState(null);
  var [country, setCountry]         = useState('');
  var [activeBar, setActiveBar]     = useState(null);

  useEffect(function() {
    function connect() {
      var ws = new WebSocket('ws://localhost:3001/ws');
      wsRef.current = ws;
      ws.onopen = function() { setConnected(true); };
      ws.onmessage = function(e) {
        var msg = JSON.parse(e.data);
        if (msg.type === 'update' && msg.country && msg.data) {
          setAllData(function(prev) {
            var next = Object.assign({}, prev);
            next[msg.country] = msg.data;
            return next;
          });
          setLastUpdated(new Date().toLocaleTimeString());
        }
      };
      ws.onclose = function() { setConnected(false); setTimeout(connect, 3000); };
      ws.onerror = function() { ws.close(); };
    }
    connect();
    return function() { if (wsRef.current) wsRef.current.close(); };
  }, []);

  useEffect(function() {
    if (!country) return;
    fetch('http://localhost:3001/api/sector-scope?country=' + country)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data && Object.keys(data).length > 0) {
          setAllData(function(prev) {
            var next = Object.assign({}, prev);
            if (!next[country]) next[country] = {};
            next[country].sector_scope = data;
            return next;
          });
          setLastUpdated(new Date().toLocaleTimeString());
        }
      })
      .catch(function(e) { console.error(e); });
  }, [country]);

  function scrollToSector(sectorName) {
    var id = 'sector-' + sectorName.toLowerCase().replace(/\s+/g, '-');
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  var countryData   = country ? ((allData[country] && allData[country].sector_scope) || {}) : {};
  var sectors       = Object.values(countryData);
  var maxAbs        = sectors.length > 0 ? Math.max.apply(null, sectors.map(function(s) { return Math.abs(s.avg_change); })) : 1;
  var sortedSectors = sectors.slice().sort(function(a, b) { return b.avg_change - a.avg_change; });
  var loading       = country && sectors.length === 0;

  return (
    <div style={{ color: '#f1f5f9' }}>
      <PageTitle title="Sector Scope" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>Sector Scope</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: 13 }}>Performance by sector — select a country to begin</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#1e293b', borderRadius: 6, border: '1px solid #334155' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block', background: connected ? '#4ade80' : '#f59e0b' }} />
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {connected ? 'Live' : 'Connecting...'}
            {lastUpdated ? ' · ' + lastUpdated : ''}
          </span>
        </div>
      </div>

      <DataDisclaimer />

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {COUNTRIES.map(function(c) {
          return (
            <button
              key={c.code}
              onClick={function() { setCountry(c.code); setActiveBar(null); }}
              style={{
                border:       '1px solid #334155',
                borderRadius: 6,
                padding:      '8px 20px',
                cursor:       'pointer',
                fontSize:     13,
                fontWeight:   600,
                background:   country === c.code ? '#3b82f6' : '#1e293b',
                color:        country === c.code ? '#fff'    : '#94a3b8',
                transition:   'all 0.15s',
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {!country && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#475569' }}>
          <p style={{ fontSize: 16 }}>Select a country above to view sector performance</p>
        </div>
      )}

      {country && loading && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#475569' }}>
          <p style={{ fontSize: 15 }}>Loading sector data...</p>
          <p style={{ fontSize: 13, color: '#334155' }}>First run takes 2-3 minutes.</p>
        </div>
      )}

      {country && !loading && sortedSectors.length > 0 && (
        <div>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em' }}>SECTOR SCOPE</span>
              <span style={{ fontSize: 10, background: '#dc2626', color: '#fff', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>ACTIVE</span>
            </div>
            <div style={{ borderTop: '2px solid #3b82f6', marginBottom: 20 }} />
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', overflowX: 'auto', paddingBottom: 8, minHeight: 200 }}>
              {sortedSectors.map(function(sector) {
                return (
                  <SectorBar
                    key={sector.name}
                    sector={sector}
                    max={maxAbs}
                    active={activeBar === sector.name}
                    onClick={function() {
                      setActiveBar(activeBar === sector.name ? null : sector.name);
                      scrollToSector(sector.name);
                    }}
                  />
                );
              })}
            </div>
          </div>

          <Paywall country={country} feature="Sector Scope">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
              {sortedSectors.map(function(sector) {
                return (
                  <SectorPanel
                    key={sector.name}
                    sector={sector}
                    active={activeBar === sector.name}
                  />
                );
              })}
            </div>
          </Paywall>
        </div>
      )}

      <LegalDisclaimer />
    </div>
  );
}