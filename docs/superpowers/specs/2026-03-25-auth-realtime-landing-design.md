# Auth + Realtime WebSocket + Landing Page Design

## Overview

TEBURN에 소셜 로그인 인증, 실시간 WebSocket 시세, 실시간 주도주 점수, 랜딩 페이지를 추가한다.

- 로그인 유저: 실시간 가격 + 실시간 주도주 점수 (WebSocket)
- 비로그인 유저: 기존 5분 폴링 유지
- 첫 방문 비로그인 유저: 랜딩 페이지 -> 로그인 유도

---

## 1. Authentication

### Provider
- 카카오 + 구글 (OAuth 2.0)
- Passport.js 사용

### User Model (MongoDB)

```typescript
{
  name: string;
  email: string;
  profileImage?: string;
  provider: 'kakao' | 'google';
  providerId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

- Unique index: `{ provider, providerId }`

### Server Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/kakao` | 카카오 OAuth 시작 |
| GET | `/api/auth/kakao/callback` | 카카오 콜백 -> JWT 발급 |
| GET | `/api/auth/google` | 구글 OAuth 시작 |
| GET | `/api/auth/google/callback` | 구글 콜백 -> JWT 발급 |
| GET | `/api/auth/me` | 현재 유저 조회 (JWT 검증) |
| POST | `/api/auth/logout` | 로그아웃 (쿠키 삭제) |

### JWT Strategy
- 로그인 성공 시 JWT를 httpOnly cookie로 발급
- Cookie 설정: `httpOnly: true`, `Secure: true`, `SameSite: Lax` (OAuth redirect 호환)
- 토큰 페이로드: `{ userId, provider }`
- 만료: 7일
- `JWT_SECRET` 환경변수로 서명키 관리
- `/api/auth/me`에서 토큰 검증 후 유저 정보 반환

### OAuth Security
- Kakao/Google 모두 Passport의 `state` 파라미터 활성화 (CSRF 방지)
- callback URL은 환경변수로 관리 (`KAKAO_CALLBACK_URL`, `GOOGLE_CALLBACK_URL`)

### Client
- `AuthProvider` context: 로그인 상태 전역 관리
- `useAuth()` 훅: `{ user, isLoggedIn, login, logout }`
- 앱 마운트 시 `/api/auth/me` 호출하여 세션 복원
- 헤더에 로그인/프로필 버튼

### Dependencies (Server)
- `passport`, `passport-kakao`, `passport-google-oauth20`
- `jsonwebtoken`
- `cookie-parser` (이미 있으면 스킵)

---

## 2. Realtime WebSocket

### Architecture

```
Kiwoom WS --onRealtimePrice--> realtimeHotness (점수 재계산)
                                      |
                                      v
                              Server WS Server --broadcast--> Logged-in Clients
                                      |
                              JWT verification
                              (first-message auth)
```

### Server Changes

**server.ts 변경**:
```typescript
// Before
app.listen(PORT, ...)

// After
const server = http.createServer(app);
server.listen(PORT, ...)
// wsServer.ts에서 server 인스턴스 받아서 WebSocket.Server 생성
```

**WebSocket 연결 핸들링** (`services/wsServer.ts`):
- 연결 후 **첫 메시지로 JWT 토큰 전송** (query param 방식은 보안상 사용하지 않음)
- 인증 타임아웃: 5초 내 토큰 미전송 시 연결 종료
- 비로그인이면 연결 거부 (close with 4001)
- 인증된 클라이언트를 `Set<WebSocket>`으로 관리
- **서버 ping/keepalive**: 30초마다 ping frame 전송 (Railway 60초 idle timeout 대응)

**장 마감 연결 정리**:
- 장 마감 (15:30) 후 `marketStatus`를 확인하여 모든 클라이언트에게 `{ type: "marketClosed" }` 전송 후 연결 종료
- 키움 WS 구독도 해제 (`stopKiwoomWebSocket()` 호출)
- 클라이언트: `marketClosed` 수신 시 폴링 모드로 전환, 재연결 시도 안 함
- 다음 장 시작 (09:00): 클라이언트가 `marketStatus` API 폴링으로 장 시작 감지 -> WebSocket 재연결

**구독 관리**:
- 주도주 TOP 30: 항상 키움 WS에 구독, 모든 로그인 유저에게 broadcast
- 종목 상세: 클라이언트가 `{ type: "subscribe", stockCode: "005930" }` 메시지 전송
- 참조 카운트: 전역 구독(주도주) + 개별 구독(상세) 분리 관리. 주도주 목록 갱신 시 개별 구독은 유지
- 5분마다 주도주 목록 갱신 시 전역 구독 종목만 업데이트
- 키움 WS `grp_no: '1'` 단일 그룹 사용 (기존과 동일), 전역+개별 구독을 합산해서 등록

**키움 WS 연동**:
```typescript
onRealtimePrice((stockCode, price, changeRate, volume) => {
    // 1. 가격 메시지 broadcast
    broadcastToSubscribers(stockCode, {
        type: 'price',
        stockCode, price, changeRate, volume,
        timestamp: Date.now(),
    });

    // 2. 주도주 점수 실시간 재계산 (해당 종목이 주도주 목록에 있으면)
    const updatedScore = realtimeHotnessUpdate(stockCode, price, changeRate, volume);
    if (updatedScore) {
        broadcastAll({
            type: 'hotness',
            stockCode,
            ...updatedScore,
            timestamp: Date.now(),
        });
    }
});
```

### Client Changes

**`hooks/useRealtimePrice.ts`**:
- 로그인 유저: WebSocket 연결, 실시간 가격 수신
- 비로그인 유저: 기존 TanStack Query 폴링 유지
- WebSocket 연결 실패 시 폴링으로 자동 fallback
- 재연결 로직: exponential backoff (1s, 2s, 4s, max 30s)

**메시지 포맷 (Server -> Client)**:

가격 업데이트:
```json
{
    "type": "price",
    "stockCode": "005930",
    "price": 72000,
    "changeRate": 1.23,
    "volume": 5000,
    "timestamp": 1711350000000
}
```

주도주 점수 업데이트:
```json
{
    "type": "hotness",
    "stockCode": "005930",
    "totalScore": 85,
    "grade": "S",
    "tradingValueScore": 22,
    "momentumScore": 20,
    "volumeScore": 18,
    "newsScore": 12,
    "themeConcentrationScore": 13,
    "timestamp": 1711350000000
}
```

**메시지 포맷 (Client -> Server)**:
```json
{ "type": "auth", "token": "eyJhbG..." }
{ "type": "subscribe", "stockCode": "005930" }
{ "type": "unsubscribe", "stockCode": "005930" }
```

### Integration Points
- `HotStocksView`: 로그인 시 WebSocket으로 가격 + 점수 실시간 갱신, 비로그인 시 기존 폴링
- `StockDetailPage`: 로그인 시 해당 종목 subscribe, 페이지 떠날 때 unsubscribe
- `TickerStrip`: 로그인 시 실시간 가격
- 기존 `usePriceFlashAndRank` 훅은 데이터 소스만 바뀌고 로직은 동일하게 활용

---

## 3. Realtime Hotness Score

### Hybrid Approach

실시간 계산 가능한 항목 (70점분)은 체결 데이터로 즉시 재계산하고, 외부 API 의존 항목 (30점분)은 5분 배치로 유지한다.

| 항목 | 배점 | 실시간 | 소스 |
|------|------|--------|------|
| 거래대금 | 25점 | O | 실시간 체결가 x 거래량 누적 |
| 모멘텀/등락률 | 25점 | O | 실시간 등락률 |
| 거래량 | 20점 | O | 실시간 거래량 누적 |
| 뉴스 | 15점 | X | 네이버 API (5분 배치) |
| 테마 집중도 | 15점 | X | 같은 테마 종목 데이터 필요 (5분 배치) |

### Implementation (`services/realtimeHotness.ts`)

- 주도주 TOP 30의 현재 점수를 인메모리에 유지
- 실시간 체결 데이터가 오면 거래대금/모멘텀/거래량 점수만 재계산
- 뉴스/테마 집중도 점수는 마지막 배치 계산값 유지
- 총점 = 실시간 3항목 + 배치 2항목
- 등급(S/A/B/C/D) 재판정
- 순위 변동 시 클라이언트에 broadcast

### Score Refresh Cycle
- 실시간: 체결 발생 시마다 (거래대금, 모멘텀, 거래량)
- 5분 배치: 뉴스 점수, 테마 집중도 점수 갱신
- 배치 갱신 시 실시간 점수와 merge

---

## 4. Landing Page

### Purpose
비로그인 유저가 `teburn.com` 첫 방문 시 서비스 소개 + 로그인 유도.

### Routing
- 비로그인 -> `/` 랜딩 페이지
- 로그인 -> `/` 기존 대시보드

`app/page.tsx`에서 `useAuth()` 상태로 분기.

### Sections (TradingView 참고)

1. **Hero**: 강렬한 헤드라인 ("오늘의 주도주를 찾아라") + 실시간 데이터 미리보기 (주도주 TOP 5 가격 움직임) + CTA "무료로 시작하기"
2. **Features**: 핵심 기능 카드 3~4개 (주도주 분석, 실시간 시세, 테마 분석, 거래량 급증 감지)
3. **Preview**: 실제 대시보드 스크린샷 또는 라이브 미리보기
4. **CTA Bottom**: "지금 시작하기" -> 소셜 로그인

### Design
- 다크 톤 기반 (현재 다크모드 스타일 활용)
- 금융/트레이딩 느낌
- 반응형 (모바일 우선)

---

## Scaling Notes

- 현재 Railway 단일 인스턴스 전제. `Set<WebSocket>` 인메모리 관리.
- 멀티 인스턴스 필요 시 Redis pub/sub으로 전환 필요 (현재는 불필요).
- 키움 WS 종목 구독 수 제한 주의. 전역(30) + 개별 구독 합산 모니터링.

---

## Implementation Order

1. **인증 시스템** -- User 모델, OAuth 라우트, JWT, AuthProvider
2. **WebSocket 서버** -- wsServer.ts, 키움 WS 연동, 구독 관리
3. **실시간 주도주 점수** -- realtimeHotness.ts, 하이브리드 계산
4. **WebSocket 클라이언트** -- useRealtimePrice 훅, 컴포넌트 연동
5. **랜딩 페이지** -- 디자인 + 라우팅 분기

---

## Out of Scope
- 프리미엄 결제 시스템 (추후)
- 이메일/비밀번호 로그인 (소셜만)
- 관심 종목, 알림 설정 (추후)
- 매매일지 자동화 (별도 스펙)
