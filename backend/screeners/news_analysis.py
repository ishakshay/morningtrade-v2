import anthropic
import json
import os

client = anthropic.Anthropic(api_key=os.environ.get('ANTHROPIC_API_KEY', ''))

ANALYSIS_PROMPT = """You are a financial market analyst. Analyze this news headline and summary, then identify market impact.

Headline: {title}
Summary: {summary}
Source: {source}

Respond ONLY with a JSON object like this (no markdown, no explanation):
{{
  "sentiment": "Bullish" | "Bearish" | "Neutral",
  "impact_score": 1-10,
  "affected": [
    {{"type": "stock", "name": "RELIANCE", "exchange": "NSE", "direction": "up" | "down" | "neutral", "reason": "brief reason"}},
    {{"type": "sector", "name": "Banking", "direction": "up" | "down" | "neutral", "reason": "brief reason"}},
    {{"type": "commodity", "name": "Gold", "direction": "up" | "down" | "neutral", "reason": "brief reason"}},
    {{"type": "currency", "name": "INR/USD", "direction": "up" | "down" | "neutral", "reason": "brief reason"}},
    {{"type": "index", "name": "NIFTY", "direction": "up" | "down" | "neutral", "reason": "brief reason"}}
  ],
  "summary": "One sentence plain English summary of market impact"
}}

Only include affected items that are genuinely relevant. Keep reasons under 10 words each."""

_analysis_cache = {}

def analyze_news_item(item):
    uid = item['id']
    if uid in _analysis_cache:
        return _analysis_cache[uid]

    try:
        message = client.messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=500,
            messages=[{
                'role': 'user',
                'content': ANALYSIS_PROMPT.format(
                    title   = item.get('title', ''),
                    summary = item.get('summary', ''),
                    source  = item.get('source', ''),
                )
            }]
        )
        text   = message.content[0].text.strip()
        result = json.loads(text)
        _analysis_cache[uid] = result
        return result
    except Exception as e:
        print(f"  [news_analysis] error: {e}")
        return None

def analyze_batch(items, max_items=10):
    results = {}
    count   = 0
    for item in items:
        if count >= max_items:
            break
        if item['id'] in _analysis_cache:
            results[item['id']] = _analysis_cache[item['id']]
            continue
        result = analyze_news_item(item)
        if result:
            results[item['id']] = result
            count += 1
    return results