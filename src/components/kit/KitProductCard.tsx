import { Package } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { KitProduct } from "@/lib/kit";

export function KitProductCard({
  product,
  buyLabel,
}: {
  product: KitProduct;
  buyLabel: string;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-ink-200 bg-white transition-shadow hover:shadow-md">
      <div className="flex aspect-square items-center justify-center bg-ink-50 p-4">
        {product.imageUrl ? (
          // Plain img — external hosts vary; keeps it simple and unoptimized.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        ) : (
          <Package size={40} className="text-ink-300" />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.partNumber && (
          <Badge variant="outline" size="sm" className="self-start">
            {product.partNumber}
          </Badge>
        )}
        <h3 className="text-sm font-semibold leading-snug text-ink-900">
          {product.name}
        </h3>
        {product.description && (
          <p className="line-clamp-2 text-xs text-ink-600">
            {product.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          {product.price && (
            <span className="text-base font-bold text-ink-900">
              {product.price}
            </span>
          )}
          {product.url && (
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium",
                "bg-brand-primary text-button-text transition-opacity hover:opacity-90",
                "ml-auto",
              )}
            >
              {buyLabel}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
