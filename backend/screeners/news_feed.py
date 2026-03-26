import feedparser
import requests
from datetime import datetime, timezone
import hashlib

FEEDS = [
    # Indian Markets
    { 'url': 'https://economictimes.indiatimes.com/markets/rss.cms',              'source': 'Economic Times',    'region': 'IN' },
    { 'url': 'https://www.moneycontrol.com/rss/marketsindia.xml',                 'source': 'Moneycontrol',      'region': 'IN' },
    { 'url': 'https://www.business-standard.com/rss/markets-106.rss',             'source': 'Business Standard', 'region': 'IN' },
    { 'url': 'https://www.livemint.com/rss/markets',                              'source': 'LiveMint',          'region': 'IN' },
    # Global Markets
    { 'url': 'https://feeds.bloomberg.com/markets/news.rss',                      'source': 'Bloomberg',         'region': 'GLOBAL' },
    { 'url': 'https://feeds.reuters.com/reuters/businessNews',                    'source': 'Reuters',           'region': 'GLOBAL' },
    { 'url': 'https://www.cnbc.com/id/100003114/device/rss/rss.html',            'source': 'CNBC',              'region': 'GLOBAL' },
    { 'url': 'https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines', 'source': 'MarketWatch',       'region': 'GLOBAL' },
]

_seen_ids  = set()
_news_cache = []

def fetch_all_feeds():
    global _news_cache
    items = []

    for feed in FEEDS:
        try:
            parsed = feedparser.parse(feed['url'])
            for entry in parsed.entries[:10]:
                uid = hashlib.md5((entry.get('link', '') + entry.get('title', '')).encode()).hexdigest()
                if uid in _seen_ids:
                    continue
                _seen_ids.add(uid)

                published = entry.get('published_parsed') or entry.get('updated_parsed')
                if published:
                    dt = datetime(*published[:6], tzinfo=timezone.utc)
                    time_str = dt.strftime('%H:%M')
                    date_str = dt.strftime('%d %b')
                else:
                    time_str = datetime.now().strftime('%H:%M')
                    date_str = datetime.now().strftime('%d %b')

                items.append({
                    'id':      uid,
                    'title':   entry.get('title', '').strip(),
                    'summary': entry.get('summary', '')[:300].strip(),
                    'url':     entry.get('link', ''),
                    'source':  feed['source'],
                    'region':  feed['region'],
                    'time':    time_str,
                    'date':    date_str,
                    'impact':  None,  # filled by analysis
                })
        except Exception as e:
            print(f"  [news] feed error {feed['source']}: {e}")

    # merge with cache, newest first, max 100
    existing_ids = {n['id'] for n in _news_cache}
    new_items    = [i for i in items if i['id'] not in existing_ids]
    _news_cache  = (new_items + _news_cache)[:100]

    print(f"  [news] {len(new_items)} new items, {len(_news_cache)} total")
    return _news_cache

def get_cached_news():
    return _news_cache

def get_nse_announcements():
    try:
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0',
            'Referer':    'https://www.nseindia.com/',
        })
        session.get('https://www.nseindia.com', timeout=10)
        r = session.get(
            'https://www.nseindia.com/api/corporate-announcements?index=equities',
            timeout=10
        )
        if r.status_code != 200:
            return []
        data  = r.json()
        items = []
        for a in data[:20]:
            uid = hashlib.md5((a.get('sm_isin', '') + a.get('an_dt', '')).encode()).hexdigest()
            items.append({
                'id':      uid,
                'title':   f"{a.get('symbol', '')} — {a.get('subject', '')}",
                'summary': a.get('desc', '')[:300],
                'url':     '',
                'source':  'NSE',
                'region':  'IN',
                'time':    a.get('an_dt', '')[-8:-3] if a.get('an_dt') else '',
                'date':    a.get('an_dt', '')[:10] if a.get('an_dt') else '',
                'symbol':  a.get('symbol', ''),
                'impact':  None,
            })
        return items
    except Exception as e:
        print(f"  [news] NSE announcements error: {e}")
        return []