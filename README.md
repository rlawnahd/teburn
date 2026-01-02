# TEBURN

> 오늘 불붙은 테마를 가장 빠르게, 지금 타오르는 테마를 찾아라

테마별 주식 시세와 관련 뉴스를 실시간으로 모니터링하는 PC 웹 대시보드입니다. 네이버 금융 테마 데이터와 KIS 실시간 시세를 연동하여 테마별 등락률, 대장주, 관련 뉴스를 한눈에 확인할 수 있습니다.

## 주요 기능

### 테마 관리
- 네이버 금융에서 테마 목록 및 구성 종목 자동 크롤링
- 매일 1회 자동 업데이트
- 테마별 키워드 관리

### 실시간 시세
- KIS WebSocket을 통한 실시간 주가 연동
- 테마별 평균 등락률 계산
- 대장주 및 거래대금 순위 표시
- 등락률 추이 차트 (오늘/1일/7일/30일)

### 뉴스 연동
- 네이버 금융 증권 뉴스 10초마다 자동 크롤링
- 테마명, 종목명, 키워드 기반 관련 뉴스 매칭
- 뉴스 탭에서 페이지네이션으로 조회

### UI/UX
- 토스 스타일 모던 디자인
- 플립 카드 효과 (호버 시 대장주/거래대금 표시)
- 테마 상세 페이지 (시세/뉴스 탭 분리)
- 실시간 LIVE 인디케이터

## 기술 스택

- **프론트엔드**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Recharts
- **백엔드**: Express, TypeScript, Mongoose, Socket.IO
- **데이터**: MongoDB, KIS Open API (실시간 시세)
- **패키지 매니저**: pnpm workspaces (모노레포)

## 디렉터리 구조

```
apps/
├── client/                 # Next.js 웹 클라이언트
│   ├── app/
│   │   ├── page.tsx       # 메인 페이지 (테마 카드 목록)
│   │   └── themes/[themeName]/
│   │       └── page.tsx   # 테마 상세 페이지
│   ├── components/
│   │   └── layout/
│   │       └── Sidebar.tsx
│   ├── hooks/
│   │   └── useRealtimeStockPrices.ts
│   └── lib/api/           # API 클라이언트
│
├── server/                 # Express API 서버
│   └── src/
│       ├── models/        # MongoDB 스키마
│       │   ├── News.ts
│       │   └── Theme.ts
│       ├── routes/        # API 라우트
│       │   ├── news.ts
│       │   ├── themes.ts
│       │   └── stocks.ts
│       ├── services/      # 비즈니스 로직
│       │   ├── crawler.ts           # 뉴스 크롤러
│       │   ├── themeCrawler.ts      # 테마 크롤러
│       │   ├── kisWebSocket.ts      # KIS 실시간 시세
│       │   └── themeHistoryService.ts
│       └── server.ts      # 서버 엔트리
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

# KIS Open API (실시간 시세용)
KIS_APP_KEY=...
KIS_APP_SECRET=...
KIS_ACCOUNT_NO=...
```

```bash
# 3. 개발 서버 실행
pnpm dev

# 클라이언트: http://localhost:3000
# 서버: http://localhost:4000
```

## API 엔드포인트

### 테마
- `GET /api/themes` - 테마 목록 조회
- `GET /api/themes/:themeName` - 테마 상세 조회
- `GET /api/themes/:themeName/realtime` - 테마 실시간 시세
- `GET /api/themes/all-rates` - 전체 테마 등락률
- `GET /api/themes/:themeName/history` - 테마 등락률 히스토리

### 뉴스
- `GET /api/news` - 뉴스 목록
- `GET /api/news/by-theme/:themeName` - 테마별 관련 뉴스

### 주식
- `GET /api/stocks/:stockCode` - 종목 현재가

## 스크립트

```bash
# 개발
pnpm dev              # 클라이언트 + 서버 동시 실행
pnpm dev:client       # 클라이언트만 실행
pnpm dev:server       # 서버만 실행

# 빌드
pnpm build            # 전체 빌드
pnpm --filter client build
pnpm --filter server build

# 린트
pnpm --filter client lint
```

## WebSocket 이벤트

### 클라이언트 → 서버
- `subscribeStockPrices` - 실시간 주가 구독
- `unsubscribeStockPrices` - 구독 해제

### 서버 → 클라이언트
- `themePricesUpdate` - 테마별 실시간 시세 업데이트 (1초마다)
