# TEBURN

> 시장이 불붙기 전에, 먼저 발견하세요

실시간 주도주 분석, 테마 급등 감지, 선물지수 모니터링까지 — 한국 주식시장의 흐름을 가장 빠르게 읽는 대시보드입니다.

## 주요 기능

### 랜딩페이지
- UnicornStudio 기반 인터랙티브 불꽃 배경
- 세션 기반 진입 (첫 방문 시 표시, 세션 중 재방문 시 바로 대시보드)

### 주도주 분석 (주도주 점수)
- 거래대금(25) + 등락률(25) + 거래량 급증(20) + 뉴스(15) + 대장주 집중도(15) = 총 100점
- S / A / B / C / D 등급 자동 분류
- 5분 주기 캐시 갱신 (stale-while-revalidate)

### 테마주 거래대금
- 거래대금 상위 종목 실시간 추적 (4% 이상 상승 종목)
- KIS Open API 기반 실시간 시세 연동
- 5분 주기 배치 캐싱

### 주도섹터
- 테마별 평균 등락률, 총 거래대금 기반 주도섹터 분석
- 대장주 자동 감지

### 일별 기록 (캘린더)
- 일별 주도테마 TOP 저장 (30분 주기)
- 캘린더 UI로 날짜별 테마 히스토리 조회
- 날짜 클릭 시 상세 테마 목록

### 선물지수
- KOSPI 200 지수 / 야간선물 (KIS API, 장중↔야간 자동 전환)
- NASDAQ 100 선물 (Yahoo Finance API, 5분 간격 차트)
- 미니 위젯 (모든 탭에서 표시) + 상세 탭 (라인차트, 고/저가)

### 뉴스
- 네이버 금융 증권 뉴스 10초마다 자동 크롤링
- 테마명, 종목명 기반 관련 뉴스 매칭
- 종목별 24시간 뉴스 건수 집계

### 테마 관리
- 네이버 금융에서 테마 목록 및 구성 종목 자동 크롤링 (1일 1회)
- 어드민 대시보드 (테마 수, 뉴스 수, 크롤링 현황)

### 텔레그램 알림봇 (@teburn_hot_bot)
- S등급(70점+) 주도주 실시간 알림 (장중 5분마다)
- 장마감 일일 요약 (평일 15:40 KST)
- 명령어: `/start` (구독), `/stop` (중지), `/hot` (TOP 10 조회), `/help` (도움말)
- Telegram 403(차단) 시 자동 비활성화

## 데이터 갱신 주기

| 데이터 | 서버 갱신 | 클라이언트 요청 |
|--------|----------|---------------|
| 주도주 점수 | 5분 | 60초 |
| 테마/종목 주가 | 5분 | 60초 |
| 거래대금 TOP | 5분 | 60초 |
| 주도섹터 | 5분 | 60초 |
| 지수 | 5분 | 60초 |
| 뉴스 크롤링 | 10초 | 30초 |
| 일별 주도테마 | 30분 | - |
| 테마 목록 크롤링 | 1일 1회 | - |
| 텔레그램 S등급 알림 | 5분 | - |
| 텔레그램 일일 요약 | 평일 15:40 | - |

## 기술 스택

- **프론트엔드**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Recharts, TanStack Query
- **백엔드**: Express, TypeScript, Mongoose, Telegraf (텔레그램 봇)
- **데이터**: MongoDB, KIS Open API (실시간 시세), Yahoo Finance API (나스닥 선물), 네이버 검색 API
- **배포**: Client → Vercel, Server → Railway
- **패키지 매니저**: pnpm workspaces (모노레포)

## 디렉터리 구조

