import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

var API = process.env.REACT_APP_API_URL || 'https://api.morningtrade.in';
var CACHE_TTL = 60 * 1000; // 60 seconds — data is considered fresh for 1 min

var DataContext = createContext(null);

export function useData() {
  return useContext(DataContext);
}

export function DataProvider({ children }) {
  var cache = useRef({});         // { [key]: { data, timestamp } }
  var inflight = useRef({});      // { [key]: Promise } — prevents duplicate fetches

  // Shared state for most-used endpoints
  var [marketOverview, setMarketOverview]   = useState(null);
  var [indices, setIndices]                 = useState(null);
  var [news, setNews]                       = useState(null);
  var [niftyOptions, setNiftyOptions]       = useState(null);
  var [bniftyOptions, setBniftyOptions]     = useState(null);
  var [loading, setLoading]                 = useState({});

  function setLoadingKey(key, val) {
    setLoading(function(prev) {
      var next = Object.assign({}, prev);
      next[key] = val;
      return next;
    });
  }

  // Core fetch with cache
  async function cachedFetch(key, url) {
    var now = Date.now();
    var hit = cache.current[key];
    if (hit && now - hit.timestamp < CACHE_TTL) {
      return hit.data;
    }
    // Prevent duplicate simultaneous fetches
    if (inflight.current[key]) {
      return inflight.current[key];
    }
    var promise = fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        cache.current[key] = { data: data, timestamp: Date.now() };
        delete inflight.current[key];
        return data;
      })
      .catch(function(err) {
        delete inflight.current[key];
        throw err;
      });
    inflight.current[key] = promise;
    return promise;
  }

  // Invalidate a cache key (force refetch next time)
  function invalidate(key) {
    delete cache.current[key];
  }

  // ── Pre-fetch commonly used data on app load ──
  useEffect(function() {
    fetchMarketOverview();
    fetchIndices();
    fetchNews();
  }, []);

  async function fetchMarketOverview() {
    setLoadingKey('marketOverview', true);
    try {
      var data = await cachedFetch('marketOverview', API + '/api/market-overview');
      setMarketOverview(data);
    } catch(e) { console.error('[DataContext] marketOverview:', e); }
    setLoadingKey('marketOverview', false);
  }

  async function fetchIndices() {
    setLoadingKey('indices', true);
    try {
      var data = await cachedFetch('indices', API + '/api/indices');
      setIndices(data);
    } catch(e) { console.error('[DataContext] indices:', e); }
    setLoadingKey('indices', false);
  }

  async function fetchNews() {
    setLoadingKey('news', true);
    try {
      var data = await cachedFetch('news', API + '/api/news');
      setNews(data);
    } catch(e) { console.error('[DataContext] news:', e); }
    setLoadingKey('news', false);
  }

  async function fetchOptions(symbol) {
    var key = 'options_' + symbol;
    setLoadingKey(key, true);
    try {
      var data = await cachedFetch(key, API + '/api/options?symbol=' + symbol);
      if (symbol === 'NIFTY')     setNiftyOptions(data);
      if (symbol === 'BANKNIFTY') setBniftyOptions(data);
    } catch(e) { console.error('[DataContext] options ' + symbol + ':', e); }
    setLoadingKey(key, false);
  }

  // Generic fetch — any page can use this with automatic caching
  async function get(key, url) {
    return cachedFetch(key, url);
  }

  return (
    <DataContext.Provider value={{
      // Pre-fetched shared data
      marketOverview,
      indices,
      news,
      niftyOptions,
      bniftyOptions,
      loading,

      // Actions
      fetchMarketOverview,
      fetchIndices,
      fetchNews,
      fetchOptions,
      invalidate,

      // Generic cached fetch for any endpoint
      get,

      // Raw API base URL
      API,
    }}>
      {children}
    </DataContext.Provider>
  );
}
