"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { MarketCard } from "@/lib/cards";
import { notifyStore, subscribeStore } from "@/lib/binder";
import CardArt from "./CardArt";
import ShareButton from "./ShareButton";

const TIERS = [
  { id: "S", color: "#fbbf24", bg: "bg-amber-400/10", border: "border-amber-400/40" },
  { id: "A", color: "#34d399", bg: "bg-emerald-400/10", border: "border-emerald-400/40" },
  { id: "B", color: "#38bdf8", bg: "bg-sky-400/10", border: "border-sky-400/40" },
  { id: "C", color: "#a78bfa", bg: "bg-violet-400/10", border: "border-violet-400/40" },
  { id: "F", color: "#71717a", bg: "bg-zinc-400/10", border: "border-zinc-500/40" },
] as const;

type TierId = (typeof TIERS)[number]["id"];

const PRESETS = [
  { id: "labs", label: "Rank the Labs" },
  { id: "founders", label: "Rank the Founders" },
  { id: "chaos", label: "Full Chaos" },
] as const;

type PresetId = (typeof PRESETS)[number]["id"];

const SHARE_LINES = [
  "My AI tier list. LeCun defenders, reply calmly. aiticker.xyz/tiers",
  "Ranked the entire AI industry. No notes accepted. aiticker.xyz/tiers",
  "This tier list is objectively correct and I will not elaborate. aiticker.xyz/tiers",
  "S tier is not up for debate. aiticker.xyz/tiers",
];

const KEY = "ai-index:tiers:v1";

interface BoardState {
  preset: PresetId;
  assignments: Record<string, TierId>;
}

function getSnapshot(): string {
  return localStorage.getItem(KEY) ?? '{"preset":"labs","assignments":{}}';
}

function parseState(raw: string): BoardState {
  try {
    return { preset: "labs", assignments: {}, ...JSON.parse(raw) };
  } catch {
    return { preset: "labs", assignments: {} };
  }
}

function writeState(state: BoardState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
  notifyStore();
}

async function loadThumb(src: string | null): Promise<HTMLImageElement | null> {
  if (!src) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `/_next/image?url=${encodeURIComponent(src)}&w=96&q=75`;
  });
}

/** Hand-drawn 1600×900 tier-board PNG. */
async function exportPng(rows: { tier: (typeof TIERS)[number]; cards: MarketCard[] }[]) {
  const W = 1600;
  const H = 900;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0a0a0b";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#fff";
  ctx.font = "700 40px system-ui, sans-serif";
  ctx.fillText("My AI tier list", 40, 62);
  ctx.textAlign = "right";
  ctx.fillStyle = "#67e8f9";
  ctx.font = "600 28px ui-monospace, monospace";
  ctx.fillText("aiticker.xyz/tiers", W - 40, 62);
  ctx.textAlign = "left";

  const top = 96;
  const rowH = (H - top - 24) / TIERS.length;
  const thumb = 72;

  for (let r = 0; r < rows.length; r++) {
    const { tier, cards } = rows[r];
    const y = top + r * rowH;
    ctx.fillStyle = "#131316";
    ctx.beginPath();
    ctx.roundRect(40, y + 6, W - 80, rowH - 12, 14);
    ctx.fill();
    // label block
    ctx.fillStyle = tier.color;
    ctx.beginPath();
    ctx.roundRect(40, y + 6, 110, rowH - 12, 14);
    ctx.fill();
    ctx.fillStyle = "#0a0a0b";
    ctx.font = "800 56px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tier.id, 95, y + rowH / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    // thumbs
    const perRow = Math.floor((W - 80 - 130) / (thumb + 10));
    const maxShown = perRow * Math.max(1, Math.floor((rowH - 20) / (thumb + 8)));
    const shown = cards.slice(0, maxShown);
    const thumbs = await Promise.all(shown.map((c) => loadThumb(c.image)));
    shown.forEach((card, i) => {
      const cx = 170 + (i % perRow) * (thumb + 10);
      const cy = y + 14 + Math.floor(i / perRow) * (thumb + 8);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx + thumb / 2, cy + thumb / 2, thumb / 2, 0, Math.PI * 2);
      ctx.clip();
      const img = thumbs[i];
      if (img) {
        ctx.fillStyle = card.type === "company" ? "#fff" : "#18181b";
        ctx.fillRect(cx, cy, thumb, thumb);
        if (card.type === "company") {
          ctx.drawImage(img, cx + 12, cy + 12, thumb - 24, thumb - 24);
        } else {
          ctx.drawImage(img, cx, cy, thumb, thumb);
        }
      } else {
        ctx.fillStyle = "#27272a";
        ctx.fillRect(cx, cy, thumb, thumb);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = "700 24px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(card.avatar.slice(0, 2), cx + thumb / 2, cy + thumb / 2);
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
      }
      ctx.restore();
    });
    if (cards.length > maxShown) {
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "600 24px ui-monospace, monospace";
      ctx.fillText(`+${cards.length - maxShown}`, W - 110, y + rowH / 2 + 8);
    }
  }

  await new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "aiticker-tier-list.png";
        a.click();
        URL.revokeObjectURL(a.href);
      }
      resolve();
    }, "image/png");
  });
}

