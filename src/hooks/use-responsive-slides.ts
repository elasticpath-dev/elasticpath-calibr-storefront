"use client";

import { useEffect, useState } from "react";

/**
 * Viewport-responsive carousel slide count, mirroring ProductGrid's column
 * breakpoints (Tailwind sm/lg/xl/2xl) including its wider full-width tiers.
 *
 * Only the long-standing default of 4 becomes responsive — an explicit
 * author-chosen count (e.g. a Plasmic block set to 2, 3, or 6 in Studio)
 * is respected as-is at every screen size.
 *
 * Returns `slidesToShow` until mounted (SSR renders the default), then the
 * viewport-derived value, updating on resize.
 */
export function useResponsiveSlides(
  slidesToShow: number,
  fullWidth: boolean,
): number {
  const [viewportSlides, setViewportSlides] = useState<number | null>(null);

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      if (w < 768) return 1; // below md
      if (w < 1024) return 2; // md
      if (w < 1280) return 3; // lg
      if (w < 1536) return 4; // xl
      // 2xl — only full-width shells actually span the viewport here; the
      // default shell is capped at 80rem (= the xl tier), so more cards
      // would just squeeze below their min width and force scrolling.
      return fullWidth ? 5 : 4;
    };
    const update = () => setViewportSlides(compute());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [fullWidth]);

  if (slidesToShow !== 4) return slidesToShow;
  return viewportSlides ?? slidesToShow;
}
