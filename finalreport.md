# 자취방 거래 안심리뷰 시스템 최종 보고서

## 목차

```text
├── 요구분석
│   ├── 프로젝트 소개
│   ├── 프로젝트 목적
│   ├── 문제 정의
│   ├── 예상 사용자
│   ├── 기능 요구사항
│   ├── 비기능 요구사항
│   └── 유스케이스
├── 설계
│   ├── 시스템 아키텍처
│   ├── 데이터베이스 설계 (ERD)
│   ├── 데이터베이스 명세서
│   ├── 시퀀스 다이어그램
│   └── API 설계
├── 구현
│   ├── 프론트엔드
│   ├── 백엔드
│   └── 데이터베이스
├── 테스트
│   └── 테스트 케이스 및 결과
├── 설치 및 실행
├── 향후 개선 사항
└── 결론
```

---

# 1. 요구분석

## 1.1 프로젝트 소개

`자취방 거래 안심리뷰 시스템`은 대학 주변 자취방 정보를 지도 기반으로 제공하는 웹 서비스이다. 국토교통부 실거래가 API에서 수집한 공공 거래 데이터와 학생 또는 사용자가 작성한 계약서 기반 실거주 리뷰를 함께 보여주어, 사용자가 매물의 가격과 실제 거주 경험을 동시에 확인할 수 있도록 한다.

기존 부동산 서비스는 실거래 정보와 리뷰 정보가 분리되어 있거나, 리뷰의 신뢰성을 확인하기 어렵다는 한계가 있다. 본 프로젝트는 계약서 또는 영수증 첨부를 통해 리뷰 검증 절차를 두고, 승인된 리뷰만 지도와 매물 상세 화면에 반영함으로써 정보 신뢰도를 높이는 것을 목표로 한다.

## 1.2 프로젝트 목적

- 대학생이 자취방을 선택할 때 실거래가와 실거주 후기를 함께 확인할 수 있게 한다.
- 국토교통부 실거래가 API를 활용해 객관적인 거래 정보를 제공한다.
- 계약서 첨부 기반 리뷰 검증 절차로 허위 리뷰 가능성을 줄인다.
- 도로명 주소 기반 리뷰 등록을 지원하여 공공 실거래 데이터에 없는 매물도 지도에 표시한다.
- 월세 적정성 계산기를 통해 지역, 주택유형, 보증금, 월세, 면적을 보정한 가격 판단 근거를 제공한다.

## 1.3 문제 정의

대학생 자취방 선택 과정에서는 다음과 같은 문제가 발생한다.

| 문제 | 설명 |
| --- | --- |
| 실거래 정보 부족 | 사용자가 보는 매물 가격이 주변 시세 대비 적절한지 판단하기 어렵다. |
| 리뷰 신뢰성 부족 | 리뷰 작성자가 실제 거주자인지 확인하기 어렵다. |
| 매물 정보 분산 | 지도, 실거래가, 리뷰, 계약 검증 정보가 한 화면에 통합되어 있지 않다. |
| 주소 기반 매물 누락 | 국토교통부 실거래가에 없는 매물은 지도에 표시되기 어렵다. |
| 단순 월세 비교의 한계 | 보증금, 전용면적, 지역 시세 차이를 반영하지 않으면 가격 판단이 왜곡된다. |

## 1.4 예상 사용자

| 사용자 | 설명 |
| --- | --- |
| 일반 사용자 | 자취방을 찾는 대학생 또는 지역 거주 예정자 |
| 리뷰 작성자 | 계약서 또는 영수증을 첨부해 실제 거주 리뷰를 등록하는 사용자 |
| 관리자 | 리뷰 승인/반려, 계약서 확인, 사용자 관리, 전국 실거래가 수집을 담당하는 운영자 |

## 1.5 기능 요구사항

