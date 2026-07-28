# SchoolFinder

A school directory for Uganda: parents search, compare, and contact schools; schools
manage their listing from a dashboard; admins moderate listings, plans, and support.

Next.js 16 (App Router) · Prisma 7 · PostgreSQL · Tailwind v4 · JWT auth (`jose`) ·
Cloudinary for media. A companion Expo/React Native app lives in a separate repo.

## Getting started

```bash
npm install
cp .env.example .env          # then fill in the values
npx prisma migrate deploy     # apply schema
npx prisma db seed            # optional demo data
npm run dev
```

Open http://localhost:3000.

Every variable in `.env.example` is documented there. Two are load-bearing in
production:

- **`AUTH_SECRET`** — without it the app falls back to a known development secret,
  which would let anyone forge an admin session.
- **`CLOUDINARY_*`** — all school media lives in Cloudinary. Without it, uploads
  return 503 and schools cannot complete registration (a badge and cover photo are
  required).

## Layout

```
src/app/(public)      Public site — home, listings, school profiles, city pages
src/app/(auth)        Sign in, sign up, password recovery
src/app/(dashboard)   School owner dashboard
src/app/(admin)       Admin console
src/app/api           Route handlers
src/lib               prisma, auth, taxonomy, cloudinary, rate-limit, serialize
src/proxy.ts          Middleware — guards /dashboard and /admin by role
prisma/               Schema, migrations, seed
```

### Things worth knowing

- **School levels.** A school can offer several levels at once, held in
  `School.types` (`primary`, `secondary_oa`, …). `School.type` keeps the primary
  level for display. Validation and grouping live in `src/lib/taxonomy.ts` — add new
  levels there, not inline in route handlers.
- **Search.** `contains` filters must pass `mode: 'insensitive'`; PostgreSQL `LIKE`
  is case-sensitive, so omitting it silently breaks search.
- **Media.** Uploads go through `/api/uploads` to Cloudinary. `schoolId` is optional
  so the registration form can upload before the school row exists.
- **Rate limiting** (`src/lib/rate-limit.ts`) is in-process, so each instance keeps
  its own counters. Move it to Redis before scaling horizontally.
- **Payments are not wired up.** Subscription and payment writes are admin-only on
  purpose; connect a gateway (Flutterwave / MTN MoMo / Airtel Money) and drive them
  from its webhook rather than from a client request.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | `prisma generate` + production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |
| `scripts/update-mobile-apk.sh` | Rebuild the Android APK and publish it to `public/downloads` |

## Deploying

Railway. Set the environment variables above, run `npx prisma migrate deploy` against
the production database, then deploy.
