import { notFound } from "next/navigation";
import {
  getProductById,
  MARKETPLACE_CATALOG,
} from "@/lib/platform/marketplace-catalog";
import ProductPageClient from "@/components/marketplace/ProductPageClient";

export function generateStaticParams() {
  return MARKETPLACE_CATALOG.map((p) => ({ id: p.id }));
}

export default async function MarketplaceProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) notFound();

  return <ProductPageClient product={product} />;
}
