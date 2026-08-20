-- Official source documents for fail-closed product verification
CREATE TABLE IF NOT EXISTS "OfficialSourceDocument" (
  "id" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "officialSourceId" TEXT NOT NULL,
  "officialHost" TEXT NOT NULL,
  "sha256" TEXT NOT NULL,
  "importedAt" TIMESTAMP(3) NOT NULL,
  "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  "filename" TEXT,
  "contentType" TEXT,
  "byteSize" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OfficialSourceDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OfficialSourceDocument_sha256_country_key"
  ON "OfficialSourceDocument"("sha256", "country");
CREATE INDEX IF NOT EXISTS "OfficialSourceDocument_country_reviewStatus_idx"
  ON "OfficialSourceDocument"("country", "reviewStatus");
CREATE INDEX IF NOT EXISTS "OfficialSourceDocument_officialHost_idx"
  ON "OfficialSourceDocument"("officialHost");
