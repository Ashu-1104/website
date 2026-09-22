# Community DB setup (Postgres + Prisma)

This repo is a **Next.js 14 (App Router)** app. The simplest way to add a Postgres database with typed queries + migrations is **Prisma**.

## 1 Start Postgres locally

### Option A (recommended): Docker
1. Start the database:
   - `docker compose up -d db`
2. Confirm it is running:
   - `docker compose ps db`

### Option B: Use an existing Postgres
Use any Postgres instance (local or hosted) and skip Docker. You only need a valid `DATABASE_URL`.

## 2 Configure environment variables

1. Create `.env` in the repo root (it is gitignored).
2. Copy values from `.env.example` and update them:
   - `DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?schema=public"`
   - `MEDIA_BASE_URL="https://your-cdn-domain"` (optional, used to build public media URLs in API responses)

## 3 Install Prisma dependencies

From the repo root:
- `npm install`

## 4) Create tables (run migrations)

Run:
- `npm run db:migrate`

This will create a `prisma/migrations/` folder and apply the schema in `prisma/schema.prisma` to your database.

## 4.1) Seed demo data (optional)

If you want the `/community` page + modal to work immediately with demo rows:
- `npm run db:seed`

## 5) Inspect your database (optional)

- `npm run db:studio`

## Data model (what to write for the community feed)

### Community feed item
Store one “card” in `CommunityFeedItem` and point it at a `MediaAsset`:
- Create `MediaAsset` first (image/video metadata + R2 object keys)
- Create `CommunityFeedItem` referencing that `MediaAsset`

### Media on Cloudflare R2
`MediaAsset` stores object keys (ex: `r2Key`, `posterKey`, `previewKey`). Your app can build public URLs from these keys using your CDN/custom domain.

## Test endpoint

Once the DB is migrated, you can hit:
- `GET /api/community/feed?limit=40`
- `GET /api/community/feed?limit=40&cursor=...`

The response includes `items` and `nextCursor` for keyset pagination.
