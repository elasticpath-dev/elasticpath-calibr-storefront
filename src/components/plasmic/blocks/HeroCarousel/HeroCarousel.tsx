"use client";

import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Resolves the slot content into one array entry per slide. Plasmic wraps a
 * multi-child slot in a single `display:contents` element, so a naive
 * Children.toArray sees one wrapper (→ all sections stacked in one "slide").
 * Unwrap single-wrapper layers until multiple siblings surface.
 */
function toSlides(node: ReactNode): ReactNode[] {
  let arr = Children.toArray(node);
  while (arr.length === 1 && isValidElement(arr[0])) {
    const inner = Children.toArray(
      (arr[0] as ReactElement<{ children?: ReactNode }>).props?.children,
    );
    if (inner.length <= 1) break;
    arr = inner;
  }
  return arr;
}

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
  /**
   * Editor mode: renders every slide stacked vertically (one below another)
   * instead of as a carousel, so all slides are visible/editable in the
   * Plasmic Studio canvas. Turn off for the live carousel behavior.
   */
  editorMode?: boolean;
  className?: string;
};

// Layout is driven by inline styles (not Tailwind classes) so the carousel
// renders correctly in the Plasmic Studio canvas too, where the storefront's
// Tailwind stylesheet isn't loaded.
const arrowStyle: CSSProperties = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  zIndex: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  borderRadius: "9999px",
  border: "none",
  cursor: "pointer",
  background: "rgba(255,255,255,0.9)",
  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  color: "#374151",
};

/**
 * Full-width hero carousel for Plasmic. Each direct child of the `slides` slot
 * is one slide; one shows at a time, sliding horizontally. Supports autoplay,
 * prev/next arrows and pagination dots.
 */
export function HeroCarousel({
  slides,
  autoplay = false,
  autoplayInterval = 5000,
  showArrows = true,
  showDots = true,
  loop = true,
  editorMode = false,
  className,
}: HeroCarouselProps) {
  const items = toSlides(slides);
  const count = items.length;
  const [index, setIndex] = useState(0);

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

  if (count === 0) {
    return (
      <div
        className={className}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 240,
          border: "1px dashed #c2c8d0",
          borderRadius: 12,
          color: "#8c95a3",
          fontSize: 14,
        }}
      >
        Add slides to the hero carousel
      </div>
    );
  }

  // Editor mode — render every slide stacked so all are visible/editable in
  // the Plasmic canvas. No carousel transform, arrows, dots or autoplay.
  if (editorMode) {
    return (
      <div
        className={className}
        style={{ display: "flex", flexDirection: "column" }}
      >
        {items.map((slide, i) => (
          <div key={i} style={{ width: "100%", minWidth: 0 }}>
            {slide}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className} style={{ position: "relative", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          transition: "transform 500ms ease",
          transform: `translateX(-${index * 100}%)`,
        }}
      >
        {items.map((slide, i) => (
          <div
            key={i}
            aria-hidden={i !== index}
            style={{ flex: "0 0 100%", width: "100%", minWidth: 0 }}
          >
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
            style={{ ...arrowStyle, left: 16 }}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next slide"
            style={{ ...arrowStyle, right: 16 }}
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {showDots && count > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              style={{
                height: 8,
                width: i === index ? 24 : 8,
                borderRadius: 9999,
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "width 300ms ease, background 300ms ease",
                background:
                  i === index ? "#ffffff" : "rgba(255,255,255,0.6)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
