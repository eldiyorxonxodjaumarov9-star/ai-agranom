/**
 * Persist seller offers + price history. Never sets Product VERIFIED.
 */
import { getPrisma, isDatabaseConfigured } from "../db/client";
import {
  matchOfferToVerifiedProductId,
  type ParsedSellerOffer,
} from "../adapters/seller-offer";

export type PersistOfferResult = {
  offerId?: string;
  created: boolean;
  updated: boolean;
  skipped: boolean;
  linkedProductId: string | null;
  priceSnapshotTaken: boolean;
  error?: string;
};

export async function persistSellerOffer(input: {
  sellerId: string;
  offer: ParsedSellerOffer;
}): Promise<PersistOfferResult> {
  if (!isDatabaseConfigured()) {
    return {
      created: false,
      updated: false,
      skipped: true,
      linkedProductId: null,
      priceSnapshotTaken: false,
      error: "database_not_configured",
    };
  }
  const prisma = getPrisma();
  if (!prisma) {
    return {
      created: false,
      updated: false,
      skipped: true,
      linkedProductId: null,
      priceSnapshotTaken: false,
      error: "no_prisma",
    };
  }

  const verified = await prisma.product.findMany({
    where: {
      status: "VERIFIED",
      registrationStatus: "ACTIVE",
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      status: true,
      registrationStatus: true,
    },
    take: 500,
  });
  const linkedProductId = matchOfferToVerifiedProductId({
    tradeName: input.offer.tradeName,
    candidates: verified.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      registrationStatus: p.registrationStatus,
    })),
  });

  const existing = await prisma.productOffer.findFirst({
    where: {
      sellerId: input.sellerId,
      tradeName: input.offer.tradeName,
    },
  });

  const provenance = {
    sourceUrl: input.offer.sourceUrl,
    parseMethod: input.offer.parseMethod,
    activeIngredient: input.offer.activeIngredient,
    concentration: input.offer.concentration,
    formulation: input.offer.formulation,
    manufacturer: input.offer.manufacturer,
    // Explicit: seller never proves registration
    verifiesProduct: false,
  };

  const now = new Date();

  if (existing) {
    if (existing.checksum === input.offer.checksum) {
      await prisma.productOffer.update({
        where: { id: existing.id },
        data: {
          lastCheckedAt: now,
          lastSeenAt: now,
          productId: linkedProductId ?? existing.productId,
        },
      });
      return {
        offerId: existing.id,
        created: false,
        updated: false,
        skipped: true,
        linkedProductId: linkedProductId ?? existing.productId,
        priceSnapshotTaken: false,
      };
    }

    await prisma.productOffer.update({
      where: { id: existing.id },
      data: {
        packSize: input.offer.packSize,
        price: input.offer.price,
        currency: input.offer.currency,
        stockStatus: input.offer.stockStatus,
        provenanceJson: provenance,
        checksum: input.offer.checksum,
        lastCheckedAt: now,
        lastSeenAt: now,
        productId: linkedProductId,
      },
    });
    await prisma.offerPriceSnapshot.create({
      data: {
        offerId: existing.id,
        price: input.offer.price,
        currency: input.offer.currency,
        stockStatus: input.offer.stockStatus,
      },
    });
    return {
      offerId: existing.id,
      created: false,
      updated: true,
      skipped: false,
      linkedProductId,
      priceSnapshotTaken: true,
    };
  }

  const created = await prisma.productOffer.create({
    data: {
      sellerId: input.sellerId,
      productId: linkedProductId,
      tradeName: input.offer.tradeName,
      packSize: input.offer.packSize,
      price: input.offer.price,
      currency: input.offer.currency,
      stockStatus: input.offer.stockStatus,
      provenanceJson: provenance,
      checksum: input.offer.checksum,
      lastCheckedAt: now,
      lastSeenAt: now,
    },
  });
  await prisma.offerPriceSnapshot.create({
    data: {
      offerId: created.id,
      price: input.offer.price,
      currency: input.offer.currency,
      stockStatus: input.offer.stockStatus,
    },
  });
  return {
    offerId: created.id,
    created: true,
    updated: false,
    skipped: false,
    linkedProductId,
    priceSnapshotTaken: true,
  };
}
