"""키움 WebSocket 실시간 시세"""
import json
import threading
import time
import websocket
from kiwoom_api import get_token
from config import KIWOOM_WS_URL

_ws: websocket.WebSocketApp | None = None
_subscribed: set[str] = set()
_callbacks: list = []
_thread: threading.Thread | None = None
_running = False


def on_realtime_price(callback):
    """실시간 체결가 콜백 등록 — callback(stock_code, price, change_rate, volume)"""
    _callbacks.append(callback)


def _on_message(ws, message):
    try:
        msg = json.loads(message)

        if msg.get('trnm') == 'REAL' and msg.get('data'):
            for item in msg['data']:
                if item.get('type') == '0B' and item.get('values'):
                    stock_code = item['item']
                    price = abs(int(item['values'].get('10', 0)))
                    change_rate = float(item['values'].get('12', 0))
                    volume = abs(int(item['values'].get('15', 0)))

                    if price > 0:
                        for cb in _callbacks:
                            try:
                                cb(stock_code, price, change_rate, volume)
                            except Exception as e:
                                print(f'❌ 실시간 콜백 에러: {e}')

        if msg.get('trnm') in ('REG', 'REMOVE'):
            code = msg.get('return_code', -1)
            if code == 0:
                print(f"📡 실시간 {msg['trnm']}: 성공")
            else:
                print(f"❌ 실시간 {msg['trnm']} 실패: {msg.get('return_msg')}")
    except Exception:
        pass


def _on_open(ws):
    print('🔌 키움 WebSocket 연결 성공')
    if _subscribed:
        _register_stocks(list(_subscribed))


def _on_close(ws, close_status_code, close_msg):
    print('🔌 키움 WebSocket 연결 종료')
    if _running:
        time.sleep(5)
        _connect()


def _on_error(ws, error):
    print(f'❌ 키움 WebSocket 에러: {error}')


def _register_stocks(stock_codes: list[str]):
    global _ws
    if not _ws:
        return
    msg = {
        'trnm': 'REG',
        'grp_no': '1',
        'refresh': '1',
        'data': [{'item': stock_codes, 'type': ['0B']}],
    }
    _ws.send(json.dumps(msg))
    print(f'📡 실시간 종목 등록: {", ".join(stock_codes)}')


def _unregister_stocks(stock_codes: list[str]):
    global _ws
    if not _ws:
        return
    msg = {
        'trnm': 'REMOVE',
        'grp_no': '1',
        'refresh': '0',
        'data': [{'item': stock_codes, 'type': ['0B']}],
    }
    _ws.send(json.dumps(msg))


def _connect():
    global _ws
    try:
        token = get_token()
        _ws = websocket.WebSocketApp(
            KIWOOM_WS_URL,
            header={
                'api-id': '0B',
                'authorization': f'Bearer {token}',
                'Content-Type': 'application/json;charset=UTF-8',
            },
            on_open=_on_open,
            on_message=_on_message,
            on_close=_on_close,
            on_error=_on_error,
        )
        _ws.run_forever()
    except Exception as e:
        print(f'❌ WebSocket 연결 실패: {e}')
        if _running:
            time.sleep(5)
            _connect()


def subscribe_stocks(stock_codes: list[str]):
    """보유 종목 실시간 구독"""
    new_codes = [c for c in stock_codes if c not in _subscribed]
    removed = [c for c in _subscribed if c not in stock_codes]

    if new_codes:
        _subscribed.update(new_codes)
        _register_stocks(new_codes)

    if removed:
        _subscribed.difference_update(removed)
        _unregister_stocks(removed)


def start():
    """WebSocket 시작 (별도 스레드)"""
    global _running, _thread
    _running = True
    _thread = threading.Thread(target=_connect, daemon=True)
    _thread.start()
    print('🔌 키움 WebSocket 실시간 시세 시작')


def stop():
    """WebSocket 중지"""
    global _running, _ws
    _running = False
    if _ws:
        _ws.close()
        _ws = None
    _subscribed.clear()
    print('🔌 키움 WebSocket 중지')
