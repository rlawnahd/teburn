import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // ── TEBURN API ──
  teburnApiUrl: process.env.TEBURN_API_URL || 'http://localhost:4000',

  // ── KIS Open API ──
  kis: {
    appKey: process.env.KIS_APP_KEY || '',
    appSecret: process.env.KIS_APP_SECRET || '',
    accountNo: process.env.KIS_ACCOUNT_NO || '',        // 계좌번호 (8자리-2자리)
    accountProductCode: process.env.KIS_ACCOUNT_PRODUCT_CODE || '01',
    isMock: process.env.KIS_IS_MOCK === 'true',          // 모의투자 여부
    get baseUrl() {
      return this.isMock
        ? 'https://openapivts.koreainvestment.com:29443'
        : 'https://openapi.koreainvestment.com:9443';
    },
  },

  // ── 매매 전략 ──
  strategy: {
    // TEBURN 시그널 필터
    minGrade: (process.env.MIN_GRADE || 'S') as 'S' | 'A' | 'B',
    minHotnessScore: parseInt(process.env.MIN_HOTNESS_SCORE || '70'),

    // 기술적 필터
    rsiEnabled: process.env.RSI_ENABLED !== 'false',
    rsiPeriod: parseInt(process.env.RSI_PERIOD || '14'),
    rsiOverbought: parseInt(process.env.RSI_OVERBOUGHT || '75'),
    rsiOversold: parseInt(process.env.RSI_OVERSOLD || '25'),
    maEnabled: process.env.MA_ENABLED !== 'false',
    maFastPeriod: parseInt(process.env.MA_FAST_PERIOD || '5'),
    maSlowPeriod: parseInt(process.env.MA_SLOW_PERIOD || '20'),

    // 진입 조건
    minChangeRate: parseFloat(process.env.MIN_CHANGE_RATE || '4'),   // 최소 등락률 %
    maxChangeRate: parseFloat(process.env.MAX_CHANGE_RATE || '25'),  // 최대 등락률 % (너무 고점 방지)
    minTradingValue: parseInt(process.env.MIN_TRADING_VALUE || '10000000000'), // 최소 거래대금 100억
  },

  // ── 리스크 관리 ──
  risk: {
    maxPositions: parseInt(process.env.MAX_POSITIONS || '3'),         // 최대 동시 보유 종목 수
    positionSizeKrw: parseInt(process.env.POSITION_SIZE_KRW || '500000'),  // 1종목당 투자금 (50만원)
    stopLossPercent: parseFloat(process.env.STOP_LOSS_PERCENT || '3'),     // 손절 %
    takeProfitPercent: parseFloat(process.env.TAKE_PROFIT_PERCENT || '7'), // 익절 %
    trailingStopEnabled: process.env.TRAILING_STOP_ENABLED === 'true',
    trailingStopPercent: parseFloat(process.env.TRAILING_STOP_PERCENT || '2'), // 고점 대비 하락 %
    dailyLossLimitKrw: parseInt(process.env.DAILY_LOSS_LIMIT_KRW || '100000'), // 일일 최대 손실 (10만원)
  },

  // ── 운영 설정 ──
  bot: {
    checkIntervalMs: parseInt(process.env.CHECK_INTERVAL_MS || '300000'),  // 체크 주기 (5분)
    marketOpenTime: '09:05',    // 장 시작 5분 후부터 (시초가 변동 회피)
    marketCloseTime: '15:15',   // 장 종료 15분 전까지 (종가 매매 회피)
    sellAllBeforeClose: process.env.SELL_ALL_BEFORE_CLOSE === 'true',  // 장 마감 전 전량 청산
    sellAllTime: '15:10',       // 전량 청산 시각
  },

  // ── 텔레그램 ──
  telegram: {
    enabled: process.env.BOT_TELEGRAM_ENABLED === 'true',
    botToken: process.env.BOT_TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.BOT_TELEGRAM_CHAT_ID || '',
  },

  // ── MongoDB (포지션 히스토리 저장용, 선택) ──
  mongo: {
    uri: process.env.MONGO_URI || '',
    enabled: !!process.env.MONGO_URI,
  },
};

export type Config = typeof config;
