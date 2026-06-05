# 자취방 월세 안심 계산기 API 명세

## GET /api/rent-fairness/regions

시/도, 시/군/구, 읍/면/동 선택 UI에 사용할 지역 트리를 반환한다.

### Response

```json
[
  {
    "sido": "서울특별시",
    "sigungu": [
      {
        "name": "강남구",
        "eupmyeondong": [
          {
            "sido": "서울특별시",
            "sigungu": "강남구",
            "eupmyeondong": "역삼동",
            "lawdCode": "11680",
            "legalDongCode": "1168010100"
          }
        ]
      }
    ]
  }
]
```

## POST /api/rent-fairness/evaluate

사용자 입력 월세를 환산월세와 면적 기준으로 보정한 뒤, 같은 법정동 권역과 같은 주택유형의 실거래/승인 리뷰 표본과 비교한다.

### Request

```json
{
  "lawdCode": "11680",
  "legalDongCode": "1168010100",
  "eupmyeondong": "역삼동",
  "deposit": 500,
  "monthlyRent": 70,
  "exclusiveArea": 18.5,
  "housingType": "ONE_ROOM",
  "conversionRate": 0.05
}
```

### 계산식

```text
convertedMonthlyRent = monthlyRent + (deposit * conversionRate / 12)
convertedRentPerArea = convertedMonthlyRent / exclusiveArea
IQR = Q3 - Q1
upperBound = Q3 + (1.5 * IQR)
isOutlier = convertedRentPerArea > upperBound
```

`conversionRate`는 생략 가능하며 기본값은 `0.05`다. 서버 환경변수 `RENT_CONVERSION_RATE`로 기본값을 변경할 수 있다.

### Response

```json
{
  "input": {
    "lawdCode": "11680",
    "legalDongCode": "1168010100",
    "eupmyeondong": "역삼동",
    "housingType": "ONE_ROOM",
    "deposit": 500,
    "monthlyRent": 70,
    "exclusiveArea": 18.5
  },
  "conversionRate": 0.05,
  "convertedMonthlyRent": 72.08333333333333,
  "convertedRentPerArea": 3.8963963963963963,
  "sampleCount": 18,
  "stats": {
    "average": 2.81,
    "median": 2.7,
    "q1": 2.2,
    "q3": 3.1,
    "iqr": 0.9,
    "upperBound": 4.45
  },
  "insufficientSample": false,
  "isOutlier": false,
  "message": "해당 지역 평균 시세 범위 내 매물입니다."
}
```

### 데이터 부족

같은 조건의 표본이 4건 미만이면 `insufficientSample: true`를 반환한다. 이 경우 데이터 삭제나 차단은 하지 않고, 사용자에게 비교 표본이 부족하다는 안내만 표시한다.

### housingType 값

```text
ONE_ROOM   원룸/다가구
OFFICETEL  오피스텔
APARTMENT  아파트
VILLA      빌라
```
