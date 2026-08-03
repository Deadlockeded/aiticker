"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getBinderSnapshot, parseBinder, subscribeStore } from "@/lib/binder";

/**
 * Owned card ids for the proof treatment: null while hydrating (surfaces
 * render full-color until the binder is known — never flash proof at an
 * owner). Ownership is the ONLY visibility distinction: unowned cards are
 * fully readable everywhere, just printed as proofs.
 */
export function useOwnedSet(): Set<string> | null {
  const raw = useSyncExternalStore(subscribeStore, getBinderSnapshot, () => null);
  return useMemo(
    () => (raw === null ? null : new Set(Object.keys(parseBinder(raw)))),
    [raw],
  );
}

/** id → copies owned (null while hydrating). Powers IN BINDER ×N chips. */
export function useBinderCopies(): Record<string, number> | null {
  const raw = useSyncExternalStore(subscribeStore, getBinderSnapshot, () => null);
  return useMemo(() => {
    if (raw === null) return null;
    return Object.fromEntries(
      Object.entries(parseBinder(raw)).map(([id, e]) => [id, e.copies]),
    );
  }, [raw]);
}
