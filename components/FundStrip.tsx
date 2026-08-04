"use client";

import { useSyncExternalStore } from "react";
import { getBinderSnapshot, parseBinder, subscribeStore } from "@/lib/binder";
import { getAllCards } from "@/lib/cards";
import {
  FUND_MULTIPLIER,
  FUND_ROUND_BONUS,
  FUNDING_SET,
  hasTheFund,
} from "@/lib/royalties";

const NAMES = new Map(getAllCards().map((c) => [c.id, c.name]));

/**
 * THE FUND — the funding-set completion strip. Hold all 8 and the set's
 * royalties pay ×1.5 and the weekly round arrives ₮50 heavier.
 */
export default function FundStrip() {
  const raw = useSyncExternalStore(subscribeStore, getBinderSnapshot, () => null);
  if (raw === null) return null;
  const binder = parseBinder(raw);
  const owned = FUNDING_SET.filter((id) => (binder[id]?.copies ?? 0) > 0);
  if (owned.length === 0) return null;
  const complete = hasTheFund(binder);

  return (
    <div className="mb-3 rounded-[22px] bg-surface p-3 shadow-card">
      <div className="flex items-baseline justify-between gap-2">
        <p className={`micro font-semibold ${complete ? "text-amber" : "text-ink3"}`}>
          {complete ? "🏛 The Fund — complete" : "The Fund"}
        </p>
        <p className="tnum micro text-ink3">
          {owned.length}/{FUNDING_SET.length}
        </p>
      </div>
      <div className="mt-2 flex gap-1">
        {FUNDING_SET.map((id) => (
          <span
            key={id}
            title={NAMES.get(id) ?? id}
            className={`h-1.5 flex-1 rounded-full ${
              (binder[id]?.copies ?? 0) > 0 ? "bg-amber" : "bg-surface2"
            }`}
          />
        ))}
      </div>
      <p className="micro mt-2 text-ink3">
        {complete
          ? `Funding royalties pay ×${FUND_MULTIPLIER} · weekly round +₮${FUND_ROUND_BONUS}`
          : `Hold all 8 funding artifacts: royalties ×${FUND_MULTIPLIER}, weekly round +₮${FUND_ROUND_BONUS}`}
      </p>
    </div>
  );
}
