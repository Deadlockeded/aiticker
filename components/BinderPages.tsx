"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { MarketCard } from "@/lib/cards";
import type { Rarity } from "@/lib/types";
import {
  getBinderSnapshot,
  parseBinder,
  subscribeStore,
  type Binder,
} from "@/lib/binder";
import { formatMove, formatTicks, getCurrentPrice, getDailyMove } from "@/lib/market";
import { KEYS, readRaw, writeRaw } from "@/lib/storage";
import CardArt from "./CardArt";
import TradingCard from "./TradingCard";
import DailyQuip from "./DailyQuip";
import Sparkline from "./Sparkline";
import AchievementWall from "./AchievementWall";

const RARITY_ORDER: Rarity[] = ["legendary", "epic", "rare", "common"];
const RARITY_RING: Record<Rarity, string> = {
  legendary: "ring-amber-400/60",
  epic: "ring-fuchsia-400/50",
  rare: "ring-sky-400/50",
  common: "ring-white/15",
  mythic: "ring-cyan-300/60",
};

type Chip = "all" | "missing" | "dupes";

// Capture the previous visit timestamp exactly once per mount session and
// stamp the new one — getSnapshot stays stable afterwards (store-safe).
let capturedVisit: number | null = null;
function visitSnapshot(): number {
  if (capturedVisit === null) {
    capturedVisit = parseInt(readRaw(KEYS.binderVisit) ?? "0", 10) || 0;
    writeRaw(KEYS.binderVisit, String(Date.now()));
  }
  return capturedVisit;
}
const subscribeNever = () => () => {};

function pageLabel(pageIndex: number, chaseStart: number, artifactStart: number, chaseCount: number): string {
  if (pageIndex >= artifactStart) return "artifacts";
  if (pageIndex >= chaseStart) return `still chasing — ${chaseCount}`;
  return "the collection";
}

