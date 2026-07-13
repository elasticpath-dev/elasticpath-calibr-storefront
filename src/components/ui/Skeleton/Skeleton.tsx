import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "rect" | "circle" | "text";
  width?: string | number;
  height?: string | number;
  lines?: number;
};

export function Skeleton({
  variant = "rect",
  width,
  height,
  lines = 1,
  className,
  style,
  ...props
}: SkeletonProps) {
  const base = cn(
    "animate-pulse bg-gray-200",
    variant === "circle" ? "rounded-full" : variant === "text" ? "rounded" : "rounded-lg",
    className
  );

  const inlineStyle = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    ...style,
  };

  if (variant === "text" && lines > 1) {
    return (
      <div className="space-y-2" {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(base, "h-4")}
            style={i === lines - 1 ? { ...inlineStyle, width: "75%" } : inlineStyle}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={base}
      style={inlineStyle}
      aria-hidden="true"
      {...props}
    />
  );
}

/** Skeleton preset for a product card */
export function ProductCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <Skeleton variant="rect" className="aspect-square w-full rounded-none" />
      <div className="p-4 space-y-2">
        <Skeleton variant="text" width="60%" height={12} />
        <Skeleton variant="text" height={16} />
        <Skeleton variant="text" width="40%" height={16} />
      </div>
    </div>
  );
}
