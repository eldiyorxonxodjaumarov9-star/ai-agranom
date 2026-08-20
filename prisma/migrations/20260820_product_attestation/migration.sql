-- Additive product attestation fields (no destructive changes)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sourceDocumentId" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "adminApproved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "verifiedBy" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Product_adminApproved_verifiedAt_idx" ON "Product"("adminApproved", "verifiedAt");
