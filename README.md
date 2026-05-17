# Creator Universe

서브컬처 창작자를 위한 멀티 콘텐츠 협업 플랫폼입니다. 작가, 일러스트레이터, 성우, BGM 크리에이터가 팀을 만들고, 독자는 코인으로 작품을 감상하며, 결제 수익은 합의된 지분율대로 자동 정산됩니다.

[배포 사이트](https://project-limyoobins-projects.vercel.app) · [개인정보 처리방침](https://project-limyoobins-projects.vercel.app/privacy-policy.html) · [계정 삭제 안내](https://project-limyoobins-projects.vercel.app/account-deletion.html) · [백엔드 상태 확인](https://creator-universe-api-7qfc.onrender.com/health)

## 핵심 기능

- 창작자 매칭: 글, 그림, 목소리, BGM 직군별 프로필 등록과 검색
- 협업 제안: 채팅 기반 매칭 제안, 수익 지분율 제안, 수락 후 팀원 합류
- 콘텐츠 탐색: 소설, 웹툰, 만화, 애니메이션, 오디오드라마, 믹스미디어 작품 필터링
- 코인 지갑: 충전, 사용, 후원, 정산 입금 내역 관리
- 스마트 정산: 일반 15%, 파트너 8% 수수료 차감 후 팀원 지분율대로 자동 분배
- 팬클럽: 창작자 후원, 구독, 유료 포스트 열람
- 고객센터: 문의, 신고, 챗봇, 알림
- 앱 대응: Android WebView/Capacitor 기반 앱 화면 최적화

## 기술 스택

- Frontend: React, Vite, TypeScript, CSS
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL, Prisma
- Deploy: Vercel, Render, Neon PostgreSQL
- Mobile: Capacitor Android wrapper

## 폴더 구조

```text
creator-universe/
  frontend/              # React 웹 프론트엔드
  src/                   # Express 백엔드 API
  prisma/                # Prisma schema, migration, seed
  docs/                  # 초기 프로토타입과 기획 문서
  scripts/               # 로컬 데모 API
  render.yaml            # Render 백엔드 배포 설정
  vercel.json            # Vercel 프론트 배포 설정
```

## 로컬 실행

```bash
npm install
npm --prefix frontend install
```

`.env.example`을 참고해서 `.env`를 만듭니다.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
PORT=4000
CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
ALLOW_INSECURE_USER_CONTEXT=false
```

데이터베이스 준비:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

백엔드와 프론트 실행:

```bash
npm run dev:api
npm run dev:web
```

로컬 접속 주소:

- Frontend: `http://127.0.0.1:5173`
- Backend health: `http://127.0.0.1:4000/health`

## 배포 환경변수

Render 백엔드:

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
CORS_ORIGINS=https://project-limyoobins-projects.vercel.app
ALLOW_INSECURE_USER_CONTEXT=false
```

Vercel 프론트엔드:

```env
VITE_API_URL=https://creator-universe-api-7qfc.onrender.com
```

관리자 계정은 기본 생성하지 않습니다. 꼭 필요할 때만 Render 환경변수에 아래 값을 직접 설정하세요.

```env
ROOT_ADMIN_USERNAME=...
ROOT_ADMIN_PASSWORD=긴_랜덤_비밀번호
ROOT_ADMIN_EMAIL=...
```

운영 환경에서는 알려진 약한 비밀번호를 사용하면 서버가 시작되지 않도록 막아두었습니다.

## 보안 체크리스트

- `.env`, `frontend/.env`, `.env.*` 파일은 Git에 올리지 않습니다.
- Neon/PostgreSQL 연결 문자열은 Render 환경변수에만 저장합니다.
- Vercel에는 공개되어도 되는 `VITE_` 접두사 환경변수만 넣습니다.
- 운영 환경에서는 `ALLOW_INSECURE_USER_CONTEXT=false`를 유지합니다.
- 운영 API의 CORS 허용 도메인은 `CORS_ORIGINS`에 실제 프론트 주소만 넣습니다.
- 관리자 계정은 데모용으로 공개하지 않고, 필요한 경우 긴 랜덤 비밀번호를 사용합니다.
- GitHub에 실수로 비밀값을 올렸다면 파일 삭제만으로 끝내지 말고 해당 DB 비밀번호나 토큰을 즉시 재발급합니다.

## 주요 API

| Method | Endpoint | 설명 |
| --- | --- | --- |
| POST | `/api/auth/signup` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| GET | `/api/auth/me` | 내 계정 확인 |
| POST | `/api/auth/check-username` | 아이디 중복 확인 |
| POST | `/api/auth/check-display-name` | 닉네임 중복 확인 |
| GET | `/api/creators` | 창작자 목록 |
| POST | `/api/creators/me/profile` | 내 매칭 프로필 등록 |
| DELETE | `/api/creators/me/profile` | 내 매칭 프로필 삭제 |
| POST | `/api/chats/messages` | 채팅 메시지 전송 |
| POST | `/api/matching/requests` | 매칭 제안 생성 |
| POST | `/api/matching/requests/:id/respond` | 매칭 제안 수락/거절 |
| POST | `/api/users/me/wallet/charge` | 코인 충전 |
| POST | `/api/settlements/content-purchase` | 콘텐츠 구매 및 자동 정산 |

## 테스트 계정 안내

시드 데이터에는 데모용 창작자와 독자 계정이 포함될 수 있습니다. 실제 배포 서비스에서는 README에 비밀번호를 공개하지 말고, 팀 내부 공유 문서나 환경변수 관리 도구를 사용하세요.

## 앱 출시 참고

Google Play Console 등록 시 개인정보 처리방침 URL은 아래 주소를 사용합니다.

```text
https://project-limyoobins-projects.vercel.app/privacy-policy.html
```

앱에서 백엔드 호출이 안 될 경우 Android WebView에서 접속하는 실제 프론트 도메인이 `CORS_ORIGINS`에 포함되어 있는지 확인하세요.
