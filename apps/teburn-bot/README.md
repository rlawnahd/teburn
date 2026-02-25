# 🤖 TEBURN 자동매매봇

TEBURN의 주도주 분석 데이터를 활용한 국내주식 자동매매봇

## 동작 원리

```
TEBURN 서버                          자동매매봇                         KIS Open API
──────────                          ──────────                         ────────────
/api/leading/hot  ──→  시그널 수신  ──→  기술적 필터(RSI/MA)  ──→  매수 주문
(S등급 주도주)         (5분마다)          통과 시                    시장가 체결
                                                                       │
                                    포지션 모니터링  ←──  현재가 조회  ←─┘
                                         │
                               손절(-3%) / 익절(+7%)  ──→  매도 주문
                                         │
                               텔레그램 알림 ──→  📱
```

## 매매 전략

1. **시그널 소스**: TEBURN의 `hotnessService`가 산출한 주도주 점수
   - 거래대금(25) + 등락률(25) + 거래량급증(20) + 뉴스(15) + 대장주집중도(15) = 100점
   - S등급(70점+) 종목만 매매 대상

2. **기술적 필터**: TEBURN 시그널을 2차 검증
   - RSI가 과매수(75+) 구간이면 진입 보류
   - 단기MA(5일) > 장기MA(20일) 상승추세 확인

3. **리스크 관리**:
   - 손절 -3% / 익절 +7% 자동 실행
   - 최대 동시 3종목
   - 일일 손실 한도 10만원 도달 시 매매 중단

## 디렉토리 구조

```
apps/bot/
├── src/
│   ├── index.ts              # 메인 봇 루프
│   ├── config.ts             # 설정 관리
│   ├── signalProvider.ts     # TEBURN API → 매매 시그널
│   ├── technicalFilter.ts    # RSI, MA 기술적 필터
│   ├── kisTrader.ts          # KIS 매수/매도/잔고 API
│   ├── riskManager.ts        # 포지션/손절/익절 관리
│   └── notifier.ts           # 텔레그램 알림
├── .env.example
├── package.json
└── tsconfig.json
```

## 빠른 시작

### 1. 한국투자증권 API 준비

1. [한국투자증권 Open API](https://apiportal.koreainvestment.com) 가입
2. **모의투자** 앱 키 발급 (먼저 모의투자로 테스트!)
3. 모의투자 계좌번호 확인

### 2. 설치

```bash
# TEBURN 루트에서
pnpm install

# 또는 bot만
cd apps/bot
pnpm install
```

### 3. 환경변수 설정

```bash
cp apps/bot/.env.example apps/bot/.env
```

`.env` 파일 편집:
```
TEBURN_API_URL=http://localhost:4000    # TEBURN 서버 주소
KIS_APP_KEY=발급받은_앱키
KIS_APP_SECRET=발급받은_시크릿
KIS_ACCOUNT_NO=00000000-01             # 모의투자 계좌번호
KIS_IS_MOCK=true                       # 모의투자 모드
```

### 4. 실행

```bash
# TEBURN 서버가 먼저 실행되어야 합니다
pnpm dev:server

# 다른 터미널에서 봇 실행
cd apps/bot
pnpm dev
```

## TEBURN 모노레포에 추가하기

`pnpm-workspace.yaml`에 bot 추가:

```yaml
packages:
  - 'apps/*'       # 이미 있으면 자동으로 포함됨
```

`apps/` 루트 `package.json`에 스크립트 추가:

```json
{
  "scripts": {
    "dev": "pnpm --filter @teburn/client dev & pnpm --filter @teburn/server dev",
    "dev:bot": "pnpm --filter @teburn/bot dev",
    "dev:all": "pnpm dev & pnpm dev:bot"
  }
}
```

## 설정값 상세

### 매매 전략

| 변수 | 기본값 | 설명 |
|------|--------|------|
| MIN_GRADE | S | 최소 주도주 등급 (S/A/B) |
| MIN_HOTNESS_SCORE | 70 | 최소 주도주 점수 |
| MIN_CHANGE_RATE | 4 | 최소 등락률 % |
| MAX_CHANGE_RATE | 25 | 최대 등락률 % (고점 추격 방지) |
| MIN_TRADING_VALUE | 100억 | 최소 거래대금 |

### 리스크 관리

| 변수 | 기본값 | 설명 |
|------|--------|------|
| MAX_POSITIONS | 3 | 동시 보유 최대 종목 수 |
| POSITION_SIZE_KRW | 50만원 | 1종목당 투자금 |
| STOP_LOSS_PERCENT | 3% | 손절 기준 |
| TAKE_PROFIT_PERCENT | 7% | 익절 기준 |
| DAILY_LOSS_LIMIT_KRW | 10만원 | 일일 최대 손실 |

### 기술적 필터

| 변수 | 기본값 | 설명 |
|------|--------|------|
| RSI_OVERBOUGHT | 75 | RSI 과매수 (이상이면 진입 X) |
| MA_FAST_PERIOD | 5 | 단기 이동평균 |
| MA_SLOW_PERIOD | 20 | 장기 이동평균 |

## ⚠️ 주의사항

1. **반드시 모의투자(`KIS_IS_MOCK=true`)로 충분히 테스트 후 실투자 전환**
2. TEBURN 서버가 실행 중이어야 시그널을 받을 수 있음
3. KIS API는 초당 20건 제한 — 봇이 자동으로 rate limit 관리
4. 장 운영시간(09:05~15:15)에만 매매, 장외시간은 대기
5. 봇 종료 시 보유 포지션은 남아있으므로 수동 관리 필요
6. **투자 원금 손실 가능 — 감당 가능한 금액만 사용하세요**
