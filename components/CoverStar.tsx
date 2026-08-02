"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import type { MarketCard } from "@/lib/cards";
import { getCoverStar } from "@/lib/daily";
import { formatTicks, getCurrentPrice } from "@/lib/market";
import TradingCard from "./TradingCard";

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
    () => getCoverStar(cards),
    () => null,
  );
  if (!star) return null;
  const price = getCurrentPrice(star);

  return (
    <div className="paper-card paper-in p-4">
      <p className="border-b-2 border-[#1E2430] pb-2 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-[#C23B2E]">
        ★ Featured card ★
      </p>
      <Link href={`/cards/${star.id}`} className="mt-3 block">
        <TradingCard card={star} rank={ranks[star.id]} />
      </Link>
      <div className="mt-3 flex items-center justify-between font-mono text-[11px] uppercase tracking-widest">
        <span className="bg-[#1E2430] px-1.5 py-0.5 text-[#FDFBF6]">
          {star.rarity === "legendary" ? "Legend" : star.rarity}
        </span>
        <span className="tnum text-[#5A6070]">
          Book: {formatTicks(Math.round(price * 0.95))}–{formatTicks(Math.round(price * 1.08))}
        </span>
      </div>
    </div>
  );
}
