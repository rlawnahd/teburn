"""
수급 데이터 수집 스크립트 (pykrx 사용)
외국인/기관/개인 순매수 데이터를 MongoDB에 저장

사용법:
    pip install -r requirements.txt
    python collect_supply.py
"""

import os
from datetime import datetime, timedelta
from pykrx import stock
from pymongo import MongoClient
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'server', '.env'))

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/teburn')


def get_mongo_client():
    """MongoDB 클라이언트 생성"""
    return MongoClient(MONGO_URI)


def collect_daily_supply(target_date: str = None):
    """
    일별 투자자별 순매수 데이터 수집

    Args:
        target_date: YYYYMMDD 형식 (기본값: 오늘)
    """
    if target_date is None:
        target_date = datetime.now().strftime('%Y%m%d')

    print(f"📊 {target_date} 수급 데이터 수집 시작...")

    client = get_mongo_client()
    db = client.get_default_database()
    collection = db['stocksupplyhistory']

    try:
        # 코스피 + 코스닥 전체 종목 수급 데이터
        # 외국인
        foreign_df = stock.get_market_trading_value_by_ticker(target_date, market="ALL")
        # 기관
        inst_df = stock.get_market_trading_value_by_ticker(target_date, market="ALL", investor="기관합계")
        # 개인
        retail_df = stock.get_market_trading_value_by_ticker(target_date, market="ALL", investor="개인")

        if foreign_df.empty:
            print(f"⚠️ {target_date}에 대한 데이터가 없습니다.")
            return 0

        saved_count = 0
        date_obj = datetime.strptime(target_date, '%Y%m%d')

        for stock_code in foreign_df.index:
            try:
                # 종목명 조회
                stock_name = stock.get_market_ticker_name(stock_code)

                # 순매수 금액 (원 단위)
                foreign_net = int(foreign_df.loc[stock_code, '순매수'] if stock_code in foreign_df.index else 0)
                inst_net = int(inst_df.loc[stock_code, '순매수'] if stock_code in inst_df.index else 0)
                retail_net = int(retail_df.loc[stock_code, '순매수'] if stock_code in retail_df.index else 0)

                # MongoDB에 저장 (upsert)
                collection.update_one(
                    {'stockCode': stock_code, 'date': date_obj},
                    {
                        '$set': {
                            'stockCode': stock_code,
                            'stockName': stock_name,
                            'date': date_obj,
                            'foreignNet': foreign_net,  # 외국인 순매수
                            'instNet': inst_net,        # 기관 순매수
                            'retailNet': retail_net,    # 개인 순매수
                            'updatedAt': datetime.now()
                        }
                    },
                    upsert=True
                )
                saved_count += 1

                if saved_count % 500 == 0:
                    print(f"  진행: {saved_count}개 저장됨...")

            except Exception as e:
                print(f"  ⚠️ {stock_code} 저장 실패: {e}")
                continue

        print(f"✅ 수급 데이터 저장 완료: {saved_count}개 종목")
        return saved_count

    except Exception as e:
        print(f"❌ 수급 데이터 수집 실패: {e}")
        return 0
    finally:
        client.close()


def collect_recent_supply(days: int = 5):
    """
    최근 N일 수급 데이터 일괄 수집
    """
    print(f"📊 최근 {days}일 수급 데이터 일괄 수집 시작...")

    total_saved = 0
    for i in range(days):
        target_date = (datetime.now() - timedelta(days=i)).strftime('%Y%m%d')
        saved = collect_daily_supply(target_date)
        total_saved += saved

    print(f"🎉 총 {total_saved}개 레코드 저장 완료")
    return total_saved


def setup_indexes():
    """MongoDB 인덱스 설정"""
    client = get_mongo_client()
    db = client.get_default_database()
    collection = db['stocksupplyhistory']

    # 인덱스 생성
    collection.create_index([('stockCode', 1), ('date', -1)])
    collection.create_index([('stockCode', 1), ('date', 1)], unique=True)
    collection.create_index([('date', 1)], expireAfterSeconds=30 * 24 * 60 * 60)  # 30일 TTL

    print("✅ MongoDB 인덱스 설정 완료")
    client.close()


if __name__ == '__main__':
    import sys

    if len(sys.argv) > 1:
        if sys.argv[1] == '--setup':
            setup_indexes()
        elif sys.argv[1] == '--recent':
            days = int(sys.argv[2]) if len(sys.argv) > 2 else 5
            collect_recent_supply(days)
        else:
            # 특정 날짜 수집
            collect_daily_supply(sys.argv[1])
    else:
        # 오늘 데이터 수집
        collect_daily_supply()
