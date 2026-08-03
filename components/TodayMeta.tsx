"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { MarketCard } from "@/lib/cards";
import { dayHash, utcDayKey } from "@/lib/daily";
import { releasedOnly } from "@/lib/drops";
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
    const pool = releasedOnly(cards).filter((c) => c.type !== "artifact" && c.id !== "agi").slice(0, 24);
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
    <div className="surface-card p-4">
      <p className="border-b border-line2 pb-2 micro text-[11px] font-semibold tracking-[0.3em] text-pink">
        ⚔ Today&apos;s meta
      </p>
      {today === null ? (
        <div className="mt-3 flex min-h-[30px] flex-wrap gap-1.5">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-[26px] w-20 rounded-full bg-surface2" />
          ))}
        </div>
      ) : (
        /* names only — the definitions live on the meta strip's tap */
        <div className="mt-3 flex min-h-[30px] flex-wrap gap-1.5">
          {today.meta.map((cat, i) => (
            <span
              key={cat.key}
              className={`micro rounded-full px-2.5 py-1.5 font-semibold ${
                i === 0 ? "bg-pink text-on-accent" : "bg-surface2 text-ink2"
              }`}
            >
              {cat.name}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 border-t border-line pt-3">
        <p className="micro text-[10px] tracking-[0.25em] text-ink3">
          Main event
        </p>
        <p className="mt-0.5 min-h-6 text-[14px] font-semibold text-ink">
          {today ? `${today.a.name} vs ${today.b.name}` : " "}
        </p>
        <Link
          href={today ? `/arena?me=${today.a.id}&vs=${today.b.id}&auto=1` : "/arena"}
          className="mt-2 inline-flex rounded-full bg-pink px-4 py-2 text-[14px] font-semibold text-on-accent transition-transform active:scale-[.97]"
        >
          Watch the fight →
        </Link>
      </div>
    </div>
  );
}
