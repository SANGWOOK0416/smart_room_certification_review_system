# 백엔드 API 명세서

## 기본 정보

- API 루트: `/api`
- 헬스 체크: `/health`

> 서버는 Express를 사용하며 CORS와 JSON 바디 파싱이 활성화되어 있습니다.
> 관리자 전용 라우트는 `X-Admin-Token: demo-admin-token` 헤더가 필요합니다.

---

## 헬스 체크

### GET `/health`

- 설명: 백엔드가 정상 동작하는지 확인합니다.
- 응답:
  - 상태: `200`
  - 본문: `{ "ok": true }`

---

## 인증

### POST `/api/auth/register`

- 설명: 신규 사용자를 등록합니다.
- 요청 본문:
  - `email` (문자열, 이메일 형식)
  - `password` (문자열, 최소 4자)
  - `phone` (문자열, 최소 8자)
  - `nickname` (문자열, 최소 2자)
  - `realName` (문자열, 최소 2자)
  - `birthDate` (문자열, 형식 `YYYY-MM-DD`)
- 응답:
  - 상태: `201`
  - 본문: 생성된 사용자 객체
    - `id`, `loginId`, `email`, `phone`, `nickname`, `realName`, `birthDate`, `role`
- 오류:
  - `409` 이미 가입된 이메일인 경우
  - `400` 입력 값이 유효하지 않은 경우

### POST `/api/auth/login`

- 설명: 등록된 사용자로 로그인합니다.
- 요청 본문:
  - `loginId` (문자열)
  - `password` (문자열)
- 응답:
  - 상태: `200`
  - 본문: 인증된 사용자 객체
    - `id`, `loginId`, `email`, `phone`, `nickname`, `realName`, `birthDate`, `role`
- 오류:
  - `401` 자격 증명이 잘못된 경우

---

## 사용자 프로필

### PATCH `/api/users/:userId`

- 설명: 사용자 프로필을 수정합니다.
- 경로 매개변수:
  - `userId` (문자열)
- 요청 본문: 다음 필드 중 선택적으로 포함 가능
  - `email` (문자열, 이메일 형식)
  - `phone` (문자열, 최소 8자)
  - `nickname` (문자열, 최소 2자)
  - `realName` (문자열, 최소 2자)
  - `birthDate` (문자열, `YYYY-MM-DD`)
  - `password` (문자열, 최소 4자)
- 응답:
  - 상태: `200`
  - 본문: 수정된 사용자 공개 정보
- 오류:
  - `404` 사용자를 찾을 수 없는 경우
  - `409` 이메일이 이미 사용 중인 경우
  - `400` 입력 값이 유효하지 않은 경우

---

## 관리자 인증

### POST `/api/admin/login`

- 설명: 관리자 인증을 수행합니다.
- 요청 본문:
  - `loginId` (문자열)
  - `password` (문자열)
- 응답:
  - 상태: `200`
  - 본문:
    - `token`: 관리자 토큰 문자열 (`demo-admin-token`)
    - `admin`: 관리자 사용자 정보
- 오류:
  - `401` 자격 증명이 잘못된 경우

---

## 건물 및 거래 정보

### GET `/api/buildings`

- 설명: 건물, 거래, 리뷰 정보를 조회합니다.
- 쿼리 매개변수:
  - `lawdCode` (문자열, 5자리)
  - `userId` (문자열)
  - `keyword` (문자열)
- 동작:
  - `lawdCode`와 `keyword` 둘 다 없으면 지역별 버킷 형태의 결과를 반환합니다.
  - 그렇지 않으면 최대 200개의 조건에 맞는 건물을 반환합니다.
- 응답:
  - 상태: `200`
  - 본문: 건물 객체 배열
    - 건물 메타데이터
    - 중첩된 `reviews`
    - 중첩된 `transactions`
- 참고:
  - 관리자 요청(`X-Admin-Token`)은 모든 리뷰를 볼 수 있습니다.
  - 일반 사용자는 승인된 리뷰와 자신의 리뷰만 볼 수 있습니다.

### PATCH `/api/buildings/:id/location`

- 설명: 건물의 좌표 정보를 수정합니다.
- 경로 매개변수:
  - `id` (문자열)
- 요청 본문:
  - `latitude` (숫자)
  - `longitude` (숫자)
- 응답:
  - 상태: `200`
  - 본문: 수정된 건물 객체
- 부작용:
  - 내부 건물 캐시가 초기화됩니다.

### GET `/api/deals`

- 설명: MOLIT 거래 데이터를 조회하고 저장합니다.
- 쿼리 매개변수:
  - `lawdCode` (문자열, 5자리)
  - `dealYmd` (문자열, `YYYYMM`)
  - `kind` (문자열, `aptTrade`, `aptRent`, `officetelRent`, `rowHouseRent`, `singleHouseRent` 중 하나)
