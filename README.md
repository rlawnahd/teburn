# TEBURN

> 시장이 불붙기 전에, 먼저 발견하세요

실시간 주도주 분석, 일별 마감 리포트, 알고리즘 적중률 검증까지 — 한국 주식시장의 흐름을 가장 빠르게 읽는 대시보드입니다.

## 주요 기능

### 랜딩페이지
- UnicornStudio 기반 인터랙티브 불꽃 배경
- 세션 기반 진입 (첫 방문 시 표시, 세션 중 재방문 시 바로 대시보드)
- 비로그인은 5분 지연 데이터, 로그인 시 실시간(WebSocket) 업데이트

### 주도주 분석 (주도주 점수)
- 7가지 지표 종합 평가: 거래대금, 상대강도, 거래량 급증, 대장주 집중도, 시세 패턴, 등락률, 시장 시선 + 연속성 보너스
- S / A / B / C / D 등급 자동 분류
- 연속 주도주 일수(streak) 표시 (실제 영업일 기준)
- 5분 주기 캐시 갱신 (stale-while-revalidate), 로그인 시 실시간 체결가로 점수 재계산

### 주도주 성적표 (`/performance`)
- TEBURN 알고리즘이 뽑은 S·A등급 주도주의 실제 적중률·평균 수익률을 매일 자동 검증하는 신뢰도 페이지
- "신호 다음날 시가 매수" 가정으로 다음날(D+1)·1주일(D+5) 성적 추적
- 7 / 30 / 90일 윈도우별 적중률 + 평균 수익률 요약, 일자별 상세 접기
- 과거 90일 백필로 첫 구동부터 데이터 채움

### 일별 마감 리포트 (`/report`, `/report/[date]`)
- 매일 장 마감(평일 15:35~)에 그날의 주도테마·주도주를 스냅샷으로 저장
- GPT 시장 요약(gpt-5.4-nano)을 함께 생성하는 SSR(SEO) 페이지
- 과거 90일 data-only 백필 (AI 요약 없이 데이터만 소급 생성)
- 캘린더·사이트맵·네비게이션에서 발견 경로 연결

### 일별 기록 (캘린더)
- 일별 주도테마 TOP 저장 (30분 주기)
- 캘린더 UI로 날짜별 테마 히스토리 조회
- 날짜 클릭 시 상세 테마 목록

### 지수
- KOSPI / KOSDAQ 지수 (KIS API)
- NASDAQ 100 선물 (Yahoo Finance API, 분봉 차트 백필)
- KOSPI 200 야간선물 — KIS WebSocket(H0MFCNT0) 기반 야간 시세 연동 작업 중
- 영역(그라데이션) 차트 + 방향색(상승=빨강 / 하락=파랑) + 장 마감 시 카드 흐림·"마감"·"종가" 표시
- 미니 위젯 (모든 탭에서 표시) + 상세 탭

> 기존 Yahoo Finance(^KS200, NQ=F) 기반에서, Railway 서버 IP가 Yahoo에 차단되는 이슈로 KIS API 기반으로 전환 중입니다. 코스피·코스닥 지수는 KIS로 전환 완료, NASDAQ 선물은 Yahoo 유지, KOSPI200 야간선물은 KIS 연동 작업 중입니다.

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

> **제거된 기능**: 섹터 탭(주도섹터)과 테마 타임라인은 UI에서 제거되었습니다. 대시보드 탭은 이제 **주도주 / 캘린더 / 지수** 3개이며, "오늘의 주도주"(`/today`) 바로가기가 함께 노출됩니다. (`/api/leading/sectors` API는 백엔드에 남아 있음)

## 데이터 갱신 주기

