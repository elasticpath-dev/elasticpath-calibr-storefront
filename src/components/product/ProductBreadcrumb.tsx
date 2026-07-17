import { Fragment } from "react";
import Link from "next/link";
import type { BreadcrumbItem } from "@/lib/api/breadcrumb";

type Props = {
  lang: string;
  items: BreadcrumbItem[];
  homeLabel: string;
};

export function ProductBreadcrumb({ lang, items, homeLabel }: Props) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center gap-2 text-sm text-gray-500">
        <li>
          <Link href={`/${lang}`} className="hover:text-gray-900 transition-colors">
            {homeLabel}
          </Link>
        </li>
        {items.map((item) => (
          <Fragment key={item.href}>
            <li aria-hidden="true">›</li>
            <li>
              <Link href={item.href} className="hover:text-gray-900 transition-colors">
                {item.name}
              </Link>
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
