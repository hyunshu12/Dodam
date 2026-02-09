<<<<<<< HEAD
# Dodam
Dacon 출품작
=======
# Emergency Connect (긴급 연결)
>>>>>>> ae42673 (Initial commit)

검색창 기반 긴급 연결 웹서비스 MVP.  
사용자가 위급 상황에서 "일상적인 검색 UI"에 약속 코드를 입력하면,  
보호자에게 자동으로 알림이 발송되고 긴급 채팅방이 생성됩니다.

<<<<<<< HEAD
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

First, run the development server:
=======
## 핵심 기능

- **검색 위장 긴급 진입**: 약속 코드 입력 시 긴급 모드 활성화, 오답 시 일반 검색 결과 표시
- **듀레스 코드**: 겉보기 정상 코드로 숨겨진 긴급 플래그 전송
- **2차 인증**: 보안 질문을 통한 추가 확인
- **긴급 채팅**: 텍스트 + 파일 + 프리셋 메시지 지원
- **AI 분석**: 대화 기반 피싱 위험도 판별 (Gemini/GPT/규칙 기반)
- **보호자 대시보드**: AI 요약, 위험 신호, 행동 가이드 체크리스트
- **데이터 보안**: AES-256-GCM 암호화, 약속 코드 bcrypt 해시

## 기술 스택

- Next.js 16 + TypeScript (App Router)
- Prisma ORM + SQLite
- JWT 인증 (httpOnly cookie)
- AES-256-GCM 필드 암호화
- Google Gemini / OpenAI GPT / 규칙 기반 AI 분석
- DB 기반 알림 큐 + 워커

## 빠른 시작
>>>>>>> ae42673 (Initial commit)

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env
# .env 파일을 열어 ENCRYPTION_KEY와 JWT_SECRET을 설정하세요

# 암호화 키 생성:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 3. DB 마이그레이션
npx prisma migrate dev

# 4. 데모 데이터 시드
npx tsx prisma/seed.ts

# 5. 개발 서버 실행
npm run dev

# 6. (선택) 알림 워커 실행 (별도 터미널)
npx tsx scripts/notifications-worker.ts
```

## 환경 변수

<<<<<<< HEAD
You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.
=======
| 변수 | 설명 | 필수 |
|------|------|------|
| `DATABASE_URL` | DB 연결 문자열 | O |
| `ENCRYPTION_KEY` | AES-256-GCM 키 (64자 hex) | O |
| `JWT_SECRET` | JWT 서명 시크릿 | O |
| `SMS_PROVIDER` | SMS 제공자 (`dev`/`twilio`) | X (기본: dev) |
| `STORAGE_PROVIDER` | 파일 저장소 (`local`/`s3`) | X (기본: local) |
| `GEMINI_API_KEY` | Google Gemini API 키 | X |
| `OPENAI_API_KEY` | OpenAI API 키 | X |
>>>>>>> ae42673 (Initial commit)

## 데모 시나리오

시드 데이터 실행 후:

### 1. 긴급 진입 테스트
1. http://localhost:3000/search 접속
2. 검색창에 `오늘 날씨 좋다` 입력 후 검색
3. 보안 질문 "우리 강아지 이름은?" → `초코` 입력
4. 긴급 채팅방으로 자동 이동

### 2. 듀레스 코드 테스트
1. 검색창에 `비가 올 것 같아` 입력 → 동일 2차 인증 후 듀레스 모드 방 생성

### 3. 오답 테스트
1. 아무 문장이나 검색 → 더미 검색 결과 표시 (긴급 시스템 숨겨짐)

### 4. 보호자 대시보드
1. 로그아웃 후 `guardian@demo.com` / `password123`으로 로그인
2. /guardian 에서 긴급 채팅방 목록 확인
3. "AI 재분석" 클릭으로 대화 분석 실행

### 데모 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|---------|
| 피해자 | victim@demo.com | password123 |
| 보호자 | guardian@demo.com | password123 |

## API 엔드포인트

모든 응답 형식: `{ ok: boolean, data?: T, error?: { code, message } }`

### Auth
- `POST /api/auth/signup` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃
- `GET /api/auth/me` - 현재 사용자 정보

### 피해자 (VICTIM)
- `POST /api/victim/guardians/invite` - 보호자 초대
- `GET /api/victim/guardians` - 보호자 목록 (전화번호 비노출)
- `POST /api/victim/code-config` - 약속 코드 설정
- `GET /api/victim/code-config` - 코드 설정 조회
- `POST /api/victim/delete` - 데이터 삭제

### 보호자 (GUARDIAN)
- `POST /api/guardian/invitations/accept` - 초대 수락
- `GET /api/guardian/rooms` - 채팅방 목록

### 긴급 진입
- `POST /api/emergency/enter` - 코드 입력
- `POST /api/emergency/verify` - 2차 인증

### 채팅
- `GET /api/rooms/:roomId` - 방 정보
- `GET /api/rooms/:roomId/messages` - 메시지 목록
- `POST /api/rooms/:roomId/messages` - 메시지 전송
- `GET /api/rooms/:roomId/insight` - AI 분석 결과
- `POST /api/rooms/:roomId/insight/refresh` - AI 재분석
- `POST /api/rooms/:roomId/progress` - 체크리스트 상태 변경

### 파일
- `POST /api/files/upload` - 파일 업로드
- `GET /api/files/:fileId` - 파일 다운로드

## AI 분석 체인

1. **Gemini** (primary): `gemini-2.0-flash` 모델, `GEMINI_API_KEY` 필요
2. **GPT** (fallback): `gpt-4o-mini` 모델, `OPENAI_API_KEY` 필요
3. **Rule-based** (최종): API 키 불필요, 키워드/패턴 기반

키가 없으면 자동으로 규칙 기반 분석기가 사용됩니다.

## 알림 워커

별도 프로세스로 실행하는 DB 폴링 워커:

```bash
npx tsx scripts/notifications-worker.ts
```

- 10초 간격 DB 폴링
- 실패 시 최대 3회 재시도 (1분 → 5분 → 15분 백오프)
- DEV 모드에서는 콘솔에 SMS 내용 출력

## 보안 체크리스트

- [x] 약속 코드 bcrypt 해시 저장 (원문 저장 금지)
- [x] 전화번호 AES-256-GCM 암호화 저장
- [x] 메시지 내용 AES-256-GCM 암호화 저장
- [x] 피해자 화면에서 보호자 전화번호 비노출
- [x] Room 접근 시 RoomMember 검사
- [x] IP 기반 레이트리밋 + 잠금
- [x] JWT httpOnly cookie
- [x] 삭제 요청 시 연관 데이터 즉시 삭제
