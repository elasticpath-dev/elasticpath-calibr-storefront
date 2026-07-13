import { ProductCard } from "./ProductCard";
import type { ProductCardData } from "@/lib/api/products";

type ProductGridProps = {
  products: ProductCardData[];
  lang: string;
};

export function ProductGrid({ products, lang }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-gray-400 text-sm">No products found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product, i) => (
        <ProductCard
          key={product.id}
          product={product}
          lang={lang}
          priority={i < 4}
        />
      ))}
    </div>
  );
}
