"use client";

import { useState } from "react";
import { ProductThumbnail } from "./ProductThumbnail";

type Props = {
  imageUrl?: string;
  additionalImages?: string[];
  name: string;
};

/**
 * PDP image gallery: main image plus clickable thumbnails (the main image
 * itself is included as the first thumbnail) — clicking a thumbnail swaps
 * it into the main slot.
 */
export function ProductImageGallery({ imageUrl, additionalImages, name }: Props) {
  const images = Array.from(
    new Set([imageUrl, ...(additionalImages ?? [])].filter((u): u is string => !!u)),
  );
  const [selected, setSelected] = useState(0);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl overflow-hidden border border-gray-100 bg-gray-50">
        <ProductThumbnail
          imageUrl={images[selected] ?? imageUrl}
          name={name}
          className="w-full aspect-square"
          priority
        />
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-3">
          {images.slice(0, 5).map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setSelected(i)}
              aria-label={`${name} — view image ${i + 1}`}
              aria-pressed={selected === i}
              className={[
                "rounded-lg overflow-hidden border bg-gray-50 aspect-square relative transition-colors",
                selected === i
                  ? "border-brand-primary ring-1 ring-brand-primary"
                  : "border-gray-100 hover:border-gray-300",
              ].join(" ")}
            >
              <ProductThumbnail imageUrl={url} name={`${name} view ${i + 1}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
