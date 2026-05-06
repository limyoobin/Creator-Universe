# Creator Universe 실제 배포 가이드

이 프로젝트는 아래 조합으로 실제 회원가입/로그인 데이터가 저장되는 형태로 배포할 수 있게 준비되어 있습니다.

- 프론트엔드: Vercel
- 백엔드 API: Render
- 데이터베이스: Neon PostgreSQL

## 1. Neon PostgreSQL 만들기

1. Neon에서 새 PostgreSQL 프로젝트를 만듭니다.
2. `Connection string`을 복사합니다.
3. Render 백엔드 환경변수 `DATABASE_URL`에 넣을 예정이므로 따로 보관합니다.

예시는 아래 형태입니다.

```text
postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

## 2. Render에 백엔드 배포하기

1. GitHub 저장소를 Render에 연결합니다.
2. `New +` -> `Blueprint`를 선택하고 이 저장소를 고릅니다.
3. Render가 루트의 `render.yaml`을 읽어 백엔드 서비스를 생성합니다.
4. 환경변수에 아래 값을 추가합니다.

```text
DATABASE_URL=Neon에서 복사한 PostgreSQL URL
```

Render 빌드 명령:

```bash
npm ci && npm run render:build
```

Render 시작 명령:

```bash
npm run render:start
```

`render:start`는 서버 시작 전에 `prisma migrate deploy`를 실행해서 Neon DB에 테이블을 자동 생성합니다.

서버 상태 확인 주소:

```text
https://배포된-render-api주소/health
```

## 3. Vercel에 프론트엔드 배포하기

1. Vercel에서 같은 GitHub 저장소를 Import합니다.
2. Root Directory를 아래처럼 설정합니다.

```text
frontend
```

3. Vercel 환경변수에 Render API 주소를 추가합니다.

```text
VITE_API_URL=https://배포된-render-api주소
```

Vercel 빌드 설정은 `frontend/vercel.json`에 들어 있습니다.

## 4. 배포 후 확인할 기능

1. Vercel 사이트에서 회원가입을 합니다.
2. Render 로그에서 API 요청이 정상 처리되는지 확인합니다.
3. Neon 콘솔에서 `users` 테이블에 회원 정보가 저장됐는지 확인합니다.
4. 로그인, 코인 충전, 콘텐츠 구매, 스크랩, 댓글/리뷰, 후원/구독 기능을 순서대로 테스트합니다.

## 5. 다음에 하면 좋은 운영 설정

- Render 환경변수에 `JWT_SECRET` 같은 인증 비밀키를 추가하고 코드에서 사용하기
- 프론트 도메인이 확정되면 백엔드 CORS를 `*` 대신 Vercel 도메인으로 제한하기
- 실제 결제 연동 시 Toss Payments, PortOne 같은 결제 대행사 Webhook 검증 추가하기
- 운영 DB 백업 정책과 관리자 계정 권한 분리하기
