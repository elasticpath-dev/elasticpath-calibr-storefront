import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize-html";

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
  // Descriptions may contain HTML markup — render it (sanitized). Plain-text
  // descriptions render unchanged. A div (not p) so block-level tags are valid.
  return (
    <div
      className={cn(
        "text-gray-600 text-sm leading-relaxed [&_a]:underline [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5",
        truncate && "line-clamp-2",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
    />
  );
}
