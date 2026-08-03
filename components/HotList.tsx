"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import DeckStack from "./DeckStack";
import TradingCard from "./TradingCard";
import type { MarketCard } from "@/lib/cards";
import { formatMove, formatTicks, getCurrentPrice, getDailyMove, getMovers } from "@/lib/market";
import { metaWatchLine } from "@/lib/meta";
import { releasedOnly } from "@/lib/drops";
import { useOwnedSet } from "./useOwned";

const subscribeNever = () => () => {};

/** META WATCH — today's loudest category and its best card. Date-derived → client-only. */
function MetaWatch({ cards }: { cards: MarketCard[] }) {
  const line = useSyncExternalStore(
    subscribeNever,
    () => metaWatchLine(cards),
    () => "",
  );
  // reserve the row pre-hydration — a late-appearing line is layout shift
  if (!line)
    return (
      <p className="invisible border-t border-line px-4 py-3 text-[12px] italic">
        &nbsp;
      </p>
    );
  return (
    <p className="border-t border-line px-4 py-3 text-[12px] italic text-ink2">
      <span className="mr-1.5 micro text-[10px] font-semibold not-italic tracking-[0.25em] text-pink">
        Meta watch
      </span>
      {line}
    </p>
  );
}

/** THE HOT LIST — red-bordered movers box, print-guide style. */
function MobileDeck({ rows }: { rows: MarketCard[] }) {
  const router = useRouter();
  const owned = useOwnedSet();
  return (
    <div className="mx-auto max-w-[240px] p-3 md:hidden">
      <DeckStack
        items={rows}
        keyOf={(c) => c.id}
        onTap={(c) => router.push(`/cards/${c.id}`)}
        renderCard={(c) => (
          <TradingCard card={c} rank={0} proof={owned !== null && !owned.has(c.id)} />
        )}
      />
    </div>
  );
}

export default function HotList({ cards }: { cards: MarketCard[] }) {
  const { gainers, losers } = getMovers(releasedOnly(cards.filter((c) => c.id !== "agi")));
  const rows = [...gainers.slice(0, 4), ...losers.slice(0, 2)];

  return (
    <div className="surface-card overflow-hidden">
      <p className="micro px-4 pt-3 font-semibold text-pink">The hot list</p>
      {/* mobile: swipeable mini-deck */}
      <MobileDeck rows={rows} />
      <ul className="hidden md:block">
        {rows.map((card) => {
          const move = getDailyMove(card);
          return (
            <li key={card.id} className="border-b border-line last:border-0">
              <Link
                href={`/cards/${card.id}`}
                className="flex items-center justify-between px-3 py-2 hover:bg-surface2"
              >
                <span className="truncate text-sm font-semibold text-ink">
                  {card.name}
                </span>
                <span className="tnum ml-3 shrink-0 font-mono text-xs">
                  <span className="text-ink2">{formatTicks(getCurrentPrice(card))}</span>{" "}
                  <span className={move >= 0 ? "text-up" : "text-down"}>
                    {formatMove(move)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <MetaWatch cards={cards} />
    </div>
  );
}