| 구분 | 기능 |
| --- | --- |
| 인증 | 회원가입, 로그인, 관리자 로그인 |
| 지도 | Kakao Map 기반 매물 마커 표시, 지역/건물명/도로명 검색, 지도 중심 이동 |
| 매물 | 실거래 매물 조회, 월세/전세/아파트 구분, 매물 상세 정보 조회 |
| 리뷰 | 계약서 첨부 리뷰 등록, 주소 기반 리뷰 등록, 리뷰 조회/수정/삭제 |
| 관리자 | 리뷰 승인/반려/삭제, 사용자 삭제/복구, 전국 실거래가 수집 |
| 계약서 | PNG/JPG/PDF 계약서 첨부 및 관리자/본인 사용자 열람 |
| 월세 계산기 | 법정동, 주택유형, 보증금, 월세, 면적 기반 월세 적정성 판단 |
| 데이터 수집 | 국토교통부 API 기반 최근 6개월 거래 데이터 수집 |

## 1.6 비기능 요구사항

| 구분 | 요구사항 |
| --- | --- |
| 보안 | API 키와 DB 접속 정보는 `.env` 환경변수로 분리한다. |
| 신뢰성 | 계약서 검증이 완료된 리뷰만 공개 데이터에 반영한다. |
| 유지보수성 | 프론트엔드, 백엔드, DB 스키마를 분리하여 관리한다. |
| 확장성 | 법정동 코드 기반으로 지역 데이터를 관리하여 전국 단위 확장을 지원한다. |
| 사용성 | 지도, 필터, 검색, 리뷰, 계산기 기능을 한 화면 흐름 안에서 사용할 수 있게 한다. |
| 데이터 무결성 | 같은 건물과 주소는 하나의 매물로 묶어 리뷰 수와 거래 수가 분산되지 않도록 한다. |

## 1.7 유스케이스

```mermaid
flowchart LR
    User["일반 사용자"]
    Admin["관리자"]
    MOLIT["국토교통부 API"]
    Kakao["Kakao Map API"]

    subgraph System["자취방 거래 안심리뷰 시스템"]
        UC1(("회원가입"))
        UC2(("로그인"))
        UC3(("지도 매물 조회"))
        UC4(("지역/주소 검색"))
        UC5(("매물 상세 조회"))
        UC6(("계약서 첨부 리뷰 등록"))
        UC7(("마이페이지 리뷰 관리"))
        UC8(("월세 적정성 계산"))

        AC1(("관리자 로그인"))
        AC2(("리뷰 승인/반려"))
        AC3(("리뷰 삭제"))
        AC4(("사용자 삭제/복구"))
        AC5(("전국 실거래가 수집"))
        AC6(("계약서 검증 자료 확인"))

        EX1(("실거래 데이터 조회"))
        EX2(("주소 좌표 변환"))
        EX3(("지도 마커 표시"))
    end

    User --- UC1
    User --- UC2
    User --- UC3
    User --- UC4
    User --- UC5
    User --- UC6
    User --- UC7
    User --- UC8

    Admin --- AC1
    Admin --- AC2
    Admin --- AC3
    Admin --- AC4
    Admin --- AC5
    Admin --- AC6

    UC3 --> EX3
    UC4 --> EX2
    UC5 --> EX1
    UC6 --> AC2
    AC2 --> EX3
    AC5 --> EX1

    MOLIT --- EX1
    Kakao --- EX2
    Kakao --- EX3
```

---

# 2. 설계

## 2.1 시스템 아키텍처

```mermaid
flowchart TB
    User["사용자 / 관리자"]

    subgraph Frontend["Frontend"]
        React["React + TypeScript"]
        Vite["Vite"]
        KakaoSDK["Kakao Maps JavaScript SDK"]
        Widgets["지도·리뷰·월세 계산기 UI"]
    end

    subgraph Backend["Backend"]
        Express["Node.js + Express"]
        Routes["REST API Routes"]
        RentService["월세 적정성 계산 서비스"]
        MolitCollector["국토교통부 API 수집 모듈"]
        Zod["Zod 입력 검증"]
    end

    subgraph Database["Database"]
        Prisma["Prisma ORM"]
        PostgreSQL["PostgreSQL"]
    end

    subgraph External["External APIs"]
        MOLIT["국토교통부 실거래가 API"]
        KakaoAPI["Kakao 지도/주소 검색 API"]
    end

    User --> React
    React --> Vite
    React --> Widgets
    Widgets --> KakaoSDK
    React --> Routes
    Routes --> Express
    Express --> Zod
    Express --> RentService
    Express --> MolitCollector
    Express --> Prisma
    Prisma --> PostgreSQL
    MolitCollector --> MOLIT
    KakaoSDK --> KakaoAPI
```

