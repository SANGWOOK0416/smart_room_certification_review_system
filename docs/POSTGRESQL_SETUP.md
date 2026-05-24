# VSCode에서 PostgreSQL 연결

## 1. PostgreSQL 설치 확인

VSCode 터미널에서 확인합니다.

```powershell
psql --version
```

설치되어 있지 않으면 PostgreSQL 17 이상을 설치하고, 설치할 때 `postgres` 사용자 비밀번호를 정합니다.

## 2. 데이터베이스 생성

비밀번호를 `postgres`로 잡은 경우:

```powershell
createdb -U postgres smart_room_safety
```

다른 비밀번호를 썼다면 `server/.env`의 `DATABASE_URL`을 맞게 바꿉니다.

```env
DATABASE_URL="postgresql://postgres:비밀번호@localhost:5432/smart_room_safety?schema=public"
```

## 3. Prisma 반영

```powershell
npx prisma generate --schema server/prisma/schema.prisma
npm run db:push --workspace server
```

## 4. 실행

```powershell
npm run dev
```

프론트엔드: `http://localhost:5173`

백엔드: `http://localhost:4000/health`

