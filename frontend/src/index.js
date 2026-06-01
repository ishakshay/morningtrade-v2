import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';


(function() {
  var _fetch = window.fetch;
  var TTL = 170000; // 2m50s — slightly under 3min refresh cycle

  // These endpoints always bypass cache — they change every 3 mins
  var NO_CACHE = [
    '/api/options',
    '/api/pcr-intraday',
    '/api/tv/events',
    '/api/tv/health',
    '/api/futures-sentiment',
    '/api/futures-dashboard',
    '/api/volume/analysis',
  ];

  function shouldSkipCache(url) {
    return NO_CACHE.some(function(p) { return url.includes(p); });
  }

  function getCached(url) {
    try {
      var raw = sessionStorage.getItem('fc_' + url);
      if (!raw) return null;
      var entry = JSON.parse(raw);
      if (Date.now() - entry.ts < TTL) return entry.data;
    } catch(e) {}
    return null;
  }

  function setCached(url, data) {
    try {
      sessionStorage.setItem('fc_' + url, JSON.stringify({data: data, ts: Date.now()}));
    } catch(e) {}
  }

  var inflight = {};

  window.fetch = function(url, opts) {
    if (opts && opts.method && opts.method !== 'GET') return _fetch(url, opts);
    if (typeof url !== 'string' || !url.includes('api.morningtrade.in')) return _fetch(url, opts);
    if (shouldSkipCache(url)) return _fetch(url, opts);
    var cached = getCached(url);
    if (cached) {
      return Promise.resolve(new Response(JSON.stringify(cached), {
        status: 200, headers: {'Content-Type': 'application/json'}
      }));
    }
    if (inflight[url]) return inflight[url];
    var promise = _fetch(url, opts).then(function(r) {
      return r.clone().json().then(function(data) {
        setCached(url, data);
        delete inflight[url];
        return r;
      }).catch(function() {
        delete inflight[url];
        return r;
      });
    });
    inflight[url] = promise;
    return promise;
  };
})();

// Unregister any existing service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(regs) {
    regs.forEach(function(reg) { reg.unregister(); });
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AuthProvider>
    <DataProvider>
      <App />
    </DataProvider>
  </AuthProvider>
);
