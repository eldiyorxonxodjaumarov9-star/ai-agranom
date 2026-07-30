#!/usr/bin/env npx tsx
/**
 * Product registry stats
 *
 *   npm run kb:product-stats
 */
import "dotenv/config";
import { getPrisma, isDatabaseConfigured } from "../server/kb/db/client";

async function main() {
  if (!isDatabaseConfigured()) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          error: "DATABASE_URL_REQUIRED",
          products: {
            total: 0,
            verified: 0,
            needsReview: 0,
            incomplete: 0,
            expired: 0,
            revoked: 0,
            conflict: 0,
            labelVerified: 0,
            recommendable: 0,
          },
          note: "No products verified without official registry import",
        },
        null,
        2
      )
    );
    process.exit(2);
  }

  const prisma = getPrisma()!;
  const [
    total,
    verified,
    needsReview,
    expired,
    revoked,
    conflict,
    labelVerified,
    recommendable,
    regs,
  ] = await Promise.all([
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.product.count({
      where: {
        deletedAt: null,
        status: "VERIFIED",
        registrationStatus: "ACTIVE",
        labelVerified: true,
      },
    }),
    prisma.product.count({
      where: { deletedAt: null, status: "NEEDS_REVIEW" },
    }),
    prisma.product.count({ where: { deletedAt: null, status: "EXPIRED" } }),
    prisma.product.count({ where: { deletedAt: null, status: "REVOKED" } }),
    prisma.product.count({ where: { deletedAt: null, status: "CONFLICT" } }),
    prisma.product.count({
      where: { deletedAt: null, labelVerified: true },
    }),
    prisma.product.count({
      where: {
        deletedAt: null,
        status: "VERIFIED",
        registrationStatus: "ACTIVE",
        labelVerified: true,
      },
    }),
    prisma.productRegistration.count({ where: { deletedAt: null } }),
  ]);

  console.log(
    JSON.stringify(
      {
        ok: true,
        products: {
          total,
          verified,
          needsReview,
          incomplete: needsReview, // INCOMPLETE mapped to NEEDS_REVIEW in DB
          expired,
          revoked,
          conflict,
          labelVerified,
          recommendable,
          registrations: regs,
        },
        note:
          verified === 0
            ? "verifiedProducts=0 until official KZ PPP CSV/JSON import + checklist pass. Use: npm run kb:import-kz-ppp -- --file ./export.csv"
            : undefined,
      },
      null,
      2
    )
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
