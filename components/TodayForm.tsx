"use client";

import { useSyncExternalStore } from "react";
import type { MarketCard } from "@/lib/cards";
import { getDailyMeta, metaValueForCard, type MetaCategory } from "@/lib/meta";

const subscribeNever = () => () => {};

/**
 * TODAY'S FORM on card detail pages — the card's fixed values in today's 4
 * IN THE META categories. Values are derived numbers, so (like price data)
 * they spoil nothing about a facedown card. AGI keeps its "?".
 */
export default function TodayForm({ card }: { card: MarketCard }) {
  const active = useSyncExternalStore(
    subscribeNever,
    () => getDailyMeta(),
    () => null as MetaCategory[] | null,
  );
  if (!active) return null;

  return (
    <div className="surface-card p-4 sm:p-5">
      <div className="flex items-baseline justify-between border-b border-line2 pb-1">
        <h2 className="micro text-xs font-semibold tracking-[0.3em] text-ink">
          Today&apos;s form
        </h2>
        <span className="micro text-[10px] text-ink3">
          meta rotates daily
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {active.map((cat) => (
          <div key={cat.key} className="text-center">
            <dt
              className="micro text-[10px] text-ink2"
              title={cat.definition}
            >
              {cat.name}
            </dt>
            <dd className="tnum font-mono text-xl font-bold text-ink">
              {card.id === "agi" ? "?" : metaValueForCard(card, cat.key)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