## 2.2 데이터베이스 설계 (ERD)

```mermaid
erDiagram
    USER ||--o{ REVIEW : writes
    BUILDING ||--o{ REVIEW : has
    BUILDING ||--o{ TRANSACTION : has
    REVIEW ||--o{ VERIFICATION_DOCUMENT : includes

    USER {
        string id PK
        string loginId UK
        string passwordHash
        UserRole role
        string email
        string phone
        string nickname
        datetime createdAt
        datetime deletedAt
        datetime restoreUntil
    }

    BUILDING {
        string id PK
        string name
        string address
        string lawdCode
        decimal latitude
        decimal longitude
        RoomType roomType
        decimal safetyScore
        datetime createdAt
        datetime updatedAt
    }

    TRANSACTION {
        string id PK
        string buildingId FK
        DealType dealType
        int dealYear
        int dealMonth
        int dealDay
        int depositAmount
        int monthlyAmount
        int saleAmount
        decimal areaSquareM
        int floor
        string source
        string sourceKey UK
        datetime fetchedAt
    }

    REVIEW {
        string id PK
        string buildingId FK
        string userId FK
        string reviewBuildingName
        string reviewRoadAddress
        decimal reviewAreaSquareM
        int reviewDepositAmount
        int reviewMonthlyRent
        int reviewMaintenanceFee
        string optionItems
        int rentSatisfaction
        int safetyRating
        int noiseRating
        int landlordRating
        int maintenanceRating
        string content
        VerificationStatus verificationStatus
        datetime createdAt
        datetime updatedAt
    }

    VERIFICATION_DOCUMENT {
        string id PK
        string reviewId FK
        string fileName
        string fileUrl
        string mimeType
        VerificationStatus status
        datetime uploadedAt
    }
```

## 2.3 데이터베이스 명세서

### User

| 필드 | 설명 |
| --- | --- |
| id | 사용자 고유 ID |
| loginId | 로그인 ID, 중복 불가 |
| passwordHash | 비밀번호 해시 |
| role | USER 또는 ADMIN |
| email, phone, nickname | 사용자 기본 정보 |
| deletedAt | 사용자 삭제 보관 시작 시각 |
| restoreUntil | 삭제 후 복구 가능 만료 시각 |

### Building

| 필드 | 설명 |
| --- | --- |
| id | 매물/건물 고유 ID |
| name | 건물명 |
| address | 도로명 또는 지번 주소 |
| lawdCode | 법정동 또는 실거래 조회 코드 |
| latitude, longitude | 지도 표시 좌표 |
| roomType | 원룸, 오피스텔, 아파트, 빌라 등 주택 유형 |
| safetyScore | 리뷰 기반 안전도 점수 |

### Transaction

| 필드 | 설명 |
| --- | --- |
| buildingId | 거래가 연결된 건물 ID |
| dealType | SALE, JEONSE, MONTHLY_RENT |
| dealYear, dealMonth, dealDay | 거래 날짜 |
| depositAmount | 보증금 |
| monthlyAmount | 월세 |
| saleAmount | 매매가 |
| areaSquareM | 전용면적 |
| source | 데이터 출처, 기본값 MOLIT |
| sourceKey | 중복 거래 방지를 위한 고유 키 |

### Review

| 필드 | 설명 |
| --- | --- |
| buildingId | 리뷰가 연결된 건물 ID |
| userId | 작성자 ID |
| reviewBuildingName | 리뷰 작성 시 입력한 건물명 |
| reviewRoadAddress | 리뷰 작성 시 입력한 도로명 주소 |
| reviewAreaSquareM | 리뷰 매물 면적 |
| reviewDepositAmount | 리뷰 매물 보증금 |
| reviewMonthlyRent | 리뷰 매물 월세 |
| optionItems | 에어컨, 세탁기 등 옵션 목록 |
| verificationStatus | PENDING, APPROVED, REJECTED |

### VerificationDocument

| 필드 | 설명 |
| --- | --- |
| reviewId | 연결된 리뷰 ID |
| fileName | 계약서 파일명 |
| fileUrl | 파일 데이터 URL 또는 저장 경로 |
| mimeType | PNG, JPG, PDF 등 파일 형식 |
| status | 검증 상태 |

