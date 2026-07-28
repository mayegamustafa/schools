-- Multi-level schools: a school can offer several levels at once (e.g. primary + secondary).
-- `type` stays as the primary level for legacy consumers; `types` holds the full set.
ALTER TABLE "School" ADD COLUMN "types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill existing rows from the single-value column.
UPDATE "School" SET "types" = ARRAY["type"] WHERE cardinality("types") = 0;

-- Facilities move from a JSON-in-TEXT column (a SQLite-era workaround) to a native
-- array, so facility filtering happens in the database instead of in JS after
-- loading every row. Rows holding invalid JSON degrade to an empty list.
ALTER TABLE "School" ADD COLUMN "facilities_arr" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "School" SET "facilities_arr" = COALESCE(
  (
    SELECT array_agg(elem)
    FROM jsonb_array_elements_text(
      CASE
        WHEN "facilities" IS NULL OR btrim("facilities") = '' THEN '[]'::jsonb
        WHEN jsonb_typeof("facilities"::jsonb) = 'array' THEN "facilities"::jsonb
        ELSE '[]'::jsonb
      END
    ) AS elem
    WHERE btrim(elem) <> ''
  ),
  ARRAY[]::TEXT[]
)
WHERE "facilities" IS NOT NULL
  AND btrim("facilities") <> ''
  AND "facilities" ~ '^\s*\[';

ALTER TABLE "School" DROP COLUMN "facilities";
ALTER TABLE "School" RENAME COLUMN "facilities_arr" TO "facilities";

-- Indexes for the filters the public listing actually uses.
CREATE INDEX "School_status_createdAt_idx" ON "School"("status", "createdAt");
CREATE INDEX "School_status_rating_idx" ON "School"("status", "rating");
CREATE INDEX "School_ownerUserId_idx" ON "School"("ownerUserId");
CREATE INDEX "School_city_idx" ON "School"("city");
CREATE INDEX "School_isFeatured_idx" ON "School"("isFeatured");
CREATE INDEX "School_types_idx" ON "School" USING GIN ("types");
CREATE INDEX "School_facilities_idx" ON "School" USING GIN ("facilities");

-- Case-insensitive search support for name/city/region lookups.
CREATE INDEX "School_name_lower_idx" ON "School"(LOWER("name"));
CREATE INDEX "School_city_lower_idx" ON "School"(LOWER("city"));
