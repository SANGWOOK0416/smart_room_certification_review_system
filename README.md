# Smart Room Certification Review System

??숆? ?먯랬諛⑹쓽 援?넗援먰넻遺 ?ㅺ굅?섍? ?곗씠?곗? 怨꾩빟???몄쬆 湲곕컲 嫄곗＜ 由щ럭瑜??④퍡 ?뺤씤?섎뒗 ???좏뵆由ъ??댁뀡?낅땲??

## 湲곗닠 ?ㅽ깮

- Frontend: React, TypeScript, Vite, Kakao Maps JavaScript SDK, lucide-react
- Backend: Node.js, Express, TypeScript, Prisma Client, Zod
- Database: PostgreSQL
- External API: 援?넗援먰넻遺 ?ㅺ굅?섍? API, 移댁뭅?ㅻ㏊ JavaScript SDK

## ?ㅽ뻾 以鍮?
1. 猷⑦듃 `.env.example`??`.env`濡?蹂듭궗?섍퀬 媛믪쓣 梨꾩썎?덈떎.
2. `frontend/.env.example`??`frontend/.env`濡?蹂듭궗?섍퀬 移댁뭅??JavaScript ?ㅻ? ?ｌ뒿?덈떎.
3. PostgreSQL ?곗씠?곕쿋?댁뒪瑜?以鍮꾪빀?덈떎.
4. ?섏〈?깆쓣 ?ㅼ튂?섍퀬 Prisma ?ㅽ궎留덈? 諛섏쁺?⑸땲??

```bash
npm install
npm run db:push --workspace backend
npm run dev
```

## ?섍꼍蹂??
猷⑦듃 `.env`

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smart_room_safety?schema=public"
MOLIT_SERVICE_KEY="YOUR_MOLIT_SERVICE_KEY"
PORT=4000
CLIENT_ORIGIN="http://localhost:5173"
```

`frontend/.env`

```env
VITE_API_BASE_URL="http://localhost:4000"
VITE_KAKAO_JAVASCRIPT_KEY="YOUR_KAKAO_JAVASCRIPT_KEY"
```

## 二쇱슂 湲곕뒫

- ?ㅺ굅??留ㅻЪ 議고쉶 諛?吏???쒖떆
- 吏?? 嫄대Ъ紐? ?꾨줈紐?二쇱냼 寃??- 怨꾩빟??泥⑤? 湲곕컲 由щ럭 ?깅줉
- 愿由ъ옄 由щ럭 ?뱀씤, 諛섎젮, ??젣
- ?ъ슜?먮퀎 由щ럭 議고쉶 諛??섏젙, ??젣
- ?꾧뎅 ?ㅺ굅???곗씠???섏쭛 ?묒뾽

