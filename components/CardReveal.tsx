"use client";

import Link from "next/link";
import type { MarketCard } from "@/lib/cards";
import { CATEGORY_ODDS } from "@/lib/packs";
import TradingCard from "./TradingCard";
import DailyQuip from "./DailyQuip";
import { useOwnedSet } from "./useOwned";

const pct = (v: number) => `${(v * 100).toFixed(1).replace(/\.0$/, "")}%`;

/** Per-card-slot pull odds for this card's tier, from the live odds table. */
function oddsFor(card: MarketCard): string {
  if (card.id === "agi") return pct(CATEGORY_ODDS.agi);
  if (card.type === "artifact") return `${pct(CATEGORY_ODDS.artifact)} (any artifact)`;
  const per: Record<string, number> = {
    common: CATEGORY_ODDS.common,
    rare: CATEGORY_ODDS.rare,
    epic: CATEGORY_ODDS.epic,
    legendary: CATEGORY_ODDS.legendary,
  };
  return pct(per[card.rarity] ?? CATEGORY_ODDS.common);
}

/**
 * Detail-page hero. Everything is public: full card, stats, quips — always.
 * Ownership only changes the ART (unowned renders as a print proof) and the
 * actions (owned → binder actions, unowned → odds + RIP PACKS).
 */
export default function CardReveal({
  card,
  rank,
}: {
  card: MarketCard;
  rank: number;
}) {
  const owned = useOwnedSet();
  const isOwned = owned?.has(card.id) ?? true; // full color until hydrated

  return (
    <>
      <TradingCard card={card} rank={rank} size="hero" proof={!isOwned} />
      <div className="mt-4">
        <DailyQuip card={card} />
      </div>
      {!isOwned && (
        <>
          <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[#9AA0AC]">
            {card.rarity} · {oddsFor(card)} per card slot · 3 cards per pack
          </p>
          <Link href="/packs" className="coupon mt-2 block p-3 text-center">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-[#C23B2E]">
              ✂ Rip packs to print your copy →
            </span>
          </Link>
        </>
      )}
      {isOwned && owned !== null && (
        <div className="mt-3 flex gap-2">
          <Link
            href={`/binder?card=${card.id}`}
            className="flex-1 border-2 border-[#1E2430] px-3 py-2 text-center font-mono text-[11px] font-semibold uppercase tracking-widest text-[#1E2430] hover:bg-[#1E2430]/5"
          >
            In your binder →
          </Link>
        </div>
      )}
    </>
  );
}
