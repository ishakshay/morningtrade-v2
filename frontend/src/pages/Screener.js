import { useState, useEffect, useRef } from 'react';
import DataDisclaimer, { LegalDisclaimer } from '../components/DataDisclaimer';
import PageTitle from '../components/PageTitle';
import Paywall from '../components/Paywall';
import { useAuth } from '../context/AuthContext';

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

function getCurrency(stock) {
  if (stock.currency === 'EUR') return 'EUR';
  if (stock.currency === 'INR') return 'INR';
  return 'PLN';
}

function StockPill(props) {
  var stock = props.stock;
  var info  = getTickerInfo(stock.symbol);
  var isUp  = stock.percent_change >= 0;
  var curr  = getCurrency(stock);

  return (
    <div
      style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer' }}
      onClick={function() { window.open(info.tvUrl, '_blank'); }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>{info.ticker}</span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: isUp ? '#16a34a33' : '#dc262633', color: isUp ? '#4ade80' : '#f87171' }}>
          {isUp ? '+' : ''}{stock.percent_change.toFixed(2)}%
        </span>
      </div>
      <p style={{ fontSize: 11, color: '#475569', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stock.name}</p>
      <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#f1f5f9' }}>{stock.price.toFixed(2)} {curr}</p>
    </div>
  );
}

function Section(props) {
  var title    = props.title;
  var subtitle = props.subtitle;
  var stocks   = props.stocks;
  var filter   = props.filter;
  var onFilter = props.onFilter;

  var filtered = (stocks || []).filter(function(s) {
    if (filter === 'all') return true;
    return s.direction === filter;
  });

  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 2px', color: '#f1f5f9' }}>{title}</h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'bullish', 'bearish'].map(function(f) {
            var bg = filter === f
              ? f === 'bullish' ? '#16a34a' : f === 'bearish' ? '#dc2626' : '#1d4ed8'
              : '#1e293b';
            return (
              <button
                key={f}
                onClick={function() { onFilter(f); }}
                style={{ border: '1px solid #334155', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: bg, color: filter === f ? '#fff' : '#94a3b8' }}
              >
                {f === 'all' ? 'All' : f === 'bullish' ? 'Bullish' : 'Bearish'}
              </button>
            );
          })}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: 24, textAlign: 'center', color: '#475569', fontSize: 13 }}>
          No {filter !== 'all' ? filter + ' ' : ''}stocks found right now
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {filtered.map(function(s) { return <StockPill key={s.symbol} stock={s} />; })}
        </div>
      )}
      <p style={{ fontSize: 12, color: '#475569', margin: '8px 0 0' }}>
        {filtered.length} stock{filtered.length !== 1 ? 's' : ''} · click any card to open chart
      </p>
    </div>
  );
}

function IntradayBoosterRow(props) {
  var stock = props.stock;
  var info  = getTickerInfo(stock.symbol);
  var isUp  = stock.direction === 'bullish';
  var curr  = getCurrency(stock);

  return (
    <div
      onClick={function() { window.open(info.tvUrl, '_blank'); }}
      style={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px 80px 70px 60px', gap: 8, padding: '10px 16px', borderBottom: '1px solid #1e293b', alignItems: 'center', cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>{info.ticker}</span>
        <span style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stock.name}</span>
      </div>
      <span style={{ fontSize: 13, color: '#cbd5e1' }}>
        {stock.price ? stock.price.toFixed(2) : '--'} {curr}
      </span>
      <span style={{
        fontSize:     12,
        fontWeight:   700,
        padding:      '3px 10px',
        borderRadius: 20,
        textAlign:    'center',
        background:   isUp ? '#16a34a33' : '#dc262633',
        color:        isUp ? '#4ade80'   : '#f87171',
        display:      'inline-block',
      }}>
        {isUp ? '+' : ''}{stock.percent_change.toFixed(2)}%
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1', textAlign: 'center' }}>
        {stock.r_factor}x
      </span>
      <span style={{ fontSize: 11, color: '#64748b', textAlign: 'center', fontWeight: 500 }}>
        {stock.detected_at || '--'}
      </span>
      <span style={{ textAlign: 'center', fontSize: 18, color: isUp ? '#4ade80' : '#f87171' }}>
        {isUp ? '▲' : '▼'}
      </span>
    </div>
  );
}

