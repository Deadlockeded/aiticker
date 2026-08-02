"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CardType } from "@/lib/types";
import type { MarketCard } from "@/lib/cards";
import TradingCard from "./TradingCard";

type Filter = "all" | CardType;
type Sort = "rating-desc" | "rating-asc" | "name";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "company", label: "Companies" },
  { value: "engineer", label: "Engineers" },
];

export default function CardGrid({
  cards,
  ranks,
}: {
  cards: MarketCard[];
  ranks: Record<string, number>;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("rating-desc");

  const visible = useMemo(() => {
    const filtered =
      filter === "all" ? cards : cards.filter((c) => c.type === filter);
    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      const diff = a.rating - b.rating;
      return sort === "rating-asc" ? diff : -diff;
    });
  }, [cards, filter, sort]);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex rounded-full border border-white/10 bg-white/5 p-1">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === value
                  ? "bg-white/15 text-white"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-white/50">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-white/30"
          >
            <option value="rating-desc" className="bg-slate-900">
              Rating: high → low
            </option>
            <option value="rating-asc" className="bg-slate-900">
              Rating: low → high
            </option>
            <option value="name" className="bg-slate-900">
              Name: A → Z
            </option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4 xl:grid-cols-5">
        {visible.map((card) => (
          <Link key={card.id} href={`/cards/${card.id}`}>
            <TradingCard card={card} rank={ranks[card.id]} />
          </Link>
        ))}
      </div>
    </div>
  );
}