```
apps/
├── client/                    # Next.js 웹 클라이언트
│   ├── app/
│   │   ├── layout.tsx         # 루트 레이아웃 (ThemeProvider, QueryProvider)
│   │   ├── page.tsx           # 메인 (랜딩 → 대시보드)
│   │   ├── admin/             # 어드민 대시보드
│   │   ├── news/              # 뉴스 페이지
│   │   ├── privacy/           # 개인정보처리방침
│   │   └── stocks/[stockCode] # 종목 상세
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx           # 헤더 (로고, 텔레그램 링크, 검색, 다크모드)
│   │   │   └── Footer.tsx           # 푸터 (저작권, 개인정보처리방침)
│   │   ├── home/
│   │   │   ├── LandingPage.tsx      # 랜딩페이지 (불꽃 배경)
│   │   │   ├── HomeContent.tsx      # 대시보드 메인
│   │   │   └── IndexWidget.tsx      # 지수 미니 위젯
│   │   ├── leading/
│   │   │   ├── HotStocksView.tsx    # 주도주 점수 분석
│   │   │   ├── TopTradingView.tsx   # 테마주 거래대금
│   │   │   ├── LeadingSectorView.tsx # 주도섹터
│   │   │   ├── CalendarView.tsx     # 일별 기록
│   │   │   └── IndexView.tsx        # 선물지수 상세
│   │   ├── news/              # 뉴스 컴포넌트
│   │   └── ui/                # ThemeToggle, ThemeProvider
│   └── lib/api/               # API 클라이언트 (themes, leading, stocks, news)
│
├── server/                    # Express API 서버
│   └── src/
│       ├── models/            # MongoDB 스키마
│       │   ├── Theme.ts              # 테마 정보
│       │   ├── News.ts               # 뉴스
│       │   ├── DailyLeadingTheme.ts  # 일별 주도테마
│       │   ├── StockVolumeHistory.ts # 거래량 히스토리
│       │   ├── PriceCache.ts         # 주가 캐시
│       │   └── TelegramSubscriber.ts # 텔레그램 구독자
│       ├── routes/            # API 라우트
│       │   ├── leading.ts     # /api/leading (주도주, 섹터, 캘린더, 핫함)
│       │   ├── themes.ts      # /api/themes
│       │   ├── stocks.ts      # /api/stocks
│       │   ├── indices.ts     # /api/indices
│       │   ├── news.ts        # /api/news
│       │   └── admin.ts       # /api/admin
│       ├── services/          # 비즈니스 로직
│       │   ├── kisApi.ts             # KIS Open API (토큰, 현재가)
│       │   ├── hotnessService.ts     # 주도주 점수 계산
│       │   ├── leadingStockService.ts # 주도주/섹터 분석
│       │   ├── themePriceCache.ts    # 주가 배치 캐싱
│       │   ├── crawler.ts            # 뉴스 크롤러
│       │   ├── themeCrawler.ts       # 테마 크롤러
│       │   ├── naverApi.ts           # 네이버 검색 API
│       │   ├── naverDataLab.ts       # 네이버 데이터랩
│       │   ├── volumeSurgeService.ts # 거래량 급증 감지
│       │   └── telegramBot.ts       # 텔레그램 알림봇
│       ├── utils/
│       │   └── marketStatus.ts      # 장 상태 (정규장/시간외/마감)
│       └── server.ts          # 서버 엔트리
```

## 빠른 시작

### 요구사항
- Node.js 18+
- pnpm
- MongoDB

### 설치 및 실행

```bash
# 1. 의존성 설치
pnpm install

# 2. 환경변수 설정
cp apps/server/.env.example apps/server/.env
```

`.env` 파일에 다음 값을 설정:
```
MONGO_URI=mongodb://...
PORT=4000

# KIS Open API (실시간 시세)
KIS_APP_KEY=...
KIS_APP_SECRET=...
KIS_ACCOUNT_NO=...
KIS_IS_MOCK=false

# 네이버 API (뉴스 검색)
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...

# 텔레그램 알림봇 (선택, 없으면 봇 비활성화)
TELEGRAM_BOT_TOKEN=...
```

```bash
# 3. 개발 서버 실행
pnpm dev

# 클라이언트: http://localhost:3000
# 서버: http://localhost:4000
```

## API 엔드포인트

### 주도주 분석
- `GET /api/leading` - 전체 데이터 (대금상위 + 주도섹터)
- `GET /api/leading/stocks` - 거래대금 상위 종목
- `GET /api/leading/sectors` - 주도섹터 목록
- `GET /api/leading/hot` - 주도주 점수 TOP 종목
- `GET /api/leading/calendar` - 캘린더 데이터 (월별)
- `GET /api/leading/calendar/:date` - 특정 날짜 상세

### 지수
- `GET /api/indices` - 전체 (KOSPI + NASDAQ)

### 테마
- `GET /api/themes` - 테마 목록
- `GET /api/themes/:themeName` - 테마 상세

### 뉴스
- `GET /api/news` - 뉴스 목록
- `GET /api/news/by-theme/:themeName` - 테마별 관련 뉴스

### 주식
- `GET /api/stocks/:stockCode` - 종목 현재가 및 상세

### 어드민
- `GET /api/admin/stats` - 대시보드 통계

## 스크립트

```bash
pnpm dev              # 클라이언트 + 서버 동시 실행
pnpm dev:client       # 클라이언트만 실행
pnpm dev:server       # 서버만 실행
pnpm build            # 전체 빌드
```
