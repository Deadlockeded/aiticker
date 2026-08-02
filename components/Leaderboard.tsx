"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MarketCard } from "@/lib/cards";
import { getBinder } from "@/lib/binder";
import { formatTicks, getCurrentPrice } from "@/lib/market";

export const STARTING_TICKS = 10_000;

/**
 * Fake-but-stable rival collectors seeded around the ₮10,000 starting stack
 * so the real user lands somewhere believable. Pure vibes — validates
 * whether anyone cares about ranking before building real accounts.
 */
const RIVALS: { name: string; value: number }[] = [
  { name: "ticker_whale", value: 24_310 },
  { name: "scaling_laws", value: 19_845 },
  { name: "e/acc_andy", value: 16_120 },
  { name: "yolo_yann", value: 14_780 },
  { name: "gpu_poor", value: 13_205 },
  { name: "prompt_lord", value: 12_440 },
  { name: "anon_collector", value: 11_615 },
  { name: "sama_stan", value: 10_930 },
  { name: "agi_2027", value: 10_105 },
  { name: "doomer_dave", value: 9_480 },
];

export default function Leaderboard({ cards }: { cards: MarketCard[] }) {
  const [yourValue, setYourValue] = useState<number | null>(null);

  useEffect(() => {
    const binder = getBinder();
    const portfolio = cards.reduce(
      (sum, c) => sum + (binder[c.id]?.copies ?? 0) * getCurrentPrice(c),
      0,
    );
    setYourValue(Math.round(STARTING_TICKS + portfolio));
  }, [cards]);

  if (yourValue === null) {
    return (
      <p className="py-24 text-center font-mono text-xs uppercase tracking-[0.3em] text-white/30">
        Ranking collectors…
      </p>
    );
  }

  const rows = [...RIVALS, { name: "You", value: yourValue }].sort(
    (a, b) => b.value - a.value,
  );

  return (
    <div>
      <div className="space-y-2">
        {rows.map((row, i) => {
          const you = row.name === "You";
          return (
            <div
              key={row.name}
              className={`flex items-center gap-4 rounded-xl border p-4 ${
                you
                  ? "border-cyan-400/40 bg-cyan-400/10 shadow-[0_0_24px_-8px_rgba(34,211,238,0.5)]"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <span
                className={`w-10 text-center font-mono text-lg font-bold ${
                  i === 0
                    ? "text-amber-300"
                    : i === 1
                      ? "text-zinc-300"
                      : i === 2
                        ? "text-amber-600"
                        : "text-white/40"
                }`}
              >
                {i + 1}
              </span>
              <span
                className={`flex-1 truncate font-semibold ${
                  you ? "text-cyan-300" : "text-white"
                }`}
              >
                {row.name}
                {you && (
                  <span className="ml-2 rounded-full bg-cyan-400/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-cyan-300">
                    that&apos;s you
                  </span>
                )}
              </span>
              <span className="font-mono font-bold text-white">
                {formatTicks(row.value)}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-sm text-white/40">
        Everyone starts with {formatTicks(STARTING_TICKS)} Ticks. Grow yours by
        ripping{" "}
        <Link href="/packs" className="text-cyan-300 underline hover:text-cyan-200">
          free daily packs
        </Link>
        . Play money — pure vibes.
      </p>
    </div>
  );
}
