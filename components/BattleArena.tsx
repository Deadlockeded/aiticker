"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { MarketCard } from "@/lib/cards";
import {
  getBinderSnapshot,
  parseBinder,
  subscribeStore,
} from "@/lib/binder";
import {
  type BattleResult,
  getBattleRecordSnapshot,
  parseBattleRecord,
  pickOpponent,
  recordBattle,
  resolveBattle,
} from "@/lib/battle";
import { addXP, XP_REWARDS } from "@/lib/xp";
import { checkAchievements } from "@/lib/achievements";
import TradingCard from "./TradingCard";
import CardArt from "./CardArt";
import ShareButton from "./ShareButton";
import { ViralNudge } from "./ViralTeasers";

type Phase = "pick" | "fight" | "done";

const STAT_LABELS = {
  innovation: "Innovation",
  influence: "Influence",
  momentum: "Momentum",
} as const;

export default function BattleArena({
  cards,
  ranks,
}: {
  cards: MarketCard[];
  ranks: Record<string, number>;
}) {
  const binderRaw = useSyncExternalStore(subscribeStore, getBinderSnapshot, () => null);
  const recordRaw = useSyncExternalStore(subscribeStore, getBattleRecordSnapshot, () => null);
  const record = useMemo(
    () => (recordRaw === null ? null : parseBattleRecord(recordRaw)),
    [recordRaw],
  );
  const owned = useMemo(() => {
    if (binderRaw === null) return null;
    const binder = parseBinder(binderRaw);
    return cards.filter((c) => binder[c.id]);
  }, [binderRaw, cards]);

  const [phase, setPhase] = useState<Phase>("pick");
  const [mine, setMine] = useState<MarketCard | null>(null);
  const [opponent, setOpponent] = useState<MarketCard | null>(null);
  const [result, setResult] = useState<BattleResult | null>(null);
  const [shownRounds, setShownRounds] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const startBattle = (my: MarketCard, opp?: MarketCard) => {
    const enemy = opp ?? pickOpponent(cards, my);
    const res = resolveBattle(my, enemy);
    setMine(my);
    setOpponent(enemy);
    setResult(res);
    setShownRounds(0);
    setPhase("fight");

    timers.current.forEach(clearTimeout);
    timers.current = res.rounds.map((_, i) =>
      setTimeout(() => setShownRounds(i + 1), 700 + i * 1300),
    );
    timers.current.push(
      setTimeout(() => {
        const won = res.winner === "a";
        recordBattle(won);
        addXP(won ? XP_REWARDS.battleWin : XP_REWARDS.battleLoss);
        checkAchievements(cards);
        setPhase("done");
      }, 700 + res.rounds.length * 1300 + 400),
    );
  };

  if (owned === null || record === null) {
    return (
      <p className="py-24 text-center font-mono text-xs uppercase tracking-[0.3em] text-white/30">
        Entering the arena…
      </p>
    );
  }

  if (owned.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 py-24 text-center">
        <p className="text-5xl">⚔️</p>
        <p className="text-white/60">
          You need at least one card in your binder to battle.
        </p>
        <Link
          href="/packs"
          className="rounded-lg bg-cyan-400 px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-cyan-300"
        >
          Rip a pack
        </Link>
      </div>
    );
  }

  const decided = result && phase !== "pick" ? result.rounds.slice(0, shownRounds) : [];
  const lastRound = decided[decided.length - 1];

  return (
    <div>
      <p className="mb-6 text-center font-mono text-xs text-white/40">
        Streak <span className="tnum text-white">{record.current}</span> · Best{" "}
        <span className="tnum text-white">{record.best}</span> ·{" "}
        <span className="tnum">{record.wins}W–{record.losses}L</span> · zero
        stakes, cards are never lost
      </p>

      {phase === "pick" && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-white">
            Choose your fighter
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {owned.map((card) => (
              <button
                key={card.id}
                onClick={() => startBattle(card)}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition-colors hover:border-cyan-400/50 hover:bg-white/[0.06]"
              >
                <div className="h-9 w-9 shrink-0">
                  <CardArt card={card} />
                </div>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-white">
                    {card.name}
                  </span>
                  <span className="tnum font-mono text-xs text-white/40">
                    {card.rating} ovr
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase !== "pick" && mine && opponent && result && (
        <div>
          <div className="mx-auto grid max-w-2xl grid-cols-2 items-start gap-4 sm:gap-10">
            {[
              { card: mine, side: "a" as const },
              { card: opponent, side: "b" as const },
            ].map(({ card, side }) => {
              const lostLast =
                lastRound && phase === "fight" && lastRound.winner !== side;
              const wonMatch = phase === "done" && result.winner === side;
              return (
                <div
                  key={side + card.id}
                  className={`${lostLast ? "hit-shake" : ""} ${wonMatch ? "winner-pulse" : ""}`}
                >
                  <p className="mb-2 text-center font-mono text-[10px] uppercase tracking-widest text-white/40">
                    {side === "a" ? "You" : "Opponent"}
                  </p>
                  <TradingCard card={card} rank={ranks[card.id]} />
                </div>
              );
            })}
          </div>

          {/* rounds */}
          <div className="mx-auto mt-6 max-w-2xl space-y-2">
            {decided.map((round, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-white/40">
                  <span>
                    Round {i + 1} · {STAT_LABELS[round.stat]}
                  </span>
                  {round.upset && <span className="text-amber-400">upset!</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`tnum w-7 text-right font-mono text-sm ${round.winner === "a" ? "font-bold text-emerald-400" : "text-white/60"}`}
                  >
                    {round.a}
                  </span>
                  <div className="flex h-1.5 flex-1 gap-1">
                    <div className="flex flex-1 justify-end overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${round.winner === "a" ? "bg-emerald-400" : "bg-white/40"}`}
                        style={{ width: `${round.a}%` }}
                      />
                    </div>
                    <div className="flex flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${round.winner === "b" ? "bg-emerald-400" : "bg-white/40"}`}
                        style={{ width: `${round.b}%` }}
                      />
                    </div>
                  </div>
                  <span
                    className={`tnum w-7 font-mono text-sm ${round.winner === "b" ? "font-bold text-emerald-400" : "text-white/60"}`}
                  >
                    {round.b}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {phase === "done" && (
            <div className="mt-6 text-center">
              <p className="text-xl font-bold text-white">
                {result.winner === "a"
                  ? `Victory ${result.aWins}–${result.bWins}`
                  : `Defeat ${result.aWins}–${result.bWins}`}
                <span className="ml-2 font-mono text-sm text-cyan-300">
                  +{result.winner === "a" ? XP_REWARDS.battleWin : XP_REWARDS.battleLoss}{" "}
                  XP
                </span>
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => startBattle(mine, opponent)}
                  className="rounded-lg bg-cyan-400 px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-cyan-300"
                >
                  Rematch
                </button>
                <button
                  onClick={() => startBattle(mine)}
                  className="rounded-lg border border-white/15 px-6 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/5"
                >
                  New opponent
                </button>
                <button
                  onClick={() => setPhase("pick")}
                  className="rounded-lg border border-white/15 px-6 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/5"
                >
                  Change card
                </button>
                <ViralNudge />
                <ShareButton
                  label="Share result"
                  text={
                    result.winner === "a"
                      ? `My ${mine.name} just beat ${opponent.name} ${result.aWins}-${result.bWins} on ${STAT_LABELS[result.rounds[result.rounds.length - 1].stat].toLowerCase()}. aiticker.xyz`
                      : `My ${mine.name} just got cooked ${result.bWins}-${result.aWins} by ${opponent.name}. Demanding a rematch. aiticker.xyz`
                  }
                  url="https://aiticker.xyz/battle"
                  className="text-sm"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
