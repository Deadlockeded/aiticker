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
      <TradingCard card={card} rank={rank} size="hero" proof={!isOwned} inBinder={owned !== null && isOwned} />
      <div className="mt-4">
        <DailyQuip card={card} />
      </div>
      {!isOwned && (
        <>
          <p className="micro mt-3 text-center text-ink3">
            {card.rarity} · {oddsFor(card)} per card slot · 2 cards per pack
          </p>
          <Link
            href="/packs"
            className="mt-3 flex w-full items-center justify-center rounded-full bg-pink px-6 py-3 text-[16px] font-semibold text-on-accent transition-transform active:scale-[.97]"
          >
            Rip packs to unlock it →
          </Link>
        </>
      )}
      {isOwned && owned !== null && (
        <div className="mt-3 flex gap-2">
          <Link
            href={`/binder?card=${card.id}`}
            className="flex-1 rounded-full bg-surface2 px-6 py-3 text-center text-[16px] font-semibold text-ink transition-transform active:scale-[.97]"
          >
            In your binder →
          </Link>
        </div>
      )}
    </>
  );
}
