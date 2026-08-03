"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MarketCard } from "@/lib/cards";
import {
  formatMove,
  formatTicks,
  getChange,
  getCurrentPrice,
  getDailyMove,
} from "@/lib/market";
import CardArt from "./CardArt";
import Sparkline from "./Sparkline";
import { releasedOnly } from "@/lib/drops";
import { useBinderCopies } from "./useOwned";
import { Chip, Segmented, tintFor } from "./ui";

type SortKey = "rank" | "name" | "rating" | "price" | "move";

const COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "rank", label: "#", align: "left" },
  { key: "name", label: "Card", align: "left" },
  { key: "rating", label: "Rating", align: "right" },
  { key: "price", label: "Price ₮", align: "right" },
  { key: "move", label: "24h", align: "right" },
];

/** Rookie cards: the newest additions to the set. */
const RC_IDS = new Set(["jensen-huang", "elon-musk", "sundar-pichai", "satya-nadella", "mark-zuckerberg"]);

/** 40px tinted tile — the tint rotates per entity so long lists have rhythm. */
function Thumb({ card, size = 40 }: { card: MarketCard; size?: number }) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-xl ${tintFor(card.id)}`}
      style={{ width: size, height: size }}
    >
      <CardArt card={card} />
    </div>
  );
}

function MoveText({ pct, className = "" }: { pct: number; className?: string }) {
  return (
    <span
      className={`tnum font-mono ${pct >= 0 ? "text-up" : "text-down"} ${className}`}
    >
      {formatMove(pct)}
    </span>
  );
}

export default function MarketTable({
  cards,
  ranks,
}: {
  cards: MarketCard[];
  ranks: Record<string, number>;
}) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [asc, setAsc] = useState(true);
  const [filter, setFilter] = useState<"all" | "owned" | "missing">("all");
  const copies = useBinderCopies();

  const sorted = useMemo(() => {
    const value = (c: MarketCard): number | string => {
      switch (sortKey) {
        case "rank":
          return ranks[c.id];
        case "name":
          return c.name;
        case "rating":
          return c.rating;
        case "price":
          return getCurrentPrice(c);
        case "move":
          return getDailyMove(c);
      }
    };
    return releasedOnly(cards).sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      const cmp =
        typeof va === "string"
          ? va.localeCompare(vb as string)
          : va - (vb as number);
      return asc ? cmp : -cmp;
    });
  }, [cards, ranks, sortKey, asc]);

  const onSort = (key: SortKey) => {
    if (key === sortKey) {
      setAsc(!asc);
    } else {
      setSortKey(key);
      // rank & name read naturally ascending, numbers descending
      setAsc(key === "rank" || key === "name");
    }
  };

  const shown = sorted.filter((c) =>
    filter === "all" ? true : filter === "owned" ? !!copies?.[c.id] : !copies?.[c.id],
  );

  return (
    <div>
      <div className="mb-3 sm:hidden">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "owned", label: "Owned" },
            { value: "missing", label: "Missing" },
          ]}
        />
      </div>
      {/* desktop table */}
      <table className="hidden w-full border-collapse text-sm sm:table">
        <thead>
          <tr className="bg-ink text-left micro text-xs text-bg">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-3 ${col.align === "right" ? "text-right" : ""}`}
              >
                <button
                  onClick={() => onSort(col.key)}
                  className={`uppercase tracking-widest hover:text-pink ${
                    sortKey === col.key ? "text-pink" : ""
                  }`}
                >
                  {col.label}
                  {sortKey === col.key ? (asc ? " ↑" : " ↓") : ""}
                </button>
              </th>
            ))}
            <th className="px-3 py-3 text-right">7d</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((card) => (
            <tr
              key={card.id}
              onClick={() => router.push(`/cards/${card.id}`)}
              className={`cursor-pointer border-b border-dotted border-ink3 transition-colors odd:bg-surface2 hover:bg-pink/5 ${card.type === "artifact" ? "italic opacity-70" : ""}`}
            >
              <td className="px-3 py-2.5 font-mono text-ink2">
                #{ranks[card.id]}
              </td>
              <td className="px-3 py-2.5">
                <span className="flex items-center gap-3">
                  <Thumb card={card} />
                  <span>
                    <span className="block font-semibold text-ink">
                      {card.name}
                      {RC_IDS.has(card.id) && (
                        <span className="ml-1.5 rounded-sm bg-pink px-1 font-mono text-[9px] not-italic text-on-accent">
                          RC
                        </span>
                      )}
                      {!!copies?.[card.id] && (
                        <span className="ml-1.5 rounded-sm border border-amber px-1 font-mono text-[9px] not-italic text-amber">
                          OWN ×{copies[card.id]}
                        </span>
                      )}
                    </span>
                    <span className="block text-xs capitalize text-ink3">
                      {card.rarity} · {card.type}
                    </span>
                  </span>
                </span>
              </td>
              <td className="px-3 py-2.5 text-right font-mono font-bold text-ink">
                {card.rating}
              </td>
              <td className="tnum px-3 py-2.5 text-right font-mono text-ink">
                {formatTicks(getCurrentPrice(card))}
              </td>
              <td className="px-3 py-2.5 text-right">
                <MoveText pct={getDailyMove(card)} />
              </td>
              <td className="px-3 py-2.5">
                <span className="flex justify-end">
                  <Sparkline history={card.priceHistory} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* mobile: Spotify rows on one surface */}
      <div className="overflow-hidden rounded-[22px] bg-surface shadow-card sm:hidden">
        {shown.map((card, i) => (
          <Link
            key={card.id}
            href={`/cards/${card.id}`}
            className={`flex items-center gap-3 px-3 py-2.5 active:bg-surface2 ${i > 0 ? "border-t border-line" : ""}`}
          >
            <Thumb card={card} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-ink">
                {card.name}
              </span>
              <span className="micro block text-ink3">
                #{ranks[card.id]} · {card.rarity}
                {!!copies?.[card.id] && ` · ×${copies[card.id]}`}
              </span>
            </span>
            <span className="text-right">
              <span className="tnum block font-mono text-[13px] text-ink">
                {formatTicks(getCurrentPrice(card))}
              </span>
              <MoveText pct={getDailyMove(card)} className="block text-[12px]" />
            </span>
          </Link>
        ))}
        {/* AGI: listed, unpriced, permanently ambiguous */}
        <div className="flex items-center gap-3 border-t border-line px-3 py-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface2 font-display text-[18px] font-extrabold text-ink3">
            ?
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-ink3">AGI</span>
            <span className="micro block text-ink3">Unpriced · unlisted</span>
          </span>
          <span className="micro text-ink3">—</span>
        </div>
      </div>
    </div>
  );
}

export function MoverCard({
  card,
  rank,
}: {
  card: MarketCard;
  rank: number;
}) {
  const move = getDailyMove(card);
  return (
    <Link
      href={`/cards/${card.id}`}
      className="flex items-center gap-3 rounded-xl border border-line bg-surface2 p-3 transition-colors hover:bg-surface2"
    >
      <Thumb card={card} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">
          {card.name}
        </span>
        <span className="block font-mono text-xs text-ink2">
          #{rank} · {formatTicks(getCurrentPrice(card))}
        </span>
      </span>
      <span className="text-right">
        <MoveText pct={move} className="block text-sm font-semibold" />
        <Sparkline history={card.priceHistory} width={72} height={20} />
      </span>
      <span className="sr-only">
        7d {formatMove(getChange(card, 7))}
      </span>
    </Link>
  );
}
