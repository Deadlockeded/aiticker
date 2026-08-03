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
import { isReleased } from "@/lib/drops";
import { KEYS, readRaw, writeRaw } from "@/lib/storage";
import { TOAST_EVENT } from "@/lib/achievements";
import { getRoomSnapshot, getToastedRooms, markRoomToasted, ROOMS, setRoom, type RoomId } from "@/lib/rooms";
import { balanceFrom, dupeValue, getWalletSnapshot, sellDupe } from "@/lib/wallet";
import BoardroomRoom from "./BoardroomRoom";
import CallRoom from "./CallRoom";
import CardArt from "./CardArt";
import TradingCard from "./TradingCard";
import DailyQuip from "./DailyQuip";
import Sparkline from "./Sparkline";
import AchievementWall from "./AchievementWall";
import RaiseARound from "./RaiseARound";

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
  const walletRaw = useSyncExternalStore(subscribeStore, getWalletSnapshot, () => null);
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
    // unreleased drops are invisible in the chase (owned copies still show)
    const index = cards.filter((c) => c.type !== "artifact" && (isReleased(c.id) || own(c)));
    const artifacts = cards.filter((c) => c.type === "artifact" && c.id !== "agi" && (isReleased(c.id) || own(c)));
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
  const [valuationInfo, setValuationInfo] = useState(false);
  const [sold, setSold] = useState<number | null>(null);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const scroller = useRef<HTMLDivElement>(null);
  const lastPage = useRef(0);
  // NEW tags: previous visit ts, captured once + stamped (webview-safe: 0)
  const lastVisit = useSyncExternalStore(subscribeNever, visitSnapshot, () => 0);
  const roomRaw = useSyncExternalStore(subscribeStore, getRoomSnapshot, () => "binder");

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

  // room unlock moments — toast exactly once when a threshold is crossed
  useEffect(() => {
    if (raw === null) return;
    const owned = Object.keys(parseBinder(raw)).length;
    const kickoff = setTimeout(() => {
      const toasted = getToastedRooms();
      for (const r of ROOMS) {
        if (r.unlockAt > 0 && owned >= r.unlockAt && !toasted.includes(r.id)) {
          markRoomToasted(r.id);
          window.dispatchEvent(
            new CustomEvent(TOAST_EVENT, {
              detail: { emoji: "🚪", title: `New room unlocked: ${r.name}`, body: "Try it from the binder header." },
            }),
          );
        }
      }
    }, 0);
    return () => clearTimeout(kickoff);
  }, [raw]);

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
      <p className="py-24 text-center micro text-xs tracking-[0.3em] text-ink3">
        Opening binder…
      </p>
    );
  }

  const indexCards = ordered.filter((c) => c.type !== "artifact");
  const ownedCount = indexCards.filter((c) => binder[c.id]).length;
  const ownedTotal = ordered.filter((c) => binder[c.id]).length;
  const roomUnlocked = (id: RoomId) =>
    (ROOMS.find((r) => r.id === id)?.unlockAt ?? 0) <= ownedTotal;
  const room: RoomId = roomUnlocked(roomRaw as RoomId) ? (roomRaw as RoomId) : "binder";
  // per-series progress — each series is sealed, so its denominator is
  // stable; artifacts count inside their series. Future drops = new rows.
  const releasedCards = cards.filter((c) => isReleased(c.id));
  const seriesLines = [...new Set(releasedCards.map((c) => c.series))]
    .sort((a, b) => a - b)
    .map((series) => {
      const inSeries = releasedCards.filter((c) => c.series === series);
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
      {/* slim sticky header — two rows on mobile: collection, then money */}
      <div className="sticky top-14 z-20 -mx-1 mb-3 rounded-xl border border-line bg-surface/95 px-3 py-2 backdrop-blur-md">
      <div className="flex items-center gap-2">
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
          <span className="tnum whitespace-nowrap font-mono text-[13px] text-ink">
            {/* series are sealed — per-series denominators only, never a
                global total (the set will grow as new series drop) */}
            {/* parallels live in the popover — the header stays one line */}
            {seriesLines.map(({ series, owned: o, size }) => (
              <span key={series} className="mr-2">
                S{series} {o}/{size}
              </span>
            ))}
          </span>
        </button>
        <span className="ml-auto micro text-[10px] text-ink3">
          {pageLabel(Math.min(page, pages.length - 1), chaseStart, artifactStart, chaseCount)}
        </span>
        <button
          onClick={() => setTrophies(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg hover:bg-surface2"
          title="Achievements"
        >
          🏆
        </button>
      </div>
      <div className="flex items-center gap-3 border-t border-dotted border-line pt-1">
        <button
          onClick={() => setValuationInfo((v) => !v)}
          className="relative flex min-h-9 items-center micro text-[10px] tracking-[0.15em] text-ink2"
          title="How this is calculated"
        >
          Lab valuation:{" "}
          <span className="tnum ml-1 text-sm normal-case tracking-normal text-ink">
            {formatTicks(Math.round(value))}
          </span>
          {valuationInfo && (
            <span className="absolute left-0 top-full z-30 mt-1 w-56 border border-line2 bg-surface p-2 text-left text-[11px] normal-case leading-snug tracking-normal text-ink2 shadow-card">
              Sum of your cards at today&apos;s prices. As rigorous as most
              valuations.
            </span>
          )}
        </button>
        {walletRaw !== null && (
          <span className="ml-auto micro text-[10px] tracking-[0.15em] text-ink2">
            Wallet{" "}
            <span className="tnum text-[13px] tracking-normal text-up">
              {formatTicks(balanceFrom(walletRaw))}
            </span>
          </span>
        )}
      </div>
      <div className="relative">
        {ringPop && (
          <div className="absolute left-2 top-full z-30 mt-1 w-56 rounded-xl border border-line bg-surface p-3 shadow-xl">
            {RARITY_ORDER.map((r) => {
              const total = ordered.filter((c) => c.rarity === r).length;
              const have = ordered.filter((c) => c.rarity === r && binder[c.id]).length;
              return (
                <div key={r} className="flex justify-between font-mono text-xs text-ink2">
                  <span className="capitalize">{r}</span>
                  <span className="tnum">{have}/{total}</span>
                </div>
              );
            })}
            <div className="mt-2 border-t border-dotted border-ink3 pt-2">
              {seriesLines.map(({ series, silver, gold, holo }) => (
                <div key={series} className="flex justify-between font-mono text-[11px]">
                  <span className="text-ink3">S{series} parallels</span>
                  <span className="tnum">
                    <span className="text-ink2">{silver} silver</span> ·{" "}
                    <span className="text-amber">{gold} gold</span> ·{" "}
                    <span className="text-violet">{holo} holo</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>

      <RaiseARound showHistory />

      {/* room switcher — presentation skins over the same collection */}
      <div className="mb-2 flex items-center gap-1.5 overflow-x-auto">
        {ROOMS.map((r) => {
          const unlocked = roomUnlocked(r.id);
          return (
            <button
              key={r.id}
              onClick={() => unlocked && setRoom(r.id)}
              disabled={!unlocked}
              className={`min-h-11 shrink-0 border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] ${
                room === r.id
                  ? "border-line2 bg-ink text-bg"
                  : unlocked
                    ? "border-line text-ink hover:border-line2"
                    : "cursor-not-allowed border-line text-ink3"
              }`}
              title={unlocked ? r.name : `Unlocks at ${r.condition}`}
            >
              {unlocked ? r.name : `🔒 ${r.name} · ${r.condition}`}
            </button>
          );
        })}
      </div>

      {/* filter chips — dim in place, never re-sort */}
      <div className="mb-3 flex items-center gap-1.5 overflow-x-auto">
        {(["all", "missing", "dupes"] as Chip[]).map((c) => (
          <button
            key={c}
            onClick={() => setChip(c)}
            className={`shrink-0 rounded-lg px-3 py-2 text-[12px] font-medium capitalize ${
              chip === c ? "bg-surface2 text-ink" : "bg-surface2 text-ink2"
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
            className="min-w-24 flex-1 rounded-lg border border-line bg-surface2 px-3 py-1.5 text-[12px] text-ink outline-none focus:border-line"
          />
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface2 text-ink2"
            title="Search"
          >
            🔍
          </button>
        )}
      </div>

      {room === "boardroom" && (
        <BoardroomRoom
          cards={ordered}
          binder={binder}
          onOpen={(c) => {
            setOpen(c);
            setSeen((s) => new Set(s).add(c.id));
          }}
        />
      )}
      {room === "call" && (
        <CallRoom
          cards={ordered}
          binder={binder}
          onOpen={(c) => {
            setOpen(c);
            setSeen((s) => new Set(s).add(c.id));
          }}
        />
      )}

      {/* rounded-xl bg-surface2 pages */}
      {room === "binder" && (
      <div className="relative">
        <div
          ref={scroller}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          {pages.map((pageCards, pi) => (
            <div key={pi} className="w-full shrink-0 snap-start px-1 md:w-1/2">
              <div className="surface-card rounded-2xl p-3">
                {pi === chaseStart && chaseCount > 0 && (
                  <p className="mb-2 border-b border-line2 pb-1 text-center micro text-[10px] font-semibold tracking-[0.3em] text-pink">
                    Still chasing — {chaseCount} cards
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2.5">
                  {Array.from({ length: 9 }, (_, si) => {
                    const card = pageCards[si];
                    if (!card) {
                      return <div key={si} className="rounded-xl bg-surface2 aspect-[1/1.4] rounded-lg bg-black/30" />;
                    }
                    const entry = binder[card.id];
                    const dim = !matches(card);
                    const isNew =
                      entry && lastVisit > 0 &&
                      Date.parse(entry.lastPulledAt) > lastVisit &&
                      !seen.has(card.id);
                    if (!entry) {
                      // STILL CHASING rounded-xl bg-surface2 — the card face-up as a print
                      // proof: name and rating readable, art unfinished.
                      return (
                        <div
                          key={card.id}
                          className={`rounded-xl bg-surface2 relative aspect-[1/1.4] rounded-lg bg-black/30 p-1 transition-opacity ${dim ? "opacity-25" : ""}`}
                        >
                          <div className="rounded-xl relative h-full w-full overflow-hidden rounded-md bg-surface">
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
                            <p className="truncate px-1 pt-1 text-left text-[9px] font-medium text-ink">
                              {card.name}
                            </p>
                            <p className="px-1 text-left font-mono text-[8px] text-ink3">
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
                        className={`rounded-xl bg-surface2 relative aspect-[1/1.4] rounded-lg bg-black/30 p-1 transition-opacity ${dim ? "opacity-25 saturate-0" : ""} ${initialCard === card.id ? "pulse-once" : ""}`}
                      >
                        <div
                          className={`rounded-xl relative h-full w-full overflow-hidden rounded-md bg-surface ring-1 ${RARITY_RING[card.rarity]} ${card.rarity === "legendary" ? "foil-slow" : ""}`}
                        >
                          <div className="relative h-[70%]">
                            <CardArt card={card} shape="tile" />
                          </div>
                          <p className="truncate px-1 pt-1 text-left text-[9px] font-medium text-ink">
                            {card.name}
                          </p>
                          <p className="px-1 text-left font-mono text-[8px] text-ink3">
                            {card.rating}
                          </p>
                          {entry.copies > 1 && (
                            <span className="absolute -right-1 -top-1 z-10 rounded-full border border-line2 bg-pink px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none text-on-accent">
                              ×{entry.copies}
                            </span>
                          )}
                          {(entry.prints ?? []).some((p) => p.v !== "base") && (
                            <span className="absolute bottom-0.5 right-0.5 flex gap-0.5">
                              {entry.prints?.some((p) => p.v === "silver") && (
                                <span className="h-2 w-2 rounded-full border border-line bg-ink3" title="Silver" />
                              )}
                              {entry.prints?.some((p) => p.v === "gold") && (
                                <span className="h-2 w-2 rounded-full border border-line bg-amber" title="Gold" />
                              )}
                              {entry.prints?.some((p) => p.v === "holo") && (
                                <span className="h-2 w-2 rounded-full border border-line bg-violet" title="Holo" />
                              )}
                            </span>
                          )}
                          {isNew && (
                            <span className="absolute left-0.5 top-0.5 rounded bg-pink px-1 font-mono text-[8px] font-bold text-on-accent">
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
                      className="rounded-xl bg-surface2 relative w-1/3 rounded-lg bg-black/40 p-1"
                    >
                      <div className="rounded-xl mythic-border relative aspect-[1/1.4] overflow-hidden rounded-md p-[1.5px]">
                        <div className="flex h-full w-full flex-col items-center justify-center rounded-[5px] bg-ink">
                          <span className="text-2xl text-ink2">∞</span>
                          <span className="mt-1 font-mono text-[8px] text-ink3">
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
          className="absolute left-0 top-1/2 hidden h-24 w-10 -translate-y-1/2 items-center justify-center text-2xl text-ink3 hover:text-ink md:flex"
        >
          ‹
        </button>
        <button
          onClick={() => scroller.current?.scrollBy({ left: scroller.current.clientWidth, behavior: "smooth" })}
          className="absolute right-0 top-1/2 hidden h-24 w-10 -translate-y-1/2 items-center justify-center text-2xl text-ink3 hover:text-ink md:flex"
        >
          ›
        </button>

        {empty && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Link
              href="/packs"
              className="rounded-lg bg-pink px-6 py-3 text-sm font-semibold text-on-accent shadow-2xl transition-colors hover:bg-pink"
            >
              Rip your first pack →
            </Link>
          </div>
        )}
      </div>
      )}

      {/* page indicator */}
      {room === "binder" && (
      <div className="mt-3 flex items-center justify-center gap-2">
        {pages.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${Math.min(page, pages.length - 1) === i ? "bg-pink" : "bg-white/20"}`}
          />
        ))}
        <span className="ml-2 font-mono text-[10px] text-ink3">
          Page {Math.min(page, pages.length - 1) + 1} of {Math.ceil(pages.length / perView) * perView >= pages.length ? pages.length : pages.length}
        </span>
      </div>
      )}

      {/* card sheet: bottom on mobile, side panel on desktop */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => { setOpen(null); setSold(null); }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:inset-y-0 md:left-auto md:right-0 md:w-[420px] md:rounded-none md:border-l md:border-t-0"
          >
            <div className="mx-auto max-w-[320px]">
              <TradingCard card={open} rank={ranks[open.id]} size="hero" />
            </div>
            <div className="mt-4 space-y-3">
              <DailyQuip card={open} />
              <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-3">
                <div>
                  <p className="tnum font-mono text-lg font-bold text-ink">
                    {formatTicks(getCurrentPrice(open))}
                  </p>
                  <p className={`tnum font-mono text-xs ${getDailyMove(open) >= 0 ? "text-up" : "text-pink"}`}>
                    {formatMove(getDailyMove(open))} 24h · ×{binder[open.id]?.copies ?? 0} owned
                  </p>
                </div>
                <Sparkline history={open.priceHistory} />
              </div>
              {/* YOUR COPIES — every print, variant + serial */}
              {binder[open.id] && (
                <div className="rounded-xl border border-line bg-surface p-3">
                  <p className="mb-1.5 micro text-[10px] font-semibold tracking-[0.25em] text-ink2">
                    Your copies · ×{binder[open.id].copies}
                  </p>
                  <ul className="space-y-1">
                    {(binder[open.id].prints ?? []).map((p, i) => (
                      <li key={i} className="flex items-center gap-2 font-mono text-[12px] text-ink">
                        <span
                          className={`h-2.5 w-2.5 rounded-full border border-line ${
                            p.v === "silver" ? "bg-ink3" : p.v === "gold" ? "bg-amber" : p.v === "holo" ? "bg-violet" : "bg-surface2"
                          }`}
                        />
                        <span className="uppercase">{p.v}</span>
                        <span className="tnum ml-auto text-ink2">
                          Nº {String(p.n).padStart(3, "0")}/{p.v === "base" ? open.editionSize : p.v === "silver" ? 100 : p.v === "gold" ? 25 : 10}
                        </span>
                      </li>
                    ))}
                    {binder[open.id].copies > (binder[open.id].prints?.length ?? 0) && (
                      <li className="font-mono text-[11px] text-ink3">
                        +{binder[open.id].copies - (binder[open.id].prints?.length ?? 0)} early print
                        {binder[open.id].copies - (binder[open.id].prints?.length ?? 0) === 1 ? "" : "s"} (unstamped base)
                      </li>
                    )}
                  </ul>
                </div>
              )}
              {/* dupes only — the last copy of a card is never sellable */}
              {(binder[open.id]?.copies ?? 0) > 1 && (
                <button
                  onClick={() => {
                    const paid = sellDupe(open.id, getCurrentPrice(open));
                    if (paid > 0) setSold(paid);
                  }}
                  className="rounded-[22px] border border-dashed border-line2 bg-surface w-full p-3 text-center micro text-[11px] font-semibold tracking-[0.2em] text-pink hover:bg-surface2"
                >
                  {sold !== null
                    ? `Sold — +${formatTicks(sold)}`
                    : `Sell one spare — ${formatTicks(dupeValue(getCurrentPrice(open)))}`}
                </button>
              )}
              <div className="flex gap-2">
                <Link
                  href={`/cards/${open.id}`}
                  className="flex-1 rounded-lg bg-pink px-4 py-3 text-center text-sm font-semibold text-on-accent hover:bg-pink"
                >
                  View full page
                </Link>
                <Link
                  href={`/arena?me=${open.id}`}
                  className="flex-1 rounded-lg border border-line px-4 py-3 text-center text-sm font-semibold text-ink2 hover:bg-surface2"
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
            className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          >
            <AchievementWall valuation={value} />
          </div>
        </div>
      )}
    </div>
  );
}
