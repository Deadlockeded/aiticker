"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import type { MarketCard } from "@/lib/cards";
import { getBinderSnapshot, getPeekSnapshot, parseBinder, parsePeek, subscribeStore } from "@/lib/binder";
import { getAllCards } from "@/lib/cards";
import { getSpotlightCard } from "@/lib/daily";
import TradingCard from "./TradingCard";
import PeekableBack from "./PeekableBack";
import DailyQuip from "./DailyQuip";

const subscribeNever = () => () => {};

function Stamp({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-1/2 top-[12%] z-10 -translate-x-1/2 rotate-[-8deg] whitespace-nowrap border-[3px] border-[#1E2430] bg-[#FDFBF6]/90 px-3 py-1 font-mono text-[11px] font-black uppercase tracking-[0.25em] text-[#1E2430]">
      {children}
    </span>
  );
}

/**
 * Mystery gate for detail pages. The mystery lives on the pull ritual, not
 * on information:
 * - owned → face-up + quip of the day
 * - arrived via a share/challenge/OG link (?ref=) → face-up, "REVEALED BY A
 *   COLLECTOR" stamp — sharing is the leak
 * - this week's SPOTLIGHT card → face-up + chip
 * - peeked → face-up with the PEEKED stamp (via PeekableBack)
 * - otherwise → facedown, press-and-hold to peek
 * The quip copy-quote works in every face-up state.
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
  const peekRaw = useSyncExternalStore(subscribeStore, getPeekSnapshot, () => null);
  const peeked = useMemo(
    () => (peekRaw ? parsePeek(peekRaw).ids.includes(card.id) : false),
    [peekRaw, card.id],
  );
  // Direct navigation respects facedown; arriving with a share ref reveals.
  const shared = useSyncExternalStore(
    subscribeNever,
    () => new URLSearchParams(window.location.search).has("ref"),
    () => false,
  );
  const spotlight = useSyncExternalStore(
    subscribeNever,
    () => getSpotlightCard(getAllCards())?.id === card.id,
    () => false,
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

  if (shared || spotlight) {
    return (
      <>
        <div className="relative">
          <TradingCard card={card} rank={rank} size="hero" />
          <Stamp>{shared ? "Revealed by a collector" : "Spotlight"}</Stamp>
        </div>
        <div className="mt-4">
          <DailyQuip card={card} />
        </div>
        <Link href="/packs" className="coupon mt-3 block p-3 text-center">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-[#C23B2E]">
            ✂ Want your own copy? Rip packs →
          </span>
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="aspect-[1/1.42] w-full">
        <PeekableBack card={card} rank={rank} size="hero" />
      </div>
      {peeked ? (
        <div className="mt-4">
          <DailyQuip card={card} />
        </div>
      ) : (
        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-[#9AA0AC]">
          press &amp; hold to peek
        </p>
      )}
      <Link href="/packs" className="coupon mt-4 block p-3 text-center">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-[#C23B2E]">
          ✂ Unpulled — rip packs to reveal →
        </span>
      </Link>
    </>
  );
}