| 데이터 | 서버 갱신 | 클라이언트 요청 |
|--------|----------|---------------|
| 주도주 점수 | 5분 (로그인 시 실시간) | 60초 |
| 테마/종목 주가 | 5분 | 60초 |
| 거래대금 TOP | 5분 | 60초 |
| 지수 | 60초 캐시 | 60초 |
| 뉴스 크롤링 | 10초 | 30초 |
| 일별 주도테마 | 30분 | - |
| 테마 목록 크롤링 | 1일 1회 | - |
| 성적표 갱신 / 일별 리포트 | 평일 15:35 (장 마감) | SSR 1시간 |
| 텔레그램 S등급 알림 | 5분 | - |
| 텔레그램 일일 요약 | 평일 15:40 | - |

## 기술 스택

- **프론트엔드**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Recharts, TanStack Query
- **백엔드**: Express, TypeScript, Mongoose, Telegraf (텔레그램 봇), ws (실시간 WebSocket), OpenAI (리포트 요약)
- **데이터**: MongoDB, KIS Open API (실시간 시세·지수·야간선물 WebSocket), Yahoo Finance API (나스닥 선물), 네이버 검색 API
- **디자인**: Grok-tic 다크 온리 + 오렌지 강조, 디자인 토큰(--accent), 보더리스 카드, 접근성 개선
- **배포**: Client → Vercel, Server → Railway
- **패키지 매니저**: pnpm workspaces (모노레포)

## 디렉터리 구조

