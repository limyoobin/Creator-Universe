# Creator Universe Docs

이 폴더는 GitHub에서 프로젝트를 빠르게 이해할 수 있도록 문서와 초기 산출물을 정리한 공간입니다.

## 문서 목록

| 경로 | 설명 |
| --- | --- |
| [../README.md](../README.md) | 프로젝트 소개, 실행 방법, 주요 기능 |
| [../DEPLOYMENT.md](../DEPLOYMENT.md) | Vercel, Render, Neon 배포 가이드 |
| [prototypes](./prototypes) | 초기 HTML/TSX 프로토타입 보관 |

## 현재 운영 코드 위치

- 프론트엔드: [`../frontend`](../frontend)
- 백엔드: [`../src`](../src)
- DB/Prisma: [`../prisma`](../prisma)
- 이미지/브랜드 에셋: [`../frontend/public`](../frontend/public)

## 정리 원칙

- 루트에는 배포와 실행에 필요한 핵심 파일만 둡니다.
- 오래된 실험 파일은 `docs/prototypes`에 보관합니다.
- 실제 서비스 코드는 `frontend`, `src`, `prisma` 중심으로 관리합니다.
