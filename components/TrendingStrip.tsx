"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import type { MarketCard } from "@/lib/cards";
import { getHotCards, HOT_BOOST, utcDayKey } from "@/lib/daily";
import { formatTicks, getCurrentPrice } from "@/lib/market";
import CardArt from "./CardArt";

const subscribeNever = () => () => {};

/** Homepage strip for today's two hot cards. Client-only (date-derived). */
export default function TrendingStrip({ cards }: { cards: MarketCard[] }) {
  const dayKey = useSyncExternalStore(
    subscribeNever,
    () => utcDayKey(),
    () => null,
  );
  if (dayKey === null) return null;
  const hot = getHotCards(cards, dayKey);

  return (
    <section className="mb-6 rounded-xl border border-orange-400/20 bg-orange-400/[0.04] p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-orange-300">
          🔥 Trending today
        </span>
        {hot.map((card) => (
          <Link
            key={card.id}
            href={`/cards/${card.id}`}
            className="flex items-center gap-2.5 rounded-lg border border-[#1E2430]/30 bg-black/30 px-3 py-1.5 transition-colors hover:border-orange-400/40"
          >
            <div className="h-7 w-7">
              <CardArt card={card} />
            </div>
            <span className="text-[13px] font-medium text-[#1E2430]">
              {card.name}
            </span>
            <span className="tnum font-mono text-xs text-orange-300">
              {card.rating}
              <span className="text-orange-400/80">+{HOT_BOOST}</span>
            </span>
            <span className="tnum font-mono text-xs text-[#9AA0AC]">
              {formatTicks(getCurrentPrice(card))}
            </span>
          </Link>
        ))}
        <span className="ml-auto hidden font-mono text-[10px] text-[#9AA0AC] sm:block">
          +3 in Arena today · rotates daily
        </span>
      </div>
    </section>
  );
}
