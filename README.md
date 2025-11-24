# StockLight

뉴스를 종목과 즉시 연결해 호재/악재를 보여주는 PC 웹 대시보드를 목표로 합니다. 프론트는 Next.js, 백엔드는 Express + MongoDB로 구성된 모노레포입니다.

## 기술 스택
- 프론트엔드: Next.js 16 (App Router), React 19, TypeScript, Tailwind
- 백엔드: Express, TypeScript, Mongoose
- 패키지 매니저/모노레포: pnpm workspaces

## 디렉터리 구조
- `apps/client`: Next.js 웹 클라이언트
- `apps/server`: Express API 서버 (TS)
- 루트: 워크스페이스 설정(`pnpm-workspace.yaml`), 공통 스크립트/의존성

## 빠른 시작
1) 요구사항: Node 18+ 추천, pnpm 설치
2) 의존성 설치 (루트): `pnpm install`
3) 환경변수 설정: `cp apps/server/.env.example apps/server/.env` 후 `MONGO_URI` 채우기 (`PORT` 기본 8080)
4) 개발 서버 동시 실행: 루트에서 `pnpm dev` (client: 3000, server: 8080)
   - 개별 실행: `pnpm dev:client`, `pnpm dev:server`

## 자주 쓰는 스크립트
- 루트: `pnpm dev` / `pnpm dev:client` / `pnpm dev:server`
- 서버: `pnpm build` (TS -> dist), `pnpm start` (빌드 결과 실행)
- 클라이언트: `pnpm lint`, `pnpm build`, `pnpm start`

## 다음 단계 TODO
- MongoDB Atlas 연결 확인 및 헬스체크 엔드포인트 테스트
- 네이버 뉴스 API/키 연동, OpenAI 분석 로직 추가
- 뉴스 수집/분석 결과 스키마 정의 및 API 라우트 설계
- 클라이언트: 3단 대시보드 레이아웃, API 연동, 상태 관리(TanStack Query) 적용
