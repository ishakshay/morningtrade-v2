var BASE = process.env.REACT_APP_API_URL || 'https://api.morningtrade.in';
var TTL = 60000;

function getCached(key) {
  try {
    var ts = parseInt(sessionStorage.getItem(key + '_ts') || '0');
    if (Date.now() - ts < TTL) {
      var val = sessionStorage.getItem(key);
      if (val) return JSON.parse(val);
    }
  } catch(e) {}
  return null;
}

function setCached(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
    sessionStorage.setItem(key + '_ts', Date.now().toString());
  } catch(e) {}
}

var inflight = {};

export function apiFetch(path) {
  var key = 'mt_' + path.replace(/[^a-z0-9]/gi, '_');
  var cached = getCached(key);
  if (cached) return Promise.resolve(cached);
  if (inflight[key]) return inflight[key];
  var promise = fetch(BASE + path)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      setCached(key, data);
      delete inflight[key];
      return data;
    })
    .catch(function(e) {
      delete inflight[key];
      throw e;
    });
  inflight[key] = promise;
  return promise;
}

export default BASE;
