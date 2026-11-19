# Deployment Guide

Creator Universe는 다음 조합으로 배포합니다.

- **Frontend**: Vercel
- **Backend API**: Render
- **Database**: Neon PostgreSQL

패스키는 별도 인증 업체 계약 없이 계정 가입과 로그인을 처리합니다. 포트원 채널을 연결하면 가입 시 실명 본인확인을 추가하거나 카드 충전을 열 수 있습니다. [포트원 운영 가이드](docs/portone-operations.md)

## 1. Neon PostgreSQL 준비

1. Neon에서 새 PostgreSQL 프로젝트를 만듭니다.
2. `Connection string`을 복사합니다.
3. Render 백엔드 환경변수 `DATABASE_URL`에 붙여 넣습니다.

예시 형식:

```text
postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

Prisma migration 중 advisory lock 문제가 생기면 Render 환경변수에 아래 값을 추가합니다.

```text
PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1
```

## 2. Render 백엔드 배포

1. Render에서 GitHub 저장소를 연결합니다.
2. `New +`에서 `Blueprint` 또는 `Web Service`를 선택합니다.
3. 루트의 `render.yaml` 설정을 사용합니다.
4. 환경변수에 `DATABASE_URL`을 추가합니다.

패스키 서버 라이브러리 13은 Node.js 20 이상에서 실행됩니다. 이 프로젝트는 Node.js 24에서 빌드와 테스트를 진행했습니다. Render 서비스의 기본 Node.js 버전은 최초 생성일에 따라 달라지며, 오래된 서비스는 Environment에서 `NODE_VERSION`을 지원되는 버전으로 설정할 수 있습니다. [Render Node.js 버전 설정](https://render.com/docs/node-version)

Render build command:

```bash
npm ci && npm run render:build
```

Render start command:

```bash
npm run render:start
```

배포 후 상태 확인:

```text
https://creator-universe-api-7qfc.onrender.com/health
```

## 3. Vercel 프론트엔드 배포

현재 저장소는 루트 `vercel.json`에서 프론트엔드 빌드 경로를 지정합니다.

```json
{
  "buildCommand": "npm --prefix frontend run build",
  "outputDirectory": "frontend/dist",
  "installCommand": "npm install && npm --prefix frontend install",
  "framework": "vite"
}
```

Vercel 환경변수:

```text
VITE_API_URL=https://creator-universe-api-7qfc.onrender.com
```

배포 사이트:

```text
https://project-limyoobins-projects.vercel.app
```

## 패스키 도메인

운영 패스키의 RP ID는 `project-limyoobins-projects.vercel.app`이고, 서버가 허용하는 운영 출처는 `https://project-limyoobins-projects.vercel.app`입니다. 사용자는 이 주소를 브라우저에서 직접 열어 가입하거나 로그인합니다. 개발 서버는 `localhost`와 `127.0.0.1`에서도 테스트할 수 있습니다. 가입과 로그인에는 같은 호스트를 사용하세요. 인증 요청은 시작한 출처에 묶이며 5분 안에 한 번만 사용할 수 있습니다.

커스텀 도메인 전환 시 기존 계정의 패스키가 등록된 RP ID를 고려해야 합니다. 서버의 허용 출처와 RP ID, 기존 계정의 기기 인증 방법을 함께 점검하세요. [WebAuthn RP ID](https://www.w3.org/TR/webauthn-3/#relying-party-identifier)

## 매칭 AI 제공사

Render 백엔드의 **Environment**에 사용할 제공사의 키를 입력하고 변경을 배포합니다. 키가 있는 제공사만 추천 검토에 참여합니다.

| 제공사 | 서버 키 | 기본 모델 |
| --- | --- | --- |
| Groq | `GROQ_API_KEY` | `openai/gpt-oss-20b` |
| NVIDIA Build | `NVIDIA_API_KEY` | `nvidia/nemotron-3.5-lightning-30b-a3b` |
| Google AI Studio | `GEMINI_API_KEY` | `gemini-3.5-flash-lite` |

모델과 사용 가능 범위는 제공사별로 다릅니다. NVIDIA는 무료 호스팅 엔드포인트를 프로토타입 용도로 안내합니다. 운영 서비스에는 계정의 사용 조건에 맞는 채널을 연결하세요. Gemini의 `GEMINI_FREE_ONLY=true`는 무료 등급을 지원하는 모델의 허용 목록을 적용합니다. 실제 요금은 각 계정의 결제 등급과 사용량에 따라 결정됩니다. [Groq 모델](https://console.groq.com/docs/model/openai/gpt-oss-20b) · [NVIDIA 모델](https://build.nvidia.com/nvidia/nemotron-3.5-lightning-30b-a3b/build) · [NVIDIA 사용 범위](https://docs.api.nvidia.com/nim/docs/product) · [Gemini 요금](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.5-flash-lite)

환경변수의 `<제공사>`에는 `GROQ`, `NVIDIA`, `GEMINI`를 넣습니다.

| 환경변수 | 기본 동작 |
| --- | --- |
| `<제공사>_MODEL` | 위 표의 모델 사용 |
| `<제공사>_AI_ENABLED` | 키가 있으면 활성화. `false`이면 해당 제공사만 중지 |
| `<제공사>_DAILY_REQUEST_LIMIT` | 서버 프로세스별 UTC 하루 40회. `0`이면 호출을 중지하며 프로세스 재시작 시 집계 초기화 |
| `<제공사>_MIN_INTERVAL_MS` | 요청 간격 1,500ms |
| `<제공사>_TIMEOUT_MS` | 응답 대기 7,000ms, 최대 8,000ms |
| `<제공사>_MAX_INPUT_CHARS` | 후보·프로젝트 입력 길이 5,200자, 최대 16,000자 |
| `<제공사>_MAX_OUTPUT_TOKENS` | 모델 출력 650토큰, 최대 2,048토큰 |

## 4. 배포 후 확인 목록

- `/health`가 `ok: true`를 반환하는지 확인합니다.
- 테스트 환경에서 패스키 가입, 로그아웃 후 패스키 로그인, 기존 계정의 비밀번호 로그인을 확인합니다.
- 로그인 후 코인 충전, 작품 구매, 지갑 내역이 정상 반영되는지 확인합니다.
- 매칭 프로필 등록과 채팅/매칭 제안이 정상 동작하는지 확인합니다.
- 정산 대시보드가 로그인 상태에서 정상 표시되는지 확인합니다.

## 5. 운영 단계에서 추가하면 좋은 것

- `JWT_SECRET` 환경변수 분리
- Vercel 도메인 기준 CORS 제한
- Toss Payments, PortOne 같은 실제 결제사 Webhook 검증
- 이미지/오디오 업로드를 위한 Object Storage
- 관리자 권한과 신고 처리 대시보드
- DB 백업과 장애 대응 정책
