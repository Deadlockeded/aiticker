"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import type { MarketCard } from "@/lib/cards";
import { getBinderSnapshot, parseBinder, subscribeStore } from "@/lib/binder";
import TradingCard from "./TradingCard";
import CardBackFace from "./CardBackFace";
import DailyQuip from "./DailyQuip";

/**
 * Mystery gate for detail pages: unpulled cards show the card back + an
 * UNPULLED coupon; quips stay hidden (they're part of the reveal).
 * Price data below is rendered by the page regardless — text spoils nothing.
 */
export default function CardReveal({
  card,
  rank,
}: {
  card: MarketCard;
  rank: number;
}) {
  const raw = useSyncExternalStore(subscribeStore, getBinderSnapshot, () => null);
  const owned = useMemo(
    () => (raw ? !!parseBinder(raw)[card.id] : false),
    [raw, card.id],
  );

  if (owned) {
    return (
      <>
        <TradingCard card={card} rank={rank} size="hero" />
        <div className="mt-4">
          <DailyQuip card={card} />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="aspect-[1/1.42] w-full">
        <CardBackFace card={card} size="hero" />
      </div>
      <Link href="/packs" className="coupon mt-4 block p-3 text-center">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-[#C23B2E]">
          ✂ Unpulled — rip packs to reveal →
        </span>
      </Link>
    </>
  );
}
