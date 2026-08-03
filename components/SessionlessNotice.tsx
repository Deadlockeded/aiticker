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
    <p className="mb-4 border-2 border-[#17301F] bg-[#F4F7F0] p-3 text-center font-mono text-[11px] uppercase tracking-[0.15em] text-[#5A6E5E]">
      This browser blocks storage — you can browse and fight, but pulls
      won&apos;t be saved.
    </p>
  );
}
