import { cn } from "@/lib/utils";

type PriceProps = {
  formatted: string;
  originalFormatted?: string;
  className?: string;
  stacked?: boolean;
  /** Show only the single current price (red when on sale) — never the strikethrough original. */
  hideOriginal?: boolean;
};

export function Price({
  formatted,
  originalFormatted,
  className,
  stacked = false,
  hideOriginal = false,
}: PriceProps) {
  if (!formatted) return null;
  const isOnSale = Boolean(originalFormatted);

  if (isOnSale && stacked && !hideOriginal) {
    return (
      <span className={cn("inline-flex flex-col gap-0.5", className)}>
        <span className="text-sm text-gray-400 line-through leading-none">{originalFormatted}</span>
        <span className="font-bold text-red-600 leading-none">{formatted}</span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className={cn("font-bold text-gray-900", isOnSale && "text-red-600")}>
        {formatted}
      </span>
      {isOnSale && !hideOriginal && (
        <span className="text-sm text-gray-400 line-through">{originalFormatted}</span>
      )}
    </span>
  );
}