```
apps/
├── client/                    # Next.js 웹 클라이언트
│   ├── app/
│   │   ├── layout.tsx         # 루트 레이아웃 (QueryProvider)
│   │   ├── page.tsx           # 메인 (랜딩 → 대시보드, 탭: 주도주/캘린더/지수)
│   │   ├── today/             # 오늘의 주도주 (SSR)
│   │   ├── performance/       # 주도주 성적표 (적중률 검증)
│   │   ├── report/            # 일별 마감 리포트 (목록 + [date] 상세, SSR)
│   │   ├── admin/             # 어드민 대시보드
│   │   ├── news/              # 뉴스 페이지
│   │   ├── themes/            # 테마 상세
│   │   ├── stocks/[stockCode] # 종목 상세
│   │   ├── login/ signup/     # 인증
│   │   └── privacy/ terms/ ...# 정책 페이지
│   ├── components/
│   │   ├── layout/            # Header, Footer
│   │   ├── landing/           # LandingPage (불꽃 배경)
│   │   ├── home/              # HomeContent(대시보드), IndexWidget, MarketStatusBar
│   │   ├── leading/
│   │   │   ├── HotStocksView.tsx    # 주도주 점수 분석
│   │   │   ├── CalendarView.tsx     # 일별 기록
│   │   │   ├── IndexView.tsx        # 지수 상세 (영역 차트)
│   │   │   └── ...                  # HeroCard, MarketThemeCard 등
│   │   ├── news/              # 뉴스 컴포넌트
│   │   └── ui/                # 공통 UI
│   └── lib/api/               # API 클라이언트 (themes, leading, stocks, news)
│
├── server/                    # Express API 서버
│   └── src/
│       ├── models/            # MongoDB 스키마
│       │   ├── Theme.ts              # 테마 정보
│       │   ├── News.ts               # 뉴스
│       │   ├── DailyLeadingTheme.ts  # 일별 주도테마
│       │   ├── DailyReport.ts        # 일별 마감 리포트
│       │   ├── GradePerformance.ts   # 등급 성적(적중률)
│       │   ├── HotnessHistory.ts     # 주도주 점수 히스토리
│       │   ├── StockVolumeHistory.ts # 거래량 히스토리
│       │   ├── PriceCache.ts         # 주가 캐시
│       │   ├── User.ts / Trade.ts    # 사용자 / 매매일지
│       │   └── TelegramSubscriber.ts # 텔레그램 구독자
│       ├── routes/            # API 라우트
│       │   ├── leading.ts     # /api/leading (주도주, 섹터, 캘린더, 핫함)
│       │   ├── performance.ts # /api/performance (성적표)
│       │   ├── report.ts      # /api/report (일별 리포트)
│       │   ├── themes.ts      # /api/themes
│       │   ├── stocks.ts      # /api/stocks
│       │   ├── indices.ts     # /api/indices
│       │   ├── news.ts        # /api/news
│       │   ├── auth.ts        # /api/auth
│       │   └── admin.ts       # /api/admin
│       ├── services/          # 비즈니스 로직
│       │   ├── kisRestApi.ts           # KIS REST (토큰)
│       │   ├── kisWebSocket.ts         # KIS 실시간 체결 WebSocket
│       │   ├── wsServer.ts             # 클라이언트 브릿지 WebSocket
│       │   ├── indexService.ts         # 지수/선물 (KIS + Yahoo)
│       │   ├── hotnessService.ts       # 주도주 점수 계산
│       │   ├── realtimeHotness.ts      # 실시간 점수 재계산
│       │   ├── leadingStockService.ts  # 주도주/섹터 분석
│       │   ├── performanceService.ts   # 성적표 레코드 생성/채움
│       │   ├── dailyReportService.ts   # 일별 리포트 생성/백필 (GPT 요약)
│       │   ├── themePriceCache.ts      # 주가 배치 캐싱
│       │   ├── crawler.ts / themeCrawler.ts # 뉴스/테마 크롤러
│       │   ├── naverApi.ts             # 네이버 검색 API
│       │   ├── memoryDiagnostics.ts    # 메모리 진단 스냅샷
│       │   └── telegramBot.ts          # 텔레그램 알림봇
│       ├── utils/
│       │   └── marketStatus.ts      # 장 상태 (KST, 정규장/시간외/마감)
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

# JWT 서명 시크릿 (필수 — 미설정 시 서버 부팅 실패)
JWT_SECRET=...

# KIS Open API (실시간 시세 / 지수 / 야간선물)
KIS_APP_KEY=...
KIS_APP_SECRET=...
KIS_ACCOUNT_NO=...
KIS_IS_MOCK=false

# 네이버 API (뉴스 검색)
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...

# OpenAI (일별 리포트 GPT 요약, 선택)
OPENAI_API_KEY=...

# 텔레그램 알림봇 (선택, 없으면 봇 비활성화)
TELEGRAM_BOT_TOKEN=...

# 매매일지 접근 비밀번호 (선택, 미설정 시 전원 차단)
TRADING_PASSWORD=...
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
- `GET /api/leading/hot` - 주도주 점수 TOP 종목 (연속일 포함)
- `GET /api/leading/calendar` - 캘린더 데이터 (월별)
- `GET /api/leading/calendar/:date` - 특정 날짜 상세

### 성적표
- `GET /api/performance/summary` - 7/30/90일 윈도우별 S·A 등급 성적 요약
- `GET /api/performance/daily?days=N` - 날짜별 종목 성적 리스트 (최대 90일)

### 리포트
- `GET /api/report?limit=N` - 최근 일별 리포트 목록
- `GET /api/report/:date` - 특정 날짜 리포트 상세

### 지수
- `GET /api/indices` - 전체 (KOSPI/KOSDAQ 지수 + NASDAQ 선물)
- `GET /api/indices/kospi-index` / `kosdaq-index` / `nasdaq` - 개별 조회

### 테마 / 뉴스 / 주식
- `GET /api/themes`, `GET /api/themes/:themeName`
- `GET /api/news`, `GET /api/news/by-theme/:themeName`
- `GET /api/stocks/:stockCode`

### 어드민 / 진단
- `GET /api/admin/stats` - 대시보드 통계
- `GET /health` - 헬스 체크 (MongoDB, 메모리)
- `GET /health/memory` - 메모리 진단 (의심 자료구조 크기 스냅샷)

## 스크립트

```bash
pnpm dev              # 클라이언트 + 서버 동시 실행
pnpm dev:client       # 클라이언트만 실행
pnpm dev:server       # 서버만 실행
pnpm build            # 전체 빌드
```
