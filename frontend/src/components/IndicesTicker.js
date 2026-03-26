import { useState, useEffect, useRef } from 'react';

var REGION_FLAG = {
  'US': '🇺🇸',
  'DE': '🇩🇪',
  'PL': '🇵🇱',
  'IN': '🇮🇳',
  'GB': '🇬🇧',
  'FR': '🇫🇷',
  'JP': '🇯🇵',
  'CN': '🇨🇳',
  'HK': '🇭🇰',
  'EU': '🇪🇺',
};

export default function IndicesTicker() {
  var [indices, setIndices] = useState([]);
  var wsRef = useRef(null);

  useEffect(function() {
    fetch('http://localhost:3001/api/indices')
      .then(function(r) { return r.json(); })
      .then(function(data) { if (Array.isArray(data)) setIndices(data); })
      .catch(function() {});

    function connect() {
      var ws = new WebSocket('ws://localhost:3001/ws');
      wsRef.current = ws;
      ws.onmessage = function(e) {
        var msg = JSON.parse(e.data);
        if (msg.type === 'indices' && Array.isArray(msg.data)) {
          setIndices(msg.data);
        }
      };
      ws.onclose = function() { setTimeout(connect, 3000); };
      ws.onerror = function() { ws.close(); };
    }
    connect();
    return function() { if (wsRef.current) wsRef.current.close(); };
  }, []);

  if (indices.length === 0) return null;

  var doubled = indices.concat(indices);

  return (
    <div style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', overflow: 'hidden', height: 36, display: 'flex', alignItems: 'center', width: '100%' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-inner {
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
          animation: tickerScroll 80s linear infinite;
        }
        .ticker-inner:hover {
          animation-play-state: paused;
        }
      `}} />
      <div className="ticker-inner">
        {doubled.map(function(idx, i) {
          var isUp  = idx.percent_change >= 0;
          var color = isUp ? '#4ade80' : '#f87171';
          var flag  = REGION_FLAG[idx.region] || '🌐';
          return (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 20px', fontSize: 12, fontFamily: 'sans-serif' }}>
              <span style={{ fontSize: 14 }}>{flag}</span>
              <span style={{ color: '#94a3b8', fontWeight: 500 }}>{idx.name}</span>
              <span style={{ color: '#f1f5f9', fontWeight: 600 }}>
                {idx.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              <span style={{ color: color, fontWeight: 600 }}>
                {isUp ? '+' : ''}{idx.percent_change.toFixed(2)}%
              </span>
              <span style={{ color: '#334155' }}>|</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}