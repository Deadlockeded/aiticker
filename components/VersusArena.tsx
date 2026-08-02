"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { MarketCard } from "@/lib/cards";
import { subscribeStore } from "@/lib/binder";
import {
  computeCommunityRating,
  getSavedCommunityCardSnapshot,
  parseCommunityCard,
  toMarketCard,
} from "@/lib/create";
import { getScoredProfile, ScoreError } from "@/lib/score";
import {
  cardVsStats,
  commentary,
  resolveVs,
  type VsResult,
  type VsSide,
} from "@/lib/vsMapping";
import CardArt from "./CardArt";
import TradingCard from "./TradingCard";
import ShareButton from "./ShareButton";

type SlotState =
  | { status: "empty" }
  | { status: "loading"; ref: string }
  | { status: "error"; ref: string; message: string }
  | { status: "ready"; side: VsSide; cached?: boolean };

/** Turn a profile/card reference ("handle", "card:id", "me") into a side. */
async function resolveRef(
  ref: string,
  cards: MarketCard[],
): Promise<{ side: VsSide; cached?: boolean }> {
  if (ref.startsWith("card:")) {
    const card = cards.find((c) => c.id === ref.slice(5));
    if (!card) throw new ScoreError("not-found", "Unknown card id.");
    return {
      side: {
        kind: "card",
        label: card.name,
        avatar: card.image,
        company: card.type === "company",
        rating: card.rating,
        stats: cardVsStats(card),
        cardId: card.id,
      },
    };
  }
  if (ref === "me") {
    const my = parseCommunityCard(getSavedCommunityCardSnapshot());
    if (!my) throw new ScoreError("not-found", "No saved card — get rated first.");
    return {
      side: {
        kind: "profile",
        label: my.handle ? `@${my.handle}` : my.name,
        avatar: my.photo,
        company: false,
        rating: my.rating,
        stats: my.sliders,
      },
    };
  }
  const { profile, cached } = await getScoredProfile(ref.replace(/^@/, ""));
  return {
    side: {
      kind: "profile",
      label: `@${profile.handle}`,
      avatar: profile.avatarUrl,
      company: false,
      rating: computeCommunityRating(profile.handle, profile.stats),
      stats: profile.stats,
    },
    cached,
  };
}

function sideToCard(side: VsSide, cards: MarketCard[]): MarketCard {
  if (side.kind === "card") return cards.find((c) => c.id === side.cardId)!;
  return toMarketCard({
    name: side.label.replace(/^@/, ""),
    title: "",
    photo: side.avatar,
    sliders: side.stats,
    rating: side.rating,
    rarity: "rare",
    createdAt: "",
    scored: true,
    handle: side.label.replace(/^@/, ""),
    verdict: undefined,
  });
}