function IntradayBooster(props) {
  var data  = props.data || {};
  var orb5  = data.orb5  || [];
  var orb15 = data.orb15 || [];
  var [tab, setTab]       = useState('orb5');
  var [filter, setFilter] = useState('all');

  var stocks   = tab === 'orb5' ? orb5 : orb15;
  var filtered = stocks.filter(function(s) {
    if (filter === 'all') return true;
    return s.direction === filter;
  });

  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 2px', color: '#f1f5f9' }}>Intraday Boosters</h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            Stocks breaking above or below opening range with high relative volume · sorted by R.Factor · persists all day
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'bullish', 'bearish'].map(function(f) {
            var bg = filter === f
              ? f === 'bullish' ? '#16a34a' : f === 'bearish' ? '#dc2626' : '#1d4ed8'
              : '#1e293b';
            return (
              <button
                key={f}
                onClick={function() { setFilter(f); }}
                style={{ border: '1px solid #334155', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: bg, color: filter === f ? '#fff' : '#94a3b8' }}
              >
                {f === 'all' ? 'All' : f === 'bullish' ? 'Bullish' : 'Bearish'}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 12, alignItems: 'center' }}>
        {['orb5', 'orb15'].map(function(t) {
          return (
            <button
              key={t}
              onClick={function() { setTab(t); }}
              style={{
                border:       '1px solid #334155',
                borderRadius: 6,
                padding:      '5px 14px',
                cursor:       'pointer',
                fontSize:     12,
                fontWeight:   600,
                background:   tab === t ? '#f1f5f9' : '#1e293b',
                color:        tab === t ? '#0f172a' : '#94a3b8',
              }}
            >
              {t === 'orb5' ? 'ORB 5 min' : 'ORB 15 min'}
            </button>
          );
        })}
        <span style={{ fontSize: 12, color: '#475569', marginLeft: 8 }}>
          {filtered.length} stock{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px 80px 70px 60px', gap: 8, padding: '8px 16px', background: '#0f172a', borderBottom: '1px solid #1e293b', fontSize: 11, fontWeight: 600, color: '#475569' }}>
          <span>Symbol</span>
          <span>Price</span>
          <span>%</span>
          <span>R.Factor</span>
          <span>Detected</span>
          <span>Signal</span>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#475569', fontSize: 13 }}>
            No {filter !== 'all' ? filter + ' ' : ''}{tab === 'orb5' ? '5 min' : '15 min'} breakouts right now
          </div>
        ) : (
          filtered.map(function(s) {
            return <IntradayBoosterRow key={s.symbol + (s.detected_at || '')} stock={s} />;
          })
        )}
      </div>
      <p style={{ fontSize: 12, color: '#475569', margin: '8px 0 0' }}>
        R.Factor = current volume / 50-day avg volume · Detected = time signal first triggered today · click to open chart
      </p>
    </div>
  );
}

function MoverRow(props) {
  var s      = props.stock;
  var i      = props.index;
  var isGain = props.isGain;
  var info   = getTickerInfo(s.symbol);
  var color  = isGain ? '#4ade80' : '#f87171';
  var curr   = getCurrency(s);

  return (
    <div
      style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
      onClick={function() { window.open(info.tvUrl, '_blank'); }}
    >
      <span style={{ fontSize: 13, fontWeight: 700, color: '#334155', minWidth: 20 }}>#{i + 1}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>{info.ticker}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: color }}>
            {isGain ? '+' : ''}{s.percent_change.toFixed(2)}%
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
          <span style={{ fontSize: 11, color: '#475569' }}>{s.name}</span>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{s.price.toFixed(2)} {curr}</span>
        </div>
      </div>
    </div>
  );
}

