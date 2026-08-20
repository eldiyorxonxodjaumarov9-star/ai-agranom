/**
 * Upsert PENDING_REVIEW discovery candidates from bundled list.
 * Never enables SellerSource crawl.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { getPrisma, isDatabaseConfigured } from "../db/client";

export type DiscoverySeedResult = {
  upserted: string[];
  errors: string[];
  crawlEnabled: false;
};

export async function seedDiscoveryCandidatesFromBundle(input?: {
  actorHash?: string;
}): Promise<DiscoverySeedResult> {
  const upserted: string[] = [];
  const errors: string[] = [];
  if (!isDatabaseConfigured()) {
    return {
      upserted,
      errors: ["database_not_configured"],
      crawlEnabled: false,
    };
  }
  const prisma = getPrisma();
  if (!prisma) {
    return { upserted, errors: ["no_prisma"], crawlEnabled: false };
  }

  const path = join(
    process.cwd(),
    "server",
    "kb",
    "sellers",
    "discovery-candidates.json"
  );
  const list = JSON.parse(readFileSync(path, "utf8")) as Array<{
    domain: string;
    url: string;
    discoveredBy?: string;
    notes?: string;
  }>;

  for (const item of list) {
    try {
      await prisma.sourceDiscoveryCandidate.upsert({
        where: { domain: item.domain },
        create: {
          domain: item.domain,
          url: item.url,
          discoveredBy: item.discoveredBy || "admin_manual_list",
          status: "PENDING_REVIEW",
          reviewNotes:
            item.notes ||
            "Crawl disabled until admin approves after robots/ToS review",
        },
        update: {
          status: "PENDING_REVIEW",
          url: item.url,
          reviewNotes:
            item.notes ||
            "Re-queued PENDING_REVIEW; crawl remains disabled",
        },
      });
      upserted.push(item.domain);
    } catch (e) {
      errors.push(
        `${item.domain}:${e instanceof Error ? e.message : "upsert_failed"}`
      );
    }
  }

  try {
    await prisma.adminAuditLog.create({
      data: {
        actorHash: input?.actorHash || "system",
        action: "discovery_seed_pending_review",
        entityType: "SourceDiscoveryCandidate",
        detail: { upserted, crawlEnabled: false },
      },
    });
  } catch {
    /* optional */
  }

  return { upserted, errors, crawlEnabled: false };
}