async function exportVsPng(a: VsSide, b: VsSide, result: VsResult): Promise<void> {
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

  const panel = (
    x: number,
    side: VsSide,
    img: HTMLImageElement | null,
    won: boolean,
  ) => {
    ctx.fillStyle = "#131316";
    ctx.strokeStyle = won ? "#34d399" : "rgba(255,255,255,0.15)";
    ctx.lineWidth = won ? 5 : 2;
    ctx.beginPath();
    ctx.roundRect(x, 90, 420, 520, 24);
    ctx.fill();
    ctx.stroke();
    // avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + 210, 270, 120, 0, Math.PI * 2);
    ctx.clip();
    if (img) {
      ctx.fillStyle = side.company ? "#fff" : "#18181b";
      ctx.fillRect(x + 90, 150, 240, 240);
      if (side.company) ctx.drawImage(img, x + 140, 200, 140, 140);
      else ctx.drawImage(img, x + 90, 150, 240, 240);
    } else {
      ctx.fillStyle = "#27272a";
      ctx.fillRect(x + 90, 150, 240, 240);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "700 80px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(side.label.replace("@", "").slice(0, 2).toUpperCase(), x + 210, 270);
    }
    ctx.restore();
    ctx.fillStyle = "#fff";
    ctx.font = "700 40px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(side.label.slice(0, 20), x + 210, 470);
    ctx.fillStyle = "#67e8f9";
    ctx.font = "800 54px system-ui, sans-serif";
    ctx.fillText(String(side.rating), x + 210, 545);
    ctx.textAlign = "left";
  };
  panel(70, a, imgA, result.winner === "a");
  panel(W - 70 - 420, b, imgB, result.winner === "b");

  // VS bolt
  ctx.fillStyle = "#fbbf24";
  ctx.font = "900 120px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("⚡", W / 2, 300);
  ctx.fillStyle = "#fff";
  ctx.font = "900 72px system-ui, sans-serif";
  ctx.fillText(`${result.aWins}–${result.bWins}`, W / 2, 400);

  // frozen stat bars
  let y = 680;
  ctx.font = "600 24px ui-monospace, monospace";
  for (const round of result.rounds) {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.textAlign = "center";
    ctx.fillText(round.label.toUpperCase(), W / 2, y - 12);
    const mid = W / 2;
    const span = 560;
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
    ctx.textAlign = "right";
    ctx.fillStyle = "#fff";
    ctx.fillText(String(round.a), mid - span - 14, y + 14);
    ctx.textAlign = "left";
    ctx.fillText(String(round.b), mid + span + 14, y + 14);
    y += 52;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#67e8f9";
  ctx.font = "600 28px ui-monospace, monospace";
  ctx.fillText("aiticker.xyz/vs", W / 2, H - 26);

  await new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "aiticker-versus.png";
        link.click();
        URL.revokeObjectURL(link.href);
      }
      resolve();
    }, "image/png");
  });
}

function Slot({
  state,
  onRetry,
}: {
  state: SlotState;
  onRetry: () => void;
}) {
  if (state.status === "loading") {
    return (
      <div className="flex aspect-[1/1.42] items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] font-mono text-xs text-white/40">
        Scoring {state.ref}…
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="flex aspect-[1/1.42] flex-col items-center justify-center gap-3 rounded-xl border border-red-400/30 bg-red-400/5 p-4 text-center">
        <p className="text-sm text-red-300">{state.message}</p>
        <button
          onClick={onRetry}
          className="rounded-lg border border-white/15 px-4 py-1.5 text-xs text-white/70 hover:bg-white/5"
        >
          Retry
        </button>
      </div>
    );
  }
  return (
    <div className="flex aspect-[1/1.42] items-center justify-center rounded-xl border border-dashed border-white/10 font-mono text-xs text-white/25">
      Pick a fighter
    </div>
  );
}

