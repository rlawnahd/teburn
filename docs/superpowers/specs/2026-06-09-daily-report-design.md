# 일별 마감 리포트 (Daily Report) 설계

날짜: 2026-06-09
상태: 승인됨

## 목적

매일 쌓이는 주도주/테마 데이터를 자동 생성 SSR 페이지(`/report/YYYY-MM-DD`)로 만들어
롱테일 검색 유입(SEO)을 확보한다. "N월 N일 주도주", "[날짜] 급등 테마" 류 검색을 매일 자동으로 흡수.

- 콘텐츠 성격: **데이터 표 + AI 요약 문단** (고유 텍스트로 SEO 강화)
- AI 생성 시점: **장마감 배치에서 1회 생성·DB 저장** (비용 고정, forward-only)
- 발견 경로: `/report` 목록 페이지 + 사이트맵 동적 등록 + 캘린더→리포트 연결

## 핵심 제약: 데이터 스냅샷

`DailyLeadingTheme`(90일 TTL)와 `HotnessHistory`(90일 TTL)는 만료된다.
리포트는 영구 SEO 자산이므로 그날 데이터를 `DailyReport`에 **복사 저장(스냅샷)** 한다.
→ 90일 후 원본이 만료돼도 리포트 페이지는 깨지지 않는다.

## 데이터 모델

새 컬렉션 `DailyReport` (`apps/server/src/models/DailyReport.ts`), TTL 없음:

```
date         string  (YYYY-MM-DD, required, unique index)
aiSummary    string  (default '')        // GPT 2~3문단 시장 요약. 실패 시 ''
topThemes    ReportTheme[]               // 스냅샷
topStocks    ReportStock[]               // 스냅샷
generatedAt  Date
createdAt    Date

ReportTheme: { rank, themeName, avgChangeRate, topStock, topStockRate }
ReportStock: { rank, stockCode, stockName, changeRate, tradingValue, grade, score, themes: string[] }
```

- unique index: `date`
- TTL 없음 — 영구 보관

## 생성 (장마감 배치, forward-only)

`apps/server/src/services/dailyReportService.ts` 신규.

기존 `server.ts`의 15:35 장마감 블록(`checkMarketCloseSchedule` 내, 성적표 갱신 다음)에 호출 추가:

```
generateDailyReport(kstToday):
  1. 이미 그날 DailyReport 있으면 skip (멱등)
  2. 그날 top테마·top주도주 수집:
     - topStocks: getHotStocksCache()에서 상위 N개 (grade/score 포함)
     - topThemes: DailyLeadingTheme(그날) 또는 leadingStockService에서
  3. 수집 데이터가 비었으면 skip (장 안 열린 날 등)
  4. GPT(gpt-5.4-nano)로 한국어 2~3문단 요약 생성
     - 프롬프트: 그날 주도테마 목록 + 대장주 목록 + 등락률 → "오늘 시장 요약"
     - 실패 시 aiSummary='' 로 진행 (표는 정상)
  5. DailyReport upsert (date 기준, $set)
```

- OpenAI 클라이언트/모델은 기존 `marketThemeService.ts` 패턴(`gpt-5.4-nano`) 재사용
- forward-only: 과거 소급 백필 없음 (내일 마감부터 누적)
- 멱등: 같은 날 두 번 실행해도 GPT 재호출 없이 skip (이미 있으면)

## API

`apps/server/src/routes/report.ts`:

- `GET /api/report/:date` — 단일 리포트 (`{success, data: DailyReport | null}`). 없으면 data: null
- `GET /api/report?limit=30` — 최근 리포트 목록 (date desc, 최대 90). 사이트맵/인덱스용.
  응답: `{success, data: { reports: [{date, summary요약앞부분, themeCount, stockCount}] }}`

## 클라이언트 페이지

### `/report/[date]/page.tsx` — SSR + 1h ISR
- `GET /api/report/:date` 페치. data null이면 `notFound()` (404)
- 구성(위→아래):
  1. 홈 링크 + h1 "{YYYY년 M월 D일} 주도주·급등테마 분석"
  2. **AI 요약 문단** (aiSummary; 빈값이면 섹션 생략)
  3. 주도테마 표 (순위, 테마명, 평균등락률, 대장주)
  4. 주도주 표 (순위, 종목명[/stocks 링크], 등급, 등락률, 거래대금)
  5. 하단: `/today`, `/performance`로 상호링크
- `generateMetadata`: 날짜별 동적 — title "{날짜} 주도주·급등테마 분석 | TEBURN", description은 그날 top테마/대장주 포함, canonical `https://teburn.com/report/{date}`
- 디자인 토큰 준수(`--bg-secondary`, `card`, `--rise-color`/`--fall-color`, `--accent-blue`), today/performance 페이지 컨벤션 따름

### `/report/page.tsx` — 인덱스(허브)
- `GET /api/report?limit=30` 페치
- 최근 리포트 날짜순 목록 (날짜 + 요약 첫 줄 미리보기 → `/report/{date}` 링크)
- 메타데이터: "주도주 일별 리포트 — 날짜별 시장 분석 아카이브 | TEBURN"

## 발견 경로

1. **사이트맵** (`apps/client/app/sitemap.ts`): `/api/report?limit=...`에서 날짜 가져와 `/report/{date}` URL 동적 추가 + `/report` 인덱스 추가
2. **캘린더 연결**: `CalendarDetailModal`에 "📄 이 날 리포트 보기" 링크 → `/report/{date}`. 리포트 있는 날만 노출(모달에서 존재 확인 또는 항상 노출 후 404 허용 — v1은 항상 노출, 단 최근 날짜 위주라 실허용)
3. **네비**: 헤더/푸터에 `/report`("일별 리포트") 링크 추가

## 엣지 케이스

| 케이스 | 처리 |
|---|---|
| 장 안 열린 날(주말/공휴일) | 수집 데이터 없음 → 리포트 미생성 → 페이지 404 |
| GPT 생성 실패 | 스냅샷만 저장, aiSummary='' → 표만 노출, 다음날 재시도 안 함(수동 재생성 가능) |
| 잘못된 날짜 형식 URL | API data null → notFound() 404 |
| 같은 날 배치 2회 | 이미 존재 시 skip (GPT 재호출 없음) |
| 미래 날짜 | data null → 404 |

## 테스트

- `dailyReportService` 순수 로직 분리: GPT 프롬프트 빌더(`buildReportPrompt(themes, stocks)`)를 순수 함수로 분리해 단위 테스트 (입력 데이터 → 프롬프트 문자열 형태 검증)
- GPT 호출/DB는 I/O라 단위 테스트 제외 (얇게 유지)
- 멱등성: 같은 날 generateDailyReport 두 번 호출 시 두 번째는 GPT 미호출 (로직 검증)

## 비범위 (v1 제외)

- 과거 소급 백필
- 종목별/테마별 개별 리포트 페이지
- 리포트 내 차트/그래프 (표 + 텍스트만)
- 다국어
