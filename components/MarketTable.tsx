"use client";

import { useMemo, useState } from "react";
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

type SortKey = "rank" | "name" | "rating" | "price" | "move";

const COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "rank", label: "Rank", align: "left" },
  { key: "name", label: "Card", align: "left" },
  { key: "rating", label: "Rating", align: "right" },
  { key: "price", label: "Price", align: "right" },
  { key: "move", label: "24h %", align: "right" },
];

function Thumb({ card }: { card: MarketCard }) {
  return (
    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/15">
      <div className="relative h-full w-full">
        <CardArt card={card} />
      </div>
    </div>
  );
}

function MoveText({ pct, className = "" }: { pct: number; className?: string }) {
  return (
    <span
      className={`font-mono ${pct >= 0 ? "text-emerald-400" : "text-red-400"} ${className}`}
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
    return [...cards].sort((a, b) => {
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

  return (
    <div>
      {/* desktop table */}
      <table className="hidden w-full border-collapse text-sm sm:table">
        <thead>
          <tr className="border-b border-white/10 text-left font-mono text-xs uppercase tracking-widest text-white/40">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-3 ${col.align === "right" ? "text-right" : ""}`}
              >
                <button
                  onClick={() => onSort(col.key)}
                  className={`uppercase tracking-widest hover:text-white ${
                    sortKey === col.key ? "text-white" : ""
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
              className="cursor-pointer border-b border-white/5 transition-colors hover:bg-white/5"
            >
              <td className="px-3 py-2.5 font-mono text-white/50">
                #{ranks[card.id]}
              </td>
              <td className="px-3 py-2.5">
                <span className="flex items-center gap-3">
                  <Thumb card={card} />
                  <span>
                    <span className="block font-semibold text-white">
                      {card.name}
                    </span>
                    <span className="block text-xs capitalize text-white/40">
                      {card.rarity} · {card.type}
                    </span>
                  </span>
                </span>
              </td>
              <td className="px-3 py-2.5 text-right font-mono font-bold text-white">
                {card.rating}
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-white/90">
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

      {/* mobile cards */}
      <div className="space-y-2 sm:hidden">
        {sorted.map((card) => (
          <Link
            key={card.id}
            href={`/cards/${card.id}`}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
          >
            <span className="w-8 font-mono text-xs text-white/40">
              #{ranks[card.id]}
            </span>
            <Thumb card={card} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-white">
                {card.name}
              </span>
              <span className="block font-mono text-xs text-white/50">
                {card.rating} · {formatTicks(getCurrentPrice(card))}
              </span>
            </span>
            <span className="text-right">
              <MoveText pct={getDailyMove(card)} className="block text-xs" />
              <Sparkline history={card.priceHistory} width={72} height={20} />
            </span>
          </Link>
        ))}
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
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10"
    >
      <Thumb card={card} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-white">
          {card.name}
        </span>
        <span className="block font-mono text-xs text-white/50">
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
