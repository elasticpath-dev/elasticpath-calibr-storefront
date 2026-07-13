"use client";

import { useState, useEffect, useRef } from "react";
import type { ShippingMethod } from "./types";

export function useShippingMethods(cartId: string | null) {
  const [methods, setMethods] = useState<Record<string, ShippingMethod>>({});
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!cartId) { setMethods({}); return; }
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    fetch("/api/shipping/details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cartId }),
      signal: ctrl.signal,
    })
      .then((r) => r.ok ? r.json() : null)
      .then((json) => { if (json?.data) setMethods(json.data); })
      .catch((e) => { if (e?.name !== "AbortError") console.error(e); });
    return () => ctrl.abort();
  }, [cartId]);

  return methods;
}
