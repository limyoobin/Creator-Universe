# Deployment Guide

Creator Universe는 다음 조합으로 배포합니다.

- **Frontend**: Vercel
- **Backend API**: Render
- **Database**: Neon PostgreSQL

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

## 4. 배포 후 확인 목록

- `/health`가 `ok: true`를 반환하는지 확인합니다.
- 회원가입 후 Neon `users` 테이블에 데이터가 저장되는지 확인합니다.
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