export default function BinderPages({
  cards,
  ranks,
  initialPage,
  initialCard,
}: {
  cards: MarketCard[];
  ranks: Record<string, number>;
  initialPage?: number;
  initialCard?: string;
}) {
  const raw = useSyncExternalStore(subscribeStore, getBinderSnapshot, () => null);
  const binder: Binder | null = useMemo(
    () => (raw === null ? null : parseBinder(raw)),
    [raw],
  );

  // COLLECTED FIRST: owned index cards packed densely (rarity desc, rating
  // desc), then the chase list as empty pockets, then artifacts (owned, then
  // missing). AGI stays hidden until owned.
  const { ordered, chaseStart, artifactStart, chaseCount } = useMemo(() => {
    const rank = (r: Rarity) => RARITY_ORDER.indexOf(r);
    const bySlot = (a: MarketCard, b: MarketCard) =>
      rank(a.rarity) - rank(b.rarity) || b.rating - a.rating;
    const own = (c: MarketCard) => !!binder?.[c.id];
    const index = cards.filter((c) => c.type !== "artifact");
    const artifacts = cards.filter((c) => c.type === "artifact" && c.id !== "agi");
    const ownedIndex = index.filter(own).sort(bySlot);
    const missingIndex = index.filter((c) => !own(c)).sort(bySlot);
    const ownedArt = artifacts.filter(own).sort(bySlot);
    const missingArt = artifacts.filter((c) => !own(c)).sort(bySlot);
    const all = [...ownedIndex, ...missingIndex, ...ownedArt, ...missingArt];
    return {
      ordered: all,
      chaseStart: Math.floor(ownedIndex.length / 9) + (ownedIndex.length % 9 ? 1 : 0),
      artifactStart:
        Math.floor((ownedIndex.length + missingIndex.length) / 9) +
        ((ownedIndex.length + missingIndex.length) % 9 ? 1 : 0),
      chaseCount: missingIndex.length,
    };
  }, [cards, binder]);
  const agiCard = useMemo(() => cards.find((c) => c.id === "agi"), [cards]);
  const pages = useMemo(() => {
    const out: MarketCard[][] = [];
    for (let i = 0; i < ordered.length; i += 9) out.push(ordered.slice(i, i + 9));
    return out;
  }, [ordered]);

  const [page, setPage] = useState(0);
  const [chip, setChip] = useState<Chip>("all");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [open, setOpen] = useState<MarketCard | null>(null);
  const [trophies, setTrophies] = useState(false);
  const [ringPop, setRingPop] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const scroller = useRef<HTMLDivElement>(null);
  const lastPage = useRef(0);
  // NEW tags: previous visit ts, captured once + stamped (webview-safe: 0)
  const lastVisit = useSyncExternalStore(subscribeNever, visitSnapshot, () => 0);

  // deep links: /binder?page=N&card=id
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let target = initialPage ? initialPage - 1 : 0;
    if (initialCard) {
      const idx = ordered.findIndex((c) => c.id === initialCard);
      if (idx >= 0) target = Math.floor(idx / 9);
    }
    if (target > 0) {
      const kickoff = setTimeout(() => {
        el.scrollTo({ left: target * el.clientWidth, behavior: "instant" as ScrollBehavior });
      }, 0);
      return () => clearTimeout(kickoff);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // desktop arrow keys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = scroller.current;
      if (!el) return;
      if (e.key === "ArrowRight") el.scrollBy({ left: el.clientWidth, behavior: "smooth" });
      if (e.key === "ArrowLeft") el.scrollBy({ left: -el.clientWidth, behavior: "smooth" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (binder === null) {
    return (
      <p className="py-24 text-center font-mono text-xs uppercase tracking-[0.3em] text-[#9CB09E]">
        Opening binder…
      </p>
    );
  }

  const indexCards = ordered.filter((c) => c.type !== "artifact");
  const ownedCount = indexCards.filter((c) => binder[c.id]).length;
  // per-series progress — each series is sealed, so its denominator is
  // stable; artifacts count inside their series. Future drops = new rows.
  const seriesLines = [...new Set(cards.map((c) => c.series))]
    .sort((a, b) => a - b)
    .map((series) => {
      const inSeries = cards.filter((c) => c.series === series);
      const withVariant = (v: string) =>
        inSeries.filter((c) => binder[c.id]?.prints?.some((p) => p.v === v)).length;
      return {
        series,
        size: inSeries.length,
        owned: inSeries.filter((c) => binder[c.id]).length,
        silver: withVariant("silver"),
        gold: withVariant("gold"),
        holo: withVariant("holo"),
      };
    });
  const s1 = seriesLines[0] ?? { owned: 0, size: 1 };
  const agiOwned = !!(agiCard && binder[agiCard.id]);
  const value = ordered.reduce(
    (s, c) => s + (binder[c.id]?.copies ?? 0) * getCurrentPrice(c),
    0,
  );
  const empty = ownedCount === 0;

  const matches = (card: MarketCard): boolean => {
    const entry = binder[card.id];
    if (query && !card.name.toLowerCase().includes(query.toLowerCase())) return false;
    switch (chip) {
      case "missing":
        return !entry;
      case "dupes":
        return (entry?.copies ?? 0) > 1;
      default:
        return true;
    }
  };

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const per = window.innerWidth >= 768 ? el.clientWidth / 2 : el.clientWidth;
    const p = Math.round(el.scrollLeft / per);
    if (p !== lastPage.current) {
      lastPage.current = p;
      setPage(p);
      if (navigator.vibrate) navigator.vibrate(5);
    }
  };

  const perView = typeof window !== "undefined" && window.innerWidth >= 768 ? 2 : 1;
  const ring = 2 * Math.PI * 14;

  return (
    <div>
      {/* slim sticky header */}
      <div className="sticky top-14 z-20 -mx-1 mb-3 flex items-center gap-3 rounded-xl border border-[#17301F]/30 bg-[#F4F7F0]/95 px-3 py-2 backdrop-blur-md">
        <button
          onClick={() => setRingPop((v) => !v)}
          className="relative flex min-h-11 items-center gap-2"
          title="Completion"
        >
          <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
            <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
            <circle
              cx="18" cy="18" r="14" fill="none" stroke="#22d3ee" strokeWidth="4"
              strokeDasharray={`${(s1.owned / s1.size) * ring} ${ring}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="tnum font-mono text-sm text-[#17301F]">
            {/* series are sealed — per-series denominators only, never a
                global total (the set will grow as new series drop) */}
            {seriesLines.map(({ series, owned: o, size, silver, gold, holo }) => (
              <span key={series} className="mr-2">
                S{series} — {o}/{size}
                <span className="ml-1.5 text-[10px] text-[#9CB09E]">
                  · <span className="text-[#5A6E5E]">SILVER {silver}</span> ·{" "}
                  <span className="text-[#8C6D1F]">GOLD {gold}</span> ·{" "}
                  <span className="text-[#6B4FA0]">HOLO {holo}</span>
                </span>
              </span>
            ))}
          </span>
        </button>
        <span className="tnum font-mono text-sm text-[#5A6E5E]">{formatTicks(Math.round(value))}</span>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-[#9CB09E]">
          {pageLabel(Math.min(page, pages.length - 1), chaseStart, artifactStart, chaseCount)}
        </span>
        <button
          onClick={() => setTrophies(true)}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-lg hover:bg-[#17301F]/5"
          title="Achievements"
        >
          🏆
        </button>
        {ringPop && (
          <div className="absolute left-2 top-full z-30 mt-1 w-52 rounded-xl border border-[#17301F]/40 bg-[#F4F7F0] p-3 shadow-xl">
            {RARITY_ORDER.map((r) => {
              const total = ordered.filter((c) => c.rarity === r).length;
              const have = ordered.filter((c) => c.rarity === r && binder[c.id]).length;
              return (
                <div key={r} className="flex justify-between font-mono text-xs text-[#5A6E5E]">
                  <span className="capitalize">{r}</span>
                  <span className="tnum">{have}/{total}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* filter chips — dim in place, never re-sort */}
      <div className="mb-3 flex items-center gap-1.5 overflow-x-auto">
        {(["all", "missing", "dupes"] as Chip[]).map((c) => (
          <button
            key={c}
            onClick={() => setChip(c)}
            className={`shrink-0 rounded-lg px-3 py-2 text-[12px] font-medium capitalize ${
              chip === c ? "bg-[#17301F]/15 text-[#17301F]" : "bg-[#17301F]/5 text-[#5A6E5E]"
            }`}
          >
            {c}
          </button>
        ))}
        {searchOpen ? (
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => !query && setSearchOpen(false)}
            placeholder="name…"
            className="min-w-24 flex-1 rounded-lg border border-[#17301F]/30 bg-[#17301F]/5 px-3 py-1.5 text-[12px] text-[#17301F] outline-none focus:border-[#B23A2E]/70"
          />
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#17301F]/5 text-[#5A6E5E]"
            title="Search"
          >
            🔍
          </button>
        )}
      </div>

      {/* pocket pages */}
      <div className="relative">
        <div
          ref={scroller}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          {pages.map((pageCards, pi) => (
            <div key={pi} className="w-full shrink-0 snap-start px-1 md:w-1/2">
              <div className="binder-texture rounded-2xl p-3">
                {pi === chaseStart && chaseCount > 0 && (
                  <p className="mb-2 border-b-2 border-[#17301F] pb-1 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-[#B23A2E]">
                    Still chasing — {chaseCount} cards
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2.5">
                  {Array.from({ length: 9 }, (_, si) => {
                    const card = pageCards[si];
                    if (!card) {
                      return <div key={si} className="pocket aspect-[1/1.4] rounded-lg bg-black/30" />;
                    }
                    const entry = binder[card.id];
                    const dim = !matches(card);
                    const isNew =
                      entry && lastVisit > 0 &&
                      Date.parse(entry.lastPulledAt) > lastVisit &&
                      !seen.has(card.id);
                    if (!entry) {
                      // STILL CHASING pocket — the card face-up as a print
                      // proof: name and rating readable, art unfinished.
                      return (
                        <div
                          key={card.id}
                          className={`pocket relative aspect-[1/1.4] rounded-lg bg-black/30 p-1 transition-opacity ${dim ? "opacity-25" : ""}`}
                        >
                          <div className="pocket-card relative h-full w-full overflow-hidden rounded-md bg-[#F4F7F0]">
                            <div
                              className="relative h-[70%]"
                              style={{ "--dot": "5px" } as React.CSSProperties}
                            >
                              <CardArt card={card} shape="tile" />
                              <div className="proof-veil">
                                <div className="proof-tint" />
                                <div className="proof-paper" />
                                <div className="proof-dots" />
                              </div>
                            </div>
                            <p className="truncate px-1 pt-1 text-left text-[9px] font-medium text-[#17301F]">
                              {card.name}
                            </p>
                            <p className="px-1 text-left font-mono text-[8px] text-[#9CB09E]">
                              {card.rating}
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={card.id}
                        onClick={() => {
                          setOpen(card);
                          setSeen((s) => new Set(s).add(card.id));
                        }}
                        className={`pocket relative aspect-[1/1.4] rounded-lg bg-black/30 p-1 transition-opacity ${dim ? "opacity-25 saturate-0" : ""} ${initialCard === card.id ? "pulse-once" : ""}`}
                      >
                        <div
                          className={`pocket-card relative h-full w-full overflow-hidden rounded-md bg-[#F4F7F0] ring-1 ${RARITY_RING[card.rarity]} ${card.rarity === "legendary" ? "foil-slow" : ""}`}
                        >
                          <div className="relative h-[70%]">
                            <CardArt card={card} shape="tile" />
                          </div>
                          <p className="truncate px-1 pt-1 text-left text-[9px] font-medium text-[#17301F]">
                            {card.name}
                          </p>
                          <p className="px-1 text-left font-mono text-[8px] text-[#9CB09E]">
                            {card.rating}
                          </p>
                          {entry.copies > 1 && (
                            <span className="absolute -right-1 -top-1 z-10 rounded-full border-2 border-[#F4F7F0] bg-[#B23A2E] px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none text-[#F4F7F0]">
                              ×{entry.copies}
                            </span>
                          )}
                          {(entry.prints ?? []).some((p) => p.v !== "base") && (
                            <span className="absolute bottom-0.5 right-0.5 flex gap-0.5">
                              {entry.prints?.some((p) => p.v === "silver") && (
                                <span className="h-2 w-2 rounded-full border border-[#17301F]/50 bg-[#8EA6B4]" title="Silver" />
                              )}
                              {entry.prints?.some((p) => p.v === "gold") && (
                                <span className="h-2 w-2 rounded-full border border-[#17301F]/50 bg-[#8C6D1F]" title="Gold" />
                              )}
                              {entry.prints?.some((p) => p.v === "holo") && (
                                <span className="h-2 w-2 rounded-full border border-[#17301F]/50 bg-[#6B4FA0]" title="Holo" />
                              )}
                            </span>
                          )}
                          {isNew && (
                            <span className="absolute left-0.5 top-0.5 rounded bg-[#B23A2E] px-1 font-mono text-[8px] font-bold text-[#F4F7F0]">
                              NEW
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {pi === pages.length - 1 && agiOwned && agiCard && (
                  <div className="mt-2.5 flex justify-center">
                    <button
                      onClick={() => setOpen(agiCard)}
                      className="pocket relative w-1/3 rounded-lg bg-black/40 p-1"
                    >
                      <div className="pocket-card mythic-border relative aspect-[1/1.4] overflow-hidden rounded-md p-[1.5px]">
                        <div className="flex h-full w-full flex-col items-center justify-center rounded-[5px] bg-[#0b0b0d]">
                          <span className="text-2xl text-[#5A6E5E]">∞</span>
                          <span className="mt-1 font-mono text-[8px] text-[#9CB09E]">
                            slot ∞
                          </span>
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* desktop click zones */}
        <button
          onClick={() => scroller.current?.scrollBy({ left: -scroller.current.clientWidth, behavior: "smooth" })}
          className="absolute left-0 top-1/2 hidden h-24 w-10 -translate-y-1/2 items-center justify-center text-2xl text-[#9CB09E] hover:text-[#17301F] md:flex"
        >
          ‹
        </button>
        <button
          onClick={() => scroller.current?.scrollBy({ left: scroller.current.clientWidth, behavior: "smooth" })}
          className="absolute right-0 top-1/2 hidden h-24 w-10 -translate-y-1/2 items-center justify-center text-2xl text-[#9CB09E] hover:text-[#17301F] md:flex"
        >
          ›
        </button>

        {empty && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Link
              href="/packs"
              className="rounded-lg bg-[#B23A2E] px-6 py-3 text-sm font-semibold text-[#F4F7F0] shadow-2xl transition-colors hover:bg-[#8E2E24]"
            >
              Rip your first pack →
            </Link>
          </div>
        )}
      </div>

      {/* page indicator */}
      <div className="mt-3 flex items-center justify-center gap-2">
        {pages.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${Math.min(page, pages.length - 1) === i ? "bg-[#B23A2E]" : "bg-white/20"}`}
          />
        ))}
        <span className="ml-2 font-mono text-[10px] text-[#9CB09E]">
          Page {Math.min(page, pages.length - 1) + 1} of {Math.ceil(pages.length / perView) * perView >= pages.length ? pages.length : pages.length}
        </span>
      </div>

      {/* card sheet: bottom on mobile, side panel on desktop */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-[#17301F]/40 bg-[#F4F7F0] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:inset-y-0 md:left-auto md:right-0 md:w-[420px] md:rounded-none md:border-l md:border-t-0"
          >
            <div className="mx-auto max-w-[320px]">
              <TradingCard card={open} rank={ranks[open.id]} size="hero" />
            </div>
            <div className="mt-4 space-y-3">
              <DailyQuip card={open} />
              <div className="flex items-center justify-between rounded-xl border border-[#17301F]/30 bg-[#F4F7F0] p-3">
                <div>
                  <p className="tnum font-mono text-lg font-bold text-[#17301F]">
                    {formatTicks(getCurrentPrice(open))}
                  </p>
                  <p className={`tnum font-mono text-xs ${getDailyMove(open) >= 0 ? "text-[#1F6E3D]" : "text-[#B23A2E]"}`}>
                    {formatMove(getDailyMove(open))} 24h · ×{binder[open.id]?.copies ?? 0} owned
                  </p>
                </div>
                <Sparkline history={open.priceHistory} />
              </div>
              {/* YOUR COPIES — every print, variant + serial */}
              {binder[open.id] && (
                <div className="rounded-xl border border-[#17301F]/30 bg-[#F4F7F0] p-3">
                  <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-[#5A6E5E]">
                    Your copies · ×{binder[open.id].copies}
                  </p>
                  <ul className="space-y-1">
                    {(binder[open.id].prints ?? []).map((p, i) => (
                      <li key={i} className="flex items-center gap-2 font-mono text-[12px] text-[#17301F]">
                        <span
                          className={`h-2.5 w-2.5 rounded-full border border-[#17301F]/40 ${
                            p.v === "silver" ? "bg-[#8EA6B4]" : p.v === "gold" ? "bg-[#8C6D1F]" : p.v === "holo" ? "bg-[#6B4FA0]" : "bg-[#EAF0E4]"
                          }`}
                        />
                        <span className="uppercase">{p.v}</span>
                        <span className="tnum ml-auto text-[#5A6E5E]">
                          Nº {String(p.n).padStart(3, "0")}/{p.v === "base" ? open.editionSize : p.v === "silver" ? 100 : p.v === "gold" ? 25 : 10}
                        </span>
                      </li>
                    ))}
                    {binder[open.id].copies > (binder[open.id].prints?.length ?? 0) && (
                      <li className="font-mono text-[11px] text-[#9CB09E]">
                        +{binder[open.id].copies - (binder[open.id].prints?.length ?? 0)} early print
                        {binder[open.id].copies - (binder[open.id].prints?.length ?? 0) === 1 ? "" : "s"} (unstamped base)
                      </li>
                    )}
                  </ul>
                </div>
              )}
              <div className="flex gap-2">
                <Link
                  href={`/cards/${open.id}`}
                  className="flex-1 rounded-lg bg-[#B23A2E] px-4 py-3 text-center text-sm font-semibold text-[#F4F7F0] hover:bg-[#8E2E24]"
                >
                  View full page
                </Link>
                <Link
                  href={`/arena?me=${open.id}`}
                  className="flex-1 rounded-lg border border-[#17301F]/40 px-4 py-3 text-center text-sm font-semibold text-[#5A6E5E] hover:bg-[#17301F]/5"
                >
                  Use in Arena
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* trophies sheet */}
      {trophies && (
        <div className="fixed inset-0 z-40" onClick={() => setTrophies(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-[#17301F]/40 bg-[#F4F7F0] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          >
            <AchievementWall />
          </div>
        </div>
      )}
    </div>
  );
}
