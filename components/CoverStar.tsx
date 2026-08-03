"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import type { MarketCard } from "@/lib/cards";
import { getCoverStar } from "@/lib/daily";
import { formatTicks, getCurrentPrice } from "@/lib/market";
import TradingCard from "./TradingCard";
import { releasedOnly } from "@/lib/drops";
import { useOwnedSet } from "./useOwned";

const subscribeNever = () => () => {};

/** ★ FEATURED CARD — month-hash pick, client-only. Frame visual unchanged. */
export default function CoverStar({
  cards,
  ranks,
}: {
  cards: MarketCard[];
  ranks: Record<string, number>;
}) {
  const star = useSyncExternalStore(
    subscribeNever,
    () => getCoverStar(releasedOnly(cards)),
    () => null,
  );
  const owned = useOwnedSet();
  // Zero-CLS skeleton: same frame + same card footprint while the
  // month-hash pick resolves client-side.
  if (!star) {
    return (
      <div className="surface-card deal-in p-4">
        <p className="border-b border-line2 pb-2 text-center micro text-[11px] font-semibold tracking-[0.3em] text-pink">
          ★ Featured card ★
        </p>
        <div className="mt-3 aspect-[1/1.42] w-full rounded-[3px] border border-line" />
        <div className="mt-3 h-[22px]" />
      </div>
    );
  }
  const price = getCurrentPrice(star);

  return (
    <div className="surface-card deal-in p-4">
      <p className="border-b border-line2 pb-2 text-center micro text-[11px] font-semibold tracking-[0.3em] text-pink">
        ★ Featured card ★
      </p>
      <Link href={`/cards/${star.id}`} className="mt-3 block">
        <TradingCard
          card={star}
          rank={ranks[star.id]}
          proof={owned !== null && !owned.has(star.id)}
        />
      </Link>
      <div className="mt-3 flex items-center justify-between micro text-[11px]">
        <span className="bg-ink px-1.5 py-0.5 text-on-accent">
          {star.rarity === "legendary" ? "Legend" : star.rarity}
        </span>
        <span className="tnum text-ink2">
          Book: {formatTicks(Math.round(price * 0.95))}–{formatTicks(Math.round(price * 1.08))}
        </span>
      </div>
    </div>
  );
}
