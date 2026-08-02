"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CardType } from "@/lib/types";
import type { MarketCard } from "@/lib/cards";
import { getCurrentPrice, getDailyMove } from "@/lib/market";
import TradingCard from "./TradingCard";

type Filter = "all" | CardType;
type Sort = "rating-desc" | "rating-asc" | "price-desc" | "move-desc" | "name";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "company", label: "Companies" },
  { value: "engineer", label: "Engineers" },
  { value: "artifact", label: "Artifacts" },
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
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = cards.filter(
      (c) =>
        c.id !== "agi" && // the secret mythic stays hidden until pulled
        (filter === "all" || c.type === filter) &&
        (q === "" ||
          c.name.toLowerCase().includes(q) ||
          c.tagline.toLowerCase().includes(q)),
    );
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "rating-asc":
          return a.rating - b.rating;
        case "price-desc":
          return getCurrentPrice(b) - getCurrentPrice(a);
        case "move-desc":
          return getDailyMove(b) - getDailyMove(a);
        default:
          return b.rating - a.rating;
      }
    });
  }, [cards, filter, sort, query]);

  return (
    <div>
      <div className="sticky top-14 z-20 -mx-1 mb-5 rounded-xl border border-white/10 bg-[#0f0f11]/90 p-2 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-white/5 p-0.5">
            {FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  filter === value
                    ? "bg-white/12 text-white"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${cards.length} cards…`}
            className="min-w-32 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[13px] text-white placeholder-white/30 outline-none focus:border-cyan-400/50"
          />

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[13px] text-white outline-none focus:border-cyan-400/50"
          >
            <option value="rating-desc" className="bg-zinc-900">Rating ↓</option>
            <option value="rating-asc" className="bg-zinc-900">Rating ↑</option>
            <option value="price-desc" className="bg-zinc-900">Price ↓</option>
            <option value="move-desc" className="bg-zinc-900">24h movers</option>
            <option value="name" className="bg-zinc-900">Name A–Z</option>
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="py-24 text-center text-sm text-white/40">
          No cards match “{query}”.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {visible.map((card) => (
            <Link key={card.id} href={`/cards/${card.id}`}>
              <TradingCard card={card} rank={ranks[card.id]} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
