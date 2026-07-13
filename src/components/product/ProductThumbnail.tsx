import Image from "next/image";
import { cn } from "@/lib/utils";

type ProductThumbnailProps = {
  imageUrl?: string;
  name: string;
  className?: string;
  priority?: boolean;
};

export function ProductThumbnail({
  imageUrl,
  name,
  className,
  priority = false,
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
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          priority={priority}
          unoptimized={imageUrl.startsWith("http")}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-xl bg-gray-200" />
        </div>
      )}
    </div>
  );
}
