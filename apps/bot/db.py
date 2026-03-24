"""MongoDB 연동 — Node.js 서버와 같은 컬렉션 사용"""
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from config import MONGO_URI

KST = timezone(timedelta(hours=9))

_client: MongoClient | None = None
_db = None


def connect():
    global _client, _db
    _client = MongoClient(MONGO_URI)
    db_name = MONGO_URI.split('/')[-1].split('?')[0] if '/' in MONGO_URI else 'teburn'
    _db = _client[db_name]
    print(f'✅ MongoDB 연결: {db_name}')


def get_db():
    if _db is None:
        connect()
    return _db


def _today_key() -> str:
    return datetime.now(KST).strftime('%Y-%m-%d')


def get_today_account() -> dict:
    """오늘의 계좌 상태 조회 (없으면 생성)"""
    db = get_db()
    today = _today_key()

    account = db.tradingaccounts.find_one({'dateKey': today})
    if account:
        return account

    # 전일 계좌에서 이어받기
    yesterday = db.tradingaccounts.find_one(sort=[('dateKey', -1)])

    new_account = {
        'dateKey': today,
        'initialCapital': yesterday['initialCapital'] if yesterday else 1_000_000,
        'cash': yesterday['cash'] if yesterday else 1_000_000,
        'positions': yesterday.get('positions', []) if yesterday else [],
        'totalValue': yesterday['totalValue'] if yesterday else 1_000_000,
        'totalPnl': yesterday.get('totalPnl', 0) if yesterday else 0,
        'totalPnlRate': yesterday.get('totalPnlRate', 0) if yesterday else 0,
        'dailyPnl': 0,
        'todayTradeCount': 0,
        'winCount': yesterday.get('winCount', 0) if yesterday else 0,
        'loseCount': yesterday.get('loseCount', 0) if yesterday else 0,
        'createdAt': datetime.now(KST),
        'updatedAt': datetime.now(KST),
    }
    db.tradingaccounts.insert_one(new_account)
    return new_account


def record_buy(stock_code: str, stock_name: str, filled_price: int, quantity: int,
               fee: int, order_id: str | None, signal: dict) -> dict:
    """매수 기록 저장"""
    db = get_db()
    amount = filled_price * quantity

    trade = {
        'stockCode': stock_code,
        'stockName': stock_name,
        'type': 'buy',
        'status': 'filled',
        'orderPrice': filled_price,
        'filledPrice': filled_price,
        'quantity': quantity,
        'amount': amount,
        'fee': fee,
        'tax': 0,
        'signal': signal,
        'sellReason': None,
        'buyTradeId': None,
        'pnl': None,
        'pnlRate': None,
        'kiwoomOrderId': order_id,
        'orderedAt': datetime.now(KST),
        'filledAt': datetime.now(KST),
        'createdAt': datetime.now(KST),
        'updatedAt': datetime.now(KST),
    }
    result = db.trades.insert_one(trade)
    trade_id = result.inserted_id

    # 계좌 업데이트
    account = get_today_account()
    new_cash = account['cash'] - (amount + fee)
    positions = account.get('positions', [])
    positions.append({
        'stockCode': stock_code,
        'stockName': stock_name,
        'quantity': quantity,
        'avgBuyPrice': filled_price,
        'currentPrice': filled_price,
        'pnl': 0,
        'pnlRate': 0,
        'buyTradeId': trade_id,
        'boughtAt': datetime.now(KST),
    })
    total_value = new_cash + sum(p['currentPrice'] * p['quantity'] for p in positions)

    db.tradingaccounts.update_one(
        {'dateKey': _today_key()},
        {'$set': {
            'cash': new_cash,
            'positions': positions,
            'totalValue': total_value,
            'todayTradeCount': account.get('todayTradeCount', 0) + 1,
            'updatedAt': datetime.now(KST),
        }}
    )
    print(f'📈 매수: {stock_name} {quantity}주 @ {filled_price:,}원')
    return trade


