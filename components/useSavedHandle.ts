"use client";

import { useEffect } from "react";
import { getSavedHandle } from "@/lib/custody";

/**
 * Seed an empty handle input with the GitHub-linked username. Post-mount
 * and deferred (hydration-safe), applied at most once. A prefill, never a
 * lock — the field stays editable and clearable.
 */
export function usePrefillHandle(apply: (saved: string) => void) {
  useEffect(() => {
    const saved = getSavedHandle();
    if (!saved) return;
    const t = setTimeout(() => apply(saved), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
