# SchoolFinder

A school directory for Uganda: parents search, compare, and contact schools; schools
manage their listing from a dashboard; admins moderate listings, plans, and support.

Next.js 16 (App Router) · Prisma 7 · PostgreSQL · Tailwind v4 · JWT auth (`jose`) ·
Cloudinary media · Flutterwave payments · SMTP email. A companion Expo/React Native
app lives in a separate repo.

## Getting started

```bash
npm install
cp .env.example .env          # then fill in the values
npx prisma migrate deploy     # apply schema
npx prisma db seed            # optional demo data
npm run dev
```

Open http://localhost:3000. Every variable is documented in `.env.example`.

**Required to run at all:** `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`,
and the three `CLOUDINARY_*` values — school registration requires a badge and cover
photo, so uploads must work.

**Strongly recommended:** `SMTP_*`. Without it, password reset degrades to a support
ticket an admin actions by hand, and school email verification is unavailable.

**Optional:** `FLUTTERWAVE_*`. Until both are set the dashboard offers an "upgrade
request" instead of a checkout.

## Layout

```
src/app/(public)      Public site — home, listings, school profiles, city pages
src/app/(auth)        Sign in, sign up, password reset
src/app/(dashboard)   School owner dashboard
src/app/(admin)       Admin console
src/app/api           Route handlers
src/lib               prisma, auth, taxonomy, cloudinary, email, tokens,
                      flutterwave, rate-limit, serialize
src/proxy.ts          Middleware — guards /dashboard and /admin by role
prisma/               Schema, migrations, seed
```

## Things worth knowing

**Auth.** The browser authenticates with an httpOnly cookie only — the JWT is never
in `localStorage`, and client code sends no `Authorization` header. The mobile app
uses Bearer tokens from SecureStore, so the API accepts both. `AUTH_SECRET` is
enforced at boot in production; there is no silent dev-secret fallback.

**School levels.** A school can offer several at once, held in `School.types`
(`primary`, `secondary_oa`, …); `School.type` keeps the primary level for display.
All validation and grouping lives in `src/lib/taxonomy.ts` — add new levels there,
never inline in a route handler.

**Search.** `contains` filters must pass `mode: 'insensitive'`. PostgreSQL `LIKE` is
case-sensitive, so omitting it silently breaks search.

**Media.** Uploads go through `/api/uploads` to Cloudinary. `schoolId` is optional so
registration can upload before the school row exists.

**Payments.** A subscription can only be activated by `/api/payments/webhook`, after
the transaction is re-verified against Flutterwave's API and the amount checked
against the plan. No client request can grant a plan. Register the webhook URL as
`https://your-domain.com/api/payments/webhook`.

**Analytics** are real events in `SchoolView`, deduplicated per visitor per school
per day via a salted daily hash of IP + user agent. Nothing identifying is stored.

**Rate limiting** (`src/lib/rate-limit.ts`) is in-process, so each instance keeps its
own counters. Move it to Redis before scaling horizontally.

**Geocoding** goes through `/api/geocode`, which adds the identifying User-Agent and
request spacing OpenStreetMap's usage policy requires. Never call Nominatim from the
browser.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | `prisma generate` + production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (watch) |
| `npm run test:run` | Vitest once — what CI runs |
| `npm run admin:create` | Create or promote an admin account (see below) |
| `npm run check:cloudinary` | Verify Cloudinary credentials with a real upload |
| `scripts/update-mobile-apk.sh` | Rebuild the Android APK into `public/downloads` |

CI (`.github/workflows/ci.yml`) runs typecheck, lint, tests, and build on every push
and PR, plus a separate job that applies migrations against a real PostgreSQL service
and checks the schema still matches them.

## Admin access

Admin accounts are created with a dedicated script rather than the seed —
`prisma db seed` truncates every table first, so using it to recover access
would destroy the data it was meant to rescue.

```bash
# Against production (Railway injects the real DATABASE_URL)
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='StrongPass1' \
  railway run npm run admin:create
```

It creates the account, or promotes an existing user and resets their password.
Only that one row is touched. Then sign in at `/auth/login`.

## Moderating listings

A newly registered school is created with `status: "pending"` and does **not**
appear in search, on the homepage, or in the sitemap until an admin approves it
at `/admin/schools`. The owner sees a notice explaining this on their dashboard.

## Deploying

Railway. Set the environment variables, run `npx prisma migrate deploy` against the
production database, then deploy.