def record_sell(stock_code: str, stock_name: str, filled_price: int, quantity: int,
                fee: int, tax: int, sell_reason: str, buy_trade_id, avg_buy_price: int,
                order_id: str | None) -> dict:
    """매도 기록 저장"""
    db = get_db()
    amount = filled_price * quantity
    buy_amount = avg_buy_price * quantity
    pnl = amount - buy_amount - fee - tax
    pnl_rate = round(((filled_price - avg_buy_price) / avg_buy_price) * 100, 2)

    trade = {
        'stockCode': stock_code,
        'stockName': stock_name,
        'type': 'sell',
        'status': 'filled',
        'orderPrice': filled_price,
        'filledPrice': filled_price,
        'quantity': quantity,
        'amount': amount,
        'fee': fee,
        'tax': tax,
        'signal': None,
        'sellReason': sell_reason,
        'buyTradeId': buy_trade_id,
        'pnl': pnl,
        'pnlRate': pnl_rate,
        'kiwoomOrderId': order_id,
        'orderedAt': datetime.now(KST),
        'filledAt': datetime.now(KST),
        'createdAt': datetime.now(KST),
        'updatedAt': datetime.now(KST),
    }
    db.trades.insert_one(trade)

    # 계좌 업데이트
    account = get_today_account()
    new_cash = account['cash'] + (amount - fee - tax)
    positions = [p for p in account.get('positions', [])
                 if str(p.get('buyTradeId')) != str(buy_trade_id)]
    total_value = new_cash + sum(p['currentPrice'] * p['quantity'] for p in positions)
    initial = account.get('initialCapital', 1_000_000)

    update = {
        'cash': new_cash,
        'positions': positions,
        'totalValue': total_value,
        'dailyPnl': account.get('dailyPnl', 0) + pnl,
        'totalPnl': account.get('totalPnl', 0) + pnl,
        'totalPnlRate': round(((total_value - initial) / initial) * 100, 2),
        'todayTradeCount': account.get('todayTradeCount', 0) + 1,
        'updatedAt': datetime.now(KST),
    }
    if pnl > 0:
        update['winCount'] = account.get('winCount', 0) + 1
    else:
        update['loseCount'] = account.get('loseCount', 0) + 1

    db.tradingaccounts.update_one({'dateKey': _today_key()}, {'$set': update})

    emoji = '💰' if pnl > 0 else '💸'
    print(f'{emoji} 매도: {stock_name} {quantity}주 @ {filled_price:,}원 ({pnl:+,}원, {sell_reason})')
    return trade


def sync_with_kiwoom(balance: dict, cash: int | None):
    """키움 실잔고 동기화"""
    db = get_db()
    account = get_today_account()
    update: dict = {'updatedAt': datetime.now(KST)}

    if cash is not None:
        update['cash'] = cash

    if balance:
        update['totalValue'] = balance.get('estimated_asset', 0) or (account['cash'] + balance.get('total_eval', 0))
        update['totalPnl'] = balance.get('total_pnl', 0)
        update['totalPnlRate'] = balance.get('total_pnl_rate', 0)

        if account.get('initialCapital', 1_000_000) == 1_000_000 and balance.get('estimated_asset', 0) > 0:
            update['initialCapital'] = balance['estimated_asset']

    db.tradingaccounts.update_one({'dateKey': _today_key()}, {'$set': update})


def get_recent_leaders(days: int = 5) -> list[dict]:
    """최근 N일간 주도주였던 종목 (DailyLeadingTheme 컬렉션에서)"""
    db = get_db()
    cutoff = datetime.now(KST) - timedelta(days=days)

    results = db.dailyleadingthemes.find(
        {'date': {'$gte': cutoff}},
        {'topStocks': 1, 'date': 1}
    ).sort('date', -1)

    # 종목별 등장 횟수 + 최고 등락률
    stock_map: dict[str, dict] = {}
    for doc in results:
        for stock in doc.get('topStocks', []):
            code = stock.get('stockCode', '')
            if not code:
                continue
            if code not in stock_map:
                stock_map[code] = {
                    'stockCode': code,
                    'stockName': stock.get('stockName', ''),
                    'appearances': 0,
                    'maxChangeRate': 0,
                    'themes': stock.get('themes', []),
                }
            stock_map[code]['appearances'] += 1
            rate = stock.get('changeRate', 0)
            if rate > stock_map[code]['maxChangeRate']:
                stock_map[code]['maxChangeRate'] = rate

    # 2회 이상 등장한 종목만 (진짜 강했던 종목)
    leaders = [v for v in stock_map.values() if v['appearances'] >= 2]
    leaders.sort(key=lambda x: x['appearances'], reverse=True)
    return leaders


def get_hotness_data() -> list[dict]:
    """Node.js 서버가 계산한 hotness 캐시에서 S/A 등급 종목 가져오기
    (Express 서버의 /api/leading/hot 호출)"""
    import requests as req
    from config import SERVER_API_URL
    try:
        api_url = f'{SERVER_API_URL}/leading/hot?limit=30'
        resp = req.get(api_url, timeout=10)
        data = resp.json()
        if data.get('success'):
            return data['data'].get('stocks', [])
        return []
    except Exception:
        return []