## 2.4 시퀀스 다이어그램

### 계약서 기반 리뷰 승인 및 지도 반영 흐름

```mermaid
sequenceDiagram
    actor User as 사용자
    participant FE as React Frontend
    participant BE as Express API
    participant DB as PostgreSQL/Prisma
    actor Admin as 관리자
    participant Kakao as Kakao Map

    User->>FE: 매물 선택 및 리뷰 작성
    User->>FE: 계약서 이미지/PDF 첨부
    FE->>BE: POST /api/reviews 또는 /api/reviews/custom
    BE->>DB: Review(PENDING) 저장
    BE->>DB: VerificationDocument 저장
    Admin->>FE: 검증 대기 리뷰 조회
    FE->>BE: GET /api/admin/reviews
    BE->>DB: PENDING 리뷰 및 계약서 조회
    DB-->>BE: 리뷰/계약서 반환
    BE-->>FE: 검증 대기 목록 반환
    Admin->>FE: 승인 처리
    FE->>BE: PATCH /api/admin/reviews/{id}/status
    BE->>DB: Review APPROVED 변경
    BE->>DB: 승인 리뷰 기반 Transaction 생성 또는 갱신
    FE->>BE: GET /api/buildings, GET /api/reviews
    BE->>DB: 승인 리뷰와 거래 수 조회
    DB-->>BE: 매물/리뷰/거래 수 반환
    BE-->>FE: 지도 마커 데이터 반환
    FE->>Kakao: 좌표 기반 마커 표시
```

### 월세 적정성 계산 흐름

```mermaid
sequenceDiagram
    actor User as 사용자
    participant FE as React Frontend
    participant BE as Express API
    participant Service as RentFairness Service
    participant DB as PostgreSQL/Prisma

    User->>FE: 시/도, 시/군/구, 읍/면/동 선택
    User->>FE: 보증금, 월세, 전용면적, 주택유형 입력
    FE->>BE: POST /api/rent-fairness/evaluate
    BE->>Service: 환산월세 및 면적당 환산월세 계산 요청
    Service->>DB: 같은 법정동 코드 + 주택유형 거래 표본 조회
    DB-->>Service: 비교 표본 반환
    Service->>Service: 평균, 중앙값, Q1, Q3, IQR, upperBound 계산
    Service-->>BE: isOutlier 및 통계 결과 반환
    BE-->>FE: 계산 결과 응답
    FE-->>User: 정상 범위 또는 시세 경고 배지 표시
```

## 2.5 API 설계

| Method | Endpoint | 설명 |
| --- | --- | --- |
| POST | `/api/auth/register` | 사용자 회원가입 |
| POST | `/api/auth/login` | 사용자 로그인 |
| PATCH | `/api/users/:userId` | 사용자 정보 수정 |
| POST | `/api/admin/login` | 관리자 로그인 |
| GET | `/api/buildings` | 매물 목록 조회, keyword 검색 지원 |
| PATCH | `/api/buildings/:id/location` | 매물 좌표 수정 |
| GET | `/api/deals` | 거래 내역 조회 |
| GET | `/api/reviews` | 승인 리뷰 조회 |
| POST | `/api/reviews` | 매물 기반 리뷰 등록 |
| POST | `/api/reviews/custom` | 도로명 주소 기반 리뷰 등록 |
| GET | `/api/users/:userId/reviews` | 사용자 본인 리뷰 목록 조회 |
| PATCH | `/api/users/:userId/reviews/:reviewId` | 사용자 리뷰 수정 |
| DELETE | `/api/users/:userId/reviews/:reviewId` | 사용자 리뷰 삭제 |
| POST | `/api/verifications` | 검증 요청 생성 |
| GET | `/api/admin/reviews` | 관리자 리뷰 검증 목록 조회 |
| PATCH | `/api/admin/reviews/:id/status` | 관리자 리뷰 승인/반려 |
| DELETE | `/api/admin/reviews/:id` | 관리자 리뷰 삭제 |
| GET | `/api/admin/users` | 관리자 사용자 목록 조회 |
| DELETE | `/api/admin/users/:userId` | 사용자 삭제 보관 처리 |
| PATCH | `/api/admin/users/:userId/restore` | 삭제 사용자 복구 |
| GET | `/api/admin/collection/nationwide` | 전국 수집 상태 조회 |
| POST | `/api/admin/collection/nationwide` | 전국 실거래가 수집 시작 |
| GET | `/api/rent-fairness/regions` | 월세 계산기 지역 데이터 조회 |
| POST | `/api/rent-fairness/evaluate` | 월세 적정성 계산 |

