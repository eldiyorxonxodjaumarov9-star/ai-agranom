-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "KbStatus" AS ENUM ('DRAFT', 'AI_PARSED', 'NEEDS_REVIEW', 'VERIFIED', 'REJECTED', 'ARCHIVED', 'AI_TRANSLATED', 'VERIFIED_TRANSLATION', 'CONFLICT', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('crop', 'disease', 'pest', 'symptom', 'treatment', 'prevention', 'product', 'nutrient', 'irrigation', 'soil', 'general');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "accessedAt" TIMESTAMP(3) NOT NULL,
    "license" TEXT NOT NULL,
    "reliabilityScore" DOUBLE PRECISION NOT NULL,
    "checksum" TEXT,
    "registryId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Crop" (
    "id" TEXT NOT NULL,
    "scientificName" TEXT,
    "cropGroup" TEXT,
    "tempC" TEXT,
    "humidity" TEXT,
    "soil" TEXT,
    "ph" TEXT,
    "irrigation" TEXT,
    "regions" TEXT[],
    "status" "KbStatus" NOT NULL DEFAULT 'VERIFIED',
    "qualityScore" INTEGER NOT NULL DEFAULT 70,
    "checksum" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,

    CONSTRAINT "Crop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CropTranslation" (
    "id" TEXT NOT NULL,
    "cropId" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "KbStatus" NOT NULL DEFAULT 'VERIFIED',

    CONSTRAINT "CropTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CropSynonym" (
    "id" TEXT NOT NULL,
    "cropId" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "CropSynonym_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disease" (
    "id" TEXT NOT NULL,
    "scientificName" TEXT,
    "eppoCode" TEXT,
    "pathogenType" TEXT,
    "pathogenName" TEXT,
    "severity" TEXT,
    "quarantineStatus" TEXT,
    "status" "KbStatus" NOT NULL DEFAULT 'VERIFIED',
    "qualityScore" INTEGER NOT NULL DEFAULT 70,
    "checksum" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "sourceUrl" TEXT,
    "organization" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,

    CONSTRAINT "Disease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiseaseTranslation" (
    "id" TEXT NOT NULL,
    "diseaseId" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "KbStatus" NOT NULL DEFAULT 'VERIFIED',

    CONSTRAINT "DiseaseTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiseaseSynonym" (
    "id" TEXT NOT NULL,
    "diseaseId" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "DiseaseSynonym_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pest" (
    "id" TEXT NOT NULL,
    "scientificName" TEXT,
    "eppoCode" TEXT,
    "pestType" TEXT,
    "taxonomy" TEXT,
    "status" "KbStatus" NOT NULL DEFAULT 'VERIFIED',
    "qualityScore" INTEGER NOT NULL DEFAULT 70,
    "checksum" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "sourceUrl" TEXT,
    "organization" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,

    CONSTRAINT "Pest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PestTranslation" (
    "id" TEXT NOT NULL,
    "pestId" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "KbStatus" NOT NULL DEFAULT 'VERIFIED',

    CONSTRAINT "PestTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PestSynonym" (
    "id" TEXT NOT NULL,
    "pestId" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "PestSynonym_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Symptom" (
    "id" TEXT NOT NULL,
    "cropId" TEXT,
    "diseaseId" TEXT,
    "pestId" TEXT,
    "plantPart" TEXT,
    "visualDescription" TEXT NOT NULL,
    "color" TEXT,
    "shape" TEXT,
    "texture" TEXT,
    "pattern" TEXT,
    "distribution" TEXT,
    "earlyStage" TEXT,
    "lateStage" TEXT,
    "progression" TEXT,
    "distinguishingFeatures" TEXT,
    "confusedWith" TEXT[],
    "language" TEXT NOT NULL DEFAULT 'en',
    "sourceUrl" TEXT,
    "organization" TEXT,
    "status" "KbStatus" NOT NULL DEFAULT 'VERIFIED',
    "qualityScore" INTEGER NOT NULL DEFAULT 70,
    "checksum" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Symptom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Treatment" (
    "id" TEXT NOT NULL,
    "conditionId" TEXT NOT NULL,
    "conditionType" TEXT NOT NULL,
    "cropId" TEXT,
    "treatmentType" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "timing" TEXT,
    "growthStage" TEXT,
    "region" TEXT,
    "greenhouse" BOOLEAN,
    "restrictions" TEXT,
    "safetyNotes" TEXT,
    "sourceUrl" TEXT,
    "organization" TEXT,
    "status" "KbStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "qualityScore" INTEGER NOT NULL DEFAULT 60,
    "checksum" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Treatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prevention" (
    "id" TEXT NOT NULL,
    "conditionId" TEXT NOT NULL,
    "conditionType" TEXT NOT NULL,
    "cropId" TEXT,
    "method" TEXT NOT NULL,
    "timing" TEXT,
    "sourceUrl" TEXT,
    "organization" TEXT,
    "status" "KbStatus" NOT NULL DEFAULT 'VERIFIED',
    "qualityScore" INTEGER NOT NULL DEFAULT 75,
    "checksum" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prevention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActiveIngredient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "KbStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "checksum" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActiveIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "marketplaceProductId" TEXT,
    "name" TEXT NOT NULL,
    "activeIngredientId" TEXT,
    "formulation" TEXT,
    "manufacturer" TEXT,
    "labelUrl" TEXT,
    "labelVerified" BOOLEAN NOT NULL DEFAULT false,
    "safetyInterval" TEXT,
    "reentryInterval" TEXT,
    "pollinatorWarning" TEXT,
    "aquaticWarning" TEXT,
    "status" "KbStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "registrationStatus" "RegistrationStatus" NOT NULL DEFAULT 'UNKNOWN',
    "qualityScore" INTEGER NOT NULL DEFAULT 40,
    "checksum" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastVerifiedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductRegistration" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "registrationCountry" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "approvedCrops" TEXT[],
    "approvedTargets" TEXT[],
    "expiresAt" TIMESTAMP(3),
    "status" "KbStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "registrationStatus" "RegistrationStatus" NOT NULL DEFAULT 'UNKNOWN',
    "checksum" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "status" "KbStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "version" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChunkRow" (
    "id" TEXT NOT NULL,
    "documentId" TEXT,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "keywords" TEXT[],
    "cropIds" TEXT[],
    "plantParts" TEXT[],
    "regions" TEXT[],
    "sourceId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceTitle" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "reliabilityScore" DOUBLE PRECISION NOT NULL,
    "qualityScore" INTEGER NOT NULL DEFAULT 50,
    "status" "KbStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "version" INTEGER NOT NULL DEFAULT 1,
    "checksum" TEXT NOT NULL,
    "embeddingJson" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "KnowledgeChunkRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageReference" (
    "id" TEXT NOT NULL,
    "conditionId" TEXT,
    "cropId" TEXT,
    "plantPart" TEXT,
    "imageUrl" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "attribution" TEXT,
    "sourceId" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "imageHash" TEXT,
    "visualFeatures" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImageReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progressJson" JSONB NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "checkpoint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJobItem" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "url" TEXT,
    "status" TEXT NOT NULL,
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJobItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportError" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "externalId" TEXT,
    "url" TEXT,
    "error" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuplicateCandidate" (
    "id" TEXT NOT NULL,
    "leftEntityId" TEXT NOT NULL,
    "rightEntityId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DuplicateCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConflictRecord" (
    "id" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "canonicalEntityId" TEXT NOT NULL,
    "conflictingEntityIds" TEXT[],
    "reason" TEXT NOT NULL,
    "fields" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sources" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConflictRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationTask" (
    "id" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "status" "KbStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "assignee" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmbeddingJob" (
    "id" TEXT NOT NULL,
    "chunkId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmbeddingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorHash" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Source_organization_idx" ON "Source"("organization");

-- CreateIndex
CREATE INDEX "Source_checksum_idx" ON "Source"("checksum");

-- CreateIndex
CREATE INDEX "Crop_scientificName_idx" ON "Crop"("scientificName");

-- CreateIndex
CREATE INDEX "Crop_status_idx" ON "Crop"("status");

-- CreateIndex
CREATE INDEX "CropTranslation_name_idx" ON "CropTranslation"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CropTranslation_cropId_lang_key" ON "CropTranslation"("cropId", "lang");

-- CreateIndex
CREATE INDEX "CropSynonym_name_idx" ON "CropSynonym"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CropSynonym_cropId_lang_name_key" ON "CropSynonym"("cropId", "lang", "name");

-- CreateIndex
CREATE INDEX "Disease_scientificName_idx" ON "Disease"("scientificName");

-- CreateIndex
CREATE INDEX "Disease_status_idx" ON "Disease"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Disease_eppoCode_key" ON "Disease"("eppoCode");

-- CreateIndex
CREATE INDEX "DiseaseTranslation_name_idx" ON "DiseaseTranslation"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DiseaseTranslation_diseaseId_lang_key" ON "DiseaseTranslation"("diseaseId", "lang");

-- CreateIndex
CREATE INDEX "DiseaseSynonym_name_idx" ON "DiseaseSynonym"("name");

-- CreateIndex
CREATE INDEX "Pest_scientificName_idx" ON "Pest"("scientificName");

-- CreateIndex
CREATE INDEX "Pest_status_idx" ON "Pest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Pest_eppoCode_key" ON "Pest"("eppoCode");

-- CreateIndex
CREATE INDEX "PestTranslation_name_idx" ON "PestTranslation"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PestTranslation_pestId_lang_key" ON "PestTranslation"("pestId", "lang");

-- CreateIndex
CREATE INDEX "PestSynonym_name_idx" ON "PestSynonym"("name");

-- CreateIndex
CREATE INDEX "Symptom_cropId_diseaseId_idx" ON "Symptom"("cropId", "diseaseId");

-- CreateIndex
CREATE INDEX "Symptom_status_idx" ON "Symptom"("status");

-- CreateIndex
CREATE INDEX "Symptom_checksum_idx" ON "Symptom"("checksum");

-- CreateIndex
CREATE INDEX "Treatment_conditionId_treatmentType_idx" ON "Treatment"("conditionId", "treatmentType");

-- CreateIndex
CREATE INDEX "Treatment_status_idx" ON "Treatment"("status");

-- CreateIndex
CREATE INDEX "Prevention_conditionId_idx" ON "Prevention"("conditionId");

-- CreateIndex
CREATE INDEX "Prevention_status_idx" ON "Prevention"("status");

-- CreateIndex
CREATE INDEX "ActiveIngredient_name_idx" ON "ActiveIngredient"("name");

-- CreateIndex
CREATE INDEX "ActiveIngredient_status_idx" ON "ActiveIngredient"("status");

-- CreateIndex
CREATE INDEX "Product_status_registrationStatus_labelVerified_idx" ON "Product"("status", "registrationStatus", "labelVerified");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_checksum_idx" ON "Product"("checksum");

-- CreateIndex
CREATE INDEX "ProductRegistration_registrationNumber_idx" ON "ProductRegistration"("registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProductRegistration_registrationCountry_registrationNumber_key" ON "ProductRegistration"("registrationCountry", "registrationNumber");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_checksum_idx" ON "KnowledgeDocument"("checksum");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_status_idx" ON "KnowledgeDocument"("status");

-- CreateIndex
CREATE INDEX "KnowledgeChunkRow_entityType_entityId_idx" ON "KnowledgeChunkRow"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "KnowledgeChunkRow_status_language_idx" ON "KnowledgeChunkRow"("status", "language");

-- CreateIndex
CREATE INDEX "KnowledgeChunkRow_checksum_idx" ON "KnowledgeChunkRow"("checksum");

-- CreateIndex
CREATE INDEX "KnowledgeChunkRow_qualityScore_idx" ON "KnowledgeChunkRow"("qualityScore");

-- CreateIndex
CREATE INDEX "KnowledgeChunkRow_sourceId_idx" ON "KnowledgeChunkRow"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ImageReference_imageHash_key" ON "ImageReference"("imageHash");

-- CreateIndex
CREATE UNIQUE INDEX "ImportJob_idempotencyKey_key" ON "ImportJob"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ImportJobItem_jobId_externalId_key" ON "ImportJobItem"("jobId", "externalId");

-- CreateIndex
CREATE INDEX "DuplicateCandidate_status_idx" ON "DuplicateCandidate"("status");

-- CreateIndex
CREATE INDEX "ConflictRecord_status_idx" ON "ConflictRecord"("status");

-- CreateIndex
CREATE INDEX "VerificationTask_status_entityType_idx" ON "VerificationTask"("status", "entityType");

-- CreateIndex
CREATE INDEX "EmbeddingJob_status_idx" ON "EmbeddingJob"("status");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "CropTranslation" ADD CONSTRAINT "CropTranslation_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "Crop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropSynonym" ADD CONSTRAINT "CropSynonym_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "Crop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiseaseTranslation" ADD CONSTRAINT "DiseaseTranslation_diseaseId_fkey" FOREIGN KEY ("diseaseId") REFERENCES "Disease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiseaseSynonym" ADD CONSTRAINT "DiseaseSynonym_diseaseId_fkey" FOREIGN KEY ("diseaseId") REFERENCES "Disease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PestTranslation" ADD CONSTRAINT "PestTranslation_pestId_fkey" FOREIGN KEY ("pestId") REFERENCES "Pest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PestSynonym" ADD CONSTRAINT "PestSynonym_pestId_fkey" FOREIGN KEY ("pestId") REFERENCES "Pest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_activeIngredientId_fkey" FOREIGN KEY ("activeIngredientId") REFERENCES "ActiveIngredient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRegistration" ADD CONSTRAINT "ProductRegistration_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChunkRow" ADD CONSTRAINT "KnowledgeChunkRow_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChunkRow" ADD CONSTRAINT "KnowledgeChunkRow_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJobItem" ADD CONSTRAINT "ImportJobItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportError" ADD CONSTRAINT "ImportError_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmbeddingJob" ADD CONSTRAINT "EmbeddingJob_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "KnowledgeChunkRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
