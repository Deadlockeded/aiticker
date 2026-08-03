"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { MarketCard } from "@/lib/cards";
import { dayHash, utcDayKey } from "@/lib/daily";
import { getDailyMeta, type MetaCategory } from "@/lib/meta";

const subscribeNever = () => () => {};

interface Today {
  meta: MetaCategory[];
  a: MarketCard;
  b: MarketCard;
}

// Cached per day — stable useSyncExternalStore snapshot.
let cachedKey: string | null = null;
let cached: Today | null = null;
function todaySnapshot(cards: MarketCard[]): Today | null {
  const key = utcDayKey();
  if (key !== cachedKey) {
    cachedKey = key;
    // MAIN EVENT: two of the top 24 index cards, date-hash pick, distinct
    const pool = cards.filter((c) => c.type !== "artifact" && c.id !== "agi").slice(0, 24);
    const i = dayHash(`main-event-a:${key}`) % pool.length;
    const j = (i + 1 + (dayHash(`main-event-b:${key}`) % (pool.length - 1))) % pool.length;
    cached = { meta: getDailyMeta(key), a: pool[i], b: pool[j] };
  }
  return cached;
}

/**
 * TODAY'S META on the homepage: the 4 active fight categories + a daily
 * main-event matchup that deep-links straight into the arena. Date-derived
 * → client-only render with a same-height skeleton (zero CLS).
 */
export default function TodayMeta({ cards }: { cards: MarketCard[] }) {
  const today = useSyncExternalStore(
    subscribeNever,
    () => todaySnapshot(cards),
    () => null,
  );

  return (
    <div className="paper-card p-4">
      <p className="border-b-2 border-[#17301F] pb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-[#B23A2E]">
        ⚔ Today&apos;s meta
      </p>
      {today === null ? (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i}>
              <div className="h-4 w-24 rounded-sm bg-[#17301F]/10" />
              <div className="mt-1 h-8 rounded-sm bg-[#17301F]/5" />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
          {today.meta.map((cat) => (
            <div key={cat.key}>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-[#17301F]">
                {cat.name}
              </p>
              <p className="mt-0.5 min-h-8 text-[12px] italic leading-snug text-[#5A6E5E]">
                {cat.definition}
              </p>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 border-t border-dotted border-[#9CB09E] pt-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#9CB09E]">
          Main event
        </p>
        <p className="mt-0.5 min-h-6 text-[14px] font-semibold text-[#17301F]">
          {today ? `${today.a.name} vs ${today.b.name}` : " "}
        </p>
        <Link
          href={today ? `/arena?me=${today.a.id}&vs=${today.b.id}` : "/arena"}
          className="mt-2 inline-block bg-[#B23A2E] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-widest text-[#F4F7F0] hover:bg-[#8E2E24]"
        >
          Watch it in the arena →
        </Link>
      </div>
    </div>
  );
}
