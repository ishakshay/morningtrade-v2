import { useState, useEffect } from 'react';
import DataDisclaimer, { LegalDisclaimer } from '../components/DataDisclaimer';
import PageTitle from '../components/PageTitle';

var COUNTRIES = [
  { code: 'PL', label: 'Poland',  currency: 'PLN' },
  { code: 'DE', label: 'Germany', currency: 'EUR' },
  { code: 'IN', label: 'India',   currency: 'INR' },
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

function getCurrency(stock) {
  if (stock.currency === 'EUR') return 'EUR';
  if (stock.currency === 'INR') return 'INR';
  return 'PLN';
}

function StockCard({ stock }) {
  var info = getTickerInfo(stock.symbol);
  var isUp = stock.percent_change >= 0;
  var curr = getCurrency(stock);

  if (!stock.price) {
    return (
      <div style={styles.card}>
        <h3 style={styles.symbol}>{info.ticker}</h3>
        <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Unavailable</p>
      </div>
    );
  }

  return (
    <div
      style={{ ...styles.card, cursor: 'pointer' }}
      onClick={function() { window.open(info.tvUrl, '_blank'); }}
    >
      <h3 style={styles.symbol}>{info.ticker}</h3>
      <p style={styles.name}>{stock.name}</p>
      <p style={styles.price}>
        {stock.price.toFixed(2)} <span style={styles.currency}>{curr}</span>
      </p>
      <p style={{ color: isUp ? '#16a34a' : '#dc2626', fontWeight: 600, margin: '4px 0 0', fontSize: 13 }}>
        {isUp ? '+' : ''}{stock.percent_change.toFixed(2)}%
      </p>
    </div>
  );
}

export default function Stocks() {
  var [stocks, setStocks]           = useState([]);
  var [loading, setLoading]         = useState(true);
  var [lastUpdated, setLastUpdated] = useState(null);
  var [filter, setFilter]           = useState('all');
  var [search, setSearch]           = useState('');
  var [country, setCountry]         = useState('PL');

  useEffect(function() {
    setLoading(true);
    setStocks([]);

    function loadStocks() {
      fetch('http://localhost:3001/api/stocks?country=' + country)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (Array.isArray(data)) {
            setStocks(data);
            setLastUpdated(new Date().toLocaleTimeString());
            setLoading(false);
          }
        })
        .catch(function(e) {
          console.error('Failed:', e);
          setLoading(false);
        });
    }

    loadStocks();
    var interval = setInterval(loadStocks, 300000);
    return function() { clearInterval(interval); };
  }, [country]);

  var filtered = stocks.filter(function(s) {
    var matchFilter =
      filter === 'all' ? true :
      filter === 'up'  ? s.percent_change >= 0 :
      s.percent_change < 0;
    var matchSearch =
      s.symbol.toLowerCase().includes(search.toLowerCase()) ||
      (s.name && s.name.toLowerCase().includes(search.toLowerCase()));
    return matchFilter && matchSearch;
  });

  var gainers         = stocks.filter(function(s) { return s.percent_change >= 0; }).length;
  var losers          = stocks.filter(function(s) { return s.percent_change < 0;  }).length;
  var selectedCountry = COUNTRIES.find(function(c) { return c.code === country; });

  return (
    <div>
      <PageTitle title="All Tickers" />

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Stock Scanner</h1>
          <p style={styles.subtitle}>{selectedCountry ? selectedCountry.label : ''} — live prices</p>
        </div>
        <div style={styles.stats}>
          <div style={styles.stat}>
            <span style={styles.statNum}>{stocks.length}</span>
            <span style={styles.statLabel}>Total</span>
          </div>
          <div style={styles.stat}>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#16a34a' }}>{gainers}</span>
            <span style={styles.statLabel}>Up</span>
          </div>
          <div style={styles.stat}>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#dc2626' }}>{losers}</span>
            <span style={styles.statLabel}>Down</span>
          </div>
        </div>
      </div>

      <DataDisclaimer />

      <div style={styles.toolbar}>
        <div style={{ display: 'flex', gap: 6 }}>
          {COUNTRIES.map(function(c) {
            return (
              <button
                key={c.code}
                onClick={function() { setCountry(c.code); setFilter('all'); setSearch(''); }}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  padding: '6px 16px',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  background: country === c.code ? '#111827' : '#fff',
                  color:      country === c.code ? '#fff'    : '#374151',
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          placeholder="Search ticker or name..."
          value={search}
          onChange={function(e) { setSearch(e.target.value); }}
          style={styles.search}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'up', 'down'].map(function(f) {
            return (
              <button
                key={f}
                onClick={function() { setFilter(f); }}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  padding: '6px 14px',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  background: filter === f ? '#1d4ed8' : '#fff',
                  color:      filter === f ? '#fff'    : '#374151',
                }}
              >
                {f === 'all' ? 'All' : f === 'up' ? 'Gainers' : 'Losers'}
              </button>
            );
          })}
        </div>
      </div>

      <div style={styles.statusBar}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block', flexShrink: 0, background: lastUpdated ? '#16a34a' : '#f59e0b' }} />
        <span style={{ fontSize: 13, color: '#6b7280' }}>
          {lastUpdated ? 'Updated ' + lastUpdated + ' · refreshes every 5 min' : 'Loading...'}
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
          <p>Fetching {selectedCountry ? selectedCountry.label : ''} stocks...</p>
          <p style={{ fontSize: 13, color: '#9ca3af' }}>Takes about 2 minutes on first load.</p>
        </div>
      ) : (
        <div>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 16px' }}>
            Showing {filtered.length} of {stocks.length} stocks · click any card to open chart
          </p>
          <div style={styles.grid}>
            {filtered.map(function(s) {
              return <StockCard key={s.symbol} stock={s} />;
            })}
          </div>
        </div>
      )}

      <LegalDisclaimer />
    </div>
  );
}

const styles = {
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
  title:     { fontSize: 24, fontWeight: 700, margin: '0 0 4px' },
  subtitle:  { color: '#6b7280', margin: 0, fontSize: 14 },
  stats:     { display: 'flex', gap: 16 },
  stat:      { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  statNum:   { fontSize: 22, fontWeight: 700, color: '#111827' },
  statLabel: { fontSize: 11, color: '#9ca3af' },
  toolbar:   { display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' },
  search:    { padding: '8px 12px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 14, width: 200, outline: 'none' },
  statusBar: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '8px 12px', background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb' },
  grid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 },
  card:      { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14 },
  symbol:    { fontSize: 16, fontWeight: 700, margin: '0 0 2px' },
  name:      { fontSize: 11, color: '#6b7280', margin: '0 0 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  price:     { fontSize: 20, fontWeight: 600, margin: 0 },
  currency:  { fontSize: 12, color: '#9ca3af', fontWeight: 400 },
};