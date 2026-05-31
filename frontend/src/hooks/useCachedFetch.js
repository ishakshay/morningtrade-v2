import { useState, useEffect, useRef } from 'react';

var DEFAULT_TTL = 60000;

export default function useCachedFetch(key, url, options) {
  var ttl = (options && options.ttl) || DEFAULT_TTL;
  var skip = (options && options.skip) || false;

  var [data, setData] = useState(function() {
    try {
      var ts = parseInt(sessionStorage.getItem(key + '_ts') || '0');
      if (Date.now() - ts < ttl) {
        var cached = sessionStorage.getItem(key);
        if (cached) return JSON.parse(cached);
      }
    } catch(e) {}
    return null;
  });

  var [loading, setLoading] = useState(!data);
  var [error, setError]     = useState(null);
  var urlRef                = useRef(url);
  urlRef.current            = url;

  useEffect(function() {
    if (skip || !url) return;
    try {
      var ts = parseInt(sessionStorage.getItem(key + '_ts') || '0');
      if (Date.now() - ts < ttl) {
        var cached = sessionStorage.getItem(key);
        if (cached) {
          setData(JSON.parse(cached));
          setLoading(false);
          return;
        }
      }
    } catch(e) {}
    setLoading(true);
    fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        setData(d);
        setLoading(false);
        setError(null);
        try {
          sessionStorage.setItem(key, JSON.stringify(d));
          sessionStorage.setItem(key + '_ts', Date.now().toString());
        } catch(e) {}
      })
      .catch(function(e) {
        setError(e.message);
        setLoading(false);
      });
  }, [key, url, ttl, skip]);

  function refetch() {
    try {
      sessionStorage.removeItem(key);
      sessionStorage.removeItem(key + '_ts');
    } catch(e) {}
    setLoading(true);
    fetch(urlRef.current)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        setData(d);
        setLoading(false);
        try {
          sessionStorage.setItem(key, JSON.stringify(d));
          sessionStorage.setItem(key + '_ts', Date.now().toString());
        } catch(e) {}
      })
      .catch(function(e) {
        setError(e.message);
        setLoading(false);
      });
  }

  return { data: data, loading: loading, error: error, refetch: refetch };
}
