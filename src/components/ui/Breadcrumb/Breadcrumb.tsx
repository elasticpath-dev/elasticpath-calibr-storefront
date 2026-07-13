import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type BreadcrumbProps = {
  items: BreadcrumbItem[];
  showHome?: boolean;
  homeHref?: string;
  className?: string;
};

export function Breadcrumb({ items, showHome = true, homeHref = "/", className }: BreadcrumbProps) {
  const allItems: BreadcrumbItem[] = showHome
    ? [{ label: "Home", href: homeHref }, ...items]
    : items;

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center", className)}>
      <ol className="flex items-center flex-wrap gap-1">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;

          return (
            <li key={index} className="flex items-center gap-1">
              {index === 0 && showHome ? (
                item.href && !isLast ? (
                  <Link
                    href={item.href}
                    aria-label="Home"
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Home size={14} />
                  </Link>
                ) : (
                  <span className="text-gray-400">
                    <Home size={14} />
                  </span>
                )
              ) : item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn(
                    "text-sm",
                    isLast ? "text-gray-900 font-medium" : "text-gray-500"
                  )}
                >
                  {item.label}
                </span>
              )}

              {!isLast && (
                <ChevronRight size={14} className="text-gray-300 shrink-0" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