- 응답:
  - 상태: `200`
  - 본문:
    - `count`: 저장된 거래 수
    - `deals`: 저장된 거래 레코드 배열

---

## 리뷰

### GET `/api/reviews`

- 설명: 지정한 건물과 동일한 주소 그룹에 속한 리뷰를 조회합니다.
- 쿼리 매개변수:
  - `buildingId` (문자열, 필수)
  - `userId` (문자열, 선택)
- 동작:
  - 요청한 건물과 동일 주소 소속 건물의 리뷰를 반환합니다.
  - 일반 사용자는 `userId`가 주어지면 자신의 리뷰도 함께 볼 수 있습니다.
- 응답:
  - 상태: `200`
  - 본문: 리뷰 객체 배열

### POST `/api/reviews`

- 설명: 기존 건물에 대한 리뷰를 등록합니다.
- 요청 본문:
  - `buildingId` (문자열)
  - `userId` (문자열)
  - `buildingName` (문자열, 선택)
  - `roadAddress` (문자열, 선택)
  - `reviewAreaSquareM` (숫자, 선택)
  - `reviewDepositAmount` (숫자, 선택)
  - `reviewMonthlyRent` (숫자, 선택)
  - `reviewMaintenanceFee` (숫자, 선택)
  - `rentSatisfaction` (1-5)
  - `safetyRating` (1-5)
  - `noiseRating` (1-5)
  - `landlordRating` (1-5)
  - `maintenanceRating` (1-5)
  - `content` (문자열)
  - `contractFileName` (문자열)
  - `contractFileUrl` (문자열)
  - `contractMimeType` (문자열)
- 응답:
  - 상태: `201`
  - 본문: 생성된 리뷰 객체 및 검증 문서 정보
- 오류:
  - `403` 유효한 사용자 정보가 아닌 경우
  - `404` 건물 정보를 찾을 수 없는 경우

### POST `/api/reviews/custom`

- 설명: 사용자 임의 건물 정보로 리뷰를 등록합니다.
- 요청 본문:
  - `userId` (문자열)
  - `buildingName` (문자열)
  - `roadAddress` (문자열)
  - `lawdCode` (문자열, 5자리, 선택)
  - `roomType` (`ONE_ROOM`, `OFFICETEL`, `APARTMENT`, `VILLA`, `DORM_NEARBY`, 선택)
  - `reviewAreaSquareM` (숫자, 선택)
  - `reviewDepositAmount` (숫자, 선택)
  - `reviewMonthlyRent` (숫자, 선택)
  - `reviewMaintenanceFee` (숫자, 선택)
  - `rentSatisfaction` (1-5)
  - `safetyRating` (1-5)
  - `noiseRating` (1-5)
  - `landlordRating` (1-5)
  - `maintenanceRating` (1-5)
  - `content` (문자열)
  - `contractFileName` (문자열)
  - `contractFileUrl` (문자열)
  - `contractMimeType` (문자열)
- 응답:
  - 상태: `201`
  - 본문: 생성된 리뷰 객체와 건물, 검증 문서 정보

### GET `/api/users/:userId/reviews`

- 설명: 특정 사용자가 등록한 모든 리뷰를 조회합니다.
- 경로 매개변수:
  - `userId` (문자열)
- 응답:
  - 상태: `200`
  - 본문: 건물 및 검증 문서가 포함된 리뷰 배열

### PATCH `/api/users/:userId/reviews/:reviewId`

- 설명: 사용자가 작성한 리뷰를 수정합니다.
- 경로 매개변수:
  - `userId` (문자열)
  - `reviewId` (문자열)
- 요청 본문: `/api/reviews` 입력 필드 중 선택적으로 포함 가능
- 동작:
  - 리뷰를 수정하고 검증 상태를 `PENDING`으로 재설정합니다.
  - 계약서 필드가 새로 입력되면 새 검증 문서를 생성합니다.
  - 그렇지 않으면 기존 검증 문서를 `PENDING` 상태로 재설정합니다.
- 응답:
  - 상태: `200`
  - 본문: 수정된 리뷰 객체
- 오류:
  - `404` 해당 사용자의 리뷰를 찾을 수 없는 경우

### DELETE `/api/users/:userId/reviews/:reviewId`

- 설명: 지정한 사용자가 작성한 리뷰를 삭제합니다.
- 응답:
  - 상태: `200`
  - 본문: 삭제된 리뷰 정보
- 오류:
  - `404` 리뷰를 찾을 수 없는 경우

---

## 검증 문서

### POST `/api/verifications`

- 설명: 독립적인 검증 문서를 생성합니다.
- 요청 본문:
  - `reviewId` (문자열)
  - `fileName` (문자열)
  - `fileUrl` (문자열, URL)
  - `mimeType` (문자열)
- 응답:
  - 상태: `201`
  - 본문: 생성된 검증 문서

---

## 관리자 전용 엔드포인트

