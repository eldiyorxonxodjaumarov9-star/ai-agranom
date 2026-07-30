/**
 * Idempotent corpus → PostgreSQL migration (library + CLI).
 */
import { createHash } from "crypto";
import { getPrisma, isDatabaseConfigured } from "./client";
import { CROPS } from "../corpus/crops";
import { DISEASES } from "../corpus/diseases";
import { DISEASES_EXTRA } from "../corpus/diseases-extra";
import { DISEASES_PHASE4 } from "../corpus/diseases-phase4";
import { PESTS } from "../corpus/pests";
import { PESTS_EXTRA } from "../corpus/pests-extra";
import { PESTS_PHASE4 } from "../corpus/pests-phase4";
import { ACTIVE_INGREDIENTS } from "../corpus/products";
import { buildCorpusChunks } from "../corpus/build";

export type CorpusMigrateReport = {
  cropsInserted: number;
  diseasesInserted: number;
  pestsInserted: number;
  chunksInserted: number;
  symptomsInserted: number;
  treatmentsInserted: number;
  productsInserted: number;
  skipped: number;
  failed: number;
  errors: string[];
};

function sha(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 16);
}

export async function migrateCorpusToDatabase(): Promise<CorpusMigrateReport> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL_REQUIRED");
  }

  const prisma = getPrisma();
  if (!prisma) {
    throw new Error("DATABASE_URL_REQUIRED");
  }

  const report: CorpusMigrateReport = {
    cropsInserted: 0,
    diseasesInserted: 0,
    pestsInserted: 0,
    chunksInserted: 0,
    symptomsInserted: 0,
    treatmentsInserted: 0,
    productsInserted: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  const force = process.env.FORCE_CORPUS_MIGRATE === "1";
  const expectedChunks = buildCorpusChunks().length;
  if (!force) {
    const existing = await prisma.knowledgeChunkRow.count();
    if (existing >= expectedChunks) {
      report.skipped = existing;
      console.info(
        `[migrate-corpus] skip — ${existing}/${expectedChunks} chunks present (FORCE_CORPUS_MIGRATE=1 to re-run)`
      );
      return report;
    }
    console.info(
      `[migrate-corpus] expanding — ${existing}/${expectedChunks} chunks; upserting…`
    );
  }

  const batches = 50;

  // Ensure default sources
  const sourceDefs = [
    {
      id: "src-fao",
      title: "FAO curated",
      organization: "FAO",
      url: "https://www.fao.org",
      license: "verify_per_document",
      reliabilityScore: 0.95,
    },
    {
      id: "src-eppo",
      title: "EPPO curated",
      organization: "EPPO",
      url: "https://gd.eppo.int",
      license: "verify",
      reliabilityScore: 0.96,
    },
    {
      id: "src-usda",
      title: "USDA/extension curated",
      organization: "USDA/extension",
      url: "https://www.usda.gov",
      license: "verify_per_document",
      reliabilityScore: 0.88,
    },
  ];

  for (const s of sourceDefs) {
    await prisma.source.upsert({
      where: { id: s.id },
      create: {
        ...s,
        accessedAt: new Date(),
        checksum: sha(s.url),
      },
      update: {
        title: s.title,
        reliabilityScore: s.reliabilityScore,
        accessedAt: new Date(),
      },
    });
  }

  const ALL_DISEASES = [...DISEASES, ...DISEASES_EXTRA, ...DISEASES_PHASE4];
  const ALL_PESTS = [...PESTS, ...PESTS_EXTRA, ...PESTS_PHASE4];

  // Crops
  for (let i = 0; i < CROPS.length; i += batches) {
    const slice = CROPS.slice(i, i + batches);
    for (const crop of slice) {
      try {
        const checksum = sha(JSON.stringify(crop));
        const existing = await prisma.crop.findUnique({ where: { id: crop.id } });
        if (existing?.checksum === checksum) {
          report.skipped++;
          continue;
        }
        await prisma.$transaction(async (tx) => {
          await tx.crop.upsert({
            where: { id: crop.id },
            create: {
              id: crop.id,
              scientificName: crop.scientificName,
              cropGroup: crop.group,
              tempC: crop.tempC,
              humidity: crop.humidity,
              soil: crop.soil,
              ph: crop.ph,
              irrigation: crop.irrigation,
              regions: crop.regions,
              status: "VERIFIED",
              qualityScore: 85,
              checksum,
            },
            update: {
              scientificName: crop.scientificName,
              cropGroup: crop.group,
              tempC: crop.tempC,
              humidity: crop.humidity,
              soil: crop.soil,
              ph: crop.ph,
              irrigation: crop.irrigation,
              regions: crop.regions,
              checksum,
              version: { increment: 1 },
            },
          });
          for (const [lang, name] of Object.entries(crop.names)) {
            await tx.cropTranslation.upsert({
              where: { cropId_lang: { cropId: crop.id, lang } },
              create: { cropId: crop.id, lang, name, status: "VERIFIED" },
              update: { name },
            });
          }
        });
        report.cropsInserted++;
      } catch (e) {
        report.failed++;
        report.errors.push(`crop ${crop.id}: ${e instanceof Error ? e.message : e}`);
      }
    }
    console.log(`crops progress ${Math.min(i + batches, CROPS.length)}/${CROPS.length}`);
  }

  // Diseases
  for (let i = 0; i < ALL_DISEASES.length; i += batches) {
    const slice = ALL_DISEASES.slice(i, i + batches);
    for (const d of slice) {
      try {
        const checksum = sha(JSON.stringify(d));
        const existing = await prisma.disease.findUnique({ where: { id: d.id } });
        if (existing?.checksum === checksum) {
          report.skipped++;
          continue;
        }
        await prisma.$transaction(async (tx) => {
          await tx.disease.upsert({
            where: { id: d.id },
            create: {
              id: d.id,
              scientificName: d.scientificName,
              eppoCode: d.eppoCode || null,
              pathogenType: d.pathogenType,
              pathogenName: d.scientificName,
              severity: d.severity,
              status: "VERIFIED",
              qualityScore: 88,
              checksum,
              sourceUrl: d.sourceUrl,
              organization: d.organization,
            },
            update: {
              scientificName: d.scientificName,
              eppoCode: d.eppoCode || null,
              pathogenType: d.pathogenType,
              severity: d.severity,
              checksum,
              sourceUrl: d.sourceUrl,
              organization: d.organization,
              version: { increment: 1 },
            },
          });
          for (const [lang, name] of Object.entries(d.names)) {
            await tx.diseaseTranslation.upsert({
              where: { diseaseId_lang: { diseaseId: d.id, lang } },
              create: { diseaseId: d.id, lang, name, status: "VERIFIED" },
              update: { name },
            });
          }
          // Symptom rows (early/late per language)
          for (const lang of Object.keys(d.earlySymptoms) as Array<keyof typeof d.earlySymptoms>) {
            const sid = `sym-${d.id}-${lang}`;
            const content = `${d.earlySymptoms[lang]} | ${d.lateSymptoms[lang]}`;
            const csum = sha(content);
            await tx.symptom.upsert({
              where: { id: sid },
              create: {
                id: sid,
                diseaseId: d.id,
                cropId: d.cropIds[0],
                plantPart: "leaf",
                visualDescription: content,
                earlyStage: d.earlySymptoms[lang],
                lateStage: d.lateSymptoms[lang],
                confusedWith: d.confusedWith || [],
                language: lang,
                sourceUrl: d.sourceUrl,
                organization: d.organization,
                status: "VERIFIED",
                qualityScore: 80,
                checksum: csum,
              },
              update: {
                visualDescription: content,
                earlyStage: d.earlySymptoms[lang],
                lateStage: d.lateSymptoms[lang],
                checksum: csum,
                version: { increment: 1 },
              },
            });
            report.symptomsInserted++;
          }
          // Prevention
          for (const lang of Object.keys(d.prevention) as Array<keyof typeof d.prevention>) {
            const pid = `prev-${d.id}-${lang}`;
            const csum = sha(d.prevention[lang]);
            await tx.prevention.upsert({
              where: { id: pid },
              create: {
                id: pid,
                conditionId: d.id,
                conditionType: "disease",
                cropId: d.cropIds[0],
                method: d.prevention[lang],
                sourceUrl: d.sourceUrl,
                organization: d.organization,
                status: "VERIFIED",
                qualityScore: 82,
                checksum: csum,
              },
              update: {
                method: d.prevention[lang],
                checksum: csum,
                version: { increment: 1 },
              },
            });
            const tid = `treat-cult-${d.id}-${lang}`;
            await tx.treatment.upsert({
              where: { id: tid },
              create: {
                id: tid,
                conditionId: d.id,
                conditionType: "disease",
                cropId: d.cropIds[0],
                treatmentType: "cultural",
                method: d.prevention[lang],
                safetyNotes:
                  "Chemical rates only from official labels; never invent doses.",
                sourceUrl: d.sourceUrl,
                organization: d.organization,
                status: "VERIFIED",
                qualityScore: 80,
                checksum: csum,
              },
              update: {
                method: d.prevention[lang],
                checksum: csum,
                version: { increment: 1 },
              },
            });
            report.treatmentsInserted++;
          }
        });
        report.diseasesInserted++;
      } catch (e) {
        report.failed++;
        report.errors.push(`disease ${d.id}: ${e instanceof Error ? e.message : e}`);
      }
    }
    console.log(`diseases progress ${Math.min(i + batches, ALL_DISEASES.length)}/${ALL_DISEASES.length}`);
  }

  // Pests
  for (let i = 0; i < ALL_PESTS.length; i += batches) {
    const slice = ALL_PESTS.slice(i, i + batches);
    for (const p of slice) {
      try {
        const checksum = sha(JSON.stringify(p));
        const existing = await prisma.pest.findUnique({ where: { id: p.id } });
        if (existing?.checksum === checksum) {
          report.skipped++;
          continue;
        }
        await prisma.$transaction(async (tx) => {
          await tx.pest.upsert({
            where: { id: p.id },
            create: {
              id: p.id,
              scientificName: p.scientificName,
              eppoCode: p.eppoCode || null,
              pestType: p.pestType,
              status: "VERIFIED",
              qualityScore: 86,
              checksum,
              sourceUrl: p.sourceUrl,
              organization: p.organization,
            },
            update: {
              scientificName: p.scientificName,
              eppoCode: p.eppoCode || null,
              pestType: p.pestType,
              checksum,
              sourceUrl: p.sourceUrl,
              organization: p.organization,
              version: { increment: 1 },
            },
          });
          for (const [lang, name] of Object.entries(p.names)) {
            await tx.pestTranslation.upsert({
              where: { pestId_lang: { pestId: p.id, lang } },
              create: { pestId: p.id, lang, name, status: "VERIFIED" },
              update: { name },
            });
          }
        });
        report.pestsInserted++;
      } catch (e) {
        report.failed++;
        report.errors.push(`pest ${p.id}: ${e instanceof Error ? e.message : e}`);
      }
    }
    console.log(`pests progress ${Math.min(i + batches, ALL_PESTS.length)}/${ALL_PESTS.length}`);
  }

  // Active ingredients / products — always NEEDS_REVIEW
  for (const ai of ACTIVE_INGREDIENTS) {
    try {
      const checksum = sha(JSON.stringify(ai));
      await prisma.activeIngredient.upsert({
        where: { id: ai.id },
        create: {
          id: ai.id,
          name: ai.name,
          type: ai.type,
          status: "NEEDS_REVIEW",
          checksum,
        },
        update: { name: ai.name, type: ai.type, checksum },
      });
      const productId = `product-class-${ai.id}`;
      await prisma.product.upsert({
        where: { id: productId },
        create: {
          id: productId,
          name: ai.name,
          activeIngredientId: ai.id,
          labelUrl: ai.sourceUrl,
          labelVerified: false,
          status: "NEEDS_REVIEW",
          registrationStatus: "UNKNOWN",
          qualityScore: 40,
          checksum,
        },
        update: {
          name: ai.name,
          checksum,
          status: "NEEDS_REVIEW",
          labelVerified: false,
        },
      });
      report.productsInserted++;
    } catch (e) {
      report.failed++;
      report.errors.push(`product ${ai.id}: ${e instanceof Error ? e.message : e}`);
    }
  }

  // Knowledge chunks
  const chunks = buildCorpusChunks();
  for (let i = 0; i < chunks.length; i += batches) {
    const slice = chunks.slice(i, i + batches);
    for (const c of slice) {
      try {
        const existing = await prisma.knowledgeChunkRow.findUnique({
          where: { id: c.id },
        });
        if (existing?.checksum === c.checksum) {
          report.skipped++;
          continue;
        }
        const sourceId =
          c.organization.includes("EPPO")
            ? "src-eppo"
            : c.organization.includes("USDA")
              ? "src-usda"
              : "src-fao";
        await prisma.knowledgeChunkRow.upsert({
          where: { id: c.id },
          create: {
            id: c.id,
            entityType: c.entityType as never,
            entityId: c.entityId,
            language: c.language,
            title: c.title,
            content: c.content,
            keywords: c.keywords,
            cropIds: c.cropIds || [],
            plantParts: c.plantParts || [],
            regions: c.regions || [],
            sourceId,
            sourceUrl: c.sourceUrl,
            sourceTitle: c.sourceTitle,
            organization: c.organization,
            reliabilityScore: c.reliabilityScore,
            qualityScore: c.qualityScore ?? 70,
            status: c.status as never,
            version: c.version,
            checksum: c.checksum,
          },
          update: {
            title: c.title,
            content: c.content,
            keywords: c.keywords,
            qualityScore: c.qualityScore ?? 70,
            status: c.status as never,
            checksum: c.checksum,
            version: { increment: 1 },
          },
        });
        report.chunksInserted++;
      } catch (e) {
        report.failed++;
        report.errors.push(`chunk ${c.id}: ${e instanceof Error ? e.message : e}`);
      }
    }
    console.log(`chunks progress ${Math.min(i + batches, chunks.length)}/${chunks.length}`);
  }

  console.log(JSON.stringify({ ok: true, ...report, errors: report.errors.slice(0, 20) }, null, 2));
  return report;
}
