# API 키 설정

이 프로젝트의 실제 API 키는 GitHub에 올리지 않습니다. 각 개발자는 `.env.example` 파일을 복사해서 로컬 `.env`에 개인 키를 입력해야 합니다.

## 국토교통부 실거래가 API

1. 공공데이터포털에서 국토교통부 실거래가 API 활용 신청을 합니다.
2. 발급받은 일반 인증키를 루트 `.env`의 `MOLIT_SERVICE_KEY`에 입력합니다.

```env
MOLIT_SERVICE_KEY="YOUR_MOLIT_SERVICE_KEY"
```

백엔드는 다음 실거래가 API를 호출합니다.

- 아파트 매매
- 아파트 전월세
- 오피스텔 전월세
- 연립다세대 전월세
- 단독/다가구 전월세

## 카카오맵 JavaScript 키

1. Kakao Developers에서 애플리케이션을 생성합니다.
2. 플랫폼 > Web 사이트 도메인에 로컬 개발 주소를 등록합니다.
3. JavaScript 키를 `client/.env`의 `VITE_KAKAO_JAVASCRIPT_KEY`에 입력합니다.

```env
VITE_KAKAO_JAVASCRIPT_KEY="YOUR_KAKAO_JAVASCRIPT_KEY"
```

개발 중에는 아래 도메인을 모두 등록해두면 편합니다.

```text
http://localhost:5173
http://127.0.0.1:5173
```