---

# 3. 구현

## 3.1 프론트엔드

프론트엔드는 React, TypeScript, Vite 기반으로 구현하였다. 지도 중심 화면에서 매물 마커, 필터, 검색, 매물 상세 패널, 리뷰 작성, 마이페이지, 관리자 화면, 월세 적정성 계산기를 사용할 수 있도록 구성하였다.

주요 구현 내용은 다음과 같다.

- Kakao Maps JavaScript SDK 기반 지도 표시
- 월세/전세/아파트 구분 마커 표시
- 지역, 건물명, 도로명 검색
- 매물 상세 탭: 정보, 거래, 리뷰
- 실거래 추이 그래프 표시
- 리뷰 작성 시 계약서 파일 첨부
- 관리자 리뷰 승인/반려/삭제 UI
- 사용자 삭제/복구 UI
- 월세 적정성 계산기 위젯

## 3.2 백엔드

백엔드는 Node.js, Express, TypeScript 기반 REST API로 구현하였다. Prisma Client를 통해 PostgreSQL과 연결하고, 국토교통부 실거래가 API 및 월세 계산기 로직을 백엔드에서 처리한다.

주요 구현 내용은 다음과 같다.

- 회원가입/로그인 API
- 매물 및 거래 조회 API
- 국토교통부 실거래가 수집 API
- 리뷰 등록/수정/삭제 API
- 관리자 리뷰 승인/반려/삭제 API
- 사용자 삭제 및 복구 API
- 주소 기반 리뷰 등록 시 매물 생성 또는 병합
- 승인 리뷰를 거래 수에 반영하는 로직
- 월세 적정성 계산 서비스 분리

## 3.3 데이터베이스

데이터베이스는 PostgreSQL을 사용하고 Prisma ORM으로 스키마를 관리한다. 주요 테이블은 User, Building, Transaction, Review, VerificationDocument이다.

데이터 처리의 핵심은 다음과 같다.

- `Building`은 `name + address` 기준으로 유니크하게 관리한다.
- `Transaction`은 `sourceKey`로 중복 저장을 방지한다.
- `Review`는 승인 상태에 따라 공개 여부가 결정된다.
- `VerificationDocument`는 리뷰 검증 근거 파일을 저장한다.
- 사용자 삭제는 즉시 물리 삭제하지 않고 `deletedAt`, `restoreUntil`으로 7일 복구 가능 상태를 관리한다.

---

# 4. 테스트

## 4.1 테스트 케이스 및 결과

테스트는 사용자 관점의 블랙박스 테스트와 내부 로직 관점의 화이트박스 테스트로 나누어 수행하였다.

### 블랙박스 테스트

