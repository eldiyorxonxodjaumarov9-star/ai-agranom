import { notFound } from "next/navigation";
import {
  getProductById,
  MARKETPLACE_CATALOG,
} from "@/lib/platform/marketplace-catalog";
import ProductPageClient from "@/components/marketplace/ProductPageClient";

export function generateStaticParams() {
  return MARKETPLACE_CATALOG.map((p) => ({ id: p.id }));
}

export default function MarketplaceProductPage({
  params,
}: {
  params: { id: string };
}) {
  const product = getProductById(params.id);
  if (!product) notFound();

  return <ProductPageClient product={product} />;
}
