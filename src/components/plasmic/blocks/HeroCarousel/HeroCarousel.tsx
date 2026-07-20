"use client";

import {
  Children,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type HeroCarouselProps = {
  /** Slot — the author drops one element per slide (image, section, etc.). */
  slides?: ReactNode;
  autoplay?: boolean;
  /** Autoplay interval in milliseconds. */
  autoplayInterval?: number;
  /** Show the previous/next arrow buttons. */
  showArrows?: boolean;
  /** Show the pagination dots. */
  showDots?: boolean;
  /** Wrap around from the last slide to the first (and vice versa). */
  loop?: boolean;
  className?: string;
};

/**
 * Full-width hero carousel for Plasmic. Each direct child of the `slides` slot
 * is one slide; the author adds as many as they like in Studio. Supports
 * autoplay, prev/next arrows and pagination dots. One slide is shown at a
 * time, sliding horizontally.
 */
export function HeroCarousel({
  slides,
  autoplay = false,
  autoplayInterval = 5000,
  showArrows = true,
  showDots = true,
  loop = true,
  className,
}: HeroCarouselProps) {
  const items = Children.toArray(slides);
  const count = items.length;
  const [index, setIndex] = useState(0);

  // Keep the index valid if slides are added/removed in Studio.
  useEffect(() => {
    if (count > 0 && index >= count) setIndex(0);
  }, [count, index]);

  const go = useCallback(
    (target: number) => {
      setIndex((prev) => {
        if (count === 0) return 0;
        if (target < 0) return loop ? count - 1 : 0;
        if (target >= count) return loop ? 0 : count - 1;
        return target;
      });
    },
    [count, loop],
  );

  useEffect(() => {
    if (!autoplay || count <= 1) return;
    const id = setInterval(() => {
      setIndex((prev) => {
        const next = prev + 1;
        return next >= count ? (loop ? 0 : prev) : next;
      });
    }, Math.max(1000, autoplayInterval));
    return () => clearInterval(id);
  }, [autoplay, autoplayInterval, count, loop]);

  // Empty — show an authoring placeholder (renders nothing meaningful live).
  if (count === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center min-h-[240px] rounded-xl border border-dashed border-gray-300 text-sm text-gray-400",
          className,
        )}
      >
        Add slides to the hero carousel
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {items.map((slide, i) => (
          <div key={i} className="w-full flex-none" aria-hidden={i !== index}>
            {slide}
          </div>
        ))}
      </div>

      {showArrows && count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white/90 shadow-md text-gray-700 hover:text-gray-900 hover:bg-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white/90 shadow-md text-gray-700 hover:text-gray-900 hover:bg-white transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {showDots && count > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === index ? "w-6 bg-white" : "w-2 bg-white/60 hover:bg-white/80",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
