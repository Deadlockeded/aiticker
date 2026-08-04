"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { MarketCard } from "@/lib/cards";
import { pullPackFor, type Pull } from "@/lib/packs";
import { variantLabel, type Variant } from "@/lib/variants";
import { EXCHANGE_PACK_COST, PACK_BANK_MAX } from "@/lib/economy";
import { formatTicks } from "@/lib/market";
import { balanceFrom, getWalletSnapshot, spendTicks } from "@/lib/wallet";
import {
  addPulls,
  countExchangePack,
  getBinder,
  consumePack,
  getAllowanceSnapshot,
  msUntilNextPack,
  packsLeftFrom,
  subscribeStore,
} from "@/lib/binder";
import { addXP, XP_REWARDS } from "@/lib/xp";
import { getRandomQuip } from "@/lib/daily";
import { checkAchievements } from "@/lib/achievements";
import { readOnboarding, stampOnboarding } from "@/lib/onboarding";
import CardArt from "./CardArt";
import CardBackFace from "./CardBackFace";
import TradingCard from "./TradingCard";
import EditorCaption from "./EditorCaption";
import { FanGlyph } from "./Logo";

// Capture-once: is this a first-run visitor? Stays true for the whole
// session (so the flip caption still fires after rip() stamps the flag).
let firstRun: boolean | null = null;
function firstRunSnapshot(): boolean {
  if (firstRun === null) firstRun = !readOnboarding().pack;
  return firstRun;
}
const subscribeNever = () => () => {};

type Phase = "idle" | "ripping" | "stack" | "fanned";

const CONFETTI_COLORS = [
  "#38bdf8",
  "#a78bfa",
  "#f472b6",
  "#fbbf24",
  "#34d399",
  "#f87171",
];

type ConfettiPiece = React.CSSProperties;

/** Randomized in event handlers only — render stays pure. */
function makeConfetti(): ConfettiPiece[] {
  return Array.from({ length: 70 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    "--confetti-delay": `${Math.random() * 0.5}s`,
    "--confetti-duration": `${2 + Math.random() * 1.6}s`,
    "--confetti-spin": `${360 + Math.random() * 540}deg`,
    transform: `scale(${0.7 + Math.random() * 0.8})`,
  })) as ConfettiPiece[];
}

function Confetti({ pieces }: { pieces: ConfettiPiece[] }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((style, i) => (
        <span key={i} className="confetti-piece" style={style} />
      ))}
    </div>
  );
}

/**
 * THE SEALED PACK, peel-to-open. Drag the foil strip sideways and it follows
 * the finger; past ~55% it commits, flies off, and the rip runs. A plain tap
 * (or Enter/Space — this is still the "Rip the pack" button) auto-peels, so
 * nothing about accessibility or the tests changed. All motion is transform
 * on the strip only — smooth on a phone, no layout work per frame.
 */
function PeelPack({
  disabled,
  tearing,
  gold = false,
  onRip,
}: {
  disabled: boolean;
  tearing: boolean;
  gold?: boolean;
  onRip: () => void;
}) {
  const [drag, setDrag] = useState(0); // 0..1 peel progress
  const [dragging, setDragging] = useState(false);
  const [springing, setSpringing] = useState(false);
  const [flying, setFlying] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const moved = useRef(false);
  const foil = gold ? "foil-gold" : "foil-series1";
  const idle = !disabled && !tearing && !flying;

  const commit = () => {
    if (flying) return;
    setFlying(true);
    if (navigator.vibrate) navigator.vibrate(12);
    setTimeout(onRip, 240); // let the strip clear the mouth first
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!idle) return;
    startX.current = e.clientX;
    moved.current = false;
    setDragging(true);
    setSpringing(false);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    const w = stripRef.current?.offsetWidth ?? 200;
    const p = Math.max(0, Math.min(1, (e.clientX - startX.current) / (w * 0.72)));
    if (p > 0.04) moved.current = true;
    setDrag(p);
  };
  const onPointerUp = () => {
    if (startX.current === null) return;
    startX.current = null;
    setDragging(false);
    if (drag > 0.55) commit();
    else {
      setSpringing(true);
      setDrag(0);
    }
  };

  /** Tap / keyboard fallback: auto-peel. A real drag suppresses the click. */
  const tap = () => {
    if (!idle) return;
    if (moved.current) {
      moved.current = false;
      return;
    }
    setDrag(1);
    commit();
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Rip the pack"
      aria-disabled={disabled}
      onClick={tap}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), tap())}
      className={`pack-w relative mx-auto select-none ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      }`}
    >
      <div className="relative aspect-[3/4.3]">
        {/* the sealed object: foil wrapper + one slow sheen, the app's only
            ambient animation. Gradient is licensed HERE and nowhere else. */}
        <div
          className={`absolute inset-0 overflow-hidden rounded-[18px] shadow-card ${foil} ${
            tearing ? "pack-vanish" : "pack-sheen"
          }`}
        >
          {/* the mouth the strip tears away from — revealed as it peels */}
          <div
            className="pack-mouth zigzag-bottom absolute inset-x-0 top-0 h-11 transition-opacity duration-150"
            style={{ opacity: drag > 0.02 || flying || tearing ? 1 : 0 }}
            aria-hidden
          />
          {/* THE DRAIN: flat pink floods down as the foil leaves */}
          {tearing && (
            <>
              <div className="foil-drain absolute inset-0 bg-inherit" />
              <div className="pink-flood absolute inset-0 bg-pink" />
            </>
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <FanGlyph size={56} />
            <span className="micro font-semibold text-white">
              {gold ? "Collector's" : "Series 1"} · 3 cards inside
            </span>
          </div>
        </div>

        {/* THE STRIP — rides the finger, tears off on commit */}
        {!tearing && (
          <div
            ref={stripRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className={`peel-strip zigzag-bottom absolute inset-x-0 top-0 z-10 h-11 rounded-t-[18px] ${
              flying ? "peel-fly" : ""
            }`}
            style={
              // the strip shows only the TOP SLICE of the pack's gradient —
              // the foil class alone would compress the whole rainbow into
              // 44px and break the single-object illusion
              flying
                ? {
                    backgroundImage: `var(--${gold ? "foil-gold" : "foil-series1"})`,
                    backgroundSize: "100% 1000%",
                    backgroundPosition: "top",
                  }
                : {
                    backgroundImage: `var(--${gold ? "foil-gold" : "foil-series1"})`,
                    backgroundSize: "100% 1000%",
                    backgroundPosition: "top",
                    transform: `translate(${drag * 55}%, ${-drag * 110}%) rotate(${drag * 22}deg)`,
                    transition:
                      dragging
                        ? "none"
                        : springing
                          ? "transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.2)"
                          : "transform 0.15s ease-out",
                  }
            }
          >
            <span
              className="micro pointer-events-none absolute inset-0 flex items-center justify-center gap-1 font-semibold text-white/85"
              style={{ opacity: Math.max(0, 1 - drag * 3.5) }}
            >
              ✂ Peel to open
            </span>
            <div className="pointer-events-none absolute inset-x-3 top-[68%] border-b border-dashed border-white/50" />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The reveal fan's card face: ART, name, rarity — nothing else. At 112px the
 * full TradingCard layout (serials, price, daily move) is unreadable noise;
 * the tap-to-enlarge sheet carries all of that. Do not add rows here.
 */
function PullCard({
  card,
  variant,
  resolving,
  firstPull,
}: {
  card: MarketCard;
  variant: Variant;
  resolving: boolean;
  firstPull: boolean;
}) {
  const rarityChip =
    card.rarity === "legendary" || card.rarity === "mythic"
      ? "bg-amber-tint text-amber"
      : card.rarity === "epic"
        ? "bg-violet-tint text-violet"
        : card.rarity === "rare"
          ? "bg-teal-tint text-teal"
          : "bg-surface2 text-ink2";
  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-[16px] bg-surface shadow-card ${
        resolving ? "art-resolving" : ""
      } ${variant === "gold" ? "outline outline-2 -outline-offset-2 outline-amber" : variant === "holo" ? "outline outline-2 -outline-offset-2 outline-violet" : variant === "silver" ? "outline outline-2 -outline-offset-2 outline-ink3" : ""}`}
    >
      {/* art fills the card */}
      <div className={`absolute inset-0 ${resolving ? "art-locked bg-surface2" : ""}`}>
        {card.type === "artifact" ? (
          <div className={`absolute inset-0 flex items-center justify-center ${card.id === "agi" ? "bg-ink" : "bg-surface2"}`}>
            <svg
              viewBox="0 0 48 48"
              className="h-16 w-16 sm:h-20 sm:w-20"
              dangerouslySetInnerHTML={{ __html: card.icon ?? "" }}
            />
          </div>
        ) : (
          <CardArt card={card} shape="tile" />
        )}
      </div>
      {resolving && (
        <div className="dot-veil" style={{ "--dot": "8px" } as React.CSSProperties} aria-hidden />
      )}
      {variant === "holo" && <div className="holo-wash absolute inset-0 opacity-50" />}
      {variant === "silver" && <div className="silver-sheen absolute inset-0" />}

      {firstPull && (
        <span className="micro pointer-events-none absolute left-1/2 top-2.5 z-10 -translate-x-1/2 rotate-[-8deg] whitespace-nowrap rounded-sm border border-line2 bg-surface/90 px-1.5 py-0.5 font-black text-ink">
          First pull
        </span>
      )}

      {/* one scrim, two facts */}
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-2 pb-2 pt-8 text-left">
        <p className="truncate font-display text-[13px] font-bold leading-tight text-white sm:text-[15px]">
          {card.name}
        </p>
        <div className="mt-1 flex items-center gap-1">
          <span className={`micro rounded-full px-1.5 py-0.5 font-semibold ${rarityChip}`}>
            {card.rarity === "mythic" ? "???" : card.rarity}
          </span>
          {variant !== "base" && (
            <span className="micro rounded-full bg-surface/90 px-1.5 py-0.5 font-semibold text-ink">
              {variantLabel(variant)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Pre-flip back: the shared card back in anonymous mode — nothing spoils the pull. */
function CardBack({ card }: { card: MarketCard }) {
  return (
    <div className="absolute inset-0 [backface-visibility:hidden]">
      <CardBackFace card={card} anonymous />
      <span className="pointer-events-none absolute inset-x-0 bottom-2 text-center micro text-[9px] tracking-[0.4em] text-ink3">
        Tap to reveal
      </span>
    </div>
  );
}

export default function PackRipper({
  cards,
  ranks,
  minimal = false,
  onRevealChange,
}: {
  cards: MarketCard[];
  ranks: Record<string, number>;
  /** Ceremony mode: the page supplies the copy — hide allowance/captions. */
  minimal?: boolean;
  /** Lets the host page hide its own framing copy during stack/fan. */
  onRevealChange?: (inReveal: boolean) => void;
}) {
  const router = useRouter();
  const fxTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [tearing, setTearing] = useState(false);
  const [pulls, setPulls] = useState<Pull[]>([]);
  const [serials, setSerials] = useState<number[]>([]);
  const [flipQuips, setFlipQuips] = useState<(string | null)[]>([]);
  const [preOwned, setPreOwned] = useState<Set<string>>(new Set());
  const [agiFlash, setAgiFlash] = useState(false);
  const [fanned, setFanned] = useState(false);
  const [enlarged, setEnlarged] = useState<number | null>(null);
  const [shimmering, setShimmering] = useState<number | null>(null);
  const [glowKey, setGlowKey] = useState(0);
  const [confetti, setConfetti] = useState<{
    key: number;
    pieces: ConfettiPiece[];
  } | null>(null);
  const [resetIn, setResetIn] = useState("");
  const [confirmExchange, setConfirmExchange] = useState(false);
  const [flipCaption, setFlipCaption] = useState(false);
  const tutorial = useSyncExternalStore(subscribeNever, firstRunSnapshot, () => false);

  // Allowance is derived from the localStorage store; null server snapshot
  // means "not hydrated yet". consumePack() notifies, so this stays fresh.
  const allowanceRaw = useSyncExternalStore(
    subscribeStore,
    getAllowanceSnapshot,
    () => null,
  );
  const walletRaw = useSyncExternalStore(subscribeStore, getWalletSnapshot, () => null);
  const mounted = allowanceRaw !== null;
  const packsLeft = mounted ? packsLeftFrom(allowanceRaw) : PACK_BANK_MAX;
  const balance = walletRaw === null ? 0 : balanceFrom(walletRaw);
  const canExchange = walletRaw !== null && balance >= EXCHANGE_PACK_COST;

  // countdown to the daily reset while out of packs
  useEffect(() => {
    if (!mounted || packsLeft > 0) return;
    const update = () => {
      const totalMin = Math.max(1, Math.ceil(msUntilNextPack() / 60_000));
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      setResetIn(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    const kickoff = setTimeout(update, 0);
    const timer = setInterval(update, 30_000);
    return () => {
      clearTimeout(kickoff);
      clearInterval(timer);
    };
  }, [mounted, packsLeft]);

  const rip = (paid = false) => {
    if (paid) {
      // Ticks are the only price; free packs and their timer are untouched.
      if (!spendTicks(EXCHANGE_PACK_COST)) return;
      countExchangePack();
      setConfirmExchange(false);
    } else {
      const left = consumePack();
      if (left === null) return;
    }
    // synchronously, BEFORE the store notify re-renders the host page:
    // the homepage must lock the pack in place or this component remounts
    // mid-rip (the reveal vanishes into a fresh idle pack)
    onRevealChange?.(true);
    stampOnboarding("pack");

    const pulled = pullPackFor(cards);
    setPreOwned(new Set(Object.keys(getBinder())));
    setPulls(pulled);
    setFanned(false);
    setEnlarged(null);
    setFlipQuips(pulled.map(() => null));
    setSerials(
      addPulls(
        pulled.map((p) => ({ id: p.card.id, variant: p.variant, editionSize: p.card.editionSize })),
      ),
    );
    addXP(XP_REWARDS.packPull);
    checkAchievements(cards);

    // The peel gesture already tore the strip, so the drain starts NOW and
    // the stack lands ~900ms later. NOTHING auto-navigates after this: every
    // exit from the reveal is the user's tap (the old auto-flip/auto-binder
    // timers were the "goes off somewhere" bug — do not reintroduce them).
    setPhase("ripping");
    setTearing(true);
    fxTimers.current.forEach(clearTimeout);
    fxTimers.current = [setTimeout(() => setPhase("stack"), 900)];
  };

  /** Stack tap: one continuous flip+fan, staggered ~150ms per card. */
  const revealAll = () => {
    if (fanned) return;
    setFanned(true);
    setPhase("fanned");
    if (tutorial) setFlipCaption(true);
    if (navigator.vibrate) navigator.vibrate(10);
    setFlipQuips(pulls.map((p) => getRandomQuip(p.card)));
    fxTimers.current.forEach(clearTimeout);
    fxTimers.current = [];
    pulls.forEach(({ card, variant }, i) => {
      const at = 250 + i * 150; // sync effects to each card's flip
      if (card.id === "agi") {
        fxTimers.current.push(
          setTimeout(() => {
            setAgiFlash(true);
            setTimeout(() => setAgiFlash(false), 900);
          }, at),
        );
        return;
      }
      if (card.rarity !== "common") {
        const foilDelay = preOwned.has(card.id) ? at : at + 1000;
        fxTimers.current.push(
          setTimeout(() => {
            setGlowKey((k) => k + 1);
            if (navigator.vibrate) navigator.vibrate(15);
            setShimmering(i);
            setTimeout(() => setShimmering((s) => (s === i ? null : s)), 1600);
          }, foilDelay),
        );
      }
      if (card.rarity === "legendary" || card.rarity === "mythic") {
        fxTimers.current.push(
          setTimeout(() => {
            if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
            setConfetti((c) => ({ key: (c?.key ?? 0) + 1, pieces: makeConfetti() }));
          }, at),
        );
      }
      // PARALLEL moments escalate: silver sheen → gold tear+haptic → holo prism+confetti
      if (variant === "silver") {
        fxTimers.current.push(setTimeout(() => setGlowKey((k) => k + 1), at + 200));
      }
      if (variant === "gold") {
        fxTimers.current.push(
          setTimeout(() => {
            if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
            setGlowKey((k) => k + 1);
          }, at + 200),
        );
      }
      if (variant === "holo") {
        fxTimers.current.push(
          setTimeout(() => {
            if (navigator.vibrate) navigator.vibrate([30, 40, 30, 40, 30]);
            setGlowKey((k) => k + 1);
            setConfetti((c) => ({ key: (c?.key ?? 0) + 1, pieces: makeConfetti() }));
          }, at + 250),
        );
      }
    });
  };

  const ripAnother = () => {
    setPhase("idle");
    setFanned(false);
    setEnlarged(null);
    setTimeout(() => rip(), 60);
  };

  const inReveal = phase === "stack" || phase === "fanned";

  return (
    <div className="relative">
      {glowKey > 0 && (
        <div
          key={glowKey}
          className="glow-flash pointer-events-none fixed inset-0 z-40 bg-[radial-gradient(circle_at_50%_45%,rgba(230,180,80,0.4),rgba(31,110,61,0.12)_45%,transparent_75%)]"
        />
      )}
      {confetti && <Confetti key={confetti.key} pieces={confetti.pieces} />}
      {agiFlash && (
        <div className="pointer-events-none fixed inset-0 z-50 bg-white transition-opacity duration-700" style={{ animation: "glow-flash 0.9s ease-out forwards" }} />
      )}

      {!minimal && !inReveal && (
        <p className="mb-8 text-center micro text-xs tracking-[0.3em] text-ink3">
          {mounted
            ? packsLeft > 0
              ? `${packsLeft} pack${packsLeft === 1 ? "" : "s"} ready`
              : `Next pack in ${resetIn}`
            : "A fresh pack every 8 hours."}
        </p>
      )}

      {!inReveal && (
        <div>
          <PeelPack
            disabled={!mounted || phase === "ripping" || packsLeft === 0}
            tearing={tearing}
            onRip={() => rip()}
          />
          {!minimal && (
            <>
              {phase === "ripping" && (
                <span className="mt-4 flex justify-center">
                  <FanGlyph size={26} />
                </span>
              )}
              <p className="mt-6 text-center micro text-[11px] tracking-[0.25em] text-ink3">
                {phase === "ripping"
                  ? "ripping…"
                  : packsLeft === 0 && mounted
                    ? `Next pack in ${resetIn}.`
                    : "Peel the strip · a fresh one every 8 hours"}
                {packsLeft === 0 && mounted && phase !== "ripping" && (
                  <>
                    <br />
                    <button
                      onClick={() => setConfirmExchange(true)}
                      disabled={!canExchange}
                      className="mt-1 tracking-[0.2em] text-pink underline underline-offset-4 disabled:text-ink3 disabled:no-underline"
                    >
                      {canExchange
                        ? `or trade ${formatTicks(EXCHANGE_PACK_COST)} for one now →`
                        : `exchange pack ${formatTicks(EXCHANGE_PACK_COST)} · you have ${formatTicks(balance)}`}
                    </button>
                  </>
                )}
              </p>
              {tutorial && phase === "idle" && packsLeft > 0 && (
                <EditorCaption className="mt-4" ttl={30000}>
                  Peel the strip.
                </EditorCaption>
              )}
              {/* reserved height: this row resolves from localStorage, and a
                  late-appearing coupon was worth 0.12 CLS on /packs */}
              {!mounted && <div className="mx-auto mt-6 h-[118px] max-w-[300px]" aria-hidden />}
              {mounted && phase !== "ripping" && (
                <div className="rounded-[22px] border border-dashed border-line2 bg-surface mx-auto mt-6 max-w-[300px] p-3 text-center">
                  <p className="micro text-[10px] tracking-[0.3em] text-ink3">
                    Wallet · <span className="tnum text-ink">{formatTicks(balance)}</span>
                  </p>
                  <button
                    onClick={() => setConfirmExchange(true)}
                    disabled={!canExchange}
                    className="mt-2 w-full border border-line2 bg-surface2 px-4 py-2.5 micro text-[11px] font-semibold tracking-[0.2em] text-ink shadow-card hover:bg-surface disabled:border-ink3 disabled:text-ink3 disabled:shadow-none"
                  >
                    Exchange pack — {formatTicks(EXCHANGE_PACK_COST)}
                  </button>
                  <p className="mt-1.5 micro text-[10px] tracking-[0.15em] text-ink3">
                    {canExchange
                      ? "Same cards. Same odds."
                      : "Win fights to earn Ticks."}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* facedown stack — tap to reveal */}
      {/* THE REVEAL: its own near-black layer in BOTH modes, so nothing
          from the page competes with three cards. Holds until a tap. */}
      {inReveal && (
      <div
        className="fixed inset-0 z-40 flex flex-col items-center justify-center overflow-y-auto px-3 py-8"
        style={{ background: "var(--reveal-veil)" }}
      >
      {phase === "stack" && (
        <button
          onClick={revealAll}
          aria-label="Reveal the cards"
          className="deal-in relative mx-auto mb-14 block aspect-[1/1.42] w-[210px]"
        >
          {pulls.map(({ card }, i) => (
            <div
              key={`${card.id}-${i}`}
              className="absolute inset-0"
              style={{
                transform: `rotate(${(i - 1) * 3}deg) translate(${(i - 1) * 5}px, ${i * -3}px)`,
                zIndex: i,
              }}
            >
              <CardBackFace card={card} anonymous />
            </div>
          ))}
          <span className="absolute inset-x-0 -bottom-9 text-center micro text-[10px] tracking-[0.3em] text-ink2">
            Tap to reveal
          </span>
        </button>
      )}

      {/* the fan — flips in one continuous motion, then HOLDS until a tap */}
      {phase === "fanned" && (
        <div>
          {flipCaption && (
            <div className="mb-4">
              <EditorCaption>
                That&apos;s yours now. It lives in your binder.
              </EditorCaption>
            </div>
          )}
          <div className="mx-auto flex max-w-[400px] items-center justify-center">
            {pulls.map(({ card, variant }, i) => (
              <button
                key={`${card.id}-${i}`}
                onClick={() => setEnlarged(i)}
                aria-label={`Enlarge ${card.name}`}
                className="relative w-[118px] shrink-0 sm:w-[150px]"
                style={{
                  transform: `rotate(${(i - 1) * 5}deg) translateY(${i === 1 ? 0 : 8}px)`,
                  zIndex: i === 1 ? 2 : 1,
                }}
              >
                <div className="relative aspect-[1/1.42] w-full [perspective:1200px]">
                  <div
                    className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]"
                    style={{
                      transform: fanned ? "rotateY(180deg)" : "rotateY(0deg)",
                      transitionDelay: `${i * 150}ms`,
                    }}
                  >
                    <CardBack card={card} />
                    <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                      {/* THE PULL BEAT: art-forward face; the drained art
                          resolves to full colour mid-flip. Serials, price and
                          the rest live in the tap-to-enlarge sheet. */}
                      <PullCard
                        card={card}
                        variant={variant}
                        resolving={!preOwned.has(card.id) && fanned}
                        firstPull={!preOwned.has(card.id)}
                      />
                      {shimmering === i && (
                        <div className="foil-sweep pointer-events-none absolute inset-0 overflow-hidden rounded-[16px]" />
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <p className="mt-4 text-center micro text-white/60">
            Tap a card for the full print
          </p>
          <div className="mx-auto mt-6 flex max-w-[320px] flex-col gap-2">
            <button
              onClick={() => router.push("/binder")}
              className="border border-line2 bg-pink px-6 py-3 font-display text-sm uppercase text-on-accent shadow-card hover:bg-pink"
            >
              Add to binder →
            </button>
            {packsLeft > 0 ? (
              <button
                onClick={ripAnother}
                className="border border-line2 px-6 py-2.5 micro text-xs font-semibold text-ink hover:bg-surface2"
              >
                Rip another ({packsLeft} banked)
              </button>
            ) : (
              canExchange && (
                <button
                  onClick={() => setConfirmExchange(true)}
                  className="border border-line2 px-6 py-2.5 micro text-xs font-semibold text-ink hover:bg-surface2"
                >
                  Exchange pack — {formatTicks(EXCHANGE_PACK_COST)}
                </button>
              )
            )}
          </div>
        </div>
      )}

      </div>
      )}

      {/* exchange confirm: one sheet, balance-after, then instant */}
      {confirmExchange && (
        <div className="fixed inset-0 z-50" onClick={() => setConfirmExchange(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 border-t border-line2 bg-surface p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
          >
            <div className="mx-auto max-w-[320px] text-center">
              <p className="font-display text-lg uppercase text-ink">
                Exchange pack
              </p>
              <p className="mt-1 text-[13px] text-ink2">
                Three cards. The same odds as a free pack.
              </p>
              <dl className="mt-4 space-y-1 border border-line2 p-3 text-left micro text-[12px] tracking-[0.1em]">
                <div className="flex justify-between">
                  <dt className="text-ink2">Cost</dt>
                  <dd className="tnum text-pink">−{formatTicks(EXCHANGE_PACK_COST)}</dd>
                </div>
                <div className="flex justify-between border-t border-dashed border-line pt-1">
                  <dt className="text-ink2">Balance after</dt>
                  <dd className="tnum text-ink">
                    {formatTicks(Math.max(0, balance - EXCHANGE_PACK_COST))}
                  </dd>
                </div>
              </dl>
              <button
                onClick={() => rip(true)}
                disabled={!canExchange}
                className="mt-4 w-full border border-line2 bg-pink px-6 py-3 font-display text-sm uppercase text-on-accent shadow-card hover:bg-pink disabled:opacity-50"
              >
                Trade {formatTicks(EXCHANGE_PACK_COST)} → rip it
              </button>
              <button
                onClick={() => setConfirmExchange(false)}
                className="mt-2 w-full px-4 py-2 micro text-[11px] text-ink2 hover:text-ink"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* enlarge sheet: card + quip */}
      {enlarged !== null && pulls[enlarged] && (
        <div className="fixed inset-0 z-50" onClick={() => setEnlarged(null)}>
          {/* a real scrim — the token sweep once turned this cream, which
              painted a dead band above the card instead of dimming the page */}
          <div className="absolute inset-0 bg-black/70" />
          {/* the scroll wrapper spans the screen, so the tap-off guard lives
              on the content column — a wrapper-level guard swallowed every
              backdrop tap and trapped people on this sheet */}
          <div className="absolute inset-0 overflow-y-auto p-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEnlarged(null);
              }}
              aria-label="Close"
              className="fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-lg text-white"
            >
              ✕
            </button>
            {/* mt clears the pinned ✕ so it never sits on the card's chips */}
            <div className="mx-auto mt-12 max-w-[320px]" onClick={(e) => e.stopPropagation()}>
              <TradingCard
                card={pulls[enlarged].card}
                rank={ranks[pulls[enlarged].card.id]}
                size="hero"
                inBinder
                variant={pulls[enlarged].variant}
                serialNo={serials[enlarged]}
              />
              {pulls[enlarged].card.id === "agi" ? (
                <p className="mt-3 text-center font-mono text-[12px] text-ink2">well.</p>
              ) : (
                flipQuips[enlarged] && (
                  <p className="mt-3 text-center text-[13px] italic leading-snug text-ink2">
                    “{flipQuips[enlarged]}”
                  </p>
                )
              )}
              <button
                onClick={() => setEnlarged(null)}
                className="mt-4 w-full border border-line2 px-4 py-2 micro text-xs text-ink hover:bg-surface2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
