# DODAM - Always Connected

> 위기 상황에서 피해자와 보호자를 잇는 긴급 연결 플랫폼

검색창 기반 긴급 연결 웹서비스. 사용자가 위급 상황에서 "일상적인 검색 UI"에 약속 코드를 입력하면, 보호자에게 자동으로 알림이 발송되고 긴급 채팅방이 생성됩니다.

**Live**: [dodam.hyunshu.com](https://dodam.hyunshu.com)

## 핵심 기능

- **검색 위장 긴급 진입** -- 약속 코드 입력 시 긴급 모드 활성화, 오답 시 일반 검색 결과 표시
- **듀레스 코드** -- 겉보기 정상 코드로 숨겨진 긴급 플래그 전송
- **2차 인증** -- 보안 질문을 통한 추가 본인 확인
- **긴급 채팅** -- 텍스트 + 파일 + 프리셋 메시지 지원
- **AI 분석** -- 대화 기반 피싱 위험도 판별 (Gemini / 규칙 기반 fallback)
- **보호자 대시보드** -- AI 요약, 위험 신호, 행동 가이드 체크리스트
- **데이터 보안** -- AES-256-GCM 필드 암호화, 약속 코드 bcrypt 해시

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS 4 |
| Backend | Next.js API Routes (20개 엔드포인트) |
| Database | PostgreSQL (Supabase) + Prisma ORM 7 |
| Auth | JWT (httpOnly cookie) + bcrypt |
| Encryption | AES-256-GCM (필드 레벨 암호화) |
| AI | Google Gemini 2.0 Flash (primary) + 규칙 기반 (fallback) |
| Deploy | Cloudflare Workers (OpenNext.js) |

## 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx              # 홈 (브랜딩)
│   ├── about/page.tsx        # About
│   ├── login/page.tsx        # 로그인
│   ├── signup/page.tsx       # 회원가입 (3단계)
│   ├── search/page.tsx       # 검색 위장 페이지 (긴급 진입)
│   ├── settings/page.tsx     # 설정 (보호자 초대, 코드 설정)
│   ├── guardian/page.tsx     # 보호자 대시보드
│   ├── guardian/accept/      # 보호자 초대 수락
│   ├── room/[id]/page.tsx    # 채팅방
│   └── api/                  # 20개 API 라우트
│       ├── auth/             # 인증 (signup, login, logout, me)
│       ├── emergency/        # 긴급 진입 (enter, verify)
│       ├── victim/           # 피해자 (guardians, code-config, delete)
│       ├── guardian/         # 보호자 (invitations, rooms)
│       ├── rooms/[roomId]/   # 채팅 (messages, insight, progress, urgency)
│       └── files/            # 파일 (upload, download)
├── components/ui/            # Navbar, StepInput
├── lib/
│   ├── prisma.ts             # DB 클라이언트 (Workers 호환)
│   ├── auth.ts               # JWT 세션 관리
│   ├── crypto.ts             # AES-256-GCM 암호화
│   ├── rate-limit.ts         # IP 기반 레이트 리밋
│   └── adapters/
│       ├── ai/               # Gemini + Rule-based fallback
│       ├── sms/              # SMS 어댑터 (dev/twilio)
│       └── storage/          # 파일 저장소 (local/s3)
└── types/                    # 공통 타입 정의
```

## 빠른 시작

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env
# .env 파일을 열어 값을 설정하세요

# 암호화 키 생성:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 3. DB 마이그레이션
npx prisma migrate dev

# 4. 데모 데이터 시드
npx tsx prisma/seed.ts

# 5. 개발 서버 실행
npm run dev
```

## 환경 변수

| 변수 | 설명 | 필수 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 | O |
| `ENCRYPTION_KEY` | AES-256-GCM 키 (64자 hex) | O |
| `JWT_SECRET` | JWT 서명 시크릿 | O |
| `GEMINI_API_KEY` | Google Gemini API 키 | X |
| `SMS_PROVIDER` | SMS 제공자 (`dev`/`twilio`) | X (기본: dev) |
| `STORAGE_PROVIDER` | 파일 저장소 (`local`/`s3`) | X (기본: local) |

## 배포

Cloudflare Workers로 배포됩니다 (OpenNext.js 어댑터 사용).

```bash
# 빌드 + 최적화 + 배포 (한 번에)
npm run deploy

# 로컬에서 Workers 런타임 미리보기
npm run preview
```

배포 시 `scripts/strip-og.js`가 자동으로 미사용 OG 이미지 파일을 제거하여 번들 크기를 최적화합니다 (gzip 2.4 MiB, 무료 플랜 호환).

Cloudflare 대시보드에서 환경변수를 **Secret**으로 설정해야 합니다.

## 데모 시나리오

시드 데이터 실행 후:

### 긴급 진입 테스트
1. `/search` 접속
2. 검색창에 `오늘 날씨 좋다` 입력 후 검색
3. 보안 질문 "우리 강아지 이름은?" → `초코` 입력
4. 긴급 채팅방으로 자동 이동

### 듀레스 코드 테스트
1. 검색창에 `비가 올 것 같아` 입력 → 동일 2차 인증 후 듀레스 모드 방 생성

### 오답 테스트
1. 아무 문장이나 검색 → 더미 검색 결과 표시 (긴급 시스템 숨겨짐)

### 보호자 대시보드
1. `guardian@demo.com` / `password123` 로그인
2. `/guardian` 에서 긴급 채팅방 목록 확인
3. "AI 재분석" 클릭으로 대화 분석 실행

### 데모 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|---------|
| 피해자 | victim@demo.com | password123 |
| 보호자 | guardian@demo.com | password123 |

## API 엔드포인트

모든 응답 형식: `{ ok: boolean, data?: T, error?: { code, message } }`

| 카테고리 | 메서드 | 경로 | 설명 |
|----------|--------|------|------|
| Auth | POST | `/api/auth/signup` | 회원가입 |
| | POST | `/api/auth/login` | 로그인 |
| | POST | `/api/auth/logout` | 로그아웃 |
| | GET | `/api/auth/me` | 현재 사용자 |
| Emergency | POST | `/api/emergency/enter` | 코드 입력 |
| | POST | `/api/emergency/verify` | 2차 인증 |
| Victim | POST | `/api/victim/guardians/invite` | 보호자 초대 |
| | GET | `/api/victim/guardians` | 보호자 목록 |
| | POST/GET | `/api/victim/code-config` | 약속 코드 설정 |
| | POST | `/api/victim/delete` | 데이터 삭제 |
| Guardian | POST | `/api/guardian/invitations/accept` | 초대 수락 |
| | GET | `/api/guardian/rooms` | 채팅방 목록 |
| Room | GET | `/api/rooms/:id` | 방 정보 |
| | GET/POST | `/api/rooms/:id/messages` | 메시지 |
| | GET/POST | `/api/rooms/:id/insight` | AI 분석 |
| | POST | `/api/rooms/:id/progress` | 체크리스트 |
| File | POST | `/api/files/upload` | 업로드 |
| | GET | `/api/files/:id` | 다운로드 |

## 보안

- [x] 약속 코드 bcrypt 해시 저장 (원문 저장 금지)
- [x] 전화번호 AES-256-GCM 암호화 저장
- [x] 메시지 내용 AES-256-GCM 암호화 저장
- [x] 피해자 화면에서 보호자 전화번호 비노출
- [x] Room 접근 시 RoomMember 검사
- [x] IP 기반 레이트리밋 + 잠금
- [x] JWT httpOnly cookie
- [x] 삭제 요청 시 연관 데이터 즉시 삭제

## 라이선스

MIT
