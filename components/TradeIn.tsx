"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { MarketCard } from "@/lib/cards";
import {
  addPulls,
  burnCopies,
  getBinderSnapshot,
  parseBinder,
  subscribeStore,
} from "@/lib/binder";
import { pullRarePlus } from "@/lib/packs";
import { checkAchievements } from "@/lib/achievements";
import TradingCard from "./TradingCard";

const BURN_COUNT = 5;

type Phase = "closed" | "picking" | "confirm" | "reveal";

/** Burn 5 commons -> 1 guaranteed rare+ with the pack-flip reveal. */
export default function TradeIn({
  cards,
  ranks,
}: {
  cards: MarketCard[];
  ranks: Record<string, number>;
}) {
  const raw = useSyncExternalStore(subscribeStore, getBinderSnapshot, () => null);
  const [phase, setPhase] = useState<Phase>("closed");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [reward, setReward] = useState<MarketCard | null>(null);
  const [flipped, setFlipped] = useState(false);

  const commons = useMemo(() => {
    if (raw === null) return [];
    const binder = parseBinder(raw);
    return cards
      .filter((c) => c.rarity === "common" && binder[c.id])
      .map((c) => ({ card: c, copies: parseBinder(raw)[c.id].copies }));
  }, [raw, cards]);

  if (raw === null) return null;
  const totalCommons = commons.reduce((s, c) => s + c.copies, 0);
  const picked = Object.values(selected).reduce((s, n) => s + n, 0);

  const bump = (id: string, max: number) => {
    setSelected((sel) => {
      const cur = sel[id] ?? 0;
      const next = cur >= max || picked >= BURN_COUNT ? 0 : cur + 1;
      const copy = { ...sel };
      if (next === 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  };

  const burn = () => {
    const prize = pullRarePlus(cards);
    burnCopies(selected);
    addPulls([{ id: prize.id, variant: "base", editionSize: prize.editionSize }]);
    checkAchievements(cards);
    setReward(prize);
    setFlipped(false);
    setSelected({});
    setPhase("reveal");
  };

  return (
    <section className="mt-10 rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Trade-in</h2>
          <p className="mt-0.5 text-xs text-ink3">
            Burn {BURN_COUNT} commons for one guaranteed rare or better.
          </p>
        </div>
        {phase === "closed" && (
          <button
            disabled={totalCommons < BURN_COUNT}
            onClick={() => setPhase("picking")}
            className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink2 transition-colors hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {totalCommons < BURN_COUNT
              ? `Need ${BURN_COUNT} commons (have ${totalCommons})`
              : "Start trade-in"}
          </button>
        )}
      </div>

      {(phase === "picking" || phase === "confirm") && (
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            {commons.map(({ card, copies }) => {
              const n = selected[card.id] ?? 0;
              return (
                <button
                  key={card.id}
                  onClick={() => bump(card.id, copies)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                    n > 0
                      ? "border-amber-400/60 bg-amber-400/10 text-amber-300"
                      : "border-line bg-surface text-ink2 hover:bg-surface2"
                  }`}
                >
                  {card.name}
                  <span className="tnum ml-1.5 font-mono text-ink3">
                    {n > 0 ? `${n}/${copies}` : `×${copies}`}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="tnum font-mono text-xs text-ink2">
              {picked}/{BURN_COUNT} selected
            </span>
            {phase === "picking" ? (
              <button
                disabled={picked !== BURN_COUNT}
                onClick={() => setPhase("confirm")}
                className="rounded-lg bg-pink px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-pink disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trade in
              </button>
            ) : (
              <>
                <span className="text-xs text-pink">
                  This burns {BURN_COUNT} cards permanently. Sure?
                </span>
                <button
                  onClick={burn}
                  className="rounded-lg bg-pink px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-pink"
                >
                  Burn them
                </button>
                <button
                  onClick={() => setPhase("picking")}
                  className="rounded-lg border border-line px-4 py-2 text-sm text-ink2 hover:bg-surface2"
                >
                  Back
                </button>
              </>
            )}
            <button
              onClick={() => {
                setPhase("closed");
                setSelected({});
              }}
              className="ml-auto text-xs text-ink3 hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {phase === "reveal" && reward && (
        <div className="mt-5 flex flex-col items-center gap-4">
          <button
            onClick={() => setFlipped(true)}
            className="deal-in relative aspect-[1/1.42] w-48 [perspective:1200px]"
          >
            <div
              className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]"
              style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
            >
              <div className="absolute inset-0 flex items-center justify-center rounded-xl border border-amber-400/40 bg-gradient-to-b from-amber-950/60 via-zinc-900 to-zinc-950 [backface-visibility:hidden]">
                <span className="micro text-[10px] tracking-[0.3em] text-amber-300/80">
                  Tap to reveal
                </span>
              </div>
              <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <TradingCard card={reward} rank={ranks[reward.id]} />
              </div>
            </div>
          </button>
          {flipped && (
            <button
              onClick={() => setPhase("closed")}
              className="rounded-lg border border-line px-4 py-2 text-sm text-ink2 hover:bg-surface2"
            >
              Done
            </button>
          )}
        </div>
      )}
    </section>
  );
}
