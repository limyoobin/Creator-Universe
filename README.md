# Creator Universe

서브컬처 창작자를 위한 `프론트엔드 + 백엔드 + Prisma DB` 기반 멀티 콘텐츠 협업 플랫폼 MVP입니다. 소설, 웹툰, 만화, 애니메이션, 오디오드라마 창작팀을 연결하고 코인 결제, 지갑, 자동 정산, 후원/구독, 고객센터 흐름까지 한 번에 확인할 수 있습니다.

## 배포 주소

- 프론트엔드: https://project-limyoobins-projects.vercel.app
- 백엔드 상태 확인: https://creator-universe-api-7qfc.onrender.com/health
- GitHub 저장소: https://github.com/limyoobin/project

Vercel은 코드가 GitHub `main` 브랜치에 올라가면 같은 프론트엔드 주소에서 자동으로 최신 버전을 다시 배포합니다. 배포 직후 1-3분 정도는 예전 화면이 보일 수 있으니 새로고침하거나 브라우저 캐시를 지워 확인하세요.

## 프로젝트 구조

- `frontend/`: Vite React 프론트엔드
- `src/`: Express 백엔드 API
- `prisma/schema.prisma`: PostgreSQL 기준 DB 스키마
- `prisma/seed.ts`: 데모 계정/프로젝트/에피소드 시드 데이터
- `creator-universe-homepage.html`: 이전 단일 HTML 데모 파일

## 핵심 기능

- 회원가입, 로그인, 로그아웃
- 아이디 찾기, 비밀번호 재설정
- 닉네임/아이디 중복 확인, 이메일/비밀번호 검증
- 계정 탈퇴
- 창작자 포트폴리오 매칭 조회
- 창작자 채팅, 매칭 요청
- 프로젝트 상세 조회
- 콘텐츠 구매 시 자동 정산
- 팀원 지갑 잔액 업데이트
- 월간 정산 대시보드
- 코인 충전, 결제한 작품, 스크랩한 작품 보관함
- 창작자 후원/구독, 프리미엄 구독 관리
- 작품 댓글/리뷰
- 고객센터 문의, 사용자 신고, 도움봇

## 실행 순서

### 1. 로컬에서 바로 보기

이 폴더를 D 드라이브에서 바로 실행하려면 `start-creator-universe.cmd`를 더블클릭하세요.

```text
Frontend: http://127.0.0.1:5173
Backend:  http://127.0.0.1:4000/health
```

현재 데모 실행은 PostgreSQL 설치 없이도 볼 수 있도록 `scripts/demo-api.mjs` 인메모리 API를 사용합니다.

### 2. 명령어로 로컬 실행하기

터미널에서 직접 실행하려면 아래 순서대로 켜면 됩니다.

```bash
npm run dev:demo-api
npm run dev:web
```

프론트엔드 주소는 `http://127.0.0.1:5173`, 데모 백엔드는 `http://127.0.0.1:4000` 입니다.

### 3. PostgreSQL까지 연결하는 정식 실행

1. 루트 의존성 설치

```bash
npm install
```

2. 프론트엔드 의존성 설치

```bash
npm --prefix frontend install
```

3. `.env.example`을 참고해서 `.env` 생성

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/creator_universe?schema=public"
PORT=4000
```

4. Prisma 마이그레이션 및 시드

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

5. 백엔드 실행

```bash
npm run dev:api
```

6. 새 터미널에서 프론트엔드 실행

```bash
npm run dev:web
```

프론트엔드 주소는 기본적으로 `http://127.0.0.1:5173` 입니다.

## 데모 계정

```text
아이디: yurino_script
비밀번호: demo1234
```

정산 대시보드에서 내 지분 30%와 이번 달 예상 정산액을 바로 확인할 수 있는 창작자 계정입니다.

```text
아이디: reader_one
비밀번호: demo1234
```

구매자 흐름을 테스트할 수 있는 독자 계정입니다.

창작자 계정도 같은 비밀번호를 사용합니다.

```text
yurino_script / demo1234
renka_frame / demo1234
haruka_voice / demo1234
```

## API 요약

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/find-id`
- `POST /api/auth/reset-password`
- `GET /api/creators`
- `GET /api/projects/:projectId`
- `POST /api/settlements/content-purchase`
- `GET /api/projects/:projectId/settlement-dashboard`
- `GET /api/projects/:projectId/viewer`

로그인 후 API는 `Authorization: Bearer <token>` 헤더를 사용합니다.



## 👥 팀원 및 기여 내용

| 이름 | 역할 | 기여 내용 | 

| **임유빈** | 팀장, Back-end | 프로젝트 총괄, 시스템 아키텍처 및 DB 설계, Node.js API 개발 | 

| **이승아** | 기획 & QA | 상세 요구사항 정의, 사용자 테스트 및 버그 리포팅 |

| **임예원** | Front-end | React Native 기반 UI/UX 구현, 메인 화면 뷰 개발 | 