export default function TierBoard({ cards }: { cards: MarketCard[] }) {
  const raw = useSyncExternalStore(subscribeStore, getSnapshot, () => null);
  const state = useMemo(() => (raw === null ? null : parseState(raw)), [raw]);
  const [selected, setSelected] = useState<string | null>(null);
  const [shareLine] = useState(
    () => SHARE_LINES[Math.floor(Math.random() * SHARE_LINES.length)],
  );

  const pool = useMemo(() => {
    if (!state) return [];
    switch (state.preset) {
      case "labs":
        return cards.filter((c) => c.type === "company");
      case "founders":
        return cards.filter((c) => c.type === "engineer");
      default:
        return cards;
    }
  }, [cards, state]);

  if (state === null) {
    return (
      <p className="py-24 text-center font-mono text-xs uppercase tracking-[0.3em] text-white/30">
        Laying out the rows…
      </p>
    );
  }

  const assign = (id: string, tier: TierId | null) => {
    const assignments = { ...state.assignments };
    if (tier === null) delete assignments[id];
    else assignments[id] = tier;
    writeState({ ...state, assignments });
    setSelected(null);
  };

  const rows = TIERS.map((tier) => ({
    tier,
    cards: pool.filter((c) => state.assignments[c.id] === tier.id),
  }));
  const tray = pool.filter((c) => !state.assignments[c.id]);

  const Thumb = ({ card, inTier }: { card: MarketCard; inTier: boolean }) => (
    <button
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", card.id)}
      onClick={() =>
        inTier ? assign(card.id, null) : setSelected(selected === card.id ? null : card.id)
      }
      title={`${card.name} (${card.rating})`}
      className={`h-11 w-11 shrink-0 cursor-grab rounded-full transition ${
        selected === card.id
          ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#0a0a0b]"
          : "hover:scale-110"
      }`}
    >
      <CardArt card={card} />
    </button>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => writeState({ preset: preset.id, assignments: {} })}
            className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              state.preset === preset.id
                ? "bg-white/12 text-white"
                : "bg-white/5 text-white/50 hover:text-white/80"
            }`}
          >
            {preset.label}
          </button>
        ))}
        <span className="ml-auto flex gap-2">
          <button
            onClick={() => exportPng(rows)}
            className="rounded-lg bg-cyan-400 px-4 py-1.5 text-[13px] font-semibold text-black transition-colors hover:bg-cyan-300"
          >
            Export image
          </button>
          <ShareButton label="Copy share text" text={shareLine} url="" className="!px-4 !py-1.5 text-[13px]" />
          <button
            onClick={() => writeState({ ...state, assignments: {} })}
            className="rounded-lg border border-white/15 px-4 py-1.5 text-[13px] text-white/60 hover:bg-white/5"
          >
            Reset
          </button>
        </span>
      </div>

      {selected && (
        <p className="mb-2 font-mono text-[11px] text-cyan-300">
          Now tap a tier row to place the selected card (or tap it again to
          deselect).
        </p>
      )}

      <div className="space-y-2">
        {rows.map(({ tier, cards: tierCards }) => (
          <div
            key={tier.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              if (id) assign(id, tier.id);
            }}
            onClick={() => selected && assign(selected, tier.id)}
            className={`flex min-h-16 items-center gap-3 rounded-xl border p-2 ${tier.bg} ${tier.border} ${
              selected ? "cursor-pointer" : ""
            }`}
          >
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-xl font-black text-black"
              style={{ backgroundColor: tier.color }}
            >
              {tier.id}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {tierCards.map((card) => (
                <Thumb key={card.id} card={card} inTier />
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mb-2 mt-6 font-mono text-[11px] uppercase tracking-widest text-white/40">
        Unranked · {tray.length} — drag into a tier, or tap then tap a row
      </p>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const id = e.dataTransfer.getData("text/plain");
          if (id) assign(id, null);
        }}
        className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-3"
      >
        {tray.map((card) => (
          <Thumb key={card.id} card={card} inTier={false} />
        ))}
      </div>
    </div>
  );
}
