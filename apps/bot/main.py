"""teburn 자동매매 봇 (Python)
Usage: python main.py
"""
import time
import math
from datetime import datetime, timezone, timedelta

from config import STRATEGY, SCAN_INTERVAL_SEC, KIWOOM_APP_KEY
import db
import kiwoom_api
import kiwoom_ws
from strategy import check_buy_signal, check_sell_signal, check_pullback_signal

KST = timezone(timedelta(hours=9))


def now_kst() -> datetime:
    return datetime.now(KST)


def time_minutes() -> int:
    t = now_kst()
    return t.hour * 60 + t.minute


def is_market_open() -> bool:
    t = now_kst()
    if t.weekday() >= 5:  # 주말
        return False
    minutes = t.hour * 60 + t.minute
    return 9 * 60 <= minutes < 15 * 60 + 20  # 09:00 ~ 15:20


def is_trade_time() -> bool:
    minutes = time_minutes()
    start = STRATEGY['TRADE_START_HOUR'] * 60 + STRATEGY['TRADE_START_MINUTE']
    return is_market_open() and minutes >= start


def sync_balance():
    """키움 실잔고 동기화"""
    try:
        balance = kiwoom_api.get_account_balance()
        cash = kiwoom_api.get_cash_balance()
        db.sync_with_kiwoom(balance, cash)
        if cash is not None:
            print(f'🔄 잔고 동기화 — 현금: {cash:,}원')
    except Exception as e:
        print(f'❌ 잔고 동기화 실패: {e}')


def handle_realtime_price(stock_code: str, price: int, change_rate: float, volume: int):
    """WebSocket 실시간 체결가 → 즉시 손절/익절"""
    account = db.get_today_account()
    positions = account.get('positions', [])
    position = next((p for p in positions if p.get('stockCode') == stock_code), None)
    if not position:
        return

    daily_pnl = account.get('dailyPnl', 0)
    sell_reason = check_sell_signal(position, price, daily_pnl, time_minutes())
    if not sell_reason:
        return

    avg_price = position.get('avgBuyPrice', 0)
    pnl_rate = ((price - avg_price) / avg_price) * 100 if avg_price else 0
    stock_name = position.get('stockName', stock_code)

    print(f'⚡ 실시간 매도 신호: {stock_name} @ {price:,}원 ({pnl_rate:+.2f}%, {sell_reason})')

    result = kiwoom_api.place_sell_order(stock_code, position['quantity'])
    if result['success']:
        amount = price * position['quantity']
        db.record_sell(
            stock_code=stock_code,
            stock_name=stock_name,
            filled_price=price,
            quantity=position['quantity'],
            fee=round(amount * STRATEGY['FEE_RATE']),
            tax=round(amount * STRATEGY['TAX_RATE']),
            sell_reason=sell_reason,
            buy_trade_id=position.get('buyTradeId'),
            avg_buy_price=avg_price,
            order_id=result.get('order_id'),
        )
        # 구독 종목 갱신
        updated = db.get_today_account()
        codes = [p['stockCode'] for p in updated.get('positions', [])]
        kiwoom_ws.subscribe_stocks(codes)
    else:
        print(f'❌ 실시간 매도 실패: {stock_name} — {result["message"]}')


def scan_buy_signals():
    """매수 신호 스캔 (1분마다)"""
    if not is_trade_time():
        return

    account = db.get_today_account()

    # 이미 포지션 보유 중이면 스킵 (100% 집중)
    if account.get('positions', []):
        return

    # 일일 손실 한도
    if account.get('dailyPnl', 0) <= STRATEGY['DAILY_LOSS_LIMIT']:
        return

    cash = account.get('cash', 0)
    if cash < 100_000:
        return

    # === 전략 1: 모멘텀 브레이크아웃 (Hotness 기반) ===
    hot_stocks = db.get_hotness_data()
    if hot_stocks:
        for stock in hot_stocks:
            result = check_buy_signal(stock)
            if not result['signal']:
                continue

            if _execute_buy(stock.get('stockCode', ''), stock.get('stockName', ''),
                            stock.get('currentPrice', 0), cash, result, 'momentum'):
                return  # 매수 성공하면 종료

    # === 전략 2: 눌림목 반등 (최근 강했던 종목이 눌렸을 때) ===
    leaders = db.get_recent_leaders(days=5)
    for leader in leaders[:10]:  # 상위 10종목만 체크
        result = check_pullback_signal(leader)
        if not result['signal']:
            continue

        if _execute_buy(leader.get('stockCode', ''), leader.get('stockName', ''),
                        result.get('current_price', 0), cash, result, 'pullback'):
            return


