"use client";

import { useSyncExternalStore } from "react";
import { upcomingDrop } from "@/lib/drops";

const subscribeNever = () => () => {};

/**
 * Pre-release tease: from 7 days out, "NEXT DROP: {name} — {n} new cards
 * in {d} days" with proof-style silhouettes only. Names stay secret.
 */
export default function NextDrop() {
  const drop = useSyncExternalStore(
    subscribeNever,
    () => upcomingDrop(),
    () => null,
  );
  if (!drop) return null;

  return (
    <div className="mb-4 flex items-center gap-3 border border-line2 bg-surface2 p-3 shadow-card">
      <div className="flex shrink-0 gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="shadow-card block h-9 w-6 rounded-[2px] border border-line bg-[repeating-linear-gradient(45deg,rgba(23,48,31,0.35)_0_2px,rgba(23,48,31,0.15)_2px_5px)]"
            style={{ transform: `rotate(${(i - 1) * 5}deg)` }}
          />
        ))}
      </div>
      <p className="min-w-0 micro text-[11px] tracking-[0.15em] text-ink">
        <span className="font-semibold text-pink">Next drop:</span> {drop.name} —{" "}
        {drop.count} new cards in {drop.days} day{drop.days === 1 ? "" : "s"}
      </p>
    </div>
  );
}