export default function VersusArena({
  cards,
  ranks,
  initialA,
  initialB,
}: {
  cards: MarketCard[];
  ranks: Record<string, number>;
  initialA?: string;
  initialB?: string;
}) {
  const myRaw = useSyncExternalStore(subscribeStore, getSavedCommunityCardSnapshot, () => null);
  const myCard = useMemo(() => (myRaw ? parseCommunityCard(myRaw) : null), [myRaw]);

  const [inputA, setInputA] = useState("");
  const [inputB, setInputB] = useState("");
  const [pickerQuery, setPickerQuery] = useState("");
  const [slotA, setSlotA] = useState<SlotState>({ status: "empty" });
  const [slotB, setSlotB] = useState<SlotState>({ status: "empty" });
  const [chaos, setChaos] = useState(false);
  const autoRan = useRef(false);

  const fill = async (which: "a" | "b", ref: string, asChaos = false) => {
    const setSlot = which === "a" ? setSlotA : setSlotB;
    setSlot({ status: "loading", ref });
    try {
      const { side, cached } = await resolveRef(ref, cards);
      setSlot({ status: "ready", side, cached });
      if (asChaos) setChaos(true);
    } catch (err) {
      setSlot({
        status: "error",
        ref,
        message: err instanceof ScoreError ? err.message : "Fetch failed.",
      });
    }
  };

  // auto-run challenge links (?a=&b=) once, client-side (deferred a tick so
  // the effect body itself stays setState-free)
  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    const kickoff = setTimeout(() => {
      if (initialA) fill("a", initialA);
      else if (myCard) fill("a", "me");
      if (initialB) fill("b", initialB);
    }, 0);
    return () => clearTimeout(kickoff);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const randomLegend = () => {
    const pool = cards.filter(
      (c) => c.rarity === "epic" || c.rarity === "legendary",
    );
    const pick = pool[Math.floor(Math.random() * pool.length)];
    fill("b", `card:${pick.id}`, true);
    if (slotA.status !== "ready" && myCard) fill("a", "me");
  };

  const ready = slotA.status === "ready" && slotB.status === "ready";
  const result = ready ? resolveVs(slotA.side, slotB.side, chaos) : null;
  const winnerLabel =
    ready && result && result.winner !== "tie"
      ? result.winner === "a"
        ? slotA.side.label
        : slotB.side.label
      : "Nobody";

  const pickerMatches = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return [];
    return cards.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6);
  }, [pickerQuery, cards]);

  const challengeUrl = () => {
    const refOf = (s: SlotState) =>
      s.status === "ready"
        ? s.side.kind === "card"
          ? `card:${s.side.cardId}`
          : s.side.label.replace(/^@/, "")
        : "";
    return `${window.location.origin}/vs?a=${encodeURIComponent(refOf(slotA))}&b=${encodeURIComponent(refOf(slotB))}`;
  };

  return (
    <div>
      {/* setup */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-white/40">
            Side A
          </p>
          <div className="flex gap-2">
            <input
              value={inputA}
              onChange={(e) => setInputA(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && inputA.trim() && fill("a", inputA.trim())}
              placeholder="GitHub handle"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-cyan-400/50"
            />
            <button
              onClick={() => inputA.trim() && fill("a", inputA.trim())}
              className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-black hover:bg-cyan-300"
            >
              Score
            </button>
          </div>
          {myCard && (
            <button
              onClick={() => fill("a", "me")}
              className="mt-2 font-mono text-[11px] text-cyan-300 hover:underline"
            >
              Use my card ({myCard.handle ? `@${myCard.handle}` : myCard.name})
            </button>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-white/40">
            Side B — handle, Series 1 card, or chaos
          </p>
          <div className="flex gap-2">
            <input
              value={inputB}
              onChange={(e) => setInputB(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && inputB.trim() && fill("b", inputB.trim())}
              placeholder="GitHub handle"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-cyan-400/50"
            />
            <button
              onClick={() => inputB.trim() && fill("b", inputB.trim())}
              className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-black hover:bg-cyan-300"
            >
              Score
            </button>
          </div>
          <div className="relative mt-2 flex items-center gap-2">
            <input
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              placeholder="…or search Series 1 cards"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/25 outline-none focus:border-cyan-400/50"
            />
            <button
              onClick={randomLegend}
              className="shrink-0 rounded-lg border border-amber-400/40 px-3 py-1.5 font-mono text-[11px] text-amber-300 hover:bg-amber-400/10"
              title="Chaos mode: seeded upsets enabled"
            >
              🎲 Random legend
            </button>
            {pickerMatches.length > 0 && (
              <ul className="absolute left-0 top-full z-20 mt-1 w-64 overflow-hidden rounded-xl border border-white/15 bg-[#131316] py-1 shadow-xl">
                {pickerMatches.map((card) => (
                  <li key={card.id}>
                    <button
                      onClick={() => {
                        fill("b", `card:${card.id}`);
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
        </div>
      </div>

      {/* arena */}
      <div className="relative mx-auto grid max-w-2xl grid-cols-2 items-start gap-6 sm:gap-14">
        <div className="origin-bottom rotate-[-2.5deg]">
          {slotA.status === "ready" ? (
            <TradingCard
              card={sideToCard(slotA.side, cards)}
              rank={slotA.side.cardId ? ranks[slotA.side.cardId] : 0}
              community={slotA.side.kind === "profile"}
            />
          ) : (
            <Slot state={slotA} onRetry={() => slotA.status === "error" && fill("a", slotA.ref)} />
          )}
        </div>
        <div className="origin-bottom rotate-[2.5deg]">
          {slotB.status === "ready" ? (
            <TradingCard
              card={sideToCard(slotB.side, cards)}
              rank={slotB.side.cardId ? ranks[slotB.side.cardId] : 0}
              community={slotB.side.kind === "profile"}
            />
          ) : (
            <Slot state={slotB} onRetry={() => slotB.status === "error" && fill("b", slotB.ref)} />
          )}
        </div>
        <span className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 text-5xl drop-shadow-[0_0_18px_rgba(251,191,36,0.7)]">
          ⚡
        </span>
      </div>

      {/* result */}
      {ready && result && (
        <div className="mx-auto mt-8 max-w-2xl">
          {chaos && (
            <p className="mb-2 text-center font-mono text-[10px] uppercase tracking-widest text-amber-400">
              chaos mode · seeded upsets on
            </p>
          )}
          <div className="space-y-2.5">
            {result.rounds.map((round, i) => (
              <div key={round.key}>
                <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-white/40">
                  <span className={round.winner === "a" ? "text-emerald-400" : ""}>
                    {round.a} {round.winner === "a" && "✓"}
                  </span>
                  <span>
                    {round.label}
                    {round.upset && <span className="ml-1 text-amber-400">upset!</span>}
                  </span>
                  <span className={round.winner === "b" ? "text-emerald-400" : ""}>
                    {round.winner === "b" && "✓"} {round.b}
                  </span>
                </div>
                <div className="flex h-2.5 gap-0.5">
                  <div className="flex flex-1 justify-end overflow-hidden rounded-l-full bg-white/8">
                    <div
                      className={`h-full origin-right rounded-l-full ${round.winner === "a" ? "bg-emerald-400" : "bg-white/35"}`}
                      style={{
                        width: `${round.a}%`,
                        animation: `tugA 0.8s ease-out ${i * 0.15}s both`,
                      }}
                    />
                  </div>
                  <div className="flex flex-1 overflow-hidden rounded-r-full bg-white/8">
                    <div
                      className={`h-full origin-left rounded-r-full ${round.winner === "b" ? "bg-emerald-400" : "bg-white/35"}`}
                      style={{
                        width: `${round.b}%`,
                        animation: `tugB 0.8s ease-out ${i * 0.15}s both`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <style>{`
            @keyframes tugA { from { transform: scaleX(0); } to { transform: scaleX(1); } }
            @keyframes tugB { from { transform: scaleX(0); } to { transform: scaleX(1); } }
          `}</style>

          <div className="mt-6 text-center">
            <p className="text-2xl font-bold text-white">
              {result.winner === "tie"
                ? `Dead heat ${result.aWins}–${result.bWins}`
                : `${winnerLabel} takes it ${Math.max(result.aWins, result.bWins)}–${Math.min(result.aWins, result.bWins)}`}
            </p>
            {result.winner !== "tie" && (
              <p className="mt-1 text-sm text-white/55">
                {commentary(result, winnerLabel)}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => exportVsPng(slotA.side, slotB.side, result)}
                className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-cyan-300"
              >
                Download result (PNG)
              </button>
              <ShareButton
                label="Copy result text"
                text={`I went ${result.aWins}–${result.bWins} against ${slotB.side.label} on aiticker.xyz/vs — run yours.`}
                url=""
                className="text-sm"
              />
              <ShareButton
                label="Copy challenge link"
                url={typeof window !== "undefined" ? challengeUrl() : "/vs"}
                className="text-sm"
              />
            </div>
            <p className="mt-3 font-mono text-[11px] text-white/30">
              Card game math on public data — beat the card, not the person.
              {(slotA.status === "ready" && slotA.cached) ||
              (slotB.status === "ready" && slotB.cached)
                ? " · profiles cached this session"
                : ""}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
