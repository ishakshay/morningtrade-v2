import threading

screener_data = {}
stocks_data   = {}
indices_data  = []
lock = threading.Lock()
connected_clients = set()

def update(country, new_data):
    with lock:
        screener_data[country] = new_data

def get(country=None):
    with lock:
        if country:
            return dict(screener_data.get(country, {}))
        return dict(screener_data)

def update_stocks(country, new_stocks):
    with lock:
        stocks_data[country] = new_stocks

def get_stocks(country=None):
    with lock:
        if country:
            return list(stocks_data.get(country, []))
        return dict(stocks_data)

def update_indices(new_indices):
    global indices_data
    with lock:
        indices_data = new_indices

def get_indices():
    with lock:
        return list(indices_data)

def add_client(ws):
    connected_clients.add(ws)

def remove_client(ws):
    connected_clients.discard(ws)

def broadcast(payload):
    dead = set()
    for client in connected_clients.copy():
        try:
            client.send(payload)
        except Exception:
            dead.add(client)
    connected_clients.difference_update(dead)