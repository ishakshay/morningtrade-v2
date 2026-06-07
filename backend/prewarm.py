#!/usr/bin/env python3
"""Pre-warm NSE cache before Gunicorn starts serving requests."""
import sys
import os
sys.path.insert(0, '/home/ubuntu/morningtrade/backend')
os.chdir('/home/ubuntu/morningtrade/backend')

from venv import create
print("[prewarm] Starting cache pre-warm...")

try:
    from screeners.nse_options import fetch_option_chain as fetch_options
    for sym in ['NIFTY', 'BANKNIFTY']:
        try:
            result = fetch_options(sym)
            if result:
                print(f"[prewarm] {sym} OK - spot:{result.get('spot_price', '?')}")
            else:
                print(f"[prewarm] {sym} empty response")
        except Exception as e:
            print(f"[prewarm] {sym} error: {e}")
except Exception as e:
    print(f"[prewarm] import error: {e}")

print("[prewarm] Done")
