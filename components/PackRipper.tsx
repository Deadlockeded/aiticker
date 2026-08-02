"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { MarketCard } from "@/lib/cards";
import { pullPack } from "@/lib/packs";
import {
  addPulls,
  getBinder,
  consumePack,
  getAllowanceSnapshot,
  msUntilReset,
  packsLeftFrom,
  PACKS_PER_DAY,
  subscribeStore,
} from "@/lib/binder";
import { addXP, XP_REWARDS } from "@/lib/xp";
import { getRandomQuip } from "@/lib/daily";
import { checkAchievements } from "@/lib/achievements";
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
    <div className={`relative mx-auto w-52 sm:w-60 ${shaking ? "pack-shake" : ""}`}>
      {/* tear strip */}
      <div
        className={`relative z-10 h-9 rounded-t-2xl border-x border-t border-[#1E2430]/40 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-400 ${
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
        className={`relative aspect-[3/4] overflow-hidden rounded-b-2xl border-x border-b border-[#1E2430]/40 bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 shadow-[0_0_60px_-12px_rgba(139,92,246,0.7)] ${
          tearing ? "pack-vanish" : ""
        }`}
      >
        <div className="holo-wash absolute inset-0 opacity-50" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="mythic-border rounded-full p-[3px]">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-950">
              <span className="font-mono text-2xl font-black text-[#1E2430]">AI</span>
            </div>
          </div>
          <span className="bg-gradient-to-r from-cyan-300 via-white to-fuchsia-300 bg-clip-text text-2xl font-black uppercase tracking-tight text-transparent">
            AI Ticker
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#5A6070]">
            Series 1 · 3 cards
          </span>
        </div>
      </div>
    </div>
  );
}

function CardBack() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-xl border border-[#1E2430]/40 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 [backface-visibility:hidden]">
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
            <span className="font-mono text-lg font-black text-[#1E2430]">AI</span>
          </div>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.4em] text-[#9AA0AC]">
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
  const router = useRouter();
  const autoTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [tearing, setTearing] = useState(false);
  const [pulls, setPulls] = useState<MarketCard[]>([]);
  const [flipQuips, setFlipQuips] = useState<(string | null)[]>([]);
  const [preOwned, setPreOwned] = useState<Set<string>>(new Set());
  const [agiFlash, setAgiFlash] = useState(false);
  const [flipped, setFlipped] = useState<boolean[]>([]);
  const [shimmering, setShimmering] = useState<number | null>(null);
  const [glowKey, setGlowKey] = useState(0);
  const [confetti, setConfetti] = useState<{
    key: number;
    pieces: ConfettiPiece[];
  } | null>(null);
  const [resetIn, setResetIn] = useState("");

  // Allowance is derived from the localStorage store; null server snapshot
  // means "not hydrated yet". consumePack() notifies, so this stays fresh.
  const allowanceRaw = useSyncExternalStore(
    subscribeStore,
    getAllowanceSnapshot,
    () => null,
  );
  const mounted = allowanceRaw !== null;
  const packsLeft = mounted ? packsLeftFrom(allowanceRaw) : PACKS_PER_DAY;

  // countdown to the daily reset while out of packs
  useEffect(() => {
    if (!mounted || packsLeft > 0) return;
    const update = () => {
      const ms = msUntilReset();
      const h = Math.floor(ms / 3_600_000);
      const m = Math.ceil((ms % 3_600_000) / 60_000);
      setResetIn(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    const kickoff = setTimeout(update, 0);
    const timer = setInterval(update, 30_000);
    return () => {
      clearTimeout(kickoff);
      clearInterval(timer);
    };
  }, [mounted, packsLeft]);

  const rip = () => {
    const left = consumePack();
    if (left === null) return;

    const pulled = pullPack(cards);
    setPreOwned(new Set(Object.keys(getBinder())));
    setPulls(pulled);
    setFlipped(pulled.map(() => false));
    setFlipQuips(pulled.map(() => null));
    addPulls(pulled.map((c) => c.id));
    addXP(XP_REWARDS.packPull);
    checkAchievements(cards);

    setPhase("ripping");
    setTearing(false);
    setTimeout(() => setTearing(true), 650);
    setTimeout(() => setPhase("reveal"), 1300);

    // ONE-TAP FLOW: cards flash-reveal in sequence, then straight to the
    // binder. Legendary/mythic moments get extra breathing room — never cut
    // those short.
    autoTimers.current.forEach(clearTimeout);
    autoTimers.current = pulled.map((_, i) =>
      setTimeout(() => flipRef.current(i), 1700 + i * 600),
    );
    const special = pulled.some(
      (c) => c.rarity === "legendary" || c.rarity === "mythic" || c.id === "agi",
    );
    autoTimers.current.push(
      setTimeout(
        () => router.push("/binder"),
        1700 + pulled.length * 600 + 1200 + (special ? 1400 : 0),
      ),
    );
  };

  const skipToBinder = () => {
    autoTimers.current.forEach(clearTimeout);
    router.push("/binder");
  };

  const flipRef = useRef<(i: number) => void>(() => {});
  const flip = (i: number) => {
    if (flipped[i]) return;
    if (navigator.vibrate) navigator.vibrate(10);
    setFlipped((f) => f.map((v, j) => (j === i ? true : v)));
    const quip = getRandomQuip(pulls[i]);
    setFlipQuips((q) => q.map((v, j) => (j === i ? quip : v)));

    if (pulls[i].id === "agi") {
      // the secret mythic: screen goes white, no confetti, silence.
      setAgiFlash(true);
      setTimeout(() => setAgiFlash(false), 900);
      return;
    }
    const rarity = pulls[i].rarity;
    if (rarity !== "common") {
      setGlowKey((k) => k + 1);
      setShimmering(i);
      setTimeout(() => setShimmering((s) => (s === i ? null : s)), 1600);
    }
    if (rarity === "legendary" || rarity === "mythic") {
      if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
      setConfetti((c) => ({ key: (c?.key ?? 0) + 1, pieces: makeConfetti() }));
    }
  };

  useEffect(() => {
    flipRef.current = flip;
  });
  const allFlipped = flipped.length > 0 && flipped.every(Boolean);

  return (
    <div className="relative">
      {glowKey > 0 && (
        <div
          key={glowKey}
          className="glow-flash pointer-events-none fixed inset-0 z-40 bg-[radial-gradient(circle_at_50%_45%,rgba(165,180,252,0.45),rgba(56,189,248,0.15)_45%,transparent_75%)]"
        />
      )}
      {confetti && <Confetti key={confetti.key} pieces={confetti.pieces} />}
      {agiFlash && (
        <div className="pointer-events-none fixed inset-0 z-50 bg-white transition-opacity duration-700" style={{ animation: "glow-flash 0.9s ease-out forwards" }} />
      )}

      <p className="mb-8 text-center font-mono text-xs uppercase tracking-[0.3em] text-[#9AA0AC]">
        {mounted
          ? packsLeft > 0
            ? `${packsLeft} of ${PACKS_PER_DAY} free packs left today`
            : `Out of packs · next pack in ${resetIn}`
          : `${PACKS_PER_DAY} free packs per day`}
      </p>

      {phase !== "reveal" && (
        <div>
          <button
            onClick={rip}
            disabled={!mounted || phase === "ripping" || packsLeft === 0}
            className="block w-full disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Rip the pack"
          >
            <PackGraphic shaking={phase === "ripping" && !tearing} tearing={tearing} />
          </button>
          <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-[0.25em] text-[#9AA0AC]">
            {phase === "ripping"
              ? "ripping…"
              : packsLeft === 0 && mounted
                ? `Next issue of free packs in ${resetIn}. — The Editor`
                : "tap the pack to rip it"}
          </p>
        </div>
      )}

      {phase === "reveal" && (
        <div onClick={skipToBinder} role="button" aria-label="Skip to binder">
          <div className="mx-auto grid max-w-xs grid-cols-1 gap-6 sm:max-w-3xl sm:grid-cols-3">
            {pulls.map((card, i) => (
              <div key={`${card.id}-${i}`} className="flex flex-col">
              <button
                onClick={() => flip(i)}
                className="deal-in relative aspect-[1/1.42] w-full [perspective:1200px]"
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
                      <div className="foil-sweep pointer-events-none absolute inset-0 overflow-hidden rounded-xl" />
                    )}
                  </div>
                </div>
              </button>
              {flipped[i] && card.id === "agi" && (
                <p className="mt-2 text-center font-mono text-[12px] text-[#5A6070]">
                  well.
                </p>
              )}
              {flipped[i] && !preOwned.has(card.id) && (
                <span className="pointer-events-none absolute left-1/2 top-[38%] z-20 -translate-x-1/2 rotate-[-14deg] border-[3px] border-[#1E2430] bg-[#FDFBF6]/85 px-2 py-0.5 font-mono text-[11px] font-black uppercase tracking-[0.25em] text-[#1E2430]">
                  First pull
                </span>
              )}
              {flipped[i] && card.id !== "agi" && flipQuips[i] && (
                <p className="deal-in mt-2 text-center text-[11px] italic leading-snug text-[#5A6070]">
                  “{flipQuips[i]}”
                </p>
              )}
              {flipped[i] && card.type === "artifact" && card.id !== "agi" && preOwned.has(card.id) && (
                <p className="mt-1 text-center font-mono text-[10px] text-[#9AA0AC]">
                  another one.
                </p>
              )}
              </div>
            ))}
          </div>
          <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-[#9AA0AC]">
            {allFlipped ? "off to the binder…" : "tap anywhere to skip →"}
          </p>
        </div>
      )}
    </div>
  );
}
