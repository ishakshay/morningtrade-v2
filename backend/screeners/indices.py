import yfinance as yf

SCREENER_ID = 'indices'

INDICES = [
    {'symbol': '^GSPC',    'name': 'S&P 500',       'region': 'US'    },
    {'symbol': '^NDX',     'name': 'NASDAQ 100',     'region': 'US'    },
    {'symbol': '^DJI',     'name': 'Dow Jones',      'region': 'US'    },
    {'symbol': '^RUT',     'name': 'Russell 2000',   'region': 'US'    },
    {'symbol': '^GDAXI',   'name': 'DAX',            'region': 'DE'    },
    {'symbol': '^FTSE',    'name': 'FTSE 100',       'region': 'UK'    },
    {'symbol': '^FCHI',    'name': 'CAC 40',         'region': 'FR'    },
    {'symbol': '^AEX',     'name': 'AEX',            'region': 'NL'    },
    {'symbol': '^STOXX50E','name': 'Euro Stoxx 50',  'region': 'EU'    },
    {'symbol': 'WIG20.WA', 'name': 'WIG20',          'region': 'PL'    },
    {'symbol': '^NSEI',    'name': 'NIFTY 50',       'region': 'IN'    },
    {'symbol': '^BSESN',   'name': 'Sensex',         'region': 'IN'    },
    {'symbol': '^N225',    'name': 'Nikkei 225',     'region': 'JP'    },
    {'symbol': '^HSI',     'name': 'Hang Seng',      'region': 'HK'    },
    {'symbol': '000001.SS','name': 'Shanghai',       'region': 'CN'    },
    {'symbol': '^AXJO',    'name': 'ASX 200',        'region': 'AU'    },
    {'symbol': 'BTC-USD',  'name': 'BTC/USD',        'region': 'CRYPTO'},
    {'symbol': 'GC=F',     'name': 'Gold',           'region': 'CMD'   },
    {'symbol': 'CL=F',     'name': 'Oil (WTI)',      'region': 'CMD'   },
]

def run(country='PL'):
    results = []
    for idx in INDICES:
        try:
            ticker = yf.Ticker(idx['symbol'])
            hist   = ticker.history(period='2d', interval='1d')
            if hist.empty or len(hist) < 2:
                continue
            close      = float(hist['Close'].iloc[-1])
            prev_close = float(hist['Close'].iloc[-2])
            change     = close - prev_close
            pct_change = (change / prev_close) * 100
            results.append({
                'symbol':         idx['symbol'],
                'name':           idx['name'],
                'region':         idx['region'],
                'price':          round(close, 2),
                'change':         round(change, 2),
                'percent_change': round(pct_change, 2),
            })
        except Exception as e:
            print(f"  [indices] error {idx['symbol']}: {e}")
    print(f"  [indices] {len(results)} indices loaded")
    return results