import yfinance as yf
import pandas as pd
import math

SYMBOLS = {
    'PL': [
        'PKN.WA', 'PKO.WA', 'PZU.WA', 'KGH.WA', 'DNP.WA',
        'LPP.WA', 'ALE.WA', 'PEO.WA', 'MBK.WA', 'CDR.WA',
        'CPS.WA', 'JSW.WA', 'KRU.WA', 'OPL.WA', 'SPL.WA',
        'TPE.WA', 'XTB.WA', 'AMC.WA', 'BDX.WA', 'CCC.WA',
        'ENA.WA', 'GPW.WA', 'ING.WA', 'MIL.WA', 'PGE.WA',
        'PCO.WA', 'MRC.WA', 'VRG.WA',
    ],
    'DE': [
        'SAP.DE',  'SIE.DE',  'ALV.DE',  'MRK.DE',  'DTE.DE',
        'BAS.DE',  'BAYN.DE', 'BMW.DE',  'MBG.DE',  'VOW3.DE',
        'ADS.DE',  'AIR.DE',  'BEI.DE',  'CON.DE',  'DB1.DE',
        'DBK.DE',  'EOAN.DE', 'FRE.DE',  'HNR1.DE', 'IFX.DE',
        'LIN.DE',  'MTX.DE',  'MUV2.DE', 'PAH3.DE', 'RWE.DE',
        'SHL.DE',  'SY1.DE',  'VNA.DE',  'ZAL.DE',  'HEI.DE',
    ],
    'IN': [
        'RELIANCE.NS',   'TCS.NS',        'HDFCBANK.NS',   'BHARTIARTL.NS',
        'ICICIBANK.NS',  'INFOSYS.NS',    'SBIN.NS',       'HINDUNILVR.NS',
        'ITC.NS',        'LT.NS',         'KOTAKBANK.NS',  'HCLTECH.NS',
        'BAJFINANCE.NS', 'ASIANPAINT.NS', 'AXISBANK.NS',   'MARUTI.NS',
        'TITAN.NS',      'WIPRO.NS',      'NESTLEIND.NS',  'ULTRACEMCO.NS',
        'NTPC.NS',       'COALINDIA.NS',  'POWERGRID.NS',  'ONGC.NS',
        'BAJAJFINSV.NS', 'TATAMOTORS.NS', 'TATASTEEL.NS',  'ADANIENT.NS',
        'SUNPHARMA.NS',  'CIPLA.NS',      'DRREDDY.NS',    'DIVISLAB.NS',
        'EICHERMOT.NS',  'HEROMOTOCO.NS', 'BAJAJ-AUTO.NS', 'HINDALCO.NS',
        'JSWSTEEL.NS',   'TATACONSUM.NS', 'APOLLOHOSP.NS', 'LTIM.NS',
        'TECHM.NS',      'HDFCLIFE.NS',   'SBILIFE.NS',    'INDUSINDBK.NS',
        'SHRIRAMFIN.NS', 'BRITANNIA.NS',  'GRASIM.NS',     'BPCL.NS',
        'M&M.NS',        'ADANIPORTS.NS',
    ],
}

SECTORS = {
    'PL': {
        'Banking':    ['PKO.WA', 'PEO.WA', 'MBK.WA', 'SPL.WA', 'ING.WA', 'MIL.WA'],
        'Energy':     ['PKN.WA', 'PGE.WA', 'TPE.WA', 'ENA.WA'],
        'Mining':     ['KGH.WA', 'JSW.WA'],
        'Retail':     ['LPP.WA', 'CCC.WA', 'VRG.WA', 'DNP.WA'],
        'Tech':       ['CDR.WA', 'XTB.WA', 'GPW.WA'],
        'Telecom':    ['OPL.WA', 'CPS.WA'],
        'Industrial': ['AMC.WA', 'BDX.WA', 'KRU.WA', 'MRC.WA', 'PCO.WA', 'ALE.WA'],
        'Insurance':  ['PZU.WA'],
    },
    'DE': {
        'Technology':  ['SAP.DE', 'IFX.DE'],
        'Industrial':  ['SIE.DE', 'CON.DE', 'MTX.DE'],
        'Auto':        ['BMW.DE', 'MBG.DE', 'VOW3.DE', 'PAH3.DE'],
        'Chemicals':   ['BAS.DE', 'BAYN.DE', 'LIN.DE', 'MRK.DE'],
        'Finance':     ['ALV.DE', 'DBK.DE', 'DB1.DE', 'MUV2.DE'],
        'Consumer':    ['ADS.DE', 'BEI.DE', 'HEI.DE', 'FRE.DE'],
        'Telecom':     ['DTE.DE'],
        'Energy':      ['RWE.DE', 'EOAN.DE'],
        'Real Estate': ['VNA.DE'],
        'Retail':      ['ZAL.DE', 'HNR1.DE'],
        'Aerospace':   ['AIR.DE'],
        'Healthcare':  ['SHL.DE', 'SY1.DE'],
    },
    'IN': {
        'Banking':       ['HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS', 'KOTAKBANK.NS', 'AXISBANK.NS', 'INDUSINDBK.NS'],
        'IT':            ['TCS.NS', 'INFOSYS.NS', 'HCLTECH.NS', 'WIPRO.NS', 'LTIM.NS', 'TECHM.NS'],
        'Energy':        ['RELIANCE.NS', 'NTPC.NS', 'POWERGRID.NS', 'ONGC.NS', 'BPCL.NS'],
        'Auto':          ['MARUTI.NS', 'TATAMOTORS.NS', 'EICHERMOT.NS', 'HEROMOTOCO.NS', 'BAJAJ-AUTO.NS', 'M&M.NS'],
        'Finance':       ['BAJFINANCE.NS', 'BAJAJFINSV.NS', 'SHRIRAMFIN.NS', 'HDFCLIFE.NS', 'SBILIFE.NS'],
        'Consumer':      ['HINDUNILVR.NS', 'ITC.NS', 'NESTLEIND.NS', 'BRITANNIA.NS', 'TATACONSUM.NS'],
        'Pharma':        ['SUNPHARMA.NS', 'CIPLA.NS', 'DRREDDY.NS', 'DIVISLAB.NS', 'APOLLOHOSP.NS'],
        'Metals':        ['TATASTEEL.NS', 'HINDALCO.NS', 'JSWSTEEL.NS', 'COALINDIA.NS', 'ADANIENT.NS'],
        'Cement':        ['ULTRACEMCO.NS', 'GRASIM.NS', 'ASIANPAINT.NS'],
        'Infra':         ['LT.NS', 'ADANIPORTS.NS'],
        'Consumer Disc': ['TITAN.NS'],
    },
}

COUNTRY_LABELS = {
    'PL': 'Poland (WIG30)',
    'DE': 'Germany (DAX30)',
    'IN': 'India (Nifty 50)',
}

MARKET_HOURS_UTC = {
    'PL': {'open': 8,  'close': 16},
    'DE': {'open': 7,  'close': 17},
    'IN': {'open': 3,  'close': 10},
}

def get_symbols(country):
    return SYMBOLS.get(country, [])

def get_sectors(country):
    return SECTORS.get(country, {})

def safe_float(val, default=0):
    try:
        result = float(val)
        if math.isnan(result) or math.isinf(result):
            return default
        return result
    except:
        return default

def fetch_daily(symbol, period='30d'):
    try:
        ticker = yf.Ticker(symbol)
        hist   = ticker.history(period=period, interval='1d')
        info   = ticker.info
        if hist.empty:
            return None, None
        return hist, info
    except Exception as e:
        print(f"  [base] fetch_daily error {symbol}: {e}")
        return None, None

def fetch_intraday(symbol):
    try:
        ticker = yf.Ticker(symbol)
        df     = ticker.history(period='1d', interval='5m')
        if df.empty:
            return None
        today    = pd.Timestamp.now().date()
        df.index = pd.to_datetime(df.index)
        df       = df[df.index.date == today]
        return df if not df.empty else None
    except Exception as e:
        print(f"  [base] fetch_intraday error {symbol}: {e}")
        return None

def base_stock_info(symbol, hist, info):
    try:
        close      = safe_float(hist['Close'].iloc[-1])
        prev_close = safe_float(hist['Close'].iloc[-2])
        if prev_close == 0 or close == 0:
            return None
        pct_change = round(((close - prev_close) / prev_close) * 100, 2)
        avg_vol    = safe_float(hist['Volume'].tail(50).mean()) if len(hist) >= 50 else safe_float(hist['Volume'].mean())
        if '.WA' in symbol:
            default_currency = 'PLN'
        elif '.NS' in symbol:
            default_currency = 'INR'
        else:
            default_currency = 'EUR'
        currency = info.get('currency', default_currency)
        return {
            'symbol':         symbol,
            'name':           info.get('shortName', symbol),
            'price':          round(close, 2),
            'prev_close':     round(prev_close, 2),
            'percent_change': pct_change,
            'currency':       currency,
            'volume':         int(safe_float(hist['Volume'].iloc[-1])),
            'avg_volume_50':  int(avg_vol),
            'day_high':       round(safe_float(hist['High'].iloc[-1]), 2),
            'day_low':        round(safe_float(hist['Low'].iloc[-1]), 2),
        }
    except Exception as e:
        print(f"  [base] base_stock_info error {symbol}: {e}")
        return None