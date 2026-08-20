-- Additive seller / offer / discovery / ingestion tables (Wave C)

CREATE TABLE IF NOT EXISTS "Seller" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "country" TEXT,
  "region" TEXT,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "status" "KbStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Seller_status_country_idx" ON "Seller"("status", "country");
CREATE INDEX IF NOT EXISTS "Seller_name_idx" ON "Seller"("name");

CREATE TABLE IF NOT EXISTS "SellerSource" (
  "id" TEXT PRIMARY KEY,
  "sellerId" TEXT NOT NULL REFERENCES "Seller"("id") ON DELETE CASCADE,
  "domain" TEXT NOT NULL,
  "baseUrl" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL DEFAULT 'SELLER_OFFER',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "robotsStatus" TEXT NOT NULL DEFAULT 'unknown',
  "tosStatus" TEXT NOT NULL DEFAULT 'unknown',
  "licenseNote" TEXT,
  "crawlDelayMs" INTEGER NOT NULL DEFAULT 3000,
  "parserVersion" TEXT NOT NULL DEFAULT '1',
  "lastSuccessAt" TIMESTAMP(3),
  "lastErrorAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "SellerSource_domain_key" ON "SellerSource"("domain");
CREATE INDEX IF NOT EXISTS "SellerSource_enabled_sourceType_idx" ON "SellerSource"("enabled", "sourceType");

CREATE TABLE IF NOT EXISTS "ProductOffer" (
  "id" TEXT PRIMARY KEY,
  "sellerId" TEXT NOT NULL REFERENCES "Seller"("id") ON DELETE CASCADE,
  "productId" TEXT,
  "sellerSku" TEXT,
  "tradeName" TEXT NOT NULL,
  "packSize" TEXT,
  "price" DOUBLE PRECISION,
  "currency" TEXT DEFAULT 'UZS',
  "stockStatus" TEXT,
  "provenanceJson" JSONB,
  "checksum" TEXT,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastCheckedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ProductOffer_sellerId_tradeName_idx" ON "ProductOffer"("sellerId", "tradeName");
CREATE INDEX IF NOT EXISTS "ProductOffer_productId_idx" ON "ProductOffer"("productId");
CREATE INDEX IF NOT EXISTS "ProductOffer_checksum_idx" ON "ProductOffer"("checksum");

CREATE TABLE IF NOT EXISTS "OfferPriceSnapshot" (
  "id" TEXT PRIMARY KEY,
  "offerId" TEXT NOT NULL REFERENCES "ProductOffer"("id") ON DELETE CASCADE,
  "price" DOUBLE PRECISION,
  "currency" TEXT,
  "stockStatus" TEXT,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "OfferPriceSnapshot_offerId_capturedAt_idx" ON "OfferPriceSnapshot"("offerId", "capturedAt");

CREATE TABLE IF NOT EXISTS "SourceDiscoveryCandidate" (
  "id" TEXT PRIMARY KEY,
  "url" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "discoveredBy" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  "reviewNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "SourceDiscoveryCandidate_domain_key" ON "SourceDiscoveryCandidate"("domain");
CREATE INDEX IF NOT EXISTS "SourceDiscoveryCandidate_status_idx" ON "SourceDiscoveryCandidate"("status");

CREATE TABLE IF NOT EXISTS "IngestionRun" (
  "id" TEXT PRIMARY KEY,
  "adapter" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "cursor" TEXT,
  "leaseUntil" TIMESTAMP(3),
  "importedCount" INTEGER NOT NULL DEFAULT 0,
  "updatedCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "IngestionRun_adapter_status_idx" ON "IngestionRun"("adapter", "status");

CREATE TABLE IF NOT EXISTS "IngestionItem" (
  "id" TEXT PRIMARY KEY,
  "runId" TEXT NOT NULL REFERENCES "IngestionRun"("id") ON DELETE CASCADE,
  "externalId" TEXT NOT NULL,
  "url" TEXT,
  "status" TEXT NOT NULL,
  "checksum" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "IngestionItem_runId_externalId_key" ON "IngestionItem"("runId", "externalId");

CREATE TABLE IF NOT EXISTS "ProductAlias" (
  "id" TEXT PRIMARY KEY,
  "tradeName" TEXT NOT NULL,
  "language" TEXT,
  "normalizedForm" TEXT NOT NULL,
  "manufacturer" TEXT,
  "productId" TEXT,
  "mappingConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" "KbStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ProductAlias_normalizedForm_idx" ON "ProductAlias"("normalizedForm");
CREATE INDEX IF NOT EXISTS "ProductAlias_status_productId_idx" ON "ProductAlias"("status", "productId");