function TopMovers(props) {
  var gainers = props.gainers || [];
  var losers  = props.losers  || [];

  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>Top Movers</h2>
      <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>Biggest gainers and losers today</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#4ade80', margin: '0 0 10px' }}>Top Gainers</p>
          {gainers.length === 0 ? (
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: 16, textAlign: 'center', color: '#475569', fontSize: 13 }}>No data yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {gainers.map(function(s, i) { return <MoverRow key={s.symbol} stock={s} index={i} isGain={true} />; })}
            </div>
          )}
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#f87171', margin: '0 0 10px' }}>Top Losers</p>
          {losers.length === 0 ? (
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: 16, textAlign: 'center', color: '#475569', fontSize: 13 }}>No data yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {losers.map(function(s, i) { return <MoverRow key={s.symbol} stock={s} index={i} isGain={false} />; })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SpikeCard(props) {
  var stock = props.stock;
  var info  = getTickerInfo(stock.symbol);
  var isUp  = stock.direction === 'bullish';
  var curr  = getCurrency(stock);

  return (
    <div
      style={{ background: '#0f172a', border: '1px solid ' + (isUp ? '#16a34a44' : '#dc262644'), borderRadius: 8, padding: '12px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 }}
      onClick={function() { window.open(info.tvUrl, '_blank'); }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>{info.ticker}</span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: isUp ? '#16a34a33' : '#dc262633', color: isUp ? '#4ade80' : '#f87171' }}>
          {isUp ? '+' : ''}{stock.percent_change.toFixed(2)}%
        </span>
      </div>
      <p style={{ fontSize: 11, color: '#475569', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stock.name}</p>
      <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#f1f5f9' }}>{stock.price.toFixed(2)} {curr}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 6, borderTop: '1px solid #1e293b' }}>
        <span style={{ fontSize: 11, color: '#475569' }}>
          Candle <b style={{ color: '#94a3b8' }}>{stock.spike ? stock.spike.candle_time || '--' : '--'}</b>
        </span>
        <span style={{ fontSize: 11, color: '#475569' }}>
          Detected <b style={{ color: '#60a5fa' }}>{stock.detected_at || '--'}</b>
        </span>
      </div>
    </div>
  );
}

function SpikeSection(props) {
  var title    = props.title;
  var subtitle = props.subtitle;
  var stocks   = props.stocks || [];
  var filter   = props.filter;
  var onFilter = props.onFilter;

  var filtered = stocks.filter(function(s) {
    if (filter === 'all') return true;
    return s.direction === filter;
  });

  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 2px', color: '#f1f5f9' }}>{title}</h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'bullish', 'bearish'].map(function(f) {
            var bg = filter === f
              ? f === 'bullish' ? '#16a34a' : f === 'bearish' ? '#dc2626' : '#1d4ed8'
              : '#1e293b';
            return (
              <button
                key={f}
                onClick={function() { onFilter(f); }}
                style={{ border: '1px solid #334155', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: bg, color: filter === f ? '#fff' : '#94a3b8' }}
              >
                {f === 'all' ? 'All' : f === 'bullish' ? 'Bullish' : 'Bearish'}
              </button>
            );
          })}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: 24, textAlign: 'center', color: '#475569', fontSize: 13 }}>
          No {filter !== 'all' ? filter + ' ' : ''}spikes detected right now · signals persist all day once triggered
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          {filtered.map(function(s) { return <SpikeCard key={s.symbol + s.timeframe} stock={s} />; })}
        </div>
      )}
      <p style={{ fontSize: 12, color: '#475569', margin: '8px 0 0' }}>
        {filtered.length} stock{filtered.length !== 1 ? 's' : ''} · click to open chart
      </p>
    </div>
  );
}

