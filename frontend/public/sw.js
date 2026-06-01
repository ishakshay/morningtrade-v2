var CACHE = 'mt-api-v1';
var API = 'https://api.morningtrade.in';
var TTL = 180000;

self.addEventListener('install', function(e) { self.skipWaiting(); });
self.addEventListener('activate', function(e) { e.waitUntil(clients.claim()); });

self.addEventListener('fetch', function(e) {
  var url = e.request.url;
  if (!url.startsWith(API)) return;
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.open(CACHE).then(async function(cache) {
      var cached = await cache.match(e.request);
      var now = Date.now();

      if (cached) {
        var cachedTime = parseInt(cached.headers.get('sw-cached-at') || '0');
        if (now - cachedTime < TTL) {
          fetch(e.request).then(function(fresh) {
            if (fresh.ok) {
              var headers = new Headers(fresh.headers);
              headers.set('sw-cached-at', now.toString());
              cache.put(e.request, new Response(fresh.clone().body, { headers }));
            }
          }).catch(function() {});
          return cached;
        }
      }

      try {
        var response = await fetch(e.request);
        if (response.ok) {
          var headers = new Headers(response.headers);
          headers.set('sw-cached-at', now.toString());
          cache.put(e.request, new Response(response.clone().body, { headers }));
        }
        return response;
      } catch(err) {
        if (cached) return cached;
        throw err;
      }
    })
  );
});

self.addEventListener('message', function(e) {
  if (e.data === 'preload') {
    var urls = [
      API + '/api/snapshot',
      API + '/api/market-overview',
      API + '/api/indices',
      API + '/api/options?symbol=NIFTY',
      API + '/api/options?symbol=BANKNIFTY',
    ];
    caches.open(CACHE).then(function(cache) {
      var now = Date.now();
      urls.forEach(function(url) {
        fetch(url).then(function(r) {
          if (r.ok) {
            var headers = new Headers(r.headers);
            headers.set('sw-cached-at', now.toString());
            cache.put(url, new Response(r.clone().body, { headers }));
          }
        }).catch(function() {});
      });
    });
  }
});
