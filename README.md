# Smart Room Certification Review System

대학가 자취방의 국토교통부 실거래가 데이터와 계약서 인증 기반 거주 리뷰를 함께 확인하는 웹 애플리케이션입니다.

## 기술 스택

- Frontend: React, TypeScript, Vite, Kakao Maps JavaScript SDK, lucide-react
- Backend: Node.js, Express, TypeScript, Prisma Client, Zod
- Database: PostgreSQL
- External API: 국토교통부 실거래가 API, 카카오맵 JavaScript SDK

## 실행 준비

1. 루트 `.env.example`을 `.env`로 복사하고 값을 채웁니다.
2. `client/.env.example`을 `client/.env`로 복사하고 카카오 JavaScript 키를 넣습니다.
3. PostgreSQL 데이터베이스를 준비합니다.
4. 의존성을 설치하고 Prisma 스키마를 반영합니다.

```bash
npm install
npm run db:push --workspace server
npm run dev
```

## 환경변수

루트 `.env`

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smart_room_safety?schema=public"
MOLIT_SERVICE_KEY="YOUR_MOLIT_SERVICE_KEY"
PORT=4000
CLIENT_ORIGIN="http://localhost:5173"
```

`client/.env`

```env
VITE_API_BASE_URL="http://localhost:4000"
VITE_KAKAO_JAVASCRIPT_KEY="YOUR_KAKAO_JAVASCRIPT_KEY"
```

## 주요 기능

- 실거래 매물 조회 및 지도 표시
- 지역, 건물명, 도로명 주소 검색
- 계약서 첨부 기반 리뷰 등록
- 관리자 리뷰 승인, 반려, 삭제
- 사용자별 리뷰 조회 및 수정, 삭제
- 전국 실거래 데이터 수집 작업
