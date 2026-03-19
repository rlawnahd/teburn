import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'server', '.env'))

# 키움 REST API
KIWOOM_APP_KEY = os.getenv('KIWOOM_APP_KEY', '')
KIWOOM_SECRET_KEY = os.getenv('KIWOOM_SECRET_KEY', '')
KIWOOM_IS_MOCK = os.getenv('KIWOOM_IS_MOCK', 'false').lower() == 'true'

KIWOOM_BASE_URL = 'https://mockapi.kiwoom.com' if KIWOOM_IS_MOCK else 'https://api.kiwoom.com'
KIWOOM_WS_URL = 'wss://mockapi.kiwoom.com:10000/api/dostk/websocket' if KIWOOM_IS_MOCK else 'wss://api.kiwoom.com:10000/api/dostk/websocket'

# MongoDB
MONGO_URI = os.getenv('MONGO_URI', '')

# 전략 파라미터
STRATEGY = {
    'INITIAL_CAPITAL': 1_000_000,
    'STOP_LOSS_RATE': -2.0,        # 손절 -2%
    'TAKE_PROFIT_RATE': 5.0,       # 익절 +5%
    'DAILY_LOSS_LIMIT': -100_000,  # 일일 최대 손실
    'MIN_HOTNESS_GRADE': ['S', 'A'],
    'MIN_VOLUME_SURGE': 3.0,       # 거래량 3배+
    'MIN_CHANGE_RATE': 5.0,        # 상승률 5%+
    'MIN_NEWS_COUNT': 1,
    'TRADE_START_HOUR': 9,
    'TRADE_START_MINUTE': 10,      # 09:10 시작
    'TIME_EXIT_HOUR': 15,
    'TIME_EXIT_MINUTE': 0,         # 15:00 청산
    'FEE_RATE': 0.00015,           # 수수료 0.015%
    'TAX_RATE': 0.0018,            # 매도세 0.18%
    # 기술적 지표 파라미터
    'RSI_PERIOD': 14,
    'RSI_OVERSOLD': 30,
    'RSI_OVERBOUGHT': 70,
    'MA_SHORT': 5,                 # 단기 이평선
    'MA_LONG': 20,                 # 장기 이평선
    'BB_PERIOD': 20,               # 볼린저밴드 기간
    'BB_STD': 2.0,                 # 볼린저밴드 표준편차
}

SCAN_INTERVAL_SEC = 60  # 매수 신호 스캔 주기 (초)
