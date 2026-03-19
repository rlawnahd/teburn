"""키움 REST API 클라이언트"""
import time
import requests
from datetime import datetime
from config import KIWOOM_APP_KEY, KIWOOM_SECRET_KEY, KIWOOM_BASE_URL

_token: str | None = None
_token_expire: float = 0
_token_lock = False


def get_token() -> str:
    """OAuth 접근토큰 발급 (au10001)"""
    global _token, _token_expire, _token_lock

    if _token and time.time() < _token_expire - 60:
        return _token

    if _token_lock:
        while _token_lock:
            time.sleep(0.1)
        return _token  # type: ignore

    _token_lock = True
    try:
        resp = requests.post(
            f'{KIWOOM_BASE_URL}/oauth2/token',
            json={
                'grant_type': 'client_credentials',
                'appkey': KIWOOM_APP_KEY,
                'secretkey': KIWOOM_SECRET_KEY,
            },
            headers={
                'Content-Type': 'application/json;charset=UTF-8',
                'api-id': 'au10001',
            },
            timeout=10,
        )
        data = resp.json()
        if data.get('return_code') != 0:
            raise Exception(f"토큰 발급 실패: {data.get('return_msg')}")

        _token = data['token']
        # expires_dt: "20241107083713"
        if data.get('expires_dt'):
            dt = data['expires_dt']
            _token_expire = datetime.strptime(dt, '%Y%m%d%H%M%S').timestamp()
        else:
            _token_expire = time.time() + 23 * 3600

        print(f'✅ 키움 토큰 발급 완료')
        return _token  # type: ignore
    finally:
        _token_lock = False


def _headers(api_id: str) -> dict:
    token = get_token()
    return {
        'Content-Type': 'application/json;charset=UTF-8',
        'api-id': api_id,
        'authorization': f'Bearer {token}',
    }


def get_stock_price(stock_code: str) -> dict | None:
    """주식기본정보요청 (ka10001) — 현재가 포함"""
    try:
        resp = requests.post(
            f'{KIWOOM_BASE_URL}/api/dostk/stkinfo',
            json={'stk_cd': stock_code},
            headers=_headers('ka10001'),
            timeout=10,
        )
        data = resp.json()
        if data.get('return_code') != 0:
            return None
        return {
            'stock_code': stock_code,
            'stock_name': data.get('stk_nm', ''),
            'current_price': abs(int(data.get('cur_prc', 0))),
            'change_rate': float(data.get('flu_rt', 0)),
            'volume': abs(int(data.get('trde_qty', 0))),
            'high': abs(int(data.get('high_pric', 0))),
            'low': abs(int(data.get('low_pric', 0))),
            'open': abs(int(data.get('open_pric', 0))),
        }
    except Exception as e:
        print(f'❌ 현재가 조회 실패 ({stock_code}): {e}')
        return None


def get_minute_candles(stock_code: str) -> list[dict] | None:
    """주식시분요청 (ka10006) — 분봉 데이터 (기술적 지표 계산용)"""
    try:
        resp = requests.post(
            f'{KIWOOM_BASE_URL}/api/dostk/stkinfo',
            json={'stk_cd': stock_code},
            headers=_headers('ka10006'),
            timeout=10,
        )
        data = resp.json()
        if data.get('return_code') != 0:
            return None
        # 시분 데이터 리스트 반환
        candles = data.get('stk_dt_pole', [])
        return candles
    except Exception as e:
        print(f'❌ 분봉 조회 실패 ({stock_code}): {e}')
        return None


def get_daily_candles(stock_code: str) -> list[dict] | None:
    """주식일주월시분요청 (ka10005) — 일봉 데이터"""
    try:
        resp = requests.post(
            f'{KIWOOM_BASE_URL}/api/dostk/stkinfo',
            json={'stk_cd': stock_code, 'period_tp': 'D'},
            headers=_headers('ka10005'),
            timeout=10,
        )
        data = resp.json()
        if data.get('return_code') != 0:
            return None
        candles = data.get('stk_dt_pole', [])
        return candles
    except Exception as e:
        print(f'❌ 일봉 조회 실패 ({stock_code}): {e}')
        return None


