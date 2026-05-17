# Security Policy

## Reporting

보안 취약점이나 실수로 노출된 비밀값을 발견하면 공개 이슈에 상세 정보를 올리지 말고 저장소 관리자에게 먼저 알려주세요.

## Secrets

- 실제 `DATABASE_URL`, Neon 비밀번호, Render/Vercel 토큰, 개인 API 키는 Git에 커밋하지 않습니다.
- `.env.example`에는 예시 형식만 작성하고 실제 비밀번호를 넣지 않습니다.
- 비밀값이 GitHub에 올라갔다면 즉시 해당 비밀번호나 토큰을 재발급합니다.

## Production Defaults

- 운영 환경에서는 `NODE_ENV=production`을 사용합니다.
- 운영 환경에서는 `ALLOW_INSECURE_USER_CONTEXT=false`를 유지합니다.
- 운영 API의 `CORS_ORIGINS`에는 실제 프론트 도메인만 허용합니다.
- 관리자 계정은 자동 생성하지 않는 것을 기본으로 합니다.
- `ROOT_ADMIN_PASSWORD`를 사용할 경우 12자 이상의 긴 랜덤 비밀번호를 사용합니다.

## Data Protection

- 비밀번호는 원문 저장하지 않고 scrypt 기반 해시로 저장합니다.
- 세션 토큰은 원문 대신 SHA-256 해시로 저장합니다.
- 계정 탈퇴 시 이메일, 아이디, 닉네임은 삭제 계정 식별값으로 대체합니다.

## Deployment Checklist

- Render 환경변수에 실제 `DATABASE_URL`을 저장했는지 확인합니다.
- Vercel 환경변수에는 `VITE_API_URL`처럼 공개 가능한 값만 저장합니다.
- 배포 후 `/health`와 회원가입/로그인/코인 충전 API가 정상 동작하는지 확인합니다.
- GitHub Push Protection 또는 Secret Scanning을 켤 수 있으면 켜는 것을 권장합니다.
