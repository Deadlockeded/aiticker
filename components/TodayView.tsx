"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import type { MarketCard } from "@/lib/cards";
import { subscribeStore } from "@/lib/binder";
import {
  fakeCommunityPct,
  getDailyCard,
  getPredictionIndex,
  getVisitsSnapshot,
  getVotesSnapshot,
  parseVisits,
  parseVotes,
  recordVisit,
  utcDayKey,
  voteToday,
} from "@/lib/daily";
import { addXP, XP_REWARDS } from "@/lib/xp";
import { checkAchievements } from "@/lib/achievements";
import predictions from "@/data/predictions.json";
import TradingCard from "./TradingCard";

export default function TodayView({
  cards,
  ranks,
}: {
  cards: MarketCard[];
  ranks: Record<string, number>;
}) {
  const votesRaw = useSyncExternalStore(subscribeStore, getVotesSnapshot, () => null);
  const visitsRaw = useSyncExternalStore(subscribeStore, getVisitsSnapshot, () => null);
  const mounted = votesRaw !== null && visitsRaw !== null;

  // external-store write only — streak state flows back via the store
  useEffect(() => {
    recordVisit();
  }, []);

  const view = useMemo(() => {
    if (!mounted) return null;
    const day = utcDayKey();
    const card = getDailyCard(cards, day);
    const q = predictions[getPredictionIndex(predictions.length, day)];
    const myVote = parseVotes(votesRaw!)[day];
    const pcts = fakeCommunityPct(q.options.length, day);
    const streak = parseVisits(visitsRaw!);
    return { day, card, q, myVote, pcts, streak };
  }, [mounted, votesRaw, visitsRaw, cards]);

  if (!view) {
    return (
      <p className="py-24 text-center font-mono text-xs uppercase tracking-[0.3em] text-white/30">
        Turning the page…
      </p>
    );
  }

  const { day, card, q, myVote, pcts, streak } = view;
  const voted = myVote !== undefined;

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,340px)_1fr]">
      {/* daily card */}
      <div>
        <p className="mb-3 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.25em] text-white/40">
          <span>Card of the day · {day}</span>
          {streak.current > 0 && (
            <span className="text-amber-400">🔥 {streak.current}-day streak</span>
          )}
        </p>
        <Link href={`/cards/${card.id}`} className="block max-w-[340px]">
          <TradingCard card={card} rank={ranks[card.id]} size="hero" />
        </Link>
      </div>

      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-bold text-white">{card.name}</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            {card.dailyBlurb}
          </p>
        </div>

        {/* prediction poll */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-400/80">
            Daily prediction · just a poll, no scoring
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">{q.question}</h3>
          <div className="mt-4 space-y-2">
            {q.options.map((option, i) => {
              const mine = myVote === i;
              return voted ? (
                <div
                  key={option}
                  className={`relative overflow-hidden rounded-lg border p-3 ${
                    mine ? "border-cyan-400/50" : "border-white/10"
                  }`}
                >
                  <div
                    className={`absolute inset-y-0 left-0 ${mine ? "bg-cyan-400/15" : "bg-white/5"}`}
                    style={{ width: `${pcts[i]}%` }}
                  />
                  <div className="relative flex items-center justify-between text-sm">
                    <span className={mine ? "font-semibold text-cyan-300" : "text-white/80"}>
                      {option} {mine && "· your pick"}
                    </span>
                    <span className="tnum font-mono text-white/60">{pcts[i]}%</span>
                  </div>
                </div>
              ) : (
                <button
                  key={option}
                  onClick={() => {
                    voteToday(i);
                    addXP(XP_REWARDS.dailyVote);
                    checkAchievements(cards);
                  }}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left text-sm text-white/80 transition-colors hover:border-cyan-400/50 hover:bg-white/[0.06]"
                >
                  {option}
                </button>
              );
            })}
          </div>
          <p className="mt-3 font-mono text-[11px] text-white/35">
            {voted
              ? "Community % is simulated. Come back tomorrow for a fresh one."
              : `Vote to earn +${XP_REWARDS.dailyVote} XP. Community % appears after you pick.`}
          </p>
        </div>
      </div>
    </div>
  );
}