def place_buy_order(stock_code: str, quantity: int) -> dict:
    """주식 매수주문 (kt10000) — 시장가"""
    try:
        resp = requests.post(
            f'{KIWOOM_BASE_URL}/api/dostk/ordr',
            json={
                'dmst_stex_tp': 'KRX',
                'stk_cd': stock_code,
                'ord_qty': str(quantity),
                'ord_uv': '',
                'trde_tp': '3',  # 시장가
                'cond_uv': '',
            },
            headers=_headers('kt10000'),
            timeout=10,
        )
        data = resp.json()
        return {
            'success': data.get('return_code') == 0,
            'order_id': data.get('ord_no'),
            'message': data.get('return_msg', ''),
        }
    except Exception as e:
        print(f'❌ 매수 주문 실패: {e}')
        return {'success': False, 'order_id': None, 'message': str(e)}


def place_sell_order(stock_code: str, quantity: int) -> dict:
    """주식 매도주문 (kt10001) — 시장가"""
    try:
        resp = requests.post(
            f'{KIWOOM_BASE_URL}/api/dostk/ordr',
            json={
                'dmst_stex_tp': 'KRX',
                'stk_cd': stock_code,
                'ord_qty': str(quantity),
                'ord_uv': '',
                'trde_tp': '3',
                'cond_uv': '',
            },
            headers=_headers('kt10001'),
            timeout=10,
        )
        data = resp.json()
        return {
            'success': data.get('return_code') == 0,
            'order_id': data.get('ord_no'),
            'message': data.get('return_msg', ''),
        }
    except Exception as e:
        print(f'❌ 매도 주문 실패: {e}')
        return {'success': False, 'order_id': None, 'message': str(e)}


def get_account_balance() -> dict | None:
    """계좌평가잔고내역 (kt00018)"""
    try:
        resp = requests.post(
            f'{KIWOOM_BASE_URL}/api/dostk/acnt',
            json={'qry_tp': '1', 'dmst_stex_tp': 'KRX'},
            headers=_headers('kt00018'),
            timeout=10,
        )
        data = resp.json()
        if data.get('return_code') != 0:
            return None

        positions = []
        for item in data.get('acnt_evlt_remn_indv_tot', []):
            qty = int(item.get('rmnd_qty', 0))
            if qty > 0:
                positions.append({
                    'stock_code': item.get('stk_cd', '').replace('A', ''),
                    'stock_name': item.get('stk_nm', ''),
                    'quantity': qty,
                    'avg_buy_price': int(item.get('pur_pric', 0)),
                    'current_price': int(item.get('cur_prc', 0)),
                    'pnl': int(item.get('evltv_prft', 0)),
                    'pnl_rate': float(item.get('prft_rt', 0)),
                })

        return {
            'total_eval': int(data.get('tot_evlt_amt', 0)),
            'total_pnl': int(data.get('tot_evlt_pl', 0)),
            'total_pnl_rate': float(data.get('tot_prft_rt', 0)),
            'estimated_asset': int(data.get('prsm_dpst_aset_amt', 0)),
            'positions': positions,
        }
    except Exception as e:
        print(f'❌ 잔고 조회 실패: {e}')
        return None


def get_cash_balance() -> int | None:
    """예수금 상세 (kt00001)"""
    try:
        resp = requests.post(
            f'{KIWOOM_BASE_URL}/api/dostk/acnt',
            json={'qry_tp': '3'},
            headers=_headers('kt00001'),
            timeout=10,
        )
        data = resp.json()
        if data.get('return_code') != 0:
            return None
        return int(data.get('entr', 0))
    except Exception as e:
        print(f'❌ 예수금 조회 실패: {e}')
        return None