| ID | 테스트 항목 | 입력 / 조건 | 기대 결과 | 결과 |
| --- | --- | --- | --- | --- |
| BB-01 | 회원가입 | 사용자 정보 입력 | 회원가입 성공 후 로그인 가능 | 통과 |
| BB-02 | 로그인 | 정상 사용자 계정 입력 | 사용자 세션 생성 및 마이페이지 접근 | 통과 |
| BB-03 | 관리자 로그인 | 관리자 계정 입력 | 관리자 화면 접근 가능 | 통과 |
| BB-04 | 지도 매물 조회 | 기본 WISE 지역 접속 | 지도에 매물 마커 표시 | 통과 |
| BB-05 | 지역 검색 | 서울특별시, 성건동, 수정빌 검색 | 해당 지역 또는 매물 기준 지도 이동 | 개선 후 통과 |
| BB-06 | 월세/전세 필터 | 월세, 전세 버튼 클릭 | 선택한 거래 유형만 표시 | 개선 후 통과 |
| BB-07 | 아파트 분류 | 아파트 매물 조회 | 아파트 라벨/색상 표시 | 개선 후 통과 |
| BB-08 | 매물 상세 조회 | 지도 마커 클릭 | 월세, 보증금, 리뷰 수, 거래 수, 그래프 표시 | 개선 후 통과 |
| BB-09 | 리뷰 등록 | 계약서 첨부 후 리뷰 등록 | 승인 대기 상태 저장 | 통과 |
| BB-10 | 주소 기반 리뷰 등록 | 실거래 없는 도로명 주소 입력 | 승인 후 지도에 마커 표시 | 개선 후 통과 |
| BB-14 | 같은 매물 리뷰 묶기 | 같은 주소 리뷰 2개 이상 작성 | 하나의 마커에 리뷰 수 합산 | 개선 후 통과 |
| BB-15 | 거래 수 반영 | 승인된 리뷰 확인 | 거래 수가 승인 리뷰 수만큼 증가 | 개선 후 통과 |
| BB-16 | 계약서 열람 | 리뷰 상세 확인 | PNG/JPG/PDF 계약서 열람 가능 | 통과 |
| BB-17 | 월세 계산기 정상 | 정상 시세 입력 | 정상 범위 메시지 출력 | 통과 |
| BB-18 | 월세 계산기 경고 | 높은 월세 입력 | 시세 경고 배지 표시 | 통과 |
| BB-19 | 입력값 유지 | 계산 버튼 클릭 | 입력값 유지 | 개선 후 통과 |
| BB-20 | 전국 수집 | 관리자 수집 버튼 클릭 | 진행률 표시 및 데이터 저장 | 통과 |

### 화이트박스 테스트

| ID | 테스트 항목 | 내부 검증 대상 | 기대 결과 | 결과 |
| --- | --- | --- | --- | --- |
| WB-01 | 국토부 API 파라미터 | serviceKey, LAWD_CD, DEAL_YMD, pageNo, numOfRows | 필수 파라미터 포함 | 통과 |
| WB-02 | API 종류 매핑 | kind 값에 따른 endpoint 선택 | 주택유형별 API 호출 | 통과 |
| WB-03 | XML/JSON 응답 파싱 | fast-xml-parser | item 배열 정상 변환 | 통과 |
| WB-04 | 거래유형 판별 | 월세금액 존재 여부 | 월세/전세 분기 정확 | 개선 후 통과 |
| WB-05 | 중복 거래 방지 | sourceKey 생성 | 같은 거래 중복 저장 방지 | 통과 |
| WB-06 | Building upsert | name + address 기준 | 같은 건물 재사용 | 개선 후 통과 |
| WB-07 | 주소 정규화 | 공백 및 주소 표기 차이 제거 | 같은 주소를 같은 건물로 묶음 | 개선 후 통과 |
| WB-08 | 리뷰 조회 병합 | 관련 buildingId 조회 | 같은 주소/건물 리뷰 함께 반환 | 개선 후 통과 |
| WB-09 | 승인 리뷰 거래화 | review:{reviewId} transaction 생성 | 승인 리뷰가 거래 수에 반영 | 개선 후 통과 |
| WB-10 | 반려/삭제 시 거래 제거 | deleteReviewTransaction | 미승인 리뷰 거래 수 제외 | 통과 |
| WB-11 | 월세 환산 계산 | monthlyRent + deposit × 0.05 ÷ 12 | 보증금의 월세 가치 반영 | 통과 |
| WB-12 | 면적당 환산월세 | convertedMonthlyRent / exclusiveArea | 면적 차이 보정 | 통과 |
| WB-13 | 면적 예외 처리 | exclusiveArea <= 0 | 계산 거부 또는 오류 처리 | 통과 |
| WB-14 | 표본 필터링 | 같은 lawdCode + housingType | 같은 지역/주택유형만 비교 | 통과 |
| WB-15 | IQR 계산 | Q1, Q3, IQR, upperBound | 이상치 상한선 계산 | 통과 |
| WB-16 | 이상치 판단 | convertedRentPerArea > upperBound | isOutlier true 반환 | 통과 |
| WB-17 | 표본 부족 처리 | 표본 수 4건 미만 | insufficientSample true 반환 | 통과 |
| WB-18 | 관리자 권한 검사 | x-admin-token | 관리자 API 접근 제어 | 통과 |
| WB-19 | 삭제 사용자 차단 | deletedAt 존재 | 로그인/리뷰 등록 차단 | 통과 |
| WB-20 | 계약서 파일 데이터 | verificationDocs 관계 | 승인 이후에도 계약서 확인 가능 | 통과 |

