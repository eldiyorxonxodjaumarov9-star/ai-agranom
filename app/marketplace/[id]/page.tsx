import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductById, MARKETPLACE_CATALOG } from "@/lib/platform/marketplace-catalog";

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

  return (
    <div className="min-h-screen bg-canvas px-4 py-12 text-ink">
      <div className="mx-auto max-w-lg rounded-3xl border border-line bg-canvas-elevated p-8 shadow-soft">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">
          {product.category}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{product.name}</h1>
        <p className="mt-2 text-lg font-medium text-brand">{product.price}</p>
        <p className="mt-4 text-sm leading-relaxed text-ink-muted">
          {product.description}
        </p>
        <p className="mt-6 text-xs text-ink-faint">
          AI Agronom faqat katalogdagi mavjud mahsulotlarni tavsiya qiladi.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/" className="btn-primary">
            AI Chatga qaytish
          </Link>
          <Link href="/#marketplace" className="btn-ghost">
            Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}
