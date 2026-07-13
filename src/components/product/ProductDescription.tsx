import { cn } from "@/lib/utils";

type ProductDescriptionProps = {
  description: string;
  truncate?: boolean;
  className?: string;
};

export function ProductDescription({
  description,
  truncate = false,
  className,
}: ProductDescriptionProps) {
  if (!description) return null;
  return (
    <p
      className={cn(
        "text-gray-600 text-sm leading-relaxed",
        truncate && "line-clamp-2",
        className
      )}
    >
      {description}
    </p>
  );
}
