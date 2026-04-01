import feedparser
import re
from datetime import datetime, timezone, timedelta
import hashlib

FEEDS = [
    # Indian Markets — verified fresh
    { 'url': 'https://www.livemint.com/rss/markets',               'source': 'LiveMint',    'region': 'IN'     },
    { 'url': 'https://www.livemint.com/rss/news',                  'source': 'LiveMint',    'region': 'IN'     },
    { 'url': 'https://feeds.feedburner.com/ndtvprofit-latest',     'source': 'NDTV Profit', 'region': 'IN'     },
    # Global Markets — verified fresh
    { 'url': 'https://www.cnbc.com/id/100003114/device/rss/rss.html',                'source': 'CNBC',          'region': 'GLOBAL' },
    { 'url': 'https://www.cnbc.com/id/10000664/device/rss/rss.html',                 'source': 'CNBC',          'region': 'GLOBAL' },
    { 'url': 'https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines',    'source': 'MarketWatch',   'region': 'GLOBAL' },
    { 'url': 'https://www.investing.com/rss/news.rss',                               'source': 'Investing.com', 'region': 'GLOBAL' },
    { 'url': 'https://www.investing.com/rss/market_overview.rss',                    'source': 'Investing.com', 'region': 'GLOBAL' },
    # Reddit — Finance & Markets
    { 'url': 'https://www.reddit.com/r/IndiaInvestments/hot.rss?limit=15',           'source': 'r/IndiaInvest', 'region': 'IN'     },
    { 'url': 'https://www.reddit.com/r/stocks/hot.rss?limit=15',                     'source': 'r/stocks',      'region': 'GLOBAL' },
    { 'url': 'https://www.reddit.com/r/economics/hot.rss?limit=15',                  'source': 'r/economics',   'region': 'GLOBAL' },
    { 'url': 'https://www.reddit.com/r/investing/hot.rss?limit=15',                  'source': 'r/investing',   'region': 'GLOBAL' },
    { 'url': 'https://www.reddit.com/r/worldnews/search.rss?q=market+economy+fed+inflation&sort=new&limit=10', 'source': 'r/worldnews', 'region': 'GLOBAL' },
]

MAX_AGE_HOURS = 48

_seen_ids   = set()
_news_cache = []

def _clean(text):
    return re.sub(r'<[^>]+>', '', text or '').strip()

def _parse_date(entry):
    published = entry.get('published_parsed') or entry.get('updated_parsed')
    if published:
        try:
            dt  = datetime(*published[:6], tzinfo=timezone.utc)
            age = datetime.now(timezone.utc) - dt
            if age > timedelta(hours=MAX_AGE_HOURS):
                return None, None, None
            return dt, dt.strftime('%H:%M'), dt.strftime('%d %b')
        except:
            pass
    now = datetime.now(timezone.utc)
    return now, now.strftime('%H:%M'), now.strftime('%d %b')

def fetch_all_feeds():
    global _news_cache, _seen_ids
    new_items = []
    skipped   = 0

    for feed in FEEDS:
        try:
            # Reddit requires a User-Agent header
            if 'reddit.com' in feed['url']:
                parsed = feedparser.parse(feed['url'], request_headers={
                    'User-Agent': 'MorningTrade/1.0 (market data aggregator; contact@morningtrade.eu)'
                })
            else:
                parsed = feedparser.parse(feed['url'])
            if not parsed.entries:
                print(f"  [news] no entries: {feed['source']} {feed['url'].split('/')[-1]}")
                continue
            count = 0
            for entry in parsed.entries[:20]:
                title = _clean(entry.get('title', ''))
                url   = entry.get('link', '')
                if not title or not url:
                    continue

                uid = hashlib.md5((url + title).encode()).hexdigest()
                if uid in _seen_ids:
                    continue

                dt, time_str, date_str = _parse_date(entry)
                if dt is None:
                    skipped += 1
                    continue

                _seen_ids.add(uid)
                summary = _clean(entry.get('summary', '') or entry.get('description', ''))

                new_items.append({
                    'id':      uid,
                    'title':   title,
                    'summary': summary[:400],
                    'url':     url,
                    'source':  feed['source'],
                    'region':  feed['region'],
                    'time':    time_str,
                    'date':    date_str,
                    'symbol':  '',
                    'impact':  None,
                })
                count += 1
            print(f"  [news] {feed['source']}: {count} items")
        except Exception as e:
            print(f"  [news] error {feed['source']}: {e}")

    print(f"  [news] skipped {skipped} stale articles (>{MAX_AGE_HOURS}h)")
    existing_ids = {n['id'] for n in _news_cache}
    truly_new    = [i for i in new_items if i['id'] not in existing_ids]
    _news_cache  = (truly_new + _news_cache)[:200]
    print(f"  [news] {len(truly_new)} new items, {len(_news_cache)} total")
    return _news_cache

def get_cached_news():
    return _news_cache

def get_nse_announcements():
    return []