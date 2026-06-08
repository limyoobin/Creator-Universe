# Creator Universe

작가, 그림 작가, 성우, BGM 크리에이터가 한 작품 안에서 팀을 만들고 수익까지 나눌 수 있게 만든 서브컬처 협업 플랫폼입니다.

혼자 시작한 아이디어가 소설, 웹툰, 오디오드라마, 애니메이션 같은 여러 형태로 커질 수 있도록 `매칭`, `작품 유통`, `코인 결제`, `자동 정산`을 한 흐름 안에 묶어보는 것이 목표입니다.

[서비스 바로가기](https://project-limyoobins-projects.vercel.app) · [Notion 문서](https://complex-license-b0c.notion.site/Creator-Universe-Service-Portfolio-36bcba32990e80b2af9afdd04b4d1e4e?source=copy_link) · [개인정보 처리방침](https://project-limyoobins-projects.vercel.app/privacy-policy.html) · [계정 삭제 안내](https://project-limyoobins-projects.vercel.app/account-deletion.html) · [백엔드 상태](https://creator-universe-api-7qfc.onrender.com/health)

## 왜 만들었나요?

웹소설이나 웹툰을 만들다 보면 글만으로는 아쉽고, 그림이나 목소리, 배경음악이 붙으면 훨씬 더 매력적인 작품이 될 때가 많습니다. 그런데 실제로 협업을 하려면 같이 할 사람을 찾는 것부터 어렵습니다.

외주로 맡기기에는 비용이 부담되고, 수익을 나누기로 해도 “얼마를 어떻게 나눌지”가 애매해서 팀이 오래 가기 힘든 경우도 많습니다. 특히 이름이 많이 알려지지 않은 창작자일수록 포트폴리오를 보여주고 협업을 시작할 수 있는 공간이 더 필요하다고 생각했습니다.

그래서 Creator Universe는 작품을 올리는 곳에서 끝나는 서비스가 아니라, 팀을 찾고, 제안하고, 작품을 판매하고, 수익을 정산하는 과정까지 한 번에 이어지는 구조를 목표로 만들었습니다.

## 서비스 흐름

창작자는 먼저 자기 프로필과 포트폴리오를 등록합니다. 글, 그림, 목소리, BGM 같은 역할을 선택하고, 어떤 장르나 분위기의 작업을 잘하는지 보여줄 수 있습니다.

다른 창작자는 그 프로필을 보고 채팅을 보내거나 매칭 제안을 할 수 있습니다. 제안할 때는 원하는 수익 지분율도 같이 보낼 수 있고, 상대가 수락하면 프로젝트 팀원으로 합류하는 흐름입니다.

독자는 작품 페이지에서 소설, 웹툰, 만화, 애니메이션, 오디오드라마, 믹스미디어 작품을 둘러볼 수 있습니다. 작품은 코인으로 열람하고, 구매가 발생하면 플랫폼 수수료를 제외한 금액이 팀원 지분율대로 계산됩니다.

## 지금 구현한 기능

| 구분 | 내용 |
| --- | --- |
| 계정 | 회원가입, 로그인, 아이디/닉네임 중복 확인, 비밀번호 찾기, 계정 탈퇴 |
| 작품 | 작품 탐색, 장르/형식 필터, 스크랩, 결제한 작품, 이어보기 |
| 매칭 | 창작자 프로필 등록, 포트폴리오 보기, 채팅, 매칭 제안, 제안 수락/거절 |
| AI 매칭 | 작품 설명을 입력하면 맞는 직군과 후보를 추천. `글 작가 한 명만`, `사운드 디자이너만` 같은 조건도 반영 |
| 지갑 | 코인 충전, 작품 구매, 후원, 구독, 코인 이용 내역 |
| 정산 | 일반 13%, 파트너 8% 수수료 기준 자동 정산 미리보기 |
| 커뮤니티 | 댓글/리뷰, 창작자 후원, 창작자 구독, 유료 팬 포스트 |
| 고객센터 | 문의 접수, 사용자 신고, 도움봇 |
| 앱 | Android WebView 앱, 하단 탭, 모바일 전용 홈/마이페이지 UI |

## 독자 모드와 창작자 모드

처음에는 한 화면에 너무 많은 기능이 들어가면서 앱이 복잡해 보이는 문제가 있었습니다. 그래서 회원가입할 때 독자와 창작자를 나누고, 앱 안에서도 역할에 따라 보이는 메뉴를 다르게 구성했습니다.

독자에게는 작품, 지갑, 스크랩, 이어보기, 알림 같은 감상 중심 기능을 먼저 보여줍니다.

창작자에게는 스튜디오, 매칭, 정산, 포트폴리오 관리, 제안 확인 같은 제작 중심 기능을 더 앞에 배치했습니다.

## AI 매칭 매니저

매칭 페이지에는 AI 매칭 매니저를 넣었습니다. 사용자가 “나는 이런 장르의 소설을 썼는데 여기에 맞는 성우를 추천해줘”처럼 자연스럽게 말하면, 등록된 창작자 프로필과 포트폴리오를 기준으로 후보를 골라줍니다.

Gemini API를 사용할 수 있으면 Gemini가 먼저 답하고, API 키가 없거나 한도에 걸리면 로컬 추천 로직으로 자동 전환됩니다. 로컬 추천도 같은 직군/인원 해석 규칙을 쓰도록 맞춰서, `글 작가 한 명만`, `성우 말고 그림 작가`, `사운드 디자이너 있나?` 같은 문장이 최대한 흔들리지 않게 처리되도록 했습니다.

무료 베타 운영을 생각해서 Gemini 호출은 하루 제한을 두고 사용하도록 설정했습니다.

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| Frontend | React, Vite, TypeScript, CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL, Prisma |
| Deploy | Vercel, Render, Neon PostgreSQL |
| Mobile | Android WebView |
| AI | Gemini API + 로컬 fallback 매칭 로직 |

## 프로젝트 구조

```text
creator-universe/
  frontend/        React 프론트엔드
  src/             Express 백엔드 API
  prisma/          Prisma schema, migration, seed
  scripts/         테스트와 보조 스크립트
  docs/            초기 프로토타입과 문서
  render.yaml      Render 백엔드 배포 설정
  vercel.json      Vercel 프론트 배포 설정
```

Android 앱 프로젝트는 별도 폴더에 있습니다.

```text
D:\project\phone
```

## 로컬 실행

의존성 설치:

```bash
npm install
npm --prefix frontend install
```

`.env.example`을 참고해서 `.env` 파일을 만듭니다.
DB 주소나 API 키처럼 민감한 값은 실제 `.env`에만 두고 GitHub에는 올리지 않습니다.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
PORT=4000
CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
ALLOW_INSECURE_USER_CONTEXT=false
GEMINI_AI_ENABLED=false
GEMINI_API_KEY=""
GEMINI_FREE_ONLY=true
GEMINI_MODEL="gemini-2.5-flash-lite"
GEMINI_DAILY_REQUEST_LIMIT=40
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

## 배포 정보

현재 배포 구조는 아래와 같습니다.

- Frontend: Vercel
- Backend API: Render
- Database: Neon PostgreSQL

Vercel 프론트엔드 환경변수:

```env
VITE_API_URL=https://creator-universe-api-7qfc.onrender.com
```

Render 백엔드 환경변수:

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
CORS_ORIGINS=https://project-limyoobins-projects.vercel.app
ALLOW_INSECURE_USER_CONTEXT=false
GEMINI_AI_ENABLED=true
GEMINI_API_KEY=Google AI Studio에서 발급한 키
GEMINI_FREE_ONLY=true
GEMINI_MODEL=gemini-2.5-flash-lite
GEMINI_DAILY_REQUEST_LIMIT=40
```

## Android 앱 빌드

Google Play Console에 올릴 AAB는 아래 명령으로 빌드합니다.

```powershell
cd D:\project\phone
$env:JAVA_HOME="D:\android\jbr"
$env:Path="D:\android\jbr\bin;$env:Path"
.\gradlew.bat bundleRelease
```

빌드 결과:

```text
D:\project\phone\app\build\outputs\bundle\release\app-release.aab
```

현재 Android 릴리즈 버전은 `1.0.10`, `versionCode 10`입니다. Play Console에 새 버전을 올릴 때는 이전에 올린 번들보다 `versionCode`가 커야 합니다.

개인정보 처리방침 URL:

```text
https://project-limyoobins-projects.vercel.app/privacy-policy.html
```

## 팀원과 역할

| 이름 | 역할 | 담당 |
| --- | --- | --- |
| 임유빈 | 팀장 / 백엔드 | 전체 기획 정리, DB 구조 설계, Node.js API, 정산 로직, 배포 환경 구성 |
| 이승아 | 기획 / QA | 아이디어 구체화, 사용자 흐름 정리, 기능 테스트, 개선점 정리 |
| 임예원 | 프론트엔드 | 화면 구성, React UI 구현, 반응형 웹/앱 화면 개선 |

## 앞으로 더 만들고 싶은 것

아직은 프로토타입에 가까운 부분도 있어서, 실제 서비스에 더 가까워지려면 아래 기능들이 더 필요합니다.

- 실제 결제사 연동과 Webhook 검증
- 이미지, 오디오, 영상 파일 업로드
- 창작자 계약/동의 이력 관리
- 관리자 신고 처리 대시보드 고도화
- 앱 화면에서 더 가벼운 UI/UX
- 시각장애인/저시력자 접근성 테스트

## 테스트

AI 매칭 로직은 간단한 smoke test를 따로 두었습니다.

```bash
npm run test:ai
```

프론트/백엔드 타입 검사는 아래처럼 확인합니다.

```bash
npm run build
npm --prefix frontend run build
```

---

Play Store 링크:

https://play.google.com/store/apps/details?id=com.creatoruniverse.app
