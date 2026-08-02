"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { subscribeStore } from "@/lib/binder";
import { utcDayKey } from "@/lib/daily";
import {
  dayNumber,
  getTickerdleSnapshot,
  parseTickerdle,
} from "@/lib/tickerdle";

/** Homepage tiles for Tickerdle (with played state) + Make-your-card CTA. */
export function HomeTeasers() {
  const raw = useSyncExternalStore(subscribeStore, getTickerdleSnapshot, () => null);
  const view = useMemo(() => {
    if (raw === null) return null;
    const key = utcDayKey();
    const day = parseTickerdle(raw).days[key];
    return { num: dayNumber(key), played: !!day?.done, won: !!day?.won };
  }, [raw]);

  return (
    <section className="mb-6 grid gap-3 sm:grid-cols-2">
      <Link
        href="/guess"
        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-cyan-400/40"
      >
        <div>
          <p className="font-semibold text-white">
            Tickerdle {view ? `#${view.num}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-white/45">
            {view?.played
              ? view.won
                ? "Solved — new puzzle at midnight UTC"
                : "Better luck tomorrow"
              : "Guess the AI figure of the day"}
          </p>
        </div>
        <span className="text-2xl">{view?.played ? (view.won ? "🟩" : "⬛") : "❓"}</span>
      </Link>
      <Link
        href="/create"
        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-cyan-400/40"
      >
        <div>
          <p className="font-semibold text-white">Get rated</p>
          <p className="mt-0.5 text-xs text-white/45">
            The Algorithm scores your public footprint.
          </p>
        </div>
        <span className="text-2xl">🪪</span>
      </Link>
      <Link
        href="/vs?b=card:andrej-karpathy"
        className="flex items-center justify-between rounded-xl border border-amber-400/25 bg-amber-400/[0.04] p-4 transition-colors hover:border-amber-400/50 sm:col-span-2"
      >
        <div>
          <p className="font-semibold text-white">
            Think you can beat the index?
          </p>
          <p className="mt-0.5 text-xs text-white/45">
            Your GitHub vs Karpathy&apos;s card. Best of four stats. ⚡
          </p>
        </div>
        <span className="text-2xl">⚡</span>
      </Link>
    </section>
  );
}

const NUDGES = [
  { href: "/guess", label: "Play today's Tickerdle →" },
  { href: "/create", label: "Make your own card →" },
];

/** One-line nudge shown after pack rips / battle wins. Alternates randomly. */
export function ViralNudge() {
  const [nudge] = useState(() => NUDGES[Math.floor(Math.random() * NUDGES.length)]);
  return (
    <Link
      href={nudge.href}
      className="font-mono text-xs text-cyan-300/90 underline-offset-4 hover:underline"
    >
      {nudge.label}
    </Link>
  );
}
