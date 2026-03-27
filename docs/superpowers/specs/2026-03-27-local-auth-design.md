# 아이디/비밀번호 회원가입 설계

## 개요

기존 OAuth(카카오/Google) 로그인에 아이디/비밀번호 자체 회원가입을 추가한다.

## 결정 사항

- **아이디 규칙**: 영문/숫자만, 4~20자, 소문자로 정규화 (대소문자 구분 안 함)
- **비밀번호 규칙**: 최소 8자, 최대 72자 (bcrypt 제한)
- **이메일 인증**: 없음
- **닉네임**: 아이디가 곧 표시 이름
- **비밀번호 해싱**: bcrypt (salt rounds: 10)
- **토큰**: 기존 JWT httpOnly 쿠키 방식 그대로

## User 모델 변경

```typescript
// provider 타입에 'local' 추가
provider: 'kakao' | 'google' | 'local'

// 새 필드 추가
password?: string  // bcrypt 해시, local일 때만 존재

// local 유저의 경우
// - providerId = username (아이디)
// - name = username (아이디)
// - email = '' (빈 문자열)
```

기존 unique index `{ provider: 1, providerId: 1 }`이 그대로 아이디 중복을 방지한다.

## 서버 API

### POST /api/auth/signup

**Request:**
```json
{ "username": "trader123", "password": "mypassword" }
```

**성공 (201):**
- JWT 쿠키 세팅
- `/me`와 동일한 shape 반환: `{ id, name, email, profileImage, provider }`

**실패:**
- 400: 아이디 규칙 위반 / 비밀번호 8~72자 위반
- 409: 아이디 중복

**로직:**
1. username 소문자 변환 + 유효성 검증 (영문/숫자, 4~20자)
2. password 유효성 검증 (8~72자)
3. 중복 확인: `User.findOne({ provider: 'local', providerId: username })`
4. bcrypt.hash(password, 10)
5. User.create({ name: username, email: '', provider: 'local', providerId: username, password: hashedPassword })
6. generateToken({ userId, provider: 'local' })
7. 쿠키 세팅 + 응답

### POST /api/auth/login

**Request:**
```json
{ "username": "trader123", "password": "mypassword" }
```

**성공 (200):**
- JWT 쿠키 세팅
- `/me`와 동일한 shape 반환

**실패:**
- 401: 아이디 없음 / 비밀번호 불일치

**로직:**
1. `User.findOne({ provider: 'local', providerId: username })` (+password 필드 select)
2. bcrypt.compare(password, user.password)
3. generateToken + 쿠키 세팅

### GET /api/auth/check-username/:username

**성공 (200):**
```json
{ "available": true }
```

**실패:**
- 400: 유효성 검증 실패 (형식 불일치)

**로직:**
1. username 소문자 변환 + 유효성 검증 (실패 시 400)
2. 중복 확인 후 available 반환

## 클라이언트 변경

### LoginModal 수정

기존 OAuth 버튼 위에 아이디/비밀번호 로그인 폼 추가:

```
┌─────────────────────────────┐
│         로그인               │
│                             │
│  아이디  [____________]     │
│  비밀번호 [____________]     │
│                             │
│  [     로그인     ]         │
│                             │
│  계정이 없으신가요? 회원가입  │
│                             │
│  ─── 또는 ───               │
│                             │
│  [🟡 카카오로 시작하기]      │
│  [🔵 Google로 시작하기]      │
└─────────────────────────────┘
```

회원가입 클릭 시:

```
┌─────────────────────────────┐
│         회원가입              │
│                             │
│  아이디  [____________]     │
│  (영문/숫자 4~20자)          │
│                             │
│  비밀번호 [____________]     │
│  (8자 이상)                  │
│                             │
│  비밀번호 확인 [____________] │
│                             │
│  [     가입하기     ]        │
│                             │
│  이미 계정이 있으신가요? 로그인│
└─────────────────────────────┘
```

### API 레이어 (auth.ts)

```typescript
signup(username: string, password: string): Promise<AuthUser>
login(username: string, password: string): Promise<AuthUser>
checkUsername(username: string): Promise<{ available: boolean }>
```

### AuthUser 타입 변경

```typescript
provider: 'kakao' | 'google' | 'local'
```

## 클라이언트 상태 관리

- `AuthProvider`에 `refreshUser()` 메서드 추가 (fetchCurrentUser 재호출)
- signup/login 성공 후 `refreshUser()` 호출하여 AuthContext 갱신
- 비밀번호 확인은 클라이언트에서만 검증 (서버로 전송하지 않음)

## 보안

- bcrypt salt rounds: 10
- 비밀번호 필드는 기본 쿼리에서 제외 (`select: false`)
- 로그인 실패 시 "아이디 또는 비밀번호가 일치하지 않습니다" (어떤 게 틀렸는지 구분하지 않음)
- 기존 httpOnly / secure / sameSite 쿠키 정책 유지
- Rate limiting: `express-rate-limit`으로 login/signup/check-username에 IP당 분당 10회 제한
- 아이디는 소문자로 정규화하여 저장 (대소문자 충돌 방지)

## 의존성

- `bcryptjs` 패키지 추가 (서버) — pure JS, native build 불필요
- `express-rate-limit` 패키지 추가 (서버)
