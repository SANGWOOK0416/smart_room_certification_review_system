# 자취방 거래 안심리뷰 시스템

공공 실거래가 데이터와 계약서 기반 실거주 리뷰를 결합해 대학생이 자취방을 더 안전하게 확인할 수 있도록 만든 지도 기반 웹 서비스입니다.

국토교통부 실거래가 API로 수집한 매물 정보를 카카오맵에 표시하고, 사용자가 계약서 또는 영수증을 첨부해 작성한 리뷰는 관리자의 승인 이후 지도와 매물 상세 화면에 반영됩니다. 또한 보증금, 월세, 전용면적을 보정해 같은 법정동과 같은 주택유형 기준으로 월세 적정성을 판단하는 계산기 기능을 제공합니다.

## 조원 및 역할

| 이름 | 담당 역할 | 주요 작업 |
| --- | --- | --- |
| 고영민 | 프론트엔드 | 지도 화면, 매물 상세 UI, 필터/검색 UI, 사용자 화면 구현 |
| 김민석 | DB 설계 및 문서화 | Prisma 스키마, 테이블 관계 설계, 테스트 케이스/발표자료 정리 |
| 임상욱 | 백엔드 API | 국토교통부 API 연동, 리뷰/매물/관리자 API, 데이터 수집 로직 구현 |
| 이성재 | 프론트 연동 및 테스트 | 리뷰 작성/조회 UI, 계약서 업로드 UI, 통합 테스트 및 오류 개선 |

## 주요 기능

- 카카오맵 기반 실거래 매물 및 리뷰 검증 매물 표시
- 지역, 건물명, 도로명 주소 기반 검색
- 월세, 전세, 아파트 등 매물 유형별 필터링
- 국토교통부 실거래가 API 기반 최근 6개월 거래 데이터 수집
- 계약서 이미지 또는 PDF 첨부 기반 리뷰 등록
- 관리자 리뷰 승인, 반려, 삭제 기능
- 사용자 본인 리뷰 조회, 수정, 삭제 기능
- 관리자 사용자 삭제 및 7일 보관 후 복구 기능
- 승인된 리뷰를 지도 마커, 리뷰 수, 거래 수에 반영
- 같은 도로명 주소와 같은 건물 리뷰를 하나의 매물로 묶어 표시
- 월세 적정성 계산기
  - 법정동 코드와 주택유형 기준 표본 조회
  - 보증금을 월세 가치로 환산
  - 전용면적으로 면적당 환산월세 계산
  - IQR 기반 이상치 여부 판단

## 기술 스택

### 프론트엔드

- React
- TypeScript
- Vite
- Kakao Maps JavaScript SDK
- lucide-react

### 백엔드

- Node.js
- Express
- TypeScript
- Prisma Client
- Zod
- Helmet
- CORS
- Morgan
- Axios
- fast-xml-parser

### 데이터베이스

- PostgreSQL
- Prisma ORM

### 외부 API

- 국토교통부 실거래가 API
- Kakao Maps JavaScript SDK
- Kakao 주소/장소 검색 API

## 프로젝트 구조

```text
.
├── backend
│   ├── prisma
│   │   └── schema.prisma
│   └── src
│       ├── index.ts
│       ├── routes.ts
│       ├── rentFairness.ts
│       └── rentFairnessRegions.ts
├── frontend
│   ├── src
│   └── restored-static
├── docs
└── package.json
```

## 실행 준비

루트 `.env.example`을 `.env`로 복사한 뒤 값을 채웁니다.

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smart_room_safety?schema=public"
MOLIT_SERVICE_KEY="YOUR_MOLIT_SERVICE_KEY"
PORT=4000
CLIENT_ORIGIN="http://localhost:5173"
```

`frontend/.env.example`을 `frontend/.env`로 복사한 뒤 카카오 JavaScript 키를 입력합니다.

```env
VITE_API_BASE_URL="http://localhost:4000"
VITE_KAKAO_JAVASCRIPT_KEY="YOUR_KAKAO_JAVASCRIPT_KEY"
```

API 키와 DB 접속 정보는 코드에 직접 넣지 않고 환경변수로 관리합니다.

## 실행 방법

```bash
npm install
npm run db:push --workspace backend
npm run dev
```

기본 실행 주소는 다음과 같습니다.

- 프론트엔드: `http://127.0.0.1:5173`
- 백엔드 API: `http://localhost:4000`

## 빌드

```bash
npm run build
```

## 테스트 및 검증 문서

테스트 케이스는 사용자 관점의 블랙박스 테스트와 내부 로직 관점의 화이트박스 테스트로 나누어 작성했습니다.

- 블랙박스 테스트: 회원가입, 로그인, 지도 조회, 검색, 리뷰 등록, 관리자 승인/반려, 계약서 열람, 월세 계산기 등 사용자 화면 중심 검증
- 화이트박스 테스트: 국토교통부 API 파라미터, 거래 유형 분류, 주소 정규화, 리뷰 승인 거래화, IQR 계산, 권한 검사 등 내부 로직 검증

관련 문서는 `docs` 폴더에서 확인할 수 있습니다.