def _execute_buy(stock_code: str, stock_name: str, current_price: int,
                 cash: int, result: dict, strategy_name: str) -> bool:
    """매수 실행 공통 함수. 성공하면 True."""
    if not stock_code or current_price <= 0:
        return False

    quantity = math.floor(cash / current_price)
    if quantity <= 0:
        return False

    strategy_label = '🔥 모멘텀' if strategy_name == 'momentum' else '📉 눌림목 반등'
    print(f'🔔 [{strategy_label}] {stock_name} (점수: {result["score"]}, {", ".join(result["reasons"][:3])})')

    buy_result = kiwoom_api.place_buy_order(stock_code, quantity)
    if buy_result['success']:
        price_info = kiwoom_api.get_stock_price(stock_code)
        filled_price = price_info['current_price'] if price_info else current_price
        amount = filled_price * quantity

        db.record_buy(
            stock_code=stock_code,
            stock_name=stock_name,
            filled_price=filled_price,
            quantity=quantity,
            fee=round(amount * STRATEGY['FEE_RATE']),
            order_id=buy_result.get('order_id'),
            signal={
                'strategy': strategy_name,
                'techScore': result['score'],
                'techReasons': result['reasons'],
            },
        )

        kiwoom_ws.subscribe_stocks([stock_code])
        return True
    else:
        print(f'❌ 매수 실패: {stock_name} — {buy_result["message"]}')
        return False


def main():
    print('=' * 50)
    print('🤖 teburn 자동매매 봇 (Python)')
    print(f'  전략: Hotness S/A + 기술적 지표 (RSI, MA, BB)')
    print(f'  손절: {STRATEGY["STOP_LOSS_RATE"]}% | 익절: +{STRATEGY["TAKE_PROFIT_RATE"]}%')
    print(f'  매매 시간: {STRATEGY["TRADE_START_HOUR"]}:{STRATEGY["TRADE_START_MINUTE"]:02d} ~ {STRATEGY["TIME_EXIT_HOUR"]}:{STRATEGY["TIME_EXIT_MINUTE"]:02d}')
    print(f'  스캔 주기: {SCAN_INTERVAL_SEC}초')
    print('=' * 50)

    if not KIWOOM_APP_KEY:
        print('❌ KIWOOM_APP_KEY 미설정. .env 확인 필요.')
        return

    # Outbound IP 확인 (키움 IP 등록용)
    try:
        import requests as _req
        ip = _req.get('https://api.ipify.org', timeout=5).text
        print(f'🌐 봇 Outbound IP: {ip}')
    except Exception:
        pass

    # MongoDB 연결
    db.connect()

    # 토큰 발급 테스트
    try:
        kiwoom_api.get_token()
    except Exception as e:
        print(f'⚠️ 토큰 발급 실패 — 키움 IP 등록 확인 필요: {e}')
        print('  위에 표시된 IP를 키움 openapi.kiwoom.com에서 등록하세요.')
        print('  등록 후 재배포하면 정상 동작합니다.')
        print('  장 외 시간에는 토큰 발급이 안 될 수 있습니다. 대기합니다...')
        # 크래시하지 않고 대기 (장 시작 시 재시도)

    # WebSocket 실시간 시세 시작
    kiwoom_ws.on_realtime_price(handle_realtime_price)
    kiwoom_ws.start()

    # 기존 보유 종목이 있으면 구독
    account = db.get_today_account()
    codes = [p['stockCode'] for p in account.get('positions', [])]
    if codes:
        time.sleep(2)  # WebSocket 연결 대기
        kiwoom_ws.subscribe_stocks(codes)

    print('🏁 봇 루프 시작...')

    try:
        last_sync = 0
        while True:
            now = time.time()

            if is_market_open():
                # 5분마다 잔고 동기화
                if now - last_sync > 300:
                    sync_balance()
                    last_sync = now

                # 매수 신호 스캔
                scan_buy_signals()
            else:
                t = now_kst()
                if t.second < 2:  # 장 외 시간에는 1분마다 상태 출력
                    print(f'⏸ 장 외 시간 ({t.strftime("%H:%M")})')

            time.sleep(SCAN_INTERVAL_SEC)

    except KeyboardInterrupt:
        print('\n🛑 봇 종료 (Ctrl+C)')
    finally:
        kiwoom_ws.stop()


if __name__ == '__main__':
    main()
