import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';


(function() {
  var _fetch = window.fetch;
  var cache = {};
  var TTL = 60000;
  window.fetch = function(url, opts) {
    if (opts && opts.method && opts.method !== 'GET') return _fetch(url, opts);
    if (typeof url !== 'string' || !url.includes('api.morningtrade.in')) return _fetch(url, opts);
    var key = url;
    var entry = cache[key];
    if (entry && Date.now() - entry.ts < TTL) {
      return Promise.resolve(new Response(JSON.stringify(entry.data), {
        status: 200, headers: {'Content-Type': 'application/json'}
      }));
    }
    return _fetch(url, opts).then(function(r) {
      return r.clone().json().then(function(data) {
        cache[key] = {data: data, ts: Date.now()};
        return r;
      }).catch(function() { return r; });
    });
  };
})();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AuthProvider>
    <DataProvider>
      <App />
    </DataProvider>
  </AuthProvider>
);
