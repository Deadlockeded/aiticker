"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { MarketCard } from "@/lib/cards";
import { pullPackFor, type Pull } from "@/lib/packs";
import { editionFor, variantLabel } from "@/lib/variants";
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
import CardBackFace from "./CardBackFace";
import TradingCard from "./TradingCard";
import EditorCaption from "./EditorCaption";
import Logo from "./Logo";

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

function PackGraphic({
  shaking,
  tearing,
}: {
  shaking: boolean;
  tearing: boolean;
}) {
  return (
    <div className={`relative mx-auto w-52 sm:w-60 ${shaking ? "pack-shake" : "pack-idle"}`}>
      {/* tear strip */}
      <div
        className={`relative z-10 h-9 rounded-t-lg border-2 border-b-0 border-[#17301F] bg-[#8E2E24] ${
          tearing ? "pack-tear-top" : ""
        }`}
      >
        {/* dashed perforation */}
        <div className="absolute inset-x-0 bottom-0 border-b-2 border-dashed border-[#F4F7F0]/70" />
        <span className="absolute inset-0 flex items-center justify-center font-mono text-[9px] uppercase tracking-[0.4em] text-[#F4F7F0]/80">
          Tear here
        </span>
      </div>
      {/* body — the brick-red foil pack, ink border, offset shadow */}
      <div
        className={`relative aspect-[3/4] overflow-hidden rounded-b-lg border-2 border-t-0 border-[#17301F] bg-[#B23A2E] shadow-[6px_6px_0_#17301F] ${
          tearing ? "pack-vanish" : ""
        }`}
      >
        <div className="holo-wash absolute inset-0 opacity-30" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="rotate-[-4deg] rounded-[4px] border-[3px] border-[#17301F] bg-[#B23A2E] px-3 py-2 shadow-[3px_3px_0_#17301F]">
            <span className="font-display text-3xl text-[#F4F7F0]">AT</span>
          </div>
          <span className="font-display text-2xl tracking-tight text-[#F4F7F0]">
            AI<span className="lowercase text-[#F0BFB6]">ticker</span>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#F0BFB6]">
            Series 1 · 3 cards inside
          </span>
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
      <span className="pointer-events-none absolute inset-x-0 bottom-2 text-center font-mono text-[9px] uppercase tracking-[0.4em] text-[#9CB09E]">
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

    // tear → facedown stack. NOTHING auto-navigates after this: every exit
    // from the reveal is the user's tap (the old auto-flip/auto-binder
    // timers were the "goes off somewhere" bug — do not reintroduce them).
    setPhase("ripping");
    setTearing(false);
    fxTimers.current.forEach(clearTimeout);
    fxTimers.current = [
      setTimeout(() => setTearing(true), 650),
      setTimeout(() => setPhase("stack"), 1300),
    ];
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
        <p className="mb-8 text-center font-mono text-xs uppercase tracking-[0.3em] text-[#9CB09E]">
          {mounted
            ? packsLeft > 0
              ? `${packsLeft} pack${packsLeft === 1 ? "" : "s"} ready`
              : `Next pack in ${resetIn}`
            : "A fresh pack every 8 hours."}
        </p>
      )}

      {!inReveal && (
        <div>
          <button
            onClick={() => rip()}
            disabled={!mounted || phase === "ripping" || packsLeft === 0}
            className="block w-full disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Rip the pack"
          >
            <PackGraphic shaking={phase === "ripping" && !tearing} tearing={tearing} />
          </button>
          {!minimal && (
            <>
              {phase === "ripping" && (
                <span className="mt-4 flex justify-center">
                  <Logo variant="icon" size={26} animate="loop" />
                </span>
              )}
              <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-[0.25em] text-[#9CB09E]">
                {phase === "ripping"
                  ? "ripping…"
                  : packsLeft === 0 && mounted
                    ? `Next pack in ${resetIn}.`
                    : "Tap the pack · a fresh one every 8 hours"}
                {packsLeft === 0 && mounted && phase !== "ripping" && (
                  <>
                    <br />
                    <button
                      onClick={() => setConfirmExchange(true)}
                      disabled={!canExchange}
                      className="mt-1 tracking-[0.2em] text-[#B23A2E] underline underline-offset-4 disabled:text-[#9CB09E] disabled:no-underline"
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
                  Tap the pack.
                </EditorCaption>
              )}
              {mounted && phase !== "ripping" && (
                <div className="coupon mx-auto mt-6 max-w-[300px] p-3 text-center">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#9CB09E]">
                    Wallet · <span className="tnum text-[#17301F]">{formatTicks(balance)}</span>
                  </p>
                  <button
                    onClick={() => setConfirmExchange(true)}
                    disabled={!canExchange}
                    className="mt-2 w-full border-2 border-[#17301F] bg-[#EAF0E4] px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#17301F] shadow-[3px_3px_0_#17301F] hover:bg-[#F4F7F0] disabled:border-[#9CB09E] disabled:text-[#9CB09E] disabled:shadow-none"
                  >
                    Exchange pack — {formatTicks(EXCHANGE_PACK_COST)}
                  </button>
                  <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-[#9CB09E]">
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
          <span className="absolute inset-x-0 -bottom-9 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-[#5A6E5E]">
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
                className="relative w-[112px] shrink-0 sm:w-[150px]"
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
                      {/* THE PULL BEAT: unowned cards flip as proofs and
                          resolve into the finished print mid-flip */}
                      <TradingCard
                        card={card}
                        rank={ranks[card.id]}
                        resolving={!preOwned.has(card.id) && fanned}
                        variant={variant}
                        serialNo={serials[i]}
                      />
                      {shimmering === i && (
                        <div className="foil-sweep pointer-events-none absolute inset-0 overflow-hidden rounded-xl" />
                      )}
                      {!preOwned.has(card.id) && (
                        <span className="pointer-events-none absolute left-1/2 top-[38%] z-20 -translate-x-1/2 rotate-[-14deg] border-2 border-[#17301F] bg-[#F4F7F0]/85 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-[#17301F]">
                          First pull
                        </span>
                      )}
                      {variant !== "base" && (
                        <span
                          className={`pointer-events-none absolute left-1/2 top-[56%] z-20 -translate-x-1/2 rotate-[4deg] border-2 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.15em] ${
                            variant === "gold"
                              ? "border-[#8C6D1F] bg-[#8C6D1F] text-[#F4F7F0]"
                              : variant === "holo"
                                ? "border-[#17301F] bg-[#17301F] text-[#F0BFB6]"
                                : "border-[#17301F] bg-[#EAF0E4] text-[#17301F]"
                          }`}
                        >
                          {variantLabel(variant)} Nº {serials[i]}/{editionFor(variant, card.editionSize)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mx-auto mt-10 flex max-w-[320px] flex-col gap-2">
            <button
              onClick={() => router.push("/binder")}
              className="border-2 border-[#17301F] bg-[#B23A2E] px-6 py-3 font-display text-sm uppercase text-[#F4F7F0] shadow-[3px_3px_0_#17301F] hover:bg-[#8E2E24]"
            >
              Add to binder →
            </button>
            {packsLeft > 0 ? (
              <button
                onClick={ripAnother}
                className="border-2 border-[#17301F] px-6 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-[#17301F] hover:bg-[#17301F]/5"
              >
                Rip another ({packsLeft} banked)
              </button>
            ) : (
              canExchange && (
                <button
                  onClick={() => setConfirmExchange(true)}
                  className="border-2 border-[#17301F] px-6 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-[#17301F] hover:bg-[#17301F]/5"
                >
                  Exchange pack — {formatTicks(EXCHANGE_PACK_COST)}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* exchange confirm: one sheet, balance-after, then instant */}
      {confirmExchange && (
        <div className="fixed inset-0 z-50" onClick={() => setConfirmExchange(false)}>
          <div className="absolute inset-0 bg-[#17301F]/60" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 border-t-2 border-[#17301F] bg-[#F4F7F0] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
          >
            <div className="mx-auto max-w-[320px] text-center">
              <p className="font-display text-lg uppercase text-[#17301F]">
                Exchange pack
              </p>
              <p className="mt-1 text-[13px] text-[#5A6E5E]">
                Three cards. The same odds as a free pack.
              </p>
              <dl className="mt-4 space-y-1 border-2 border-[#17301F] p-3 text-left font-mono text-[12px] uppercase tracking-[0.1em]">
                <div className="flex justify-between">
                  <dt className="text-[#5A6E5E]">Cost</dt>
                  <dd className="tnum text-[#B23A2E]">−{formatTicks(EXCHANGE_PACK_COST)}</dd>
                </div>
                <div className="flex justify-between border-t border-dashed border-[#17301F]/40 pt-1">
                  <dt className="text-[#5A6E5E]">Balance after</dt>
                  <dd className="tnum text-[#17301F]">
                    {formatTicks(Math.max(0, balance - EXCHANGE_PACK_COST))}
                  </dd>
                </div>
              </dl>
              <button
                onClick={() => rip(true)}
                disabled={!canExchange}
                className="mt-4 w-full border-2 border-[#17301F] bg-[#B23A2E] px-6 py-3 font-display text-sm uppercase text-[#F4F7F0] shadow-[3px_3px_0_#17301F] hover:bg-[#8E2E24] disabled:opacity-50"
              >
                Trade {formatTicks(EXCHANGE_PACK_COST)} → rip it
              </button>
              <button
                onClick={() => setConfirmExchange(false)}
                className="mt-2 w-full px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-[#5A6E5E] hover:text-[#17301F]"
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
          <div className="absolute inset-0 bg-[#17301F]/60" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto border-t-2 border-[#17301F] bg-[#F4F7F0] p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
          >
            <div className="mx-auto max-w-[320px]">
              <TradingCard
                card={pulls[enlarged].card}
                rank={ranks[pulls[enlarged].card.id]}
                size="hero"
                inBinder
                variant={pulls[enlarged].variant}
                serialNo={serials[enlarged]}
              />
              {pulls[enlarged].card.id === "agi" ? (
                <p className="mt-3 text-center font-mono text-[12px] text-[#5A6E5E]">well.</p>
              ) : (
                flipQuips[enlarged] && (
                  <p className="mt-3 text-center text-[13px] italic leading-snug text-[#5A6E5E]">
                    “{flipQuips[enlarged]}”
                  </p>
                )
              )}
              <button
                onClick={() => setEnlarged(null)}
                className="mt-4 w-full border-2 border-[#17301F] px-4 py-2 font-mono text-xs uppercase tracking-widest text-[#17301F] hover:bg-[#17301F]/5"
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
