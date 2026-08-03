"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CardType } from "@/lib/types";
import type { MarketCard } from "@/lib/cards";
import { getCurrentPrice, getDailyMove } from "@/lib/market";
import TradingCard from "./TradingCard";
import DeckStack from "./DeckStack";
import { useRouter } from "next/navigation";
import { useBinderCopies } from "./useOwned";

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
  const router = useRouter();
  // null = responsive default (deck < md, grid ≥ md) rendered via CSS so
  // the server paints the right view — no post-hydration swap, no LCP hit.
  const [view, setView] = useState<"deck" | "grid" | null>(null);
  const copies = useBinderCopies();
  const isProof = (id: string) => copies !== null && !(id in copies);
  const ownedCount = copies === null ? 0 : Object.keys(copies).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = cards.filter(
      (c) =>
        c.id !== "agi" && // the secret mythic stays out of the checklist until pulled
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
      <div className="sticky top-14 z-20 -mx-1 mb-5 rounded-xl border border-[#17301F]/30 bg-[#F4F7F0]/95 p-2 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-[#17301F]/5 p-0.5">
            {FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  filter === value
                    ? "bg-[#17301F]/15 text-[#17301F]"
                    : "text-[#5A6E5E] hover:text-[#5A6E5E]"
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
            className="min-w-32 flex-1 rounded-lg border border-[#17301F]/30 bg-[#17301F]/5 px-3 py-1.5 text-[13px] text-[#17301F] placeholder-[#9CB09E] outline-none focus:border-[#B23A2E]/70"
          />

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-lg border border-[#17301F]/30 bg-[#17301F]/5 px-2.5 py-1.5 text-[13px] text-[#17301F] outline-none focus:border-[#B23A2E]/70"
          >
            <option value="rating-desc" className="bg-zinc-900">Rating ↓</option>
            <option value="rating-asc" className="bg-zinc-900">Rating ↑</option>
            <option value="price-desc" className="bg-zinc-900">Price ↓</option>
            <option value="move-desc" className="bg-zinc-900">24h movers</option>
            <option value="name" className="bg-zinc-900">Name A–Z</option>
          </select>

          <button
            onClick={() => setView(view === "deck" ? "grid" : "deck")}
            title="Toggle deck / grid view"
            className="rounded-lg border border-[#17301F]/30 bg-[#17301F]/5 px-2.5 py-1.5 text-[13px] text-[#17301F]"
          >
            {view === "deck" ? "▦" : "🂠"}
          </button>
        </div>
        <p className="tnum mt-1.5 px-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#9CB09E]">
          Collected: {ownedCount}
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="py-24 text-center text-sm text-[#9CB09E]">
          No cards match “{query}”.
        </p>
      ) : (
        <>
          <div
            className={`mx-auto max-w-[300px] py-4 ${
              view === null ? "md:hidden" : view === "deck" ? "" : "hidden"
            }`}
          >
            <DeckStack
              items={visible}
              keyOf={(c) => c.id}
              onTap={(c) => router.push(`/cards/${c.id}`)}
              renderCard={(c) => (
                <TradingCard card={c} rank={ranks[c.id]} proof={isProof(c.id)} inBinder={!!copies?.[c.id]} copies={copies?.[c.id]} />
              )}
            />
          </div>
          <div
            className={`grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 ${
              view === null ? "hidden md:grid" : view === "grid" ? "grid" : "hidden"
            }`}
          >
            {visible.map((card) => (
              <Link key={card.id} href={`/cards/${card.id}`}>
                <TradingCard card={card} rank={ranks[card.id]} proof={isProof(card.id)} inBinder={!!copies?.[card.id]} copies={copies?.[card.id]} />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
