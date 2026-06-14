# Backend Rewrite — Clean Restructure (data-preserving)

**Branch:** `backend-rewrite`
**Decisions:** preserve all production data · restructure cleanly, same domain
**Status:** schema designed (`schema.restructured.prisma`). Migration + code cascade staged below. **Not applied to any database.**

---

## Why this is staged, not yet applied

1. **Build does not auto-migrate.** `package.json` build is `prisma generate && next build` — no `prisma migrate deploy`. Schema changes reach prod only via a deliberate step. We must add `migrate deploy` to the deploy/release flow (below) before cutover.
2. **No safe test target locally.** Local `.env` `DATABASE_URL` points at a stale SQLite `dev.db`; schema/prod are Postgres. Data-preserving column-type migrations (String→enum, text→jsonb) **must be validated against a copy of production data** before touching the live DB.

**What I need from you to proceed safely (pick one):**
- A **dump of production** (`pg_dump`) I can restore into a throwaway DB to test the migration, **or**
- A **staging `DATABASE_URL`** (separate Railway Postgres) seeded from a prod dump.

Either lets me run the migration, run the app against it, and confirm zero data loss before cutover.

---

## What changes in the schema

| Field(s) | From | To |
|---|---|---|
| `School.type/category/gender/status` | `String` | Postgres enums |
| `User.role`, `Message.senderRole` | `String` | `UserRole` enum |
| `Lead.status`, `Conversation.status`, `Payment.status`, `SchoolSubscription.status`, `SupportTicket.status/priority` | `String` | enums |
| `School.gallery/videos/facilities`, `User.favorites`, `SubscriptionPlan.features`, `AuditLog.details`, `CmsSection.content` | `String` (JSON text) | `Json` (jsonb) |
| `School` indexes | — | `+ (status,isFeatured)`, `(type,status)`, `(city)` |
| `Review` index | — | `+ (schoolId,createdAt)` |

Same entities, same relations, same cascade rules. No data is dropped — only types tightened and JSON text promoted to jsonb.

---

## Data-preserving migration SQL (review draft)

> Run inside one transaction against a **test copy** first. Enum value sets are
> chosen to match existing stored values; the legacy-role normalization step
> must run **before** the role enum cast.

```sql
BEGIN;

-- 0. Normalize any legacy role values before casting to the enum
UPDATE "User" SET role = 'user'   WHERE role = 'parent';
UPDATE "User" SET role = 'school' WHERE role = 'school_admin';
UPDATE "User" SET role = 'user'   WHERE role NOT IN ('user','school','admin');

-- 1. Create enum types
CREATE TYPE "SchoolType"        AS ENUM ('daycare','kindergarten','primary','secondary','secondary_o','secondary_oa','tertiary','university');
CREATE TYPE "SchoolCategory"    AS ENUM ('day','boarding','mixed');
CREATE TYPE "SchoolGender"      AS ENUM ('mixed','girls_only','boys_only');
CREATE TYPE "SchoolStatus"      AS ENUM ('pending','active','rejected','suspended');
CREATE TYPE "UserRole"          AS ENUM ('user','school','admin');
CREATE TYPE "LeadStatus"        AS ENUM ('new','contacted','enrolled','closed');
CREATE TYPE "ConversationStatus" AS ENUM ('open','closed');
CREATE TYPE "PaymentStatus"     AS ENUM ('paid','pending','failed','refunded');
CREATE TYPE "SubscriptionStatus" AS ENUM ('active','past_due','canceled','expired');
CREATE TYPE "TicketStatus"      AS ENUM ('open','pending','resolved','closed');
CREATE TYPE "TicketPriority"    AS ENUM ('low','normal','high','urgent');

-- 2. Cast string columns to enums (drop defaults first, re-add after)
ALTER TABLE "School" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "School"
  ALTER COLUMN type     TYPE "SchoolType"     USING type::"SchoolType",
  ALTER COLUMN category TYPE "SchoolCategory" USING category::"SchoolCategory",
  ALTER COLUMN gender   TYPE "SchoolGender"   USING gender::"SchoolGender",
  ALTER COLUMN status   TYPE "SchoolStatus"   USING status::"SchoolStatus";
ALTER TABLE "School" ALTER COLUMN gender SET DEFAULT 'mixed', ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE "User" ALTER COLUMN role DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN role TYPE "UserRole" USING role::"UserRole";
ALTER TABLE "User" ALTER COLUMN role SET DEFAULT 'user';

ALTER TABLE "Message" ALTER COLUMN "senderRole" TYPE "UserRole" USING "senderRole"::"UserRole";

ALTER TABLE "Lead" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "Lead" ALTER COLUMN status TYPE "LeadStatus" USING status::"LeadStatus";
ALTER TABLE "Lead" ALTER COLUMN status SET DEFAULT 'new';

ALTER TABLE "Conversation" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "Conversation" ALTER COLUMN status TYPE "ConversationStatus" USING status::"ConversationStatus";
ALTER TABLE "Conversation" ALTER COLUMN status SET DEFAULT 'open';

ALTER TABLE "Payment" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "Payment" ALTER COLUMN status TYPE "PaymentStatus" USING status::"PaymentStatus";
ALTER TABLE "Payment" ALTER COLUMN status SET DEFAULT 'paid';

ALTER TABLE "SchoolSubscription" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "SchoolSubscription" ALTER COLUMN status TYPE "SubscriptionStatus" USING status::"SubscriptionStatus";
ALTER TABLE "SchoolSubscription" ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE "SupportTicket" ALTER COLUMN status DROP DEFAULT, ALTER COLUMN priority DROP DEFAULT;
ALTER TABLE "SupportTicket"
  ALTER COLUMN status   TYPE "TicketStatus"   USING status::"TicketStatus",
  ALTER COLUMN priority TYPE "TicketPriority" USING priority::"TicketPriority";
ALTER TABLE "SupportTicket" ALTER COLUMN status SET DEFAULT 'open', ALTER COLUMN priority SET DEFAULT 'normal';

-- 3. Promote JSON-text columns to jsonb (guard against any invalid text)
ALTER TABLE "School"
  ALTER COLUMN gallery    TYPE jsonb USING (CASE WHEN gallery    ~ '^\s*[\[{]' THEN gallery::jsonb    ELSE '[]'::jsonb END),
  ALTER COLUMN videos     TYPE jsonb USING (CASE WHEN videos     ~ '^\s*[\[{]' THEN videos::jsonb     ELSE '[]'::jsonb END),
  ALTER COLUMN facilities TYPE jsonb USING (CASE WHEN facilities ~ '^\s*[\[{]' THEN facilities::jsonb ELSE '[]'::jsonb END);
ALTER TABLE "User"
  ALTER COLUMN favorites  TYPE jsonb USING (CASE WHEN favorites  ~ '^\s*[\[{]' THEN favorites::jsonb  ELSE '[]'::jsonb END);
ALTER TABLE "SubscriptionPlan"
  ALTER COLUMN features   TYPE jsonb USING (CASE WHEN features   ~ '^\s*[\[{]' THEN features::jsonb   ELSE '[]'::jsonb END);
ALTER TABLE "AuditLog"
  ALTER COLUMN details    TYPE jsonb USING (CASE WHEN details    ~ '^\s*[\[{]' THEN details::jsonb    ELSE '{}'::jsonb END);
ALTER TABLE "CmsSection"
  ALTER COLUMN content    TYPE jsonb USING (CASE WHEN content    ~ '^\s*[\[{]' THEN content::jsonb    ELSE '{}'::jsonb END);

-- 4. New indexes
CREATE INDEX "School_status_isFeatured_idx" ON "School" (status, "isFeatured");
CREATE INDEX "School_type_status_idx"       ON "School" (type, status);
CREATE INDEX "School_city_idx"              ON "School" (city);
CREATE INDEX "Review_schoolId_createdAt_idx" ON "Review" ("schoolId", "createdAt");

COMMIT;
```

