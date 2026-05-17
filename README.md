# Creator Universe

창작자들이 혼자 버티지 않아도 되는 플랫폼을 만들고 싶어서 시작한 프로젝트입니다.  
`Creator Universe`는 작가, 일러스트레이터, 성우, BGM 크리에이터가 서로를 찾고, 같이 작품을 만들고, 수익까지 투명하게 나눌 수 있도록 만든 서브컬처 협업 웹/앱 서비스입니다.

[서비스 바로가기](https://project-limyoobins-projects.vercel.app) · [개인정보 처리방침](https://project-limyoobins-projects.vercel.app/privacy-policy.html) · [계정 삭제 안내](https://project-limyoobins-projects.vercel.app/account-deletion.html) · [백엔드 상태 확인](https://creator-universe-api-7qfc.onrender.com/health)

## 기획 의도

서브컬처 콘텐츠는 혼자 만드는 경우도 많지만, 실제로는 글, 그림, 목소리, 음악이 합쳐질수록 훨씬 큰 매력을 갖게 됩니다. 그런데 막상 협업을 하려고 하면 팀원을 찾는 것도 어렵고, 외주 비용이나 수익 분배 문제 때문에 시작도 전에 흐지부지되는 경우가 많습니다.

그래서 이 프로젝트는 단순히 작품을 올리는 사이트가 아니라, 창작자가 팀을 만들고 작품을 판매하고 정산까지 처리할 수 있는 구조를 목표로 잡았습니다. 독자는 소설, 웹툰, 만화, 오디오드라마, 믹스미디어 작품을 둘러보고 코인으로 감상할 수 있고, 창작자는 작품 수익을 미리 정한 비율대로 자동 정산받을 수 있습니다.

또 하나 중요하게 생각한 부분은 접근성입니다. 시각 중심 콘텐츠에 익숙한 플랫폼이 많지만, 오디오드라마나 보이스 콘텐츠가 잘 연결되면 시각장애인과 저시력자도 더 자연스럽게 서브컬처 콘텐츠를 즐길 수 있다고 생각했습니다. 그래서 오디오, 대본, 고대비 UI, 앱 화면 최적화도 함께 고려했습니다.

## 어떤 서비스인가요?

Creator Universe는 쉽게 말하면 `창작자 매칭 + 콘텐츠 유통 + 코인 결제 + 자동 정산`을 한 번에 연결한 서비스입니다.

- 팀원이 필요한 창작자는 매칭 프로필을 등록합니다.
- 다른 창작자는 포트폴리오를 보고 채팅이나 매칭 제안을 보냅니다.
- 매칭 제안에는 원하는 수익 지분율을 넣을 수 있습니다.
- 상대방이 조건을 보고 수락하면 프로젝트 팀원으로 합류합니다.
- 독자가 작품을 구매하면 플랫폼 수수료를 제외한 금액이 팀원 지분율대로 계산됩니다.
- 창작자는 지갑과 정산 화면에서 코인 흐름을 확인할 수 있습니다.

## 주요 기능

| 기능 | 설명 |
| --- | --- |
| 회원가입 / 로그인 | 아이디, 닉네임 중복 확인과 비밀번호 규칙을 포함한 계정 기능 |
| 작품 탐색 | 소설, 웹툰, 만화, 애니메이션, 오디오드라마, 믹스미디어 작품 탐색 |
| 장르 필터 | 로맨스, 판타지, 미스터리, 스릴러, 일상, BL, 힐링 등 복합 필터 |
| 매칭 프로필 | 글, 그림, 목소리, BGM 등 직군별 창작자 프로필 등록 |
| 채팅 / 매칭 제안 | 창작자끼리 DM을 보내고 수익 지분율을 포함한 협업 제안 가능 |
| 코인 지갑 | 코인 충전, 작품 구매, 후원, 정산 입금 내역 관리 |
| 스마트 정산 | 일반 15%, 파트너 8% 수수료 차감 후 지분율대로 자동 분배 |
| 창작자 후원 / 구독 | 창작자 개인 프로필에서 후원, 구독, 유료 포스트 열람 |
| 고객센터 / 신고 | 문의 접수, 사용자 신고, 챗봇 상담 기능 |
| 앱 화면 대응 | Android 앱에서 보기 쉽도록 하단 탭, 마이페이지, 채팅 UI 최적화 |

## 차별점

기존 플랫폼들은 보통 한 가지 흐름에 집중되어 있습니다. 외주 플랫폼은 사람을 찾는 데 강하지만 작품 판매 이후의 수익 분배는 따로 처리해야 하고, 콘텐츠 플랫폼은 작품 유통은 편하지만 여러 명이 같이 만든 작품의 정산을 관리하기 어렵습니다.

Creator Universe는 이 사이의 빈틈을 줄이고 싶었습니다.

- 창작자끼리 서로를 찾는 단계
- 작품을 같이 만드는 단계
- 독자가 구매하는 단계
- 팀원끼리 수익을 나누는 단계

이 흐름이 끊기지 않게 하나의 서비스 안에 묶는 것이 핵심입니다.

## 팀원과 역할

| 이름 | 역할 | 담당 |
| --- | --- | --- |
| 임유빈 | 팀장 / 백엔드 | 전체 기획 정리, DB 구조 설계, Node.js API, 정산 로직, 배포 환경 구성 |
| 이승아 | 기획 / QA | 아이디어 구체화, 사용자 흐름 정리, 기능 테스트, 개선점 정리 |
| 임예원 | 프론트엔드 | 화면 구성, React UI 구현, 반응형 웹/앱 화면 개선 |

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| Frontend | React, Vite, TypeScript, CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL, Prisma |
| Deploy | Vercel, Render, Neon PostgreSQL |
| Mobile | Capacitor Android |

## 프로젝트 구조

```text
creator-universe/
  frontend/        React 프론트엔드
  src/             Express 백엔드 API
  prisma/          Prisma schema, migration, seed
  docs/            초기 프로토타입과 문서
  scripts/         로컬 데모 API
  render.yaml      Render 백엔드 배포 설정
  vercel.json      Vercel 프론트 배포 설정
```

## 로컬 실행 방법

의존성 설치:

```bash
npm install
npm --prefix frontend install
```

`.env.example`을 참고해서 `.env` 파일을 만듭니다.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
PORT=4000
CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
ALLOW_INSECURE_USER_CONTEXT=false
```

DB 준비:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

백엔드 실행:

```bash
npm run dev:api
```

프론트 실행:

```bash
npm run dev:web
```

접속 주소:

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:4000/health`

## 배포 환경

현재 배포는 아래 구조로 되어 있습니다.

- Frontend: Vercel
- Backend API: Render
- Database: Neon PostgreSQL

Render 백엔드 환경변수:

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
CORS_ORIGINS=https://project-limyoobins-projects.vercel.app
ALLOW_INSECURE_USER_CONTEXT=false
```

Vercel 프론트엔드 환경변수:

```env
VITE_API_URL=https://creator-universe-api-7qfc.onrender.com
```

## 보안 관련 주의사항

이 프로젝트는 실제 회원가입과 DB 저장까지 연결되어 있기 때문에, 아래 부분은 특히 조심해야 합니다.

- `.env`, `frontend/.env`, `.env.*` 파일은 GitHub에 올리지 않습니다.
- Neon DB URL, Render/Vercel 토큰, API 키는 환경변수에만 저장합니다.
- Vercel에는 공개되어도 되는 `VITE_` 값만 넣습니다.
- 운영 환경에서는 `ALLOW_INSECURE_USER_CONTEXT=false`를 유지합니다.
- 운영 API의 CORS 허용 도메인은 실제 프론트 주소만 넣습니다.
- 관리자 계정은 README에 비밀번호를 공개하지 않습니다.
- 혹시라도 비밀값을 GitHub에 올렸다면 파일만 지우지 말고 해당 비밀번호나 토큰을 새로 발급해야 합니다.

자세한 보안 안내는 [SECURITY.md](./SECURITY.md)에 정리했습니다.

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
| POST | `/api/matching/requests/:id/respond` | 매칭 제안 수락 / 거절 |
| POST | `/api/users/me/wallet/charge` | 코인 충전 |
| POST | `/api/settlements/content-purchase` | 콘텐츠 구매 및 자동 정산 |

## 앞으로 더 만들고 싶은 부분

- 실제 결제사 연동과 Webhook 검증
- 이미지, 오디오, 영상 파일 업로드
- 창작자 계약/동의 이력 관리
- 관리자 신고 처리 대시보드
- 더 세밀한 앱 UI/UX 최적화
- 접근성 테스트와 스크린리더 대응 강화

## 앱 출시 참고

Google Play Console에 등록할 개인정보 처리방침 URL:

```text
https://project-limyoobins-projects.vercel.app/privacy-policy.html
```

앱에서 백엔드 연결이 안 될 경우, 앱이 접속하는 실제 프론트 도메인이 Render의 `CORS_ORIGINS`에 들어가 있는지 확인하면 됩니다.
