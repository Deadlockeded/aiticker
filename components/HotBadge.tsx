"use client";

import { useSyncExternalStore } from "react";
import { getAllCards } from "@/lib/cards";
import { HOT_BOOST, isHot } from "@/lib/daily";

const subscribeNever = () => () => {};

/**
 * Client-only hot-streak marker. The server snapshot is always false (the
 * pick is date-derived, so SSG'd HTML must not bake in a day); after
 * hydration it shows a flame chip + warm glow on today's two hot cards.
 */
export default function HotBadge({ cardId }: { cardId: string }) {
  const hot = useSyncExternalStore(
    subscribeNever,
    () => isHot(cardId, getAllCards()),
    () => false,
  );

  if (!hot) return null;

  return (
    <>
      <span className="pointer-events-none absolute inset-0 shadow-[inset_0_0_28px_rgba(251,146,60,0.35)]" />
      <span className="absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded-md border border-orange-400/40 bg-black/70 px-1.5 py-0.5 font-mono text-[9px] font-bold text-orange-300 backdrop-blur-sm">
        +{HOT_BOOST} 🔥
      </span>
    </>
  );
}