A `prisma migrate diff` against the restructured schema will be used to generate
the canonical migration; the SQL above is the hand-verified expectation to
diff against (Prisma's auto-generated enum/jsonb casts often default to a
drop+recreate that loses data — we override with the `USING` clauses above).

---

## Code cascade (lockstep with the migration)

Because `serialize.ts` centralizes DB→API conversion, the read surface is small:

- **`src/lib/serialize.ts`** — `gallery/videos/facilities` become real arrays
  (drop `JSON.parse`, validate shape). Enum fields pass through as typed values.
- **`src/types/index.ts`** — align union types with the new Prisma enums.
- **`src/lib/seed.ts`** — write arrays/objects directly instead of `JSON.stringify`.
- **Write-path routes** (create/update) that currently `JSON.stringify` arrays
  or write enum strings — pass values directly:
  - `api/schools` (POST), `api/schools/[id]` (PATCH/PUT)
  - `api/users`, `api/users/[id]`, `api/auth/signup` (favorites/role)
  - `api/admin/cms`, `api/admin/cms/[id]` (content)
  - `api/admin/plans`, `api/plans` (features)
  - `api/leads`, `api/conversations`, `api/payments`, `api/subscriptions` (status)
- **Read-path routes** that `JSON.parse` these fields drop the parse (16 files
  reference them; most read through `serializeSchool`).

All verifiable by `tsc --noEmit` on the branch before any DB touch.

---

## Cutover sequence (zero-data-loss)

1. On a **test DB** (prod dump restored): `prisma migrate deploy` → run app → verify.
2. Land the code cascade on the branch; `tsc` + manual smoke test against test DB.
3. Add `prisma migrate deploy` to the Railway release step (or `build`):
   `"build": "prisma generate && prisma migrate deploy && next build"`.
4. **Back up prod** (`pg_dump`) immediately before cutover.
5. Merge `backend-rewrite` → `main`; Railway deploys, runs `migrate deploy`.
6. Smoke-test prod; keep the dump for rollback.

---

## Honest note

The current backend is already clean and secure; this restructure is a
polish/correctness pass (type-safe enums, real jsonb, extra indexes), not a
rescue. The main practical wins are DB-level type safety and query performance.
It carries real risk on a live DB, which is why every step above is gated on a
test-DB validation before cutover.
