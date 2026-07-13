import { cn } from "@/lib/utils";

type ProductNameProps = {
  name: string;
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
};

export function ProductName({ name, as: Tag = "h3", className }: ProductNameProps) {
  return (
    <Tag className={cn("font-semibold text-gray-900 leading-snug", className)}>
      {name}
    </Tag>
  );
}
