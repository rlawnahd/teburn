"""매매 전략 — Hotness + 기술적 지표 조합"""
import pandas as pd
import pandas_ta as ta
from config import STRATEGY
from kiwoom_api import get_daily_candles, get_stock_price


def compute_indicators(stock_code: str) -> dict | None:
    """일봉 데이터에서 기술적 지표 계산"""
    candles = get_daily_candles(stock_code)
    if not candles or len(candles) < STRATEGY['MA_LONG']:
        return None

    try:
        df = pd.DataFrame(candles)

        # 키움 API 필드명에 맞게 컬럼 매핑
        col_map = {}
        if 'close_pric' in df.columns:
            col_map = {'close_pric': 'close', 'open_pric': 'open',
                       'high_pric': 'high', 'low_pric': 'low', 'trde_qty': 'volume'}
        elif 'cur_prc' in df.columns:
            col_map = {'cur_prc': 'close', 'open_pric': 'open',
                       'high_pric': 'high', 'low_pric': 'low', 'trde_qty': 'volume'}

        if col_map:
            df = df.rename(columns=col_map)

        for col in ['close', 'open', 'high', 'low', 'volume']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col].astype(str).str.replace('+', '').str.replace('-', ''), errors='coerce').abs()

        if 'close' not in df.columns or df['close'].isna().all():
            return None

        df = df.dropna(subset=['close'])
        if len(df) < STRATEGY['MA_LONG']:
            return None

        # RSI
        rsi = ta.rsi(df['close'], length=STRATEGY['RSI_PERIOD'])
        rsi_val = rsi.iloc[-1] if rsi is not None and len(rsi) > 0 else None

        # 이동평균선
        ma_short = ta.sma(df['close'], length=STRATEGY['MA_SHORT'])
        ma_long = ta.sma(df['close'], length=STRATEGY['MA_LONG'])
        ma_short_val = ma_short.iloc[-1] if ma_short is not None and len(ma_short) > 0 else None
        ma_long_val = ma_long.iloc[-1] if ma_long is not None and len(ma_long) > 0 else None

        # 볼린저밴드
        bb = ta.bbands(df['close'], length=STRATEGY['BB_PERIOD'], std=STRATEGY['BB_STD'])
        bb_lower = None
        bb_upper = None
        if bb is not None and len(bb) > 0:
            bb_cols = bb.columns.tolist()
            lower_col = [c for c in bb_cols if 'BBL' in c]
            upper_col = [c for c in bb_cols if 'BBU' in c]
            if lower_col:
                bb_lower = bb[lower_col[0]].iloc[-1]
            if upper_col:
                bb_upper = bb[upper_col[0]].iloc[-1]

        current_price = float(df['close'].iloc[-1])

        # 골든크로스: 단기 > 장기
        golden_cross = (ma_short_val is not None and ma_long_val is not None
                        and ma_short_val > ma_long_val)

        # 데드크로스: 단기 < 장기
        dead_cross = (ma_short_val is not None and ma_long_val is not None
                      and ma_short_val < ma_long_val)

        return {
            'rsi': round(rsi_val, 2) if rsi_val is not None else None,
            'ma_short': round(ma_short_val, 2) if ma_short_val is not None else None,
            'ma_long': round(ma_long_val, 2) if ma_long_val is not None else None,
            'golden_cross': golden_cross,
            'dead_cross': dead_cross,
            'bb_lower': round(bb_lower, 2) if bb_lower is not None else None,
            'bb_upper': round(bb_upper, 2) if bb_upper is not None else None,
            'current_price': current_price,
        }
    except Exception as e:
        print(f'❌ 지표 계산 실패 ({stock_code}): {e}')
        return None


