"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblings?: number;
  className?: string;
};

function getPageRange(current: number, total: number, siblings: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const leftSibling = Math.max(current - siblings, 1);
  const rightSibling = Math.min(current + siblings, total);

  const showLeft = leftSibling > 2;
  const showRight = rightSibling < total - 1;

  const pages: (number | "...")[] = [1];
  if (showLeft) pages.push("...");

  for (let i = leftSibling; i <= rightSibling; i++) {
    if (i !== 1 && i !== total) pages.push(i);
  }

  if (showRight) pages.push("...");
  pages.push(total);

  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblings = 1,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageRange(currentPage, totalPages, siblings);

  return (
    <nav aria-label="Pagination" className={cn("flex items-center gap-1", className)}>
      {/* Previous */}
      <PageButton
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </PageButton>

      {/* Pages */}
      {pages.map((page, i) =>
        page === "..." ? (
          <span
            key={`ellipsis-${i}`}
            className="flex items-center justify-center w-9 h-9 text-gray-400"
            aria-hidden="true"
          >
            <MoreHorizontal size={16} />
          </span>
        ) : (
          <PageButton
            key={page}
            onClick={() => onPageChange(page as number)}
            isActive={page === currentPage}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </PageButton>
        )
      )}

      {/* Next */}
      <PageButton
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </PageButton>
    </nav>
  );
}

type PageButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  isActive?: boolean;
  children: React.ReactNode;
  "aria-label"?: string;
  "aria-current"?: "page" | undefined;
};

function PageButton({ onClick, disabled, isActive, children, ...props }: PageButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center justify-center min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1",
        "disabled:opacity-40 disabled:pointer-events-none",
        isActive
          ? "bg-brand-primary text-white"
          : "text-gray-700 hover:bg-gray-100"
      )}
      {...props}
    >
      {children}
    </button>
  );
}
