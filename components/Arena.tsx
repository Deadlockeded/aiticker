"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { MarketCard } from "@/lib/cards";
import {
  getBinderSnapshot,
  parseBinder,
  subscribeStore,
} from "@/lib/binder";
import {
  getBattleRecordSnapshot,
  parseBattleRecord,
  recordBattle,
} from "@/lib/battle";
import { addXP, XP_REWARDS } from "@/lib/xp";
import { checkAchievements, unlockArtifactWin } from "@/lib/achievements";
import { computeCommunityRating, toMarketCard } from "@/lib/create";
import { getScoredProfile, ScoreError } from "@/lib/score";
import { getHotCards, getRandomQuip, HOT_BOOST } from "@/lib/daily";
import {
  cardVsStats,
  commentary,
  resolveArena,
  type VsResult,
  type VsSide,
} from "@/lib/vsMapping";
import CardArt from "./CardArt";
import TradingCard from "./TradingCard";
import ShareButton from "./ShareButton";
import { canShareFiles, canvasBlob, sharePng, type ShareOutcome } from "@/lib/share";
import { ViralNudge } from "./ViralTeasers";

type Phase = "setup" | "fight" | "done";

interface Fighter {
  side: VsSide;
  card?: MarketCard;
  hot: boolean;
}

async function exportArenaPng(a: VsSide, b: VsSide, result: VsResult) {
  const W = 1600;
  const H = 900;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0a0a0b";
  ctx.fillRect(0, 0, W, H);

  const load = (src: string | null) =>
    new Promise<HTMLImageElement | null>((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src.startsWith("data:")
        ? src
        : `/_next/image?url=${encodeURIComponent(src)}&w=384&q=80`;
    });
  const [imgA, imgB] = await Promise.all([load(a.avatar), load(b.avatar)]);

  const panel = (x: number, side: VsSide, img: HTMLImageElement | null, won: boolean) => {
    ctx.fillStyle = "#131316";
    ctx.strokeStyle = won ? "#34d399" : "rgba(255,255,255,0.15)";
    ctx.lineWidth = won ? 5 : 2;
    ctx.beginPath();
    ctx.roundRect(x, 100, 420, 500, 24);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + 210, 270, 115, 0, Math.PI * 2);
    ctx.clip();
    if (img) {
      ctx.fillStyle = side.company ? "#fff" : "#18181b";
      ctx.fillRect(x + 95, 155, 230, 230);
      if (side.company) ctx.drawImage(img, x + 145, 205, 130, 130);
      else ctx.drawImage(img, x + 95, 155, 230, 230);
    } else {
      ctx.fillStyle = "#27272a";
      ctx.fillRect(x + 95, 155, 230, 230);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "700 76px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(side.label.replace("@", "").slice(0, 2).toUpperCase(), x + 210, 270);
    }
    ctx.restore();
    ctx.fillStyle = "#fff";
    ctx.font = "700 38px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(side.label.slice(0, 20), x + 210, 460);
    ctx.fillStyle = "#67e8f9";
    ctx.font = "800 50px system-ui, sans-serif";
    ctx.fillText(String(side.rating), x + 210, 535);
    ctx.textAlign = "left";
  };
  panel(80, a, imgA, result.winner === "a");
  panel(W - 80 - 420, b, imgB, result.winner === "b");

  ctx.textAlign = "center";
  ctx.fillStyle = "#fbbf24";
  ctx.font = "900 110px system-ui, sans-serif";
  ctx.fillText("⚔️", W / 2, 300);
  ctx.fillStyle = "#fff";
  ctx.font = "900 68px system-ui, sans-serif";
  ctx.fillText(`${result.aWins}–${result.bWins}`, W / 2, 400);

  let y = 690;
  ctx.font = "600 24px ui-monospace, monospace";
  for (const round of result.rounds) {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.textAlign = "center";
    ctx.fillText(round.label.toUpperCase(), W / 2, y - 12);
    const mid = W / 2;
    const span = 540;
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.roundRect(mid - span, y, span * 2, 16, 8);
    ctx.fill();
    ctx.fillStyle = round.winner === "a" ? "#34d399" : "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.roundRect(mid - (span * round.a) / 100, y, (span * round.a) / 100, 16, 8);
    ctx.fill();
    ctx.fillStyle = round.winner === "b" ? "#34d399" : "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.roundRect(mid, y, (span * round.b) / 100, 16, 8);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "right";
    ctx.fillText(String(round.a), mid - span - 14, y + 14);
    ctx.textAlign = "left";
    ctx.fillText(String(round.b), mid + span + 14, y + 14);
    y += 54;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#67e8f9";
  ctx.font = "600 28px ui-monospace, monospace";
  ctx.fillText("aiticker.xyz/arena", W / 2, H - 26);

  const blob = await canvasBlob(canvas);
  if (!blob) return "cancelled" as const;
  return sharePng(blob, { filename: "aiticker-arena.png", text: `Arena result ${result.aWins}–${result.bWins}. Run yours.`, url: "https://aiticker.vercel.app/arena" });
}

