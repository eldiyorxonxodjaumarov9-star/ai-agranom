#!/usr/bin/env npx tsx
/**
 * Batch product verification (does NOT invent registry data).
 * Without official registry fields, products remain NEEDS_REVIEW.
 *
 *   npm run kb:verify-products
 */
import "dotenv/config";
import { ACTIVE_INGREDIENTS } from "../server/kb/corpus/products";
import { verifyProductRecord } from "../server/kb/products/verify";
import { getPrisma, isDatabaseConfigured } from "../server/kb/db/client";

async function main() {
  const results = {
    checked: 0,
    verified: 0,
    needsReview: 0,
    expired: 0,
    revoked: 0,
    conflict: 0,
    details: [] as Array<{ id: string; status: string; reasons: string[] }>,
  };

  for (const ai of ACTIVE_INGREDIENTS) {
    const outcome = verifyProductRecord({
      registryRecordExists: false,
      registrationNumber: null,
      labelUrl: ai.sourceUrl,
      approvedCrops: ai.cropsHint,
      approvedTargets: ai.targets,
      sourceChecksum: null,
    });
    results.checked++;
    if (outcome.status === "VERIFIED") results.verified++;
    else if (outcome.status === "EXPIRED") results.expired++;
    else if (outcome.status === "REVOKED") results.revoked++;
    else if (outcome.status === "CONFLICT") results.conflict++;
    else results.needsReview++;
    results.details.push({
      id: ai.id,
      status: outcome.status,
      reasons: outcome.reasons,
    });
  }

  if (isDatabaseConfigured()) {
    const prisma = getPrisma();
    if (prisma) {
      for (const d of results.details) {
        const productId = `product-class-${d.id}`;
        try {
          await prisma.product.updateMany({
            where: { id: productId },
            data: {
              status: d.status as never,
              labelVerified: d.status === "VERIFIED",
              registrationStatus:
                d.status === "VERIFIED"
                  ? "ACTIVE"
                  : d.status === "EXPIRED"
                    ? "EXPIRED"
                    : d.status === "REVOKED"
                      ? "REVOKED"
                      : "UNKNOWN",
            },
          });
        } catch {
          /* ignore missing rows */
        }
      }
      await prisma.$disconnect();
    }
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
