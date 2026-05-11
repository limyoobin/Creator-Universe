# Creator Universe

서브컬처 창작자를 위한 **멀티 콘텐츠 협업 플랫폼 MVP**입니다.  
작가, 일러스트레이터, 성우, BGM 크리에이터가 팀을 만들고, 독자는 코인으로 작품을 감상하며, 결제 수익은 프로젝트 지분율에 따라 자동 정산됩니다.

[배포 사이트 열기](https://project-limyoobins-projects.vercel.app) · [백엔드 상태 확인](https://creator-universe-api-7qfc.onrender.com/health) · [GitHub 저장소](https://github.com/limyoobin/Creator-Universe)

## 핵심 가치

- **창작자 매칭**: 글, 그림, 목소리, BGM 창작자가 포트폴리오를 등록하고 협업 제안을 주고받습니다.
- **스마트 정산**: 독자 결제 후 플랫폼 수수료를 제외한 금액을 팀원 지분율대로 자동 분배합니다.
- **멀티 콘텐츠 유통**: 소설, 웹툰, 만화, 애니메이션, 오디오드라마, 믹스미디어 작품을 장르별로 탐색합니다.
- **팬덤 수익화**: 창작자 후원, 구독, 유료 포스트, 프리미엄 멤버십 흐름을 제공합니다.
- **운영 도구**: 지갑, 정산 콘솔, 알림센터, 고객센터, 사용자 신고, 댓글/리뷰 기능을 포함합니다.

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| Frontend | React 19, Vite, TypeScript, CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL, Prisma |
| Deployment | Vercel(frontend), Render(backend), Neon PostgreSQL |
| UI Assets | SVG cover assets, custom logo/favicon/OG image |

## 폴더 구조

```text
creator-universe/
├─ frontend/                 # Vite React 프론트엔드
│  ├─ public/                 # 로고, 파비콘, OG 이미지, 작품 커버
│  └─ src/                    # App.tsx, styles.css, 진입점
├─ src/                       # Express 백엔드 API
│  ├─ routes/                 # auth, project, settlement, community API
│  ├─ services/               # 비즈니스 로직
│  └─ utils/                  # 인증, 토큰, decimal 유틸
├─ prisma/                    # Prisma schema, migration, seed
├─ scripts/                   # 로컬 데모 API
├─ docs/                      # 문서와 이전 프로토타입 보관
├─ render.yaml                # Render 백엔드 배포 설정
├─ vercel.json                # Vercel 프론트엔드 배포 설정
└─ start-creator-universe.cmd # Windows 로컬 실행 스크립트
```

## 주요 기능

- 회원가입, 로그인, 로그아웃, 아이디 찾기, 비밀번호 재설정, 계정 탈퇴
- 닉네임/아이디 중복 확인, 이메일 형식 검증, 비밀번호 규칙 검증
- 작품 탐색, 장르/콘텐츠 형식 다중 필터, 랭킹, 작품 상세, 댓글/리뷰
- 작품 구매, 스크랩, 최근 본 작품, 내 보관함
- 코인 충전, 지갑 내역, 프리미엄 구독, 구독 해지
- 창작자 프로필 등록/삭제, 매칭 제안, 채팅, 지분율 제안 수락
- 프로젝트 정산 대시보드, 팀원별 예상 정산액, 고정 수수료 정책
- 고객센터 문의, 사용자 신고, 챗봇 UI, 알림센터

## 로컬 실행

### 빠른 실행

Windows에서 바로 확인하려면 루트 폴더의 `start-creator-universe.cmd`를 실행합니다.

```text
Frontend: http://127.0.0.1:5173
Backend:  http://127.0.0.1:4000/health
```

이 방식은 PostgreSQL 없이 `scripts/demo-api.mjs` 데모 API를 사용합니다.

### 명령어로 실행

터미널 2개를 열고 아래 명령어를 각각 실행합니다.

```bash
npm run dev:demo-api
```

```bash
npm run dev:web
```

## 실제 DB 연동 실행

1. 루트 의존성 설치

```bash
npm install
```

2. 프론트엔드 의존성 설치

```bash
npm --prefix frontend install
```

3. `.env.example`을 참고해 `.env` 생성

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
PORT=4000
```

4. Prisma 준비

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

5. 백엔드 실행

```bash
npm run dev:api
```

6. 프론트엔드 실행

```bash
npm run dev:web
```

## 데모 계정

| 역할 | 아이디 | 비밀번호 |
| --- | --- | --- |
| 관리자/테스트 | root | toor |
| 작가 | yurino_script | demo1234 |
| 독자 | reader_one | demo1234 |
| 일러스트레이터 | renka_frame | demo1234 |
| 성우 | haruka_voice | demo1234 |

## 주요 API

| Method | Endpoint | 설명 |
| --- | --- | --- |
| POST | `/api/auth/signup` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| GET | `/api/auth/me` | 내 계정 확인 |
| POST | `/api/auth/logout` | 로그아웃 |
| POST | `/api/auth/check-username` | 아이디 중복 확인 |
| POST | `/api/auth/check-display-name` | 닉네임 중복 확인 |
| GET | `/api/creators` | 창작자 목록 |
| POST | `/api/creators/me/profile` | 내 매칭 프로필 등록 |
| DELETE | `/api/creators/me/profile` | 내 매칭 프로필 삭제 |
| GET | `/api/projects/:projectId` | 프로젝트 상세 |
| POST | `/api/settlements/content-purchase` | 콘텐츠 구매 및 자동 정산 |
| GET | `/api/projects/:projectId/settlement-dashboard` | 정산 대시보드 |
| GET | `/api/users/me/wallet` | 내 지갑 잔액 |
| POST | `/api/users/me/wallet/charge` | 코인 충전 |
| POST | `/api/chats/messages` | 채팅 메시지 전송 |
| POST | `/api/matching/requests` | 매칭 제안 생성 |

로그인이 필요한 API는 `Authorization: Bearer <token>` 헤더를 사용합니다.

## 배포

- 프론트엔드는 Vercel에서 `main` 브랜치 기준으로 자동 배포됩니다.
- 백엔드는 Render에서 `render.yaml`을 기준으로 자동 배포됩니다.
- 데이터베이스는 Neon PostgreSQL을 사용합니다.

자세한 배포 절차는 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참고하세요.

## 문서

- [docs/README.md](./docs/README.md): 문서 인덱스
- [docs/prototypes](./docs/prototypes): 초기 HTML/TSX 프로토타입 보관
- [frontend/public](./frontend/public): 이미지와 브랜드 에셋

## 참고

이 프로젝트는 MVP/프로토타입 단계입니다. 실제 결제 연동, 파일 업로드, 운영자 권한, 결제사 Webhook 검증, 운영 DB 백업 정책은 정식 서비스 단계에서 추가해야 합니다.
