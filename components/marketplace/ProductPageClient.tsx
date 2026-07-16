"use client";

import Link from "next/link";
import { LocaleProvider, useT } from "@/lib/context/LocaleContext";
import { ThemeProvider } from "@/lib/context/ThemeContext";
import type { MarketplaceProduct } from "@/lib/platform/types";

function ProductBody({ product }: { product: MarketplaceProduct }) {
  const t = useT();

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
        <p className="mt-6 text-xs text-ink-faint">{t.marketplace.catalogNote}</p>
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

export default function ProductPageClient({
  product,
}: {
  product: MarketplaceProduct;
}) {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <ProductBody product={product} />
      </LocaleProvider>
    </ThemeProvider>
  );
}
