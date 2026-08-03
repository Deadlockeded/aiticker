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
      <div className="paper-card paper-in p-4">
        <p className="border-b-2 border-[#17301F] pb-2 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-[#B23A2E]">
          ★ Featured card ★
        </p>
        <div className="mt-3 aspect-[1/1.42] w-full rounded-[3px] border-2 border-[#17301F]/20" />
        <div className="mt-3 h-[22px]" />
      </div>
    );
  }
  const price = getCurrentPrice(star);

  return (
    <div className="paper-card paper-in p-4">
      <p className="border-b-2 border-[#17301F] pb-2 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-[#B23A2E]">
        ★ Featured card ★
      </p>
      <Link href={`/cards/${star.id}`} className="mt-3 block">
        <TradingCard
          card={star}
          rank={ranks[star.id]}
          proof={owned !== null && !owned.has(star.id)}
        />
      </Link>
      <div className="mt-3 flex items-center justify-between font-mono text-[11px] uppercase tracking-widest">
        <span className="bg-[#17301F] px-1.5 py-0.5 text-[#F4F7F0]">
          {star.rarity === "legendary" ? "Legend" : star.rarity}
        </span>
        <span className="tnum text-[#5A6E5E]">
          Book: {formatTicks(Math.round(price * 0.95))}–{formatTicks(Math.round(price * 1.08))}
        </span>
      </div>
    </div>
  );
}