def check_buy_signal(hotness: dict) -> dict:
    """매수 신호 판단 — Hotness + 기술적 지표 조합

    Returns:
        {'signal': True/False, 'score': 0~100, 'reasons': [...]}
    """
    reasons = []
    score = 0

    # === 1. Hotness 조건 (기본 필터) ===
    grade = hotness.get('grade', 'D')
    if grade not in STRATEGY['MIN_HOTNESS_GRADE']:
        return {'signal': False, 'score': 0, 'reasons': [f'등급 {grade} (S/A만 허용)']}

    hotness_score = hotness.get('totalScore', 0)
    surge = hotness.get('volumeSurgeRate') or 0
    change_rate = hotness.get('changeRate', 0)
    news = hotness.get('newsCount', 0)

    if surge < STRATEGY['MIN_VOLUME_SURGE']:
        return {'signal': False, 'score': 0, 'reasons': [f'거래량 급증 {surge}배 (3배+ 필요)']}
    if change_rate < STRATEGY['MIN_CHANGE_RATE']:
        return {'signal': False, 'score': 0, 'reasons': [f'상승률 {change_rate}% (5%+ 필요)']}
    if news < STRATEGY['MIN_NEWS_COUNT']:
        return {'signal': False, 'score': 0, 'reasons': [f'뉴스 {news}건 (1건+ 필요)']}

    # 기본 조건 충족 (50점)
    score += 50
    reasons.append(f'Hotness {grade}등급 ({hotness_score}점)')
    reasons.append(f'거래량 {surge}배 급증')

    # === 2. 기술적 지표 보너스 ===
    stock_code = hotness.get('stockCode', '')
    indicators = compute_indicators(stock_code)

    if indicators:
        # RSI 30~70 사이면 적정 (과매수/과매도 아님)
        rsi = indicators.get('rsi')
        if rsi is not None:
            if rsi < STRATEGY['RSI_OVERSOLD']:
                score += 20  # 과매도 → 반등 기대
                reasons.append(f'RSI {rsi} (과매도, 반등 기대)')
            elif rsi < STRATEGY['RSI_OVERBOUGHT']:
                score += 10  # 적정 범위
                reasons.append(f'RSI {rsi} (적정)')
            else:
                score -= 10  # 과매수 → 위험
                reasons.append(f'RSI {rsi} (과매수 주의)')

        # 골든크로스
        if indicators.get('golden_cross'):
            score += 15
            reasons.append('골든크로스 (5일선 > 20일선)')
        elif indicators.get('dead_cross'):
            score -= 15
            reasons.append('데드크로스 (5일선 < 20일선)')

        # 볼린저밴드 — 하단 근처면 매수 유리
        bb_lower = indicators.get('bb_lower')
        bb_upper = indicators.get('bb_upper')
        price = indicators.get('current_price', 0)
        if bb_lower and bb_upper and price:
            bb_range = bb_upper - bb_lower
            if bb_range > 0:
                position = (price - bb_lower) / bb_range
                if position < 0.3:
                    score += 10
                    reasons.append(f'볼린저밴드 하단 ({position:.0%})')
                elif position > 0.8:
                    score -= 5
                    reasons.append(f'볼린저밴드 상단 ({position:.0%})')

    # 최종 판단: 60점 이상이면 매수
    return {
        'signal': score >= 60,
        'score': max(0, min(100, score)),
        'reasons': reasons,
        'indicators': indicators,
    }


def check_sell_signal(position: dict, current_price: int, daily_pnl: int,
                      time_minutes: int) -> str | None:
    """매도 사유 판단

    Returns:
        sell_reason or None
    """
    avg_price = position.get('avgBuyPrice', 0) or position.get('avg_buy_price', 0)
    if avg_price == 0:
        return None

    pnl_rate = ((current_price - avg_price) / avg_price) * 100

    # 1. 손절 -2%
    if pnl_rate <= STRATEGY['STOP_LOSS_RATE']:
        return 'stop_loss'

    # 2. 익절 +5%
    if pnl_rate >= STRATEGY['TAKE_PROFIT_RATE']:
        return 'take_profit'

    # 3. 시간 청산 15:00
    exit_time = STRATEGY['TIME_EXIT_HOUR'] * 60 + STRATEGY['TIME_EXIT_MINUTE']
    if time_minutes >= exit_time:
        return 'time_exit'

    # 4. 일일 손실 한도
    if daily_pnl <= STRATEGY['DAILY_LOSS_LIMIT']:
        return 'daily_limit'

    return None
