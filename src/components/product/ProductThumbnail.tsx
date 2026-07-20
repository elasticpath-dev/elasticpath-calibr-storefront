import Image from "next/image";
import { cn } from "@/lib/utils";

type ProductThumbnailProps = {
  imageUrl?: string;
  name: string;
  className?: string;
  priority?: boolean;
  /**
   * How the image fills its square. "contain" (default) shows the whole image
   * (letterboxed on the neutral background); "cover" crops it edge-to-edge.
   */
  objectFit?: "contain" | "cover";
};

export function ProductThumbnail({
  imageUrl,
  name,
  className,
  priority = false,
  objectFit = "contain",
}: ProductThumbnailProps) {
  return (
    <div
      className={cn(
        "relative aspect-square bg-gray-50 overflow-hidden",
        className,
      )}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className={cn(
            "group-hover:scale-105 transition-transform duration-300",
            objectFit === "cover" ? "object-cover" : "object-contain",
          )}
          priority={priority}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-xl bg-gray-200" />
        </div>
      )}
    </div>
  );
}
