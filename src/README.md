# Backend API

Express 기반 Creator Universe 백엔드입니다.

## 구조

| 폴더 | 설명 |
| --- | --- |
| `routes/` | HTTP API 라우터 |
| `services/` | 인증, 프로젝트, 정산, 지갑, 커뮤니티 비즈니스 로직 |
| `middleware/` | 공통 에러 핸들러 |
| `utils/` | 인증 토큰, decimal 계산, 요청 컨텍스트 |
| `lib/` | Prisma 클라이언트 |

## 주요 흐름

- 인증: `auth.routes.ts` → `auth.service.ts`
- 작품/프로젝트: `project.routes.ts` → `project.service.ts`
- 자동 정산: `settlement.routes.ts` → `settlement.service.ts`
- 커뮤니티/채팅/매칭: `community.routes.ts` → `community.routes.ts`
- 지갑/계정: `user.routes.ts` → `user.service.ts`

## 실행

```bash
npm install
npm run dev:api
```

기본 API 주소는 `http://127.0.0.1:4000`입니다.