### 미통과 항목 개선 내역

| 관련 테스트 | 초기 문제 | 개선 내용 | 결과 |
| --- | --- | --- | --- |
| BB-05 | 서울특별시 또는 건물명 검색 시 지도 중심이 WISE 근처에 머무는 문제 | 백엔드 keyword 검색과 Kakao 장소/주소 검색을 연결하고 fallback 제거 | 개선 후 통과 |
| BB-06 / WB-04 | 전세 필터에서 월세 매물이 함께 표시되는 문제 | dealType 분기와 프론트 필터 조건 분리 | 개선 후 통과 |
| BB-10 / WB-07 | 주소 기반 리뷰 매물이 지도에 표시되지 않거나 다른 위치에 표시되는 문제 | 도로명 주소 정규화 및 Kakao 좌표 변환 적용 | 개선 후 통과 |
| BB-14 / WB-06 | 같은 주소 리뷰가 여러 마커로 분리되는 문제 | Building upsert 기준을 주소와 건물명 중심으로 보정 | 개선 후 통과 |
| BB-15 / WB-09 | 승인 리뷰가 거래 수에 반영되지 않는 문제 | 승인 리뷰 기반 Transaction 생성 | 개선 후 통과 |
| BB-19 | 월세 계산 후 입력값이 사라지는 문제 | 입력 상태와 결과 상태 분리 | 개선 후 통과 |

---

# 5. 설치 및 실행

## 5.1 사전 준비

- Node.js
- npm
- PostgreSQL
- 국토교통부 실거래가 API 키
- Kakao JavaScript API 키

## 5.2 환경변수

루트 `.env` 예시:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smart_room_safety?schema=public"
MOLIT_SERVICE_KEY="YOUR_MOLIT_SERVICE_KEY"
PORT=4000
CLIENT_ORIGIN="http://localhost:5173"
```

`frontend/.env` 예시:

```env
VITE_API_BASE_URL="http://localhost:4000"
VITE_KAKAO_JAVASCRIPT_KEY="YOUR_KAKAO_JAVASCRIPT_KEY"
```

## 5.3 실행 명령어

```bash
npm install
npm run db:push --workspace backend
npm run dev
```

기본 실행 주소:

- 프론트엔드: `http://127.0.0.1:5173`
- 백엔드 API: `http://localhost:4000`

## 5.4 빌드

```bash
npm run build
```

---

# 6. 향후 개선 사항

- AWS 또는 클라우드 환경에 실제 배포하여 외부 접속 가능하도록 구성
- 계약서 파일을 base64 문자열이 아닌 별도 Object Storage에 저장
- 관리자 권한 인증을 임시 토큰 방식에서 JWT 또는 세션 기반 인증으로 개선
- Kakao 주소 검색 실패 시 재시도 및 후보 선택 UI 추가
- 월세 적정성 계산기 표본 부족 지역에 대한 안내 강화
- 실거래 그래프에 기간 필터와 상세 툴팁 추가
- 모바일 화면에서 지도와 상세 패널의 사용성 개선
- 학교별 즐겨찾기 지역 또는 캠퍼스 기반 탐색 기능 추가

---

# 7. 결론

본 프로젝트는 대학생 자취방 선택 과정에서 발생하는 정보 불균형과 리뷰 신뢰성 문제를 해결하기 위해 설계되었다. 국토교통부 실거래가 API를 통해 객관적인 거래 데이터를 제공하고, 계약서 기반 리뷰 검증을 통해 실제 거주 경험 정보를 보완하였다.

또한 지도 기반 매물 탐색, 주소 기반 리뷰 등록, 관리자 승인/반려, 사용자 삭제/복구, 월세 적정성 계산기 기능을 구현하여 단순 매물 조회를 넘어 신뢰 가능한 자취방 거래 검증 플랫폼의 형태를 갖추었다.

최종적으로 이 시스템은 공공 데이터, 실거주 리뷰, 계약서 검증, 통계 기반 월세 판단을 결합하여 사용자가 더 안전하고 합리적으로 자취방을 선택할 수 있도록 돕는 것을 목표로 한다.