export default function Arena({
  cards,
  ranks,
  initialMe,
  initialVs,
}: {
  cards: MarketCard[];
  ranks: Record<string, number>;
  initialMe?: string;
  initialVs?: string;
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

  const [me, setMe] = useState<Fighter | null>(null);
  const [foe, setFoe] = useState<Fighter | null>(null);
  const [foeLoading, setFoeLoading] = useState<string | null>(null);
  const [foeError, setFoeError] = useState<string | null>(null);
  const [chaos, setChaos] = useState(false);
  const [handleInput, setHandleInput] = useState("");
  const [pickerQuery, setPickerQuery] = useState("");
  const [phase, setPhase] = useState<Phase>("setup");
  const [result, setResult] = useState<VsResult | null>(null);
  const [entranceQuips, setEntranceQuips] = useState<(string | null)[]>([null, null]);
  const [shareMode, setShareMode] = useState<ShareOutcome | null>(null);
  const [shownRounds, setShownRounds] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const autoRan = useRef(false);

  const hotIds = useMemo(
    () => new Set(getHotCards(cards).map((c) => c.id)),
    [cards],
  );

  const cardFighter = (card: MarketCard): Fighter => {
    const hot = hotIds.has(card.id);
    const base = cardVsStats(card);
    const boost = (v: number) => Math.min(99, v + (hot ? HOT_BOOST : 0));
    return {
      card,
      hot,
      side: {
        kind: "card",
        label: card.name,
        avatar: card.image,
        company: card.type === "company",
        rating: Math.min(99, card.rating + (hot ? HOT_BOOST : 0)),
        stats: {
          shipping: boost(base.shipping),
          yapping: boost(base.yapping),
          galaxyBrain: boost(base.galaxyBrain),
          gpuHoarding: boost(base.gpuHoarding),
        },
        cardId: card.id,
      },
    };
  };

  const loadFoe = async (ref: string, asChaos = false) => {
    setFoeError(null);
    setChaos(asChaos);
    if (ref.startsWith("card:")) {
      const card = cards.find((c) => c.id === ref.slice(5));
      if (card) setFoe(cardFighter(card));
      else setFoeError("Unknown card.");
      return;
    }
    setFoeLoading(ref);
    try {
      const { profile } = await getScoredProfile(ref.replace(/^@/, ""));
      setFoe({
        hot: false,
        side: {
          kind: "profile",
          label: `@${profile.handle}`,
          avatar: profile.avatarUrl,
          company: false,
          rating: computeCommunityRating(profile.handle, profile.stats),
          stats: profile.stats,
        },
      });
    } catch (err) {
      setFoeError(err instanceof ScoreError ? err.message : "Fetch failed.");
    } finally {
      setFoeLoading(null);
    }
  };

  // challenge links (?me=cardId&vs=cardId|handle)
  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    const kickoff = setTimeout(() => {
      if (initialMe) {
        const card = cards.find((c) => c.id === initialMe);
        if (card) setMe(cardFighter(card));
      }
      if (initialVs) loadFoe(initialVs.startsWith("@") ? initialVs : cards.some((c) => c.id === initialVs) ? `card:${initialVs}` : initialVs);
    }, 0);
    return () => clearTimeout(kickoff);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fight = () => {
    if (!me || !foe) return;
    const res = resolveArena(me.side, foe.side, chaos);
    setEntranceQuips([
      me.card ? getRandomQuip(me.card) : null,
      foe.card ? getRandomQuip(foe.card) : null,
    ]);
    setResult(res);
    setShownRounds(0);
    setPhase("fight");
    timers.current.forEach(clearTimeout);
    timers.current = res.rounds.map((_, i) =>
      setTimeout(() => setShownRounds(i + 1), 600 + i * 1200),
    );
    timers.current.push(
      setTimeout(() => {
        const won = res.winner === "a";
        recordBattle(won, won && foe.side.rating >= me.side.rating + 10);
        addXP(won ? XP_REWARDS.battleWin : XP_REWARDS.battleLoss);
        if (won && me.card?.type === "artifact") {
          unlockArtifactWin(me.card);
        }
        checkAchievements(cards);
        setPhase("done");
      }, 600 + res.rounds.length * 1200 + 400),
    );
  };

  if (owned === null || record === null) {
    return (
      <p className="py-24 text-center font-mono text-xs uppercase tracking-[0.3em] text-white/30">
        Opening the arena…
      </p>
    );
  }

  if (owned.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 py-24 text-center">
        <p className="text-5xl">⚔️</p>
        <p className="text-white/60">
          You fight with cards from your binder — rip your free daily packs
          first.
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

  const pickerMatches = pickerQuery.trim()
    ? cards.filter((c) => c.id !== "agi" && c.name.toLowerCase().includes(pickerQuery.trim().toLowerCase())).slice(0, 6)
    : [];
  const decided = result ? result.rounds.slice(0, shownRounds) : [];
  const lastRound = decided[decided.length - 1];
  const winnerLabel = result
    ? result.winner === "a"
      ? me!.side.label
      : result.winner === "b"
        ? foe!.side.label
        : "Nobody"
    : "";

  return (
    <div>
      <p className="mb-6 text-center font-mono text-xs text-white/40">
        Streak <span className="tnum text-white">{record.current}</span> · Best{" "}
        <span className="tnum text-white">{record.best}</span> ·{" "}
        <span className="tnum">{record.wins}W–{record.losses}L</span> · zero
        stakes, cards are never lost
      </p>

      {phase === "setup" && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {/* fighter */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-white/40">
                Your fighter · from your binder
              </p>
              <div className="grid max-h-56 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                {owned.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => setMe(cardFighter(card))}
                    className={`flex items-center gap-2.5 rounded-lg border p-2 text-left transition-colors ${
                      me?.side.cardId === card.id
                        ? "border-cyan-400/60 bg-cyan-400/10"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="h-8 w-8 shrink-0">
                      <CardArt card={card} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-white">
                        {card.name}
                        {hotIds.has(card.id) && (
                          <span className="ml-1 font-mono text-[10px] text-orange-300">
                            🔥 +{HOT_BOOST} today
                          </span>
                        )}
                      </span>
                      <span className="tnum font-mono text-[11px] text-white/40">
                        {card.rating} ovr
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* opponent */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-white/40">
                Opponent · index card, GitHub handle, or chaos
              </p>
              <div className="relative">
                <input
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder="Search Series 1 cards…"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-cyan-400/50"
                />
                {pickerMatches.length > 0 && (
                  <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-white/15 bg-[#131316] py-1 shadow-xl max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:z-50 max-md:max-h-[55vh] max-md:overflow-y-auto max-md:rounded-b-none max-md:rounded-t-2xl max-md:border-t max-md:pb-[env(safe-area-inset-bottom)]">
                    {pickerMatches.map((card) => (
                      <li key={card.id}>
                        <button
                          onClick={() => {
                            loadFoe(`card:${card.id}`);
                            setPickerQuery("");
                          }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-white/80 hover:bg-white/5"
                        >
                          <span className="h-6 w-6 shrink-0">
                            <CardArt card={card} />
                          </span>
                          <span className="truncate">{card.name}</span>
                          <span className="tnum ml-auto font-mono text-[10px] text-white/35">
                            {card.rating}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={handleInput}
                  onChange={(e) => setHandleInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleInput.trim() && loadFoe(handleInput.trim())}
                  placeholder="…or a GitHub handle"
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-cyan-400/50"
                />
                <button
                  onClick={() => handleInput.trim() && loadFoe(handleInput.trim())}
                  className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 hover:bg-white/5"
                >
                  Score
                </button>
                <button
                  onClick={() => {
                    const pool = cards.filter((c) => c.rarity === "epic" || c.rarity === "legendary");
                    loadFoe(`card:${pool[Math.floor(Math.random() * pool.length)].id}`, true);
                  }}
                  className="shrink-0 rounded-lg border border-amber-400/40 px-3 py-2 font-mono text-[11px] text-amber-300 hover:bg-amber-400/10"
                  title="Chaos mode: seeded upsets enabled"
                >
                  🎲
                </button>
              </div>
              {foeLoading && (
                <p className="mt-2 font-mono text-[11px] text-white/40">
                  Scoring {foeLoading}…
                </p>
              )}
              {foeError && (
                <p className="mt-2 text-xs text-red-300">{foeError}</p>
              )}
              {foe && (
                <p className="mt-2 font-mono text-[11px] text-cyan-300">
                  Opponent locked: {foe.side.label} ({foe.side.rating})
                  {foe.hot && ` · 🔥 +${HOT_BOOST} today`}
                  {chaos && " · chaos mode"}
                </p>
              )}
            </div>
          </div>
          <div className="mt-5 text-center">
            <button
              onClick={fight}
              disabled={!me || !foe}
              className="rounded-lg bg-cyan-400 px-10 py-3 text-base font-semibold text-black transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Fight
            </button>
          </div>
        </>
      )}

      {phase !== "setup" && me && foe && result && (
        <div>
          <div className="relative mx-auto grid max-w-2xl grid-cols-2 items-start gap-6 sm:gap-14">
            {[
              { fighter: me, side: "a" as const },
              { fighter: foe, side: "b" as const },
            ].map(({ fighter, side }) => {
              const lostLast = lastRound && phase === "fight" && lastRound.winner !== side && lastRound.winner !== "tie";
              const wonMatch = phase === "done" && result.winner === side;
              return (
                <div
                  key={side}
                  className={`origin-bottom ${side === "a" ? "rotate-[-2.5deg]" : "rotate-[2.5deg]"} ${lostLast ? "hit-shake" : ""} ${wonMatch ? "winner-pulse" : ""}`}
                >
                  <p className="mb-2 text-center font-mono text-[10px] uppercase tracking-widest text-white/40">
                    {side === "a" ? "You" : "Opponent"}
                    {fighter.hot && (
                      <span className="ml-1 text-orange-300">🔥 +{HOT_BOOST}</span>
                    )}
                  </p>
                  {fighter.card ? (
                    <>
                      <TradingCard card={fighter.card} rank={ranks[fighter.card.id]} />
                      {entranceQuips[side === "a" ? 0 : 1] && (
                        <p className="mt-2 text-center text-[11px] italic leading-snug text-white/50">
                          “{entranceQuips[side === "a" ? 0 : 1]}”
                        </p>
                      )}
                    </>
                  ) : (
                    <TradingCard
                      card={toMarketCard({
                        name: fighter.side.label.replace(/^@/, ""),
                        title: "",
                        photo: fighter.side.avatar,
                        sliders: fighter.side.stats,
                        rating: fighter.side.rating,
                        rarity: "rare",
                        createdAt: "",
                        scored: true,
                        handle: fighter.side.label.replace(/^@/, ""),
                      })}
                      rank={0}
                      community
                    />
                  )}
                </div>
              );
            })}
            <span className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 text-5xl drop-shadow-[0_0_18px_rgba(251,191,36,0.7)]">
              ⚔️
            </span>
          </div>

          <div className="mx-auto mt-6 max-w-2xl space-y-2">
            {decided.map((round, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-white/40">
                  <span>
                    Round {i + 1} · {round.label}
                  </span>
                  {round.upset && <span className="text-amber-400">upset!</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`tnum w-7 text-right font-mono text-sm ${round.winner === "a" ? "font-bold text-emerald-400" : "text-white/60"}`}>
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
                  <span className={`tnum w-7 font-mono text-sm ${round.winner === "b" ? "font-bold text-emerald-400" : "text-white/60"}`}>
                    {round.b}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {phase === "done" && (
            <div className="mt-6 text-center">
              <p className="text-xl font-bold text-white">
                {result.winner === "tie"
                  ? `Dead heat ${result.aWins}–${result.bWins}`
                  : `${winnerLabel} takes it ${Math.max(result.aWins, result.bWins)}–${Math.min(result.aWins, result.bWins)}`}
                <span className="ml-2 font-mono text-sm text-cyan-300">
                  +{result.winner === "a" ? XP_REWARDS.battleWin : XP_REWARDS.battleLoss} XP
                </span>
              </p>
              {result.winner !== "tie" && (
                <p className="mt-1 text-sm text-white/55">
                  {commentary(result, winnerLabel)}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={fight}
                  className="rounded-lg bg-cyan-400 px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-cyan-300"
                >
                  Rematch
                </button>
                <button
                  onClick={() => {
                    setPhase("setup");
                    setFoe(null);
                  }}
                  className="rounded-lg border border-white/15 px-6 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/5"
                >
                  New opponent
                </button>
                <button
                  onClick={async () => setShareMode(await exportArenaPng(me.side, foe.side, result))}
                  className="rounded-lg border border-white/15 px-6 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/5"
                >
                  Share result
                </button>
                <ShareButton
                  label="Copy result"
                  text={
                    result.winner === "a"
                      ? `My ${me.side.label} card just beat ${foe.side.label} ${result.aWins}-${result.bWins} in the aiticker arena. aiticker.xyz/arena`
                      : `My ${me.side.label} card got cooked ${result.bWins}-${result.aWins} by ${foe.side.label}. Demanding a rematch. aiticker.xyz/arena`
                  }
                  url=""
                  className="text-sm"
                />
                {me.side.cardId && (
                  <ShareButton
                    label="Copy challenge link"
                    url={
                      typeof window !== "undefined"
                        ? `${window.location.origin}/arena?me=${me.side.cardId}&vs=${foe.side.cardId ?? foe.side.label.replace(/^@/, "")}`
                        : "/arena"
                    }
                    className="text-sm"
                  />
                )}
              </div>
              {shareMode === "downloaded" && !canShareFiles() && (
                <p className="mt-2 font-mono text-[11px] text-amber-300/80">
                  In-app browser blocked native share — downloaded instead.{" "}
                  <a href="" target="_blank" className="underline">open in browser ↗</a>
                </p>
              )}
              <div className="mt-3">
                <ViralNudge />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
