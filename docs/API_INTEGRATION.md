# 공공데이터/지도 연동 메모

## 국토교통부 실거래가 API

- 공공데이터포털의 국토교통부 실거래가 API는 REST/XML 형식입니다.
- 조회 파라미터는 법정동코드 앞 5자리 `LAWD_CD`, 계약년월 6자리 `DEAL_YMD`, 인증키 `serviceKey`를 기본으로 사용합니다.
- 백엔드는 `/api/deals`에서 국토교통부 API를 호출한 뒤 PostgreSQL에 `Building`, `Transaction`으로 저장합니다.
- MVP 기준 지원 타입은 아파트 전월세, 아파트 매매, 오피스텔 전월세입니다.

## 카카오맵

- 프론트엔드는 Kakao Maps JavaScript SDK를 동적으로 로드합니다.
- SDK URL은 `autoload=false&libraries=services`로 로드하고, `kakao.maps.load` 콜백 안에서 지도와 지오코더를 생성합니다.
- 국토교통부 데이터에는 좌표가 없으므로, 카카오 주소 검색으로 위도/경도를 보강해 마커를 표시합니다.

## 이후 보강하면 좋은 부분

- 주소 정규화: 법정동/지번 주소를 카카오 주소 검색 성공률이 높은 문자열로 정리
- 좌표 캐싱: 첫 지오코딩 성공 시 백엔드에 `latitude`, `longitude` 저장
- API 호출 제한 대응: 동일 `LAWD_CD + DEAL_YMD + kind` 요청 캐싱
- 인증 업로드: 현재는 파일 메타데이터 API만 있고 실제 스토리지 연동은 별도 구현 필요
