"use client";

import { useSyncExternalStore } from "react";
import { storageAvailable } from "@/lib/storage";

const subscribeNever = () => () => {};

/**
 * Shown only when the browser blocks localStorage (private-mode webviews):
 * everything still renders and works, pulls just don't persist.
 */
export default function SessionlessNotice() {
  const blocked = useSyncExternalStore(
    subscribeNever,
    () => !storageAvailable(),
    () => false,
  );
  if (!blocked) return null;
  return (
    <p className="mb-4 border border-line2 bg-surface p-3 text-center micro text-[11px] tracking-[0.15em] text-ink2">
      This browser blocks storage — you can browse and fight, but pulls
      won&apos;t be saved.
    </p>
  );
}
