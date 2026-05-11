# Frontend

Creator Universe의 Vite React 프론트엔드입니다.

## 주요 파일

| 경로 | 설명 |
| --- | --- |
| `src/App.tsx` | 전체 페이지, 모달, 상태 관리, API 연동 |
| `src/styles.css` | 반응형 UI, 라이트/다크 모드, 모든 화면 스타일 |
| `public/logo.png` | 서비스 로고 |
| `public/favicon.png` | 브라우저 탭 아이콘 |
| `public/og-image.svg` | 링크 공유 미리보기 이미지 |
| `public/covers` | 추천 작품 커버 SVG |

## 실행

```bash
npm --prefix frontend install
npm run dev:web
```

기본 주소는 `http://127.0.0.1:5173`입니다.

## 환경변수

```env
VITE_API_URL=http://127.0.0.1:4000
```

배포 환경에서는 Render 백엔드 주소를 넣습니다.

```env
VITE_API_URL=https://creator-universe-api-7qfc.onrender.com
```