> 모든 관리자 엔드포인트는 `X-Admin-Token: demo-admin-token` 헤더가 필요합니다.

### GET `/api/admin/reviews`

- 설명: 관리자용 리뷰 목록을 조회합니다.
- 쿼리 매개변수:
  - `status` (선택, `PENDING`, `APPROVED`, `REJECTED`)
- 응답:
  - 상태: `200`
  - 본문: 건물, 사용자, 검증 문서가 포함된 리뷰 배열

### GET `/api/admin/users`

- 설명: 일반 사용자와 해당 사용자가 작성한 리뷰를 조회합니다.
- 응답:
  - 상태: `200`
  - 본문: 리뷰 요약이 포함된 사용자 객체 배열

### GET `/api/admin/collection/nationwide`

- 설명: 전국 수집 상태를 조회합니다.
- 응답:
  - 상태: `200`
  - 본문: 현재 수집 상태 객체

### POST `/api/admin/collection/nationwide`

- 설명: 전국 데이터 수집을 시작합니다.
- 요청 본문 (모두 선택 항목):
  - `monthsBack` (정수, 1-12)
  - `dealYmds` (`YYYYMM` 문자열 배열, 1-24)
  - `lawdCodes` (5자리 문자열 배열, 1-300)
  - `kinds` (거래 종류 문자열 배열)
- 응답:
  - 상태: `202`
  - 본문: 수집 시작 결과

### PATCH `/api/admin/reviews/:id/status`

- 설명: 리뷰를 승인 또는 거부합니다.
- 경로 매개변수:
  - `id` (문자열)
- 요청 본문:
  - `status` (`APPROVED` 또는 `REJECTED`)
- 응답:
  - 상태: `200`
  - 본문: 수정된 리뷰 객체

### DELETE `/api/admin/reviews/:id`

- 설명: 관리자가 리뷰를 삭제합니다.
- 응답:
  - 상태: `200`
  - 본문: 삭제된 리뷰 객체
- 오류:
  - `404` 리뷰를 찾을 수 없는 경우

---

## 데이터 모델

### User

- `id` (string)
- `loginId` (string)
- `passwordHash` (string)
- `role` (`USER` 또는 `ADMIN`)
- `email` (string?)
- `phone` (string?)
- `nickname` (string)
- `realName` (string?)
- `birthDate` (Date?)
- `createdAt` (Date)

### Building

- `id` (string)
- `name` (string)
- `address` (string)
- `lawdCode` (string)
- `latitude` (Decimal?)
- `longitude` (Decimal?)
- `roomType` (`ONE_ROOM`, `OFFICETEL`, `APARTMENT`, `VILLA`, `DORM_NEARBY`)
- `safetyScore` (Decimal?)
- `createdAt` (Date)
- `updatedAt` (Date)

### Transaction

- `id` (string)
- `buildingId` (string)
- `dealType` (`SALE`, `JEONSE`, `MONTHLY_RENT`)
- `dealYear` (integer)
- `dealMonth` (integer)
- `dealDay` (integer?)
- `depositAmount` (integer?)
- `monthlyAmount` (integer?)
- `saleAmount` (integer?)
- `areaSquareM` (Decimal?)
- `floor` (integer?)
- `source` (string)
- `sourceKey` (string)
- `fetchedAt` (Date)

### Review

- `id` (string)
- `buildingId` (string)
- `userId` (string?)
- `reviewBuildingName` (string?)
- `reviewRoadAddress` (string?)
- `reviewAreaSquareM` (Decimal?)
- `reviewDepositAmount` (integer?)
- `reviewMonthlyRent` (integer?)
- `reviewMaintenanceFee` (integer?)
- `rentSatisfaction` (integer)
- `safetyRating` (integer)
- `noiseRating` (integer)
- `landlordRating` (integer)
- `maintenanceRating` (integer)
- `content` (string)
- `isAnonymous` (boolean)
- `verificationStatus` (`PENDING`, `APPROVED`, `REJECTED`)
- `createdAt` (Date)
- `updatedAt` (Date)

### VerificationDocument

- `id` (string)
- `reviewId` (string)
- `fileName` (string)
- `fileUrl` (string)
- `mimeType` (string)
- `status` (`PENDING`, `APPROVED`, `REJECTED`)
- `uploadedAt` (Date)

---

## 주의 사항

- 이 API는 세션 쿠키나 JWT를 사용하지 않습니다. 관리자 인증은 고정 `X-Admin-Token` 헤더로 처리됩니다.
- 리뷰 목록은 역할에 따라 다르게 반환됩니다. 관리자는 모든 리뷰를, 일반 사용자는 승인된 리뷰와 본인 리뷰만 볼 수 있습니다.
- 건물 조회 결과는 내부 캐시에 15초간 저장되며, 건물 또는 리뷰 변경 시 캐시를 초기화합니다.
