# Prisma

Creator Universe의 PostgreSQL 스키마와 초기 데이터입니다.

## 파일

| 파일 | 설명 |
| --- | --- |
| `schema.prisma` | Users, Projects, ProjectMembers, Transactions, Wallet 등 핵심 모델 |
| `migrations/` | 운영 DB에 적용되는 Prisma migration |
| `seed.ts` | 데모 계정, 프로젝트, 창작자 프로필, 초기 지갑 데이터 |

## 명령어

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

배포 환경에서는 Render 시작 명령에서 `prisma migrate deploy`가 실행됩니다.
