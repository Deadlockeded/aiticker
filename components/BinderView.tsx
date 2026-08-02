"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MarketCard } from "@/lib/cards";
import type { Rarity } from "@/lib/types";
import { getBinder, type Binder } from "@/lib/binder";
import { formatTicks, getCurrentPrice } from "@/lib/market";
import TradingCard from "./TradingCard";

const RARITY_ORDER: Rarity[] = ["common", "rare", "epic", "legendary", "mythic"];

const RARITY_BAR: Record<Rarity, string> = {
  common: "bg-zinc-400",
  rare: "bg-sky-400",
  epic: "bg-fuchsia-400",
  legendary: "bg-amber-400",
  mythic: "bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300",
};

function Silhouette({ card }: { card: MarketCard }) {
  return (
    <div className="relative flex aspect-[5/7] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.03]">
      <span className="text-4xl font-black text-white/15">?</span>
      <span className="mt-2 px-3 text-center font-mono text-[9px] uppercase tracking-[0.2em] text-white/25">
        {card.rarity}
      </span>
    </div>
  );
}

export default function BinderView({
  cards,
  ranks,
}: {
  cards: MarketCard[];
  ranks: Record<string, number>;
}) {
  const [binder, setBinder] = useState<Binder | null>(null);

  useEffect(() => {
    setBinder(getBinder());
  }, []);

  if (binder === null) {
    return (
      <p className="py-24 text-center font-mono text-xs uppercase tracking-[0.3em] text-white/30">
        Opening binder…
      </p>
    );
  }

  const owned = cards.filter((c) => binder[c.id]);
  const totalCopies = owned.reduce((n, c) => n + binder[c.id].copies, 0);
  const portfolioValue = owned.reduce(
    (sum, c) => sum + getCurrentPrice(c) * binder[c.id].copies,
    0,
  );
  const completion = Math.round((owned.length / cards.length) * 100);

  if (owned.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 py-24 text-center">
        <p className="text-5xl">🃏</p>
        <div>
          <h2 className="text-xl font-bold text-white">Your binder is empty</h2>
          <p className="mt-1 text-sm text-white/50">
            Rip your free daily packs to start the collection.
          </p>
        </div>
        <Link
          href="/packs"
          className="rounded-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-fuchsia-400 px-8 py-3 font-black uppercase tracking-wide text-slate-950 transition-transform hover:scale-105"
        >
          Rip a Pack
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* header stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
            Collected
          </span>
          <p className="mt-1 font-mono text-3xl font-bold text-white">
            {owned.length}
            <span className="text-lg text-white/40">/{cards.length}</span>
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-400"
              style={{ width: `${completion}%` }}
            />
          </div>
          <p className="mt-1.5 font-mono text-xs text-white/50">
            {completion}% complete · {totalCopies} total cards
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
            Portfolio value
          </span>
          <p className="mt-1 font-mono text-3xl font-bold text-white">
            {formatTicks(Math.round(portfolioValue))}
          </p>
          <p className="mt-1.5 font-mono text-xs text-white/50">
            simulated · copies × current price
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
            Rarity breakdown
          </span>
          <div className="mt-2.5 space-y-1.5">
            {RARITY_ORDER.map((rarity) => {
              const total = cards.filter((c) => c.rarity === rarity).length;
              const have = owned.filter((c) => c.rarity === rarity).length;
              return (
                <div key={rarity} className="flex items-center gap-2">
                  <span className="w-16 font-mono text-[9px] uppercase tracking-wider text-white/50">
                    {rarity}
                  </span>
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${RARITY_BAR[rarity]}`}
                      style={{ width: `${total ? (have / total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="w-7 text-right font-mono text-[9px] text-white/60">
                    {have}/{total}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* collection grid — unowned cards stay as silhouettes for completion pressure */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4 xl:grid-cols-5">
        {cards.map((card) => {
          const entry = binder[card.id];
          if (!entry) return <Silhouette key={card.id} card={card} />;
          return (
            <Link key={card.id} href={`/cards/${card.id}`} className="relative">
              <TradingCard card={card} rank={ranks[card.id]} />
              {entry.copies > 1 && (
                <span className="absolute -right-1.5 -top-1.5 z-10 rounded-full border border-white/20 bg-slate-950 px-2 py-0.5 font-mono text-xs font-bold text-white shadow-lg">
                  ×{entry.copies}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