export default function Screener() {
  var wsRef = useRef(null);
  var [allData, setAllData]             = useState({});
  var [connected, setConnected]         = useState(false);
  var [lastUpdated, setLastUpdated]     = useState(null);
  var [country, setCountry]             = useState('PL');
  var [nr7Filter, setNr7Filter]         = useState('all');
  var [spike5Filter, setSpike5Filter]   = useState('all');
  var [spike10Filter, setSpike10Filter] = useState('all');
  var { hasAccess }                     = useAuth();

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

  var countryData   = (allData && allData[country]) || {};
  var loading       = Object.keys(countryData).length === 0;
  var nr7Stocks     = countryData.nr7 || [];
  var topMovers     = countryData.top_movers || {};
  var gainers       = topMovers.gainers || [];
  var losers        = topMovers.losers  || [];
  var momentumData  = countryData.momentum_spike || {};
  var spikes5min    = momentumData.spikes_5min  || [];
  var spikes10min   = momentumData.spikes_10min || [];
  var intradayData  = countryData.intraday_booster || {};
  var selectedLabel = COUNTRIES.find(function(c) { return c.code === country; });

  return (
    <div style={{ color: '#f1f5f9' }}>
      <PageTitle title="Screener" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>Screener</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: 13 }}>
            {selectedLabel ? selectedLabel.label : ''} · refreshes every 60s
          </p>
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

      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {COUNTRIES.map(function(c) {
          return (
            <button
              key={c.code}
              onClick={function() {
                setCountry(c.code);
                setNr7Filter('all');
                setSpike5Filter('all');
                setSpike10Filter('all');
              }}
              style={{
                border:       '1px solid #334155',
                borderRadius: 6,
                padding:      '6px 18px',
                cursor:       'pointer',
                fontSize:     13,
                fontWeight:   600,
                background:   country === c.code ? '#f1f5f9' : '#1e293b',
                color:        country === c.code ? '#0f172a' : '#94a3b8',
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <p style={{ fontSize: 15 }}>Running screeners for {selectedLabel ? selectedLabel.label : ''}...</p>
          <p style={{ fontSize: 13, color: '#475569' }}>First run takes 2-3 minutes. Always instant after that.</p>
        </div>
      ) : (
        <div>
          <TopMovers gainers={gainers} losers={losers} />
          <div style={{ borderTop: '1px solid #1e293b', marginBottom: 36 }} />

          <Paywall country={country} feature="Intraday Boosters">
            <IntradayBooster data={intradayData} />
          </Paywall>
          <div style={{ borderTop: '1px solid #1e293b', marginBottom: 36 }} />

          <Paywall country={country} feature="NR7 Stocks">
            <Section
              title="NR7 Stocks"
              subtitle="Narrowest range in 7 days — coiling up for a breakout"
              stocks={nr7Stocks}
              filter={nr7Filter}
              onFilter={setNr7Filter}
            />
          </Paywall>
          <div style={{ borderTop: '1px solid #1e293b', marginBottom: 36 }} />

          <Paywall country={country} feature="5 Min Momentum Spikes">
            <SpikeSection
              title="5 Min Momentum Spike"
              subtitle="Single 5-min candle 2x average body, closes near high, volume 1.5x avg · persists all day"
              stocks={spikes5min}
              filter={spike5Filter}
              onFilter={setSpike5Filter}
            />
          </Paywall>
          <div style={{ borderTop: '1px solid #1e293b', marginBottom: 36 }} />

          <Paywall country={country} feature="10 Min Momentum Spikes">
            <SpikeSection
              title="10 Min Momentum Spike"
              subtitle="Sustained 10-min push 1.75x average body, closes near high, volume 1.5x avg · persists all day"
              stocks={spikes10min}
              filter={spike10Filter}
              onFilter={setSpike10Filter}
            />
          </Paywall>
        </div>
      )}

      <LegalDisclaimer />
    </div>
  );
}