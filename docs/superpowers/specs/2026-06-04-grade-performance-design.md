# 등급 성적표 (Grade Performance) 설계

날짜: 2026-06-04
상태: 승인됨

## 목적

주도주 점수(S/A등급)가 실제로 유효했는지 수익률로 자체 검증하고 공개한다.
서비스 신뢰도 확보(리텐션)와 콘텐츠 소재(유입)를 동시에 노린다.

- 타겟: 장중 트레이더 + 퇴근 후 직장인 투자자
- 노출: 전용 페이지 `/performance`만 (v1). 텔레그램/대시보드 연동은 차후
- 추적 범위: S등급 + A등급

## 측정 방법론 (페이지에 명시)

- D일 15:35 저장된 `HotnessHistory` 기준 S/A등급 종목이 대상
- **D+1 거래일 시가 매수** 가정 (알림 받은 유저가 실제로 따라할 수 있는 기준)
- 수익률 윈도우 2개:
  - `returnD1` = D+1 종가 / D+1 시가 - 1 (단타 관점)
  - `returnD5` = D+5 종가 / D+1 시가 - 1 (스윙 관점)
  - 기산 정의: 진입일(D+1 거래일)을 1일째로 세어 5일째 거래일 종가가 `d5Close`
    (= 진입일 이후 4거래일 뒤. 예: 월요일 진입 → 금요일 종가)
- 동일가중 평균, 수수료/슬리피지 미반영 (방법론 노트에 명시)
- 휴장일: "다음 거래일"로 자동 처리 (KIS 일봉 데이터의 실제 거래일 기준)
- 거래정지/상장폐지로 일봉이 없는 종목: `excluded` 처리, 통계에서 제외하되 표본에서 빠졌음을 표기
- 상한가 갭으로 시가 매수가 사실상 불가능한 케이스: v1에서는 그대로 포함, 방법론에 한 줄 명시

## 데이터 모델

새 컬렉션 `GradePerformance` (mongoose 모델 `apps/server/src/models/GradePerformance.ts`):

```
stockCode    string  (required)
stockName    string  (required)
grade        'S' | 'A'
totalScore   number          // 등급일 당시 점수
date         string  YYYY-MM-DD  // 등급일 D
entryPrice   number | null   // D+1 거래일 시가
d1Close      number | null   // D+1 거래일 종가
d5Close      number | null   // D+5 거래일 종가
returnD1     number | null   // %
returnD5     number | null   // %
status       'pending' | 'partial' | 'complete' | 'excluded'
createdAt    Date
```

- unique index: `(stockCode, date)`
- TTL 없음 — 성적 기록은 영구 보관 (`HotnessHistory`의 90일 TTL과 분리하는 이유)
- status 전이: `pending`(레코드 생성) → `partial`(D+1 채움) → `complete`(D+5 채움). 일봉 조회 결과 데이터가 없으면 `excluded`

## 가격 데이터 소스

KIS 일봉 API (`inquire-daily-price`, FHKST01010400 계열) 사용.

- 종목당 1콜로 최근 30거래일 시가/종가를 모두 얻음 → 한 종목의 여러 날짜 레코드를 한 번에 채움
- 모든 호출은 기존 `kisRateLimiter`(`acquireKisToken`, 초당 3건)를 통과
- 신규 서비스 파일: `apps/server/src/services/performanceService.ts`

## 배치

### 일일 채움 (fillPerformanceRecords)

기존 `checkMarketCloseSchedule`(server.ts, 평일 15:35~15:40 블록)에 추가:

1. 오늘 날짜의 S/A등급 종목을 `hotStocksCache`에서 읽어 `pending` 레코드 upsert
2. `status in (pending, partial)`인 전체 레코드를 종목별로 그룹핑
3. 종목별 일봉 1콜 → 해당 종목의 모든 미완성 레코드에 entryPrice/d1Close/d5Close 채움
4. returnD1/returnD5 계산, status 갱신

예상 호출량: 하루 ~30콜 내외 (미완성 레코드의 고유 종목 수).

### 소급 백필 (backfillPerformance)

배포 후 1회 실행 (서버 시작 시 GradePerformance가 비어 있으면 자동 실행):

1. `HotnessHistory`에서 지난 90일 S/A 레코드 전체 조회 (~수백 개)
2. 종목별 그룹핑 → 일봉 조회 → 레코드 생성+채움
3. 고유 종목 수백 개 × 초당 3건 = 약 2~5분 소요. 서버 시작 블로킹 금지 (백그라운드)

주의: KIS 일봉은 1콜에 최근 30거래일 — 90일 백필에는 기간 지정 조회(FHKST03010100,
inquire-daily-itemchartprice)로 시작일~종료일 지정 1콜 처리.

## API

`apps/server/src/routes/performance.ts`:

- `GET /api/performance/summary`
  - 윈도우: 7/30/90일 × 등급(S/A) 별로 평균 returnD1, 평균 returnD5, 승률(returnD1>0 비율), 표본 수, 최고/최악 종목
  - 인메모리 캐시 1시간 (단일 객체 — 메모리 누수 패턴 금지: Map 누적 대신 단일 캐시 객체 교체)
- `GET /api/performance/daily?days=30`
  - 날짜별 그룹: 해당일 S/A 종목 리스트 + 개별 수익률 + status

## 클라이언트

`apps/client/app/performance/page.tsx` — SSR:

- 상단: 요약 카드 (S vs A — 평균 수익률, 승률, 표본 수. 7/30/90일 탭)
- 본문: 일자별 아코디언 테이블 (날짜 → 종목 행: 종목명, 등급, 점수, D+1 수익률, D+5 수익률)
- 하단: 방법론 노트 (측정 기준 전문)
- 수익률 색상: 기존 디자인 시스템의 상승/하락 색 재사용
- SEO 메타: "주도주 성적표 — S등급 주도주 실제 수익률 검증" 류 타이틀/디스크립션
- 음수 성적도 그대로 노출 (필터링/미화 없음 — 기능의 본질)

## 엣지 케이스

| 케이스 | 처리 |
|---|---|
| D+1이 휴장 | KIS 일봉의 다음 실제 거래일 사용 |
| 거래정지/상폐 | 일봉 누락 → `excluded`, 통계 제외 + 표기 |
| 백필 중 KIS 장애 | 미완성 status 유지 → 다음 일일 배치에서 재시도 |
| 같은 종목이 연속 N일 S등급 | 날짜별 독립 레코드 (각각 측정) |
| D+5 미도래 | `partial` 상태로 D+1 수익률만 표시 |

## 테스트

- `performanceService` 단위 테스트: 수익률 계산, status 전이, 휴장일 처리(일봉 누락 시 다음 거래일 선택), excluded 처리
- 일봉 API 응답은 fixture로 모킹 (KIS 실호출 없이)
- 백필 아이덤포턴시: 두 번 실행해도 중복 레코드 없음 (unique index + upsert)

## 비범위 (v1 제외)

- 텔레그램 요약 연동, 대시보드 위젯
- B/C/D 등급 추적
- 상한가 갭 매수 불가 보정
- 누적 수익률 곡선/백테스트 차트
