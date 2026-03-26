import { useState, useEffect, useRef } from 'react';
import PageTitle from '../components/PageTitle';

var REGIONS = [
  { code: 'ALL', label: 'All News' },
  { code: 'IN',  label: '🇮🇳 India' },
  { code: 'GLOBAL', label: '🌍 Global' },
];

function NewsCard(props) {
  var item = props.item;
  var [expanded, setExpanded] = useState(false);

  return (
    <div
      onClick={function() { setExpanded(function(e) { return !e; }); }}
      style={{
        background:   '#0f172a',
        border:       '1px solid #1e293b',
        borderLeft:   '3px solid #334155',
        borderRadius: 8,
        padding:      '12px 16px',
        cursor:       'pointer',
        transition:   'border-color 0.15s',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {item.source}
            </span>
            <span style={{ fontSize: 10, color: '#334155' }}>{item.date} {item.time}</span>
            {item.region === 'IN' && (
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#1e40af22', color: '#60a5fa', fontWeight: 600 }}>IN</span>
            )}
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', margin: 0, lineHeight: 1.4 }}>
            {item.title}
          </p>
        </div>
        <span style={{ fontSize: 12, color: '#334155', flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ marginTop: 10, borderTop: '1px solid #1e293b', paddingTop: 10 }}>
          {item.summary && (
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 8px', lineHeight: 1.5 }}>
              {item.summary}
            </p>
          )}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={function(e) { e.stopPropagation(); }}
              style={{ fontSize: 11, color: '#3b82f6', textDecoration: 'none' }}
            >
              Read full article →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function News() {
  var [news, setNews]             = useState(function() {
    try {
      var ts  = parseInt(sessionStorage.getItem('mt_news_ts') || '0');
      if (Date.now() - ts < 300000) {
        return JSON.parse(sessionStorage.getItem('mt_news') || '[]');
      }
    } catch(e) {}
    return [];
  });
  var [region, setRegion]         = useState('ALL');
  var [loading, setLoading]       = useState(false);
  var [lastUpdate, setLastUpdate] = useState(null);
  var [search, setSearch]         = useState('');
  var intervalRef                 = useRef(null);

  function fetchNews() {
    setLoading(true);
    fetch('http://localhost:3001/api/news?region=' + region)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        var items = Array.isArray(d) ? d : [];
        setNews(items);
        setLoading(false);
        setLastUpdate(new Date().toLocaleTimeString());
        try {
          sessionStorage.setItem('mt_news', JSON.stringify(items));
          sessionStorage.setItem('mt_news_ts', Date.now().toString());
        } catch(e) {}
      })
      .catch(function() { setLoading(false); });
  }

  useEffect(function() {
    fetchNews();
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchNews, 300000);
    return function() { clearInterval(intervalRef.current); };
  }, [region]);

  var filtered = news.filter(function(n) {
    if (!search) return true;
    var q = search.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      (n.summary || '').toLowerCase().includes(q) ||
      n.source.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ color: '#f1f5f9' }}>
      <PageTitle title="Market News" />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>Market News</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: 13 }}>Real-time news · updates every 5 min</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#1e293b', borderRadius: 6, border: '1px solid #334155' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block', background: loading ? '#f59e0b' : '#4ade80' }} />
            <span style={{ fontSize: 12, color: '#64748b' }}>
              {lastUpdate ? 'Updated ' + lastUpdate : 'Loading...'}
            </span>
          </div>
          <button
            onClick={fetchNews}
            style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '6px 14px', color: '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Region filter + search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {REGIONS.map(function(r) {
          return (
            <button
              key={r.code}
              onClick={function() { setRegion(r.code); }}
              style={{
                border: '1px solid #334155', borderRadius: 8, padding: '6px 16px',
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: region === r.code ? '#8b5cf6' : '#1e293b',
                color:      region === r.code ? '#fff'    : '#94a3b8',
              }}
            >
              {r.label}
            </button>
          );
        })}
        <input
          type="text"
          placeholder="Search news, stocks, sectors..."
          value={search}
          onChange={function(e) { setSearch(e.target.value); }}
          style={{
            flex: 1, minWidth: 200, padding: '7px 14px',
            background: '#1e293b', border: '1px solid #334155',
            borderRadius: 8, color: '#f1f5f9', fontSize: 12,
            outline: 'none',
          }}
        />
        <span style={{ fontSize: 12, color: '#475569' }}>
          {filtered.length} stories
        </span>
      </div>

      {/* News feed */}
      {loading && news.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#475569' }}>
          <p style={{ fontSize: 15 }}>Fetching latest market news...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(function(item) {
            return <NewsCard key={item.id} item={item} />;
          })}
          {filtered.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#475569' }}>
              <p style={{ fontSize: 15 }}>No news found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}