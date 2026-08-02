"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { MarketCard } from "@/lib/cards";
import { pullPack } from "@/lib/packs";
import {
  addPulls,
  consumePack,
  getPacksLeft,
  msUntilReset,
  PACKS_PER_DAY,
} from "@/lib/binder";
import TradingCard from "./TradingCard";

type Phase = "idle" | "ripping" | "reveal";

const CONFETTI_COLORS = [
  "#38bdf8",
  "#a78bfa",
  "#f472b6",
  "#fbbf24",
  "#34d399",
  "#f87171",
];

/** One CSS-only confetti burst. Randomized post-mount (client event), then done. */
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        left: `${Math.random() * 100}%`,
        background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        "--confetti-delay": `${Math.random() * 0.5}s`,
        "--confetti-duration": `${2 + Math.random() * 1.6}s`,
        "--confetti-spin": `${360 + Math.random() * 540}deg`,
        transform: `scale(${0.7 + Math.random() * 0.8})`,
      })),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((style, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={style as React.CSSProperties}
        />
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
    <div className={`relative mx-auto w-52 sm:w-60 ${shaking ? "pack-shake" : ""}`}>
      {/* tear strip */}
      <div
        className={`relative z-10 h-9 rounded-t-2xl border-x border-t border-white/25 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-400 ${
          tearing ? "pack-tear-top" : ""
        }`}
      >
        <div className="absolute inset-x-0 bottom-0 border-b-2 border-dashed border-black/50" />
        <span className="absolute inset-0 flex items-center justify-center font-mono text-[9px] uppercase tracking-[0.4em] text-black/60">
          Tear here
        </span>
      </div>
      {/* body */}
      <div
        className={`relative aspect-[3/4] overflow-hidden rounded-b-2xl border-x border-b border-white/25 bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 shadow-[0_0_60px_-12px_rgba(139,92,246,0.7)] ${
          tearing ? "pack-vanish" : ""
        }`}
      >
        <div className="holo-wash absolute inset-0 opacity-50" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="mythic-border rounded-full p-[3px]">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-950">
              <span className="font-mono text-2xl font-black text-white">AI</span>
            </div>
          </div>
          <span className="bg-gradient-to-r from-cyan-300 via-white to-fuchsia-300 bg-clip-text text-2xl font-black uppercase tracking-tight text-transparent">
            AI Index
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/50">
            Series 1 · 3 cards
          </span>
        </div>
      </div>
    </div>
  );
}

function CardBack() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl border-2 border-white/20 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 [backface-visibility:hidden]">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0 2px, transparent 2px 14px)",
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <div className="mythic-border rounded-full p-[2px]">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-950">
            <span className="font-mono text-lg font-black text-white">AI</span>
          </div>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.4em] text-white/40">
          Tap to reveal
        </span>
      </div>
    </div>
  );
}

export default function PackRipper({
  cards,
  ranks,
}: {
  cards: MarketCard[];
  ranks: Record<string, number>;
}) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [tearing, setTearing] = useState(false);
  const [packsLeft, setPacksLeft] = useState(PACKS_PER_DAY);
  const [pulls, setPulls] = useState<MarketCard[]>([]);
  const [flipped, setFlipped] = useState<boolean[]>([]);
  const [shimmering, setShimmering] = useState<number | null>(null);
  const [glowKey, setGlowKey] = useState(0);
  const [confettiKey, setConfettiKey] = useState(0);
  const [resetIn, setResetIn] = useState("");

  useEffect(() => {
    setMounted(true);
    setPacksLeft(getPacksLeft());
  }, []);

  // countdown to the daily reset while out of packs
  useEffect(() => {
    if (!mounted || packsLeft > 0) return;
    const update = () => {
      const ms = msUntilReset();
      const h = Math.floor(ms / 3_600_000);
      const m = Math.ceil((ms % 3_600_000) / 60_000);
      setResetIn(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    update();
    const timer = setInterval(update, 30_000);
    return () => clearInterval(timer);
  }, [mounted, packsLeft]);

  const rip = () => {
    const left = consumePack();
    if (left === null) return;
    setPacksLeft(left);

    const pulled = pullPack(cards);
    setPulls(pulled);
    setFlipped(pulled.map(() => false));
    addPulls(pulled.map((c) => c.id));

    setPhase("ripping");
    setTearing(false);
    setTimeout(() => setTearing(true), 650);
    setTimeout(() => setPhase("reveal"), 1300);
  };

  const flip = (i: number) => {
    if (flipped[i]) return;
    setFlipped((f) => f.map((v, j) => (j === i ? true : v)));

    const rarity = pulls[i].rarity;
    if (rarity !== "common") {
      setGlowKey((k) => k + 1);
      setShimmering(i);
      setTimeout(() => setShimmering((s) => (s === i ? null : s)), 1600);
    }
    if (rarity === "legendary" || rarity === "mythic") {
      setConfettiKey((k) => k + 1);
    }
  };

  const allFlipped = flipped.length > 0 && flipped.every(Boolean);

  return (
    <div className="relative">
      {glowKey > 0 && (
        <div
          key={glowKey}
          className="glow-flash pointer-events-none fixed inset-0 z-40 bg-[radial-gradient(circle_at_50%_45%,rgba(165,180,252,0.45),rgba(56,189,248,0.15)_45%,transparent_75%)]"
        />
      )}
      {confettiKey > 0 && <Confetti key={confettiKey} />}

      <p className="mb-8 text-center font-mono text-xs uppercase tracking-[0.3em] text-white/40">
        {mounted
          ? packsLeft > 0
            ? `${packsLeft} of ${PACKS_PER_DAY} free packs left today`
            : `Out of packs · next pack in ${resetIn}`
          : `${PACKS_PER_DAY} free packs per day`}
      </p>

      {phase !== "reveal" && (
        <div>
          <PackGraphic shaking={phase === "ripping" && !tearing} tearing={tearing} />
          <div className="mt-10 text-center">
            <button
              onClick={rip}
              disabled={!mounted || phase === "ripping" || packsLeft === 0}
              className="rounded-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-fuchsia-400 px-10 py-3.5 text-lg font-black uppercase tracking-wide text-slate-950 shadow-[0_0_40px_-8px_rgba(99,102,241,0.9)] transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              {phase === "ripping" ? "Ripping…" : "Rip a Pack"}
            </button>
          </div>
        </div>
      )}

      {phase === "reveal" && (
        <div>
          <div className="mx-auto grid max-w-xs grid-cols-1 gap-6 sm:max-w-3xl sm:grid-cols-3">
            {pulls.map((card, i) => (
              <button
                key={`${card.id}-${i}`}
                onClick={() => flip(i)}
                className="deal-in relative aspect-[5/7] w-full [perspective:1200px]"
                style={{
                  animationDelay: `${i * 0.12}s`,
                  "--deal-tilt": `${(i - 1) * 6}deg`,
                } as React.CSSProperties}
              >
                <div
                  className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]"
                  style={{
                    transform: flipped[i] ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}
                >
                  <CardBack />
                  <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <TradingCard card={card} rank={ranks[card.id]} />
                    {shimmering === i && (
                      <div className="foil-sweep pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-10 text-center">
            {allFlipped ? (
              <div className="space-y-4">
                <p className="font-mono text-sm text-emerald-400">
                  ✓ Saved to your binder
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {packsLeft > 0 && (
                    <button
                      onClick={rip}
                      className="rounded-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-fuchsia-400 px-8 py-3 font-black uppercase tracking-wide text-slate-950 transition-transform hover:scale-105"
                    >
                      Rip another
                    </button>
                  )}
                  <Link
                    href="/binder"
                    className="rounded-full border border-white/20 px-8 py-3 font-semibold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10"
                  >
                    View binder
                  </Link>
                </div>
              </div>
            ) : (
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/40">
                Tap each card to reveal
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
