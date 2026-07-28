-- Real engagement tracking. The school dashboard previously derived "profile
-- views" and "link clicks" arithmetically from reviewCount, so paying schools
-- were shown invented numbers.
CREATE TABLE "SchoolView" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'profile',
    "source" TEXT NOT NULL DEFAULT 'direct',
    "referrer" TEXT,
    "sessionHash" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolView_pkey" PRIMARY KEY ("id")
);

-- One visitor counts once per school, per event kind, per day.
CREATE UNIQUE INDEX "SchoolView_schoolId_kind_sessionHash_day_key"
    ON "SchoolView"("schoolId", "kind", "sessionHash", "day");

CREATE INDEX "SchoolView_schoolId_createdAt_idx" ON "SchoolView"("schoolId", "createdAt");
CREATE INDEX "SchoolView_schoolId_kind_createdAt_idx" ON "SchoolView"("schoolId", "kind", "createdAt");

ALTER TABLE "SchoolView" ADD CONSTRAINT "SchoolView_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
