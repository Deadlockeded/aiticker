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
    <div className="paper-card p-4 sm:p-5">
      <div className="flex items-baseline justify-between border-b-2 border-[#1E2430] pb-1">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-[#1E2430]">
          Today&apos;s form
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#9AA0AC]">
          meta rotates daily
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {active.map((cat) => (
          <div key={cat.key} className="text-center">
            <dt
              className="font-mono text-[10px] uppercase tracking-widest text-[#5A6070]"
              title={cat.definition}
            >
              {cat.name}
            </dt>
            <dd className="tnum font-mono text-xl font-bold text-[#1E2430]">
              {card.id === "agi" ? "?" : metaValueForCard(card, cat.key)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
