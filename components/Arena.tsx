"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { MarketCard } from "@/lib/cards";
import { SHARE } from "@/lib/tokens";
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
import { computePurse, type Purse } from "@/lib/economy";
import { formatTicks } from "@/lib/market";
import { grantTicks } from "@/lib/wallet";
import { checkAchievements, unlockArtifactWin } from "@/lib/achievements";
import { getSavedHandleSnapshot } from "@/lib/custody";
import { computeCommunityRating, toMarketCard } from "@/lib/create";
import { readOnboarding, stampOnboarding } from "@/lib/onboarding";
import { getScoredProfile, ScoreError } from "@/lib/score";
import { dayHash, getHotCards, getRandomQuip, HOT_BOOST } from "@/lib/daily";
import { dealChallengers, dailySpotlight, dealerSeed } from "@/lib/dealer";
import { fireToast } from "@/lib/toast";
import {
  cardVsStats,
  commentary,
  decisiveCategory,
  resolveArena,
  type VsResult,
  type VsSide,
} from "@/lib/vsMapping";
import { cardMetaValues, getDailyMeta, profileMetaValues, type MetaKey } from "@/lib/meta";
import CardArt from "./CardArt";
import { Button } from "./ui";
import { usePrefillHandle } from "./useSavedHandle";
import DeckStack from "./DeckStack";
import EditorCaption from "./EditorCaption";
import TradingCard from "./TradingCard";
import ShareButton from "./ShareButton";
import { brandFonts, canShareFiles, canvasBlob, drawLogoMark, sharePng, type ShareOutcome } from "@/lib/share";
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
  const fonts = await brandFonts();
  // Price Guide tokens: cream stock, ink, accent red, win green
  const INK = SHARE.ink;
  const CREAM = SHARE.surface;
  const PAPER = SHARE.surface;
  const RED = SHARE.pink;
  const GREEN = SHARE.up;
  const SECONDARY = SHARE.ink2;
  ctx.fillStyle = CREAM;
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
    // paper card with the 5px offset ink shadow
    ctx.fillStyle = INK;
    ctx.fillRect(x + 6, 106, 420, 500);
    ctx.fillStyle = PAPER;
    ctx.strokeStyle = won ? GREEN : INK;
    ctx.lineWidth = won ? 6 : 3;
    ctx.fillRect(x, 100, 420, 500);
    ctx.strokeRect(x, 100, 420, 500);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + 210, 270, 115, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = side.company ? "#ffffff" : CREAM;
    ctx.fillRect(x + 95, 155, 230, 230);
    if (img) {
      if (side.company) ctx.drawImage(img, x + 145, 205, 130, 130);
      else ctx.drawImage(img, x + 95, 155, 230, 230);
    } else {
      ctx.fillStyle = SECONDARY;
      ctx.font = `700 76px ${fonts.mono}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(side.label.replace("@", "").slice(0, 2).toUpperCase(), x + 210, 270);
    }
    ctx.restore();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + 210, 270, 115, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    // fit-to-width: long names (CLÉMENT DELANGUE) shrink instead of
    // escaping the 420px panel
    const label = side.label.toUpperCase();
    let nameSize = 44;
    ctx.font = `400 ${nameSize}px ${fonts.display}`;
    while (nameSize > 22 && ctx.measureText(label).width > 372) {
      nameSize -= 2;
      ctx.font = `400 ${nameSize}px ${fonts.display}`;
    }
    ctx.fillText(label, x + 210, 465);
    ctx.fillStyle = won ? GREEN : SECONDARY;
    ctx.font = `600 50px ${fonts.mono}`;
    ctx.fillText(String(side.rating), x + 210, 540);
    ctx.textAlign = "left";
  };
  panel(80, a, imgA, result.winner === "a");
  panel(W - 80 - 420, b, imgB, result.winner === "b");

  ctx.textAlign = "center";
  ctx.font = "110px serif";
  ctx.fillText("⚔️", W / 2, 300);
  ctx.fillStyle = INK;
  ctx.font = `400 76px ${fonts.display}`;
  ctx.fillText(`${result.aWins}–${result.bWins}`, W / 2, 410);

  let y = 690;
  ctx.font = `600 24px ${fonts.mono}`;
  for (const round of result.rounds) {
    ctx.fillStyle = SECONDARY;
    ctx.textAlign = "center";
    ctx.fillText(round.label.toUpperCase(), W / 2, y - 12);
    const mid = W / 2;
    const span = 540;
    ctx.fillStyle = "rgba(23, 48, 31,0.12)";
    ctx.beginPath();
    ctx.roundRect(mid - span, y, span * 2, 16, 8);
    ctx.fill();
    ctx.fillStyle = round.winner === "a" ? GREEN : "rgba(23, 48, 31,0.35)";
    ctx.beginPath();
    ctx.roundRect(mid - (span * round.a) / 100, y, (span * round.a) / 100, 16, 8);
    ctx.fill();
    ctx.fillStyle = round.winner === "b" ? GREEN : "rgba(23, 48, 31,0.35)";
    ctx.beginPath();
    ctx.roundRect(mid, y, (span * round.b) / 100, 16, 8);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.textAlign = "right";
    ctx.fillText(String(round.a), mid - span - 14, y + 14);
    ctx.textAlign = "left";
    ctx.fillText(String(round.b), mid + span + 14, y + 14);
    y += 54;
  }

  drawLogoMark(ctx, 80, H - 74, 44, fonts.display);
  ctx.textAlign = "right";
  ctx.fillStyle = SECONDARY;
  ctx.font = `600 24px ${fonts.mono}`;
  ctx.fillText("aiticker.xyz/arena", W - 80, H - 40);

  const blob = await canvasBlob(canvas);
  if (!blob) return "cancelled" as const;
  return sharePng(blob, { filename: "aiticker-arena.png", text: `Arena result ${result.aWins}–${result.bWins}. Run yours.`, url: "https://aiticker.vercel.app/arena" });
}

/** Counts a Tick total up on mount. Pure transform+text, no layout shift. */
function TickCountUp({ to, ms = 900 }: { to: number; ms?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (to <= 0) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      // ease-out so the last digits settle
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return <span className="tnum">{formatTicks(n)}</span>;
}

/** Line-itemed purse for the result screen. Losses still pay — never a debit. */
function PurseBreakdown({ purse, paid }: { purse: Purse; paid: number }) {
  const rows: [string, number][] = [
    ["Base", purse.base],
    ["Upset", purse.upset],
    ["Streak", purse.streak],
    ["First win today", purse.daily],
  ];
  return (
    <div
      data-testid="purse"
      className="deal-in mx-auto mt-4 max-w-[280px] border border-line2 bg-surface p-3 text-left shadow-card"
    >
      <p className="text-center micro text-[10px] tracking-[0.3em] text-ink3">
        Purse
      </p>
      <dl className="mt-2 space-y-0.5 micro text-[11px] tracking-[0.1em]">
        {rows
          .filter(([, v]) => v > 0)
          .map(([label, v]) => (
            <div key={label} className="flex justify-between">
              <dt className="text-ink2">{label}</dt>
              <dd className="tnum text-ink">+{formatTicks(v)}</dd>
            </div>
          ))}
        <div className="mt-1 flex justify-between border-t border-dashed border-line pt-1">
          <dt className="font-semibold text-ink">Paid</dt>
          <dd className="text-up">
            +<TickCountUp to={paid} />
          </dd>
        </div>
      </dl>
      {paid < purse.total && (
        <p className="mt-1.5 text-center micro text-[9px] tracking-[0.15em] text-ink3">
          Daily earn cap reached — the rest keeps till tomorrow.
        </p>
      )}
    </div>
  );
}

export default function Arena({
  cards,
  ranks,
  initialMe,
  initialVs,
  autoStart = false,
}: {
  cards: MarketCard[];
  ranks: Record<string, number>;
  initialMe?: string;
  initialVs?: string;
  /** MAIN EVENT links: run the fight on arrival instead of waiting on taps. */
  autoStart?: boolean;
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
  const ownedIds = useMemo(() => new Set((owned ?? []).map((c) => c.id)), [owned]);

  const [me, setMe] = useState<Fighter | null>(null);
  const [foe, setFoe] = useState<Fighter | null>(null);
  const [foeLoading, setFoeLoading] = useState<string | null>(null);
  const [foeError, setFoeError] = useState<string | null>(null);
  const [chaos, setChaos] = useState(false);
  const [handleInput, setHandleInput] = useState("");
  const [handleOpen, setHandleOpen] = useState(false);
  // GitHub-linked collectors get their own handle staged as the opponent
  usePrefillHandle((saved) => setHandleInput((h) => h || saved));
  const linkedHandle =
    useSyncExternalStore(subscribeStore, getSavedHandleSnapshot, () => null) ?? "";
  const [passes, setPasses] = useState(0);
  // The dealer's session nonce. 0 = the deterministic opening deck (same for
  // everyone on a given day, hydration-safe); NEW OPPONENT and deck exhaustion
  // roll a fresh nonce in an event handler, so render stays pure.
  const [nonce, setNonce] = useState(0);
  // Cards already served this session — the dealer holds them back until the
  // pool is dry, then the deck refreshes.
  const [served, setServed] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<Phase>("setup");
  const [result, setResult] = useState<VsResult | null>(null);
  const [entranceQuips, setEntranceQuips] = useState<(string | null)[]>([null, null]);
  const [shareMode, setShareMode] = useState<ShareOutcome | null>(null);
  const [shownRounds, setShownRounds] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const autoRan = useRef(false);
  const [arenaTips, setArenaTips] = useState(false);
  const [pendingAuto, setPendingAuto] = useState(autoStart);
  const [purse, setPurse] = useState<{ purse: Purse; paid: number } | null>(null);

  // First arena visit with cards in hand: exactly 2 captions, then never again.
  useEffect(() => {
    if (!owned || owned.length === 0 || readOnboarding().arena) return;
    const kickoff = setTimeout(() => {
      stampOnboarding("arena");
      setArenaTips(true);
    }, 0);
    return () => clearTimeout(kickoff);
  }, [owned]);

  const getDeterministicQuip = (c: MarketCard): string =>
    c.quips?.[dayHash(`line-quip:${c.id}`) % (c.quips?.length || 1)] ?? c.flavorText;

  const binderSize = owned?.length ?? 0;
  const challengers = useMemo(() => {
    if (!me) return [];
    return dealChallengers({
      pool: cards,
      myRating: me.side.rating,
      served,
      binderSize,
      seed: dealerSeed(nonce),
      excludeId: me.side.cardId,
      spotlightFirst: nonce === 0,
    });
  }, [cards, me, served, binderSize, nonce]);

  // must exclude the fighter exactly as the dealer does, or the chip points at
  // a card that was never dealt (the day OpenAI is the spotlight AND your pick)
  const spotlightId = useMemo(
    () =>
      me
        ? (dailySpotlight(cards.filter((c) => c.id !== me.side.cardId))?.id ?? null)
        : null,
    [cards, me],
  );

  /** A pass sends the card to the back of the deck, never out of it. */
  const onPass = (card: MarketCard) => {
    setPasses((p) => p + 1);
    setServed((prev) => {
      const next = new Set(prev).add(card.id);
      // pool exhausted → fresh deck, and say so
      if (next.size >= challengers.length + prev.size - 1) {
        setNonce(Math.floor(Math.random() * 2 ** 31) || 1);
        fireToast("🃏", "Fresh deck.", "Everyone's back in the line.");
        return new Set();
      }
      return next;
    });
  };

  const hotIds = useMemo(
    () => new Set(getHotCards(cards).map((c) => c.id)),
    [cards],
  );

  const cardFighter = (card: MarketCard): Fighter => {
    const hot = hotIds.has(card.id);
    const base = cardVsStats(card);
    const boost = (v: number) => Math.min(99, v + (hot ? HOT_BOOST : 0));
    // Hot Streak's +3 rides on whatever categories are active today.
    const meta = Object.fromEntries(
      Object.entries(cardMetaValues(card)).map(([k, v]) => [k, boost(v)]),
    ) as Record<MetaKey, number>;
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
        meta,
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
      const rating = computeCommunityRating(profile.handle, profile.stats);
      setFoe({
        hot: false,
        side: {
          kind: "profile",
          label: `@${profile.handle}`,
          avatar: profile.avatarUrl,
          company: false,
          rating,
          stats: profile.stats,
          meta: profileMetaValues(profile.handle, profile.stats, rating),
        },
      });
    } catch (err) {
      setFoeError(err instanceof ScoreError ? err.message : "Fetch failed.");
    } finally {
      setFoeLoading(null);
    }
  };

  /**
   * Card vs GitHub, one tap: score the handle and open the bout in the same
   * gesture. The scored fighter goes through fight()'s override path, so no
   * interstitial "opponent locked" step ever renders.
   */
  const fightHandle = async (ref: string) => {
    if (!me) return;
    setFoeError(null);
    setChaos(false);
    setFoeLoading(ref);
    try {
      const { profile } = await getScoredProfile(ref.replace(/^@/, ""));
      const rating = computeCommunityRating(profile.handle, profile.stats);
      fight({
        hot: false,
        side: {
          kind: "profile",
          label: `@${profile.handle}`,
          avatar: profile.avatarUrl,
          company: false,
          rating,
          stats: profile.stats,
          meta: profileMetaValues(profile.handle, profile.stats, rating),
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

  const fight = (foeOverride?: Fighter, meOverride?: Fighter) => {
    const activeMe = meOverride ?? me;
    const activeFoe = foeOverride ?? foe;
    if (!activeMe || !activeFoe) return;
    if (meOverride) setMe(meOverride);
    if (foeOverride) setFoe(foeOverride);
    const res = resolveArena(activeMe.side, activeFoe.side, chaos, getDailyMeta());
    setEntranceQuips([
      activeMe.card ? getRandomQuip(activeMe.card) : null,
      activeFoe.card ? getRandomQuip(activeFoe.card) : null,
    ]);
    setResult(res);
    setPurse(null);
    setShownRounds(0);
    setPhase("fight");
    timers.current.forEach(clearTimeout);
    timers.current = res.rounds.map((_, i) =>
      setTimeout(() => setShownRounds(i + 1), 600 + i * 1200),
    );
    timers.current.push(
      setTimeout(() => {
        const won = res.winner === "a";
        const rec = recordBattle(won, won && activeFoe.side.rating >= activeMe.side.rating + 10);
        // Purses only ever ADD Ticks — nothing is ever staked or lost here.
        const p = computePurse({
          won,
          myRating: activeMe.side.rating,
          foeRating: activeFoe.side.rating,
          streakAfter: rec.current,
          firstWinToday: rec.firstWinToday,
        });
        // silent: the result screen counts the total up itself
        const paid = grantTicks(p.total, { reason: "arena purse", silent: true });
        setPurse({ purse: p, paid });
        addXP(won ? XP_REWARDS.battleWin : XP_REWARDS.battleLoss);
        if (won && activeMe.card?.type === "artifact") {
          unlockArtifactWin(activeMe.card);
        }
        checkAchievements(cards);
        setPhase("done");
      }, 600 + res.rounds.length * 1200 + 400),
    );
  };

  // MAIN EVENT (?auto=1): both corners arrive by URL — run the bout the
  // moment they're loaded, so "watch the fight" actually shows a fight
  useEffect(() => {
    if (!pendingAuto || !me || !foe || phase !== "setup") return;
    // flip the flag INSIDE the timer: flipping it here re-renders, and the
    // cleanup below would clear this very timeout before it ever fired
    const kickoff = setTimeout(() => {
      setPendingAuto(false);
      fight();
    }, 400);
    return () => clearTimeout(kickoff);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAuto, me, foe, phase]);


  if (owned === null || record === null) {
    return (
      <p className="py-24 text-center micro text-xs tracking-[0.3em] text-ink3">
        Opening the arena…
      </p>
    );
  }

  if (owned.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 py-24 text-center">
        <p className="text-5xl">⚔️</p>
        <p className="text-ink2">No cards yet. Rip a pack first.</p>
        <Link
          href="/packs"
          className="rounded-lg bg-pink px-6 py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-pink"
        >
          Rip a pack
        </Link>
      </div>
    );
  }

  const decided = result ? result.rounds.slice(0, shownRounds) : [];
  const lastRound = decided[decided.length - 1];
  // null-safe on purpose: NEW OPPONENT clears `foe` while `result` may still
  // be set for a frame. Reading foe!.side here used to throw and blank the
  // whole arena after any fight you lost.
  const winnerLabel = !result
    ? ""
    : result.winner === "a"
      ? (me?.side.label ?? "You")
      : result.winner === "b"
        ? (foe?.side.label ?? "The index")
        : "Nobody";

  return (
    <div>
      <p className="mb-3 text-center font-mono text-[11px] text-ink3">
        Streak <span className="tnum text-ink">{record.current}</span> · Best{" "}
        <span className="tnum text-ink">{record.best}</span> ·{" "}
        <span className="tnum">{record.wins}W–{record.losses}L</span>
      </p>

      {phase === "setup" && (
        <>
          {arenaTips && !me && (
            <EditorCaption className="mb-4" ttl={10000}>
              Pick your fighter from your binder.
            </EditorCaption>
          )}
          {/* a challenge arrived by link (?vs=) — name the stakes, then the
              fighter pick below starts the bout instantly */}
          {foe && !me && (
            <div className="mb-3 rounded-[22px] bg-pink-tint p-3 text-center">
              <p className="micro font-semibold text-pink">Challenge</p>
              <p className="mt-0.5 text-[14px] text-ink">
                vs {foe.side.label} ({foe.side.rating}) — pick your fighter to start
              </p>
            </div>
          )}
          {/* fighter rail: one compact swipeable row so the challenger deck
              stays above the fold on a phone (this used to be a 224px-tall
              vertical list that pushed everything off-screen) */}
          <div className="rounded-xl border border-line bg-surface p-2">
            <p className="mb-1.5 micro text-[10px] text-ink3">
              Your fighter · from your binder
            </p>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {owned.map((card) => (
                <button
                  key={card.id}
                  onClick={() => {
                    const picked = cardFighter(card);
                    // during setup a non-null foe can only be a pending
                    // ?vs= challenge — picking the fighter starts the bout
                    if (foe) fight(undefined, picked);
                    else setMe(picked);
                  }}
                  className={`flex w-[112px] shrink-0 flex-col items-center gap-1 rounded-lg border p-1.5 text-center transition-colors ${
                    me?.side.cardId === card.id
                      ? "border-pink bg-pink/10"
                      : "border-line bg-ink/[0.03] hover:bg-surface2"
                  }`}
                >
                  <span className="h-8 w-8 shrink-0">
                    <CardArt card={card} />
                  </span>
                  <span className="w-full truncate text-[12px] font-medium leading-tight text-ink">
                    {card.name}
                  </span>
                  <span className="tnum font-mono text-[10px] text-ink3">
                    {card.rating} ovr
                    {hotIds.has(card.id) && <span className="ml-1 text-orange-400">🔥</span>}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* both corners set by link (copy-challenge) — one tap to the bell */}
          {me && foe && (
            <div className="mx-auto mt-5 max-w-[320px] rounded-[22px] bg-surface p-4 text-center shadow-card">
              <p className="text-[14px] text-ink">
                {me.side.label} <span className="text-ink3">vs</span> {foe.side.label}
              </p>
              <Button onClick={() => fight()} className="mt-3 w-full">
                Fight →
              </Button>
            </div>
          )}

          {me && !foe && challengers.length > 0 && (
            <div className="mx-auto mt-6 max-w-[220px]">
              <p className="mb-3 border-b border-line2 pb-1 text-center micro text-[11px] font-semibold tracking-[0.3em] text-pink">
                The Challenger Line
              </p>
              {arenaTips && (
                <EditorCaption className="mb-3" ttl={10000}>
                  Swipe past cowards. Tap FIGHT on victims.
                </EditorCaption>
              )}
              <DeckStack
                items={challengers}
                keyOf={(c) => c.id}
                leftStamp="Passed"
                onPass={onPass}
                onSwipeRight={(c) => fight(cardFighter(c))}
                onTap={(c) => fight(cardFighter(c))}
                renderCard={(c) => (
                  <div className="relative">
                    {c.id === spotlightId && (
                      <span className="micro absolute -top-2 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-pink px-2.5 py-1 font-semibold text-on-accent shadow-card">
                        Today&apos;s challenger
                      </span>
                    )}
                    <TradingCard card={c} rank={0} proof={!ownedIds.has(c.id)} />
                  </div>
                )}
                footerFor={(c) => (
                  <div className="text-center">
                    <p className="text-[13px] italic text-ink2">
                      “{getDeterministicQuip(c)}”
                    </p>
                    <button
                      onClick={() => fight(cardFighter(c))}
                      className="mt-2 bg-pink px-6 py-2 micro text-xs font-semibold text-on-accent hover:bg-pink"
                    >
                      Fight →
                    </button>
                    {passes >= 10 && (
                      <p className="mt-2 micro text-[10px] text-ink3">
                        The index is starting to take this personally.
                      </p>
                    )}
                  </div>
                )}
              />
              <p className="mt-2 text-center font-mono text-[10px] text-ink3">
                swipe left to pass · right (or tap) to fight
              </p>
            </div>
          )}

          {/* THE CROSSOVER — card vs any GitHub account. A first-class
              button, not a fold: this is the fight we want people picking.
              Submitting goes STRAIGHT to the bout — scoring happens inside
              the loading beat, never as a separate step. */}
          {!handleOpen ? (
            <div className="mt-4">
              <Button tone="teal" className="w-full" onClick={() => setHandleOpen(true)}>
                Fight a GitHub handle →
              </Button>
              <p className="mt-1.5 text-center micro text-[10px] text-ink3">
                Any public account. Yours counts.
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-[22px] border border-line2 bg-surface p-3">
              <p className="micro font-semibold text-teal">Card vs GitHub</p>
              <div className="mt-2 flex gap-2">
                <input
                  autoFocus
                  value={handleInput}
                  onChange={(e) => setHandleInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleInput.trim() && fightHandle(handleInput.trim())}
                  placeholder="github handle"
                  className="min-w-0 flex-1 rounded-full bg-surface2 px-4 py-2.5 text-[16px] text-ink placeholder-ink3 outline-none ring-inset focus:ring-2 focus:ring-teal"
                />
                <button
                  onClick={() => handleInput.trim() && fightHandle(handleInput.trim())}
                  disabled={!me || foeLoading !== null}
                  className="rounded-full bg-pink px-5 py-2.5 text-[16px] font-semibold text-on-accent transition-transform active:scale-[.97] disabled:pointer-events-none disabled:opacity-40"
                >
                  {foeLoading ? "…" : "Fight →"}
                </button>
              </div>
              {!me && (
                <p className="mt-2 micro text-[10px] text-ink3">
                  Pick your fighter above first.
                </p>
              )}
              {foeLoading && (
                <p className="mt-2 font-mono text-[11px] text-ink3">
                  Weighing in @{foeLoading}…
                </p>
              )}
              {foeError && <p className="mt-2 text-xs text-pink">{foeError}</p>}
            </div>
          )}

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
                  <p className="mb-2 text-center micro text-[10px] text-ink3">
                    {side === "a" ? "You" : "Opponent"}
                    {fighter.hot && (
                      <span className="ml-1 text-orange-300">🔥 +{HOT_BOOST}</span>
                    )}
                  </p>
                  {fighter.card ? (
                    <>
                      <TradingCard
                        card={fighter.card}
                        rank={ranks[fighter.card.id]}
                        proof={!ownedIds.has(fighter.card.id)}
                      />
                      {entranceQuips[side === "a" ? 0 : 1] && (
                        <p className="mt-2 text-center text-[11px] italic leading-snug text-ink2">
                          “{entranceQuips[side === "a" ? 0 : 1]}”
                        </p>
                      )}
                    </>
                  ) : (
                    <>
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
                      {/* the GitHub-linked collector's own handle fights
                          under a confirmed identity */}
                      {linkedHandle &&
                        fighter.side.label.replace(/^@/, "").toLowerCase() ===
                          linkedHandle.toLowerCase() && (
                          <p className="mt-1.5 text-center">
                            <span className="micro inline-flex items-center gap-1 rounded-full bg-teal-tint px-2 py-0.5 text-[9px] font-semibold text-teal">
                              ✓ Identity confirmed by commit history
                            </span>
                          </p>
                        )}
                    </>
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
              <div key={i} className="rounded-xl border border-line bg-surface p-3">
                <div className="mb-1.5 flex items-center justify-between micro text-[10px] text-ink3">
                  <span>
                    Round {i + 1}: {round.label}
                    {round.definition && i === decided.length - 1 && phase === "fight" && (
                      <span className="deal-in ml-1.5 normal-case italic tracking-normal text-ink2">
                        — {round.definition.toLowerCase().replace(/\.$/, "")}
                      </span>
                    )}
                  </span>
                  {round.upset && <span className="text-amber-400">upset!</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`tnum w-7 text-right font-mono text-sm ${round.winner === "a" ? "font-bold text-up" : "text-ink2"}`}>
                    {round.a}
                  </span>
                  <div className="flex h-1.5 flex-1 gap-1">
                    <div className="flex flex-1 justify-end overflow-hidden rounded-full bg-surface2">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${round.winner === "a" ? "bg-up" : "bg-white/40"}`}
                        style={{ width: `${round.a}%` }}
                      />
                    </div>
                    <div className="flex flex-1 overflow-hidden rounded-full bg-surface2">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${round.winner === "b" ? "bg-up" : "bg-white/40"}`}
                        style={{ width: `${round.b}%` }}
                      />
                    </div>
                  </div>
                  <span className={`tnum w-7 font-mono text-sm ${round.winner === "b" ? "font-bold text-up" : "text-ink2"}`}>
                    {round.b}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {phase === "done" && (
            <div className="mt-6 text-center">
              <p className="text-xl font-bold text-ink">
                {result.winner === "tie"
                  ? `Dead heat ${result.aWins}–${result.bWins}`
                  : `${winnerLabel} takes it ${Math.max(result.aWins, result.bWins)}–${Math.min(result.aWins, result.bWins)}`}
                <span className="ml-2 font-mono text-sm text-pink">
                  +{result.winner === "a" ? XP_REWARDS.battleWin : XP_REWARDS.battleLoss} XP
                </span>
              </p>
              {result.winner !== "tie" && (
                <p className="mt-1 text-sm text-ink2">
                  {commentary(result, winnerLabel)}
                </p>
              )}
              {purse && <PurseBreakdown purse={purse.purse} paid={purse.paid} />}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => fight()}
                  className="rounded-lg bg-pink px-6 py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-pink"
                >
                  Rematch
                </button>
                <button
                  onClick={() => {
                    setPhase("setup");
                    setFoe(null);
                    setResult(null);
                    setPurse(null);
                    // random lives in the handler, never in render
                    setNonce(Math.floor(Math.random() * 2 ** 31) || 1);
                    setPasses(0);
                  }}
                  className="rounded-lg border border-line px-6 py-2.5 text-sm font-semibold text-ink2 transition-colors hover:bg-surface2"
                >
                  New opponent
                </button>
                <button
                  onClick={async () => setShareMode(await exportArenaPng(me.side, foe.side, result))}
                  className="rounded-lg border border-line px-6 py-2.5 text-sm font-semibold text-ink2 transition-colors hover:bg-surface2"
                >
                  Share result
                </button>
                <ShareButton
                  label="Copy result"
                  text={(() => {
                    const cat = decisiveCategory(result)?.toUpperCase();
                    const took = purse?.paid
                      ? ` Took ${formatTicks(purse.paid)} off ${foe.side.label}.`
                      : "";
                    return result.winner === "a"
                      ? `My ${me.side.label} card just beat ${foe.side.label} ${result.aWins}-${result.bWins} in the aiticker arena.${cat ? ` Sealed it on ${cat}.` : ""}${took} aiticker.xyz/arena`
                      : `${foe.side.label} took my ${me.side.label} card ${result.bWins}-${result.aWins}.${cat ? ` Lost on ${cat}, which honestly tracks.` : ""}${purse?.paid ? ` Still walked with ${formatTicks(purse.paid)}.` : ""} aiticker.xyz/arena`;
                  })()}
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
