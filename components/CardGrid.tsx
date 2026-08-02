"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { CardType } from "@/lib/types";
import type { MarketCard } from "@/lib/cards";
import { getCurrentPrice, getDailyMove } from "@/lib/market";
import TradingCard from "./TradingCard";
import DeckStack from "./DeckStack";
import PeekableBack from "./PeekableBack";
import { useRouter } from "next/navigation";
import { consumePeekGuard, getBinderSnapshot, parseBinder, subscribeStore } from "@/lib/binder";
import { getSpotlightCard } from "@/lib/daily";

const subscribeNever = () => () => {};

function SpotlightChip() {
  return (
    <span className="pointer-events-none absolute left-1.5 top-1.5 z-10 rotate-[-4deg] bg-[#C23B2E] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#FDFBF6]">
      Spotlight
    </span>
  );
}

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
  const isMobile = useSyncExternalStore(
    () => () => {},
    () => window.innerWidth < 768,
    () => false,
  );
  const effectiveView = view ?? (isMobile ? "deck" : "grid");
  const binderRaw = useSyncExternalStore(subscribeStore, getBinderSnapshot, () => null);
  const owned = useMemo(
    () => new Set(binderRaw ? Object.keys(parseBinder(binderRaw)) : []),
    [binderRaw],
  );
  // Weekly spotlight: face-up for everyone (date-derived → client-only)
  const spotlightId = useSyncExternalStore(
    subscribeNever,
    () => getSpotlightCard(cards)?.id ?? "",
    () => "",
  );

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
      <div className="sticky top-14 z-20 -mx-1 mb-5 rounded-xl border border-[#1E2430]/30 bg-[#FDFBF6]/95 p-2 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-[#1E2430]/5 p-0.5">
            {FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  filter === value
                    ? "bg-[#1E2430]/15 text-[#1E2430]"
                    : "text-[#5A6070] hover:text-[#5A6070]"
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
            className="min-w-32 flex-1 rounded-lg border border-[#1E2430]/30 bg-[#1E2430]/5 px-3 py-1.5 text-[13px] text-[#1E2430] placeholder-[#9AA0AC] outline-none focus:border-[#C23B2E]/70"
          />

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-lg border border-[#1E2430]/30 bg-[#1E2430]/5 px-2.5 py-1.5 text-[13px] text-[#1E2430] outline-none focus:border-[#C23B2E]/70"
          >
            <option value="rating-desc" className="bg-zinc-900">Rating ↓</option>
            <option value="rating-asc" className="bg-zinc-900">Rating ↑</option>
            <option value="price-desc" className="bg-zinc-900">Price ↓</option>
            <option value="move-desc" className="bg-zinc-900">24h movers</option>
            <option value="name" className="bg-zinc-900">Name A–Z</option>
          </select>

          <button
            onClick={() => setView(effectiveView === "deck" ? "grid" : "deck")}
            title={effectiveView === "deck" ? "Grid view" : "Deck view"}
            className="rounded-lg border border-[#1E2430]/30 bg-[#1E2430]/5 px-2.5 py-1.5 text-[13px] text-[#1E2430]"
          >
            {effectiveView === "deck" ? "▦" : "🂠"}
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="py-24 text-center text-sm text-[#9AA0AC]">
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
              onTap={(c) => {
                if (consumePeekGuard()) return; // a peek-hold is not a tap
                router.push(`/cards/${c.id}`);
              }}
              renderCard={(c) =>
                owned.has(c.id) ? (
                  <TradingCard card={c} rank={ranks[c.id]} />
                ) : c.id === spotlightId ? (
                  <div className="relative">
                    <SpotlightChip />
                    <TradingCard card={c} rank={ranks[c.id]} />
                  </div>
                ) : (
                  <div className="aspect-[1/1.42]">
                    <PeekableBack card={c} rank={ranks[c.id]} />
                  </div>
                )
              }
            />
          </div>
          <div
            className={`grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 ${
              view === null ? "hidden md:grid" : view === "grid" ? "grid" : "hidden"
            }`}
          >
            {visible.map((card) => (
              <Link
                key={card.id}
                href={`/cards/${card.id}`}
                onClick={(e) => {
                  if (consumePeekGuard()) e.preventDefault();
                }}
              >
                {owned.has(card.id) ? (
                  <TradingCard card={card} rank={ranks[card.id]} />
                ) : card.id === spotlightId ? (
                  <div className="relative">
                    <SpotlightChip />
                    <TradingCard card={card} rank={ranks[card.id]} />
                  </div>
                ) : (
                  <div className="aspect-[1/1.42]">
                    <PeekableBack card={card} rank={ranks[card.id]} />
                  </div>
                )}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
