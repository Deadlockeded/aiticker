"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { Rarity } from "@/lib/types";
import { subscribeStore } from "@/lib/binder";
import {
  clearCommunityCard,
  COMMUNITY_STATS,
  computeCommunityRating,
  consumeReroll,
  getRerollsLeft,
  getSavedCommunityCardSnapshot,
  initialsOf,
  parseCommunityCard,
  REROLLS_PER_DAY,
  rollCommunityRarity,
  saveCommunityCard,
  shareText,
  toMarketCard,
  type CommunityCard,
  type CommunitySliders,
} from "@/lib/create";
import ShareButton from "./ShareButton";
import TradingCard from "./TradingCard";

const RARITY_COLORS: Record<Rarity, [string, string]> = {
  common: ["#3f3f46", "#131316"],
  rare: ["#0c4a6e", "#101318"],
  epic: ["#581c87", "#131117"],
  legendary: ["#78350f", "#141210"],
  mythic: ["#1e1b4b", "#101018"],
};

const RARITY_ACCENT: Record<Rarity, string> = {
  common: "#d4d4d8",
  rare: "#38bdf8",
  epic: "#e879f9",
  legendary: "#fbbf24",
  mythic: "#67e8f9",
};

/** Downscale an uploaded photo to a small local-only data URL. */
function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 512;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        // cover-crop to square
        const s = Math.min(img.width, img.height);
        ctx.drawImage(
          img,
          (img.width - s) / 2,
          (img.height - s) / 2,
          s,
          s,
          0,
          0,
          size,
          size,
        );
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => reject(new Error("unreadable image"));
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Hand-drawn 1080×1350 card PNG. No html2canvas — pure 2D canvas. */
async function exportPng(card: CommunityCard): Promise<void> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const [c0, c1] = RARITY_COLORS[card.rarity];
  const accent = RARITY_ACCENT[card.rarity];

  // backdrop
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, c0);
  bg.addColorStop(0.65, c1);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // card frame
  const M = 48;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(M, M, W - M * 2, H - M * 2, 36);
  ctx.stroke();
  ctx.fillStyle = "rgba(19,19,22,0.72)";
  ctx.fill();

  // art area
  const artX = M + 28;
  const artY = M + 28;
  const artW = W - (M + 28) * 2;
  const artH = artW; // square
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(artX, artY, artW, artH, 24);
  ctx.clip();
  const artBg = ctx.createRadialGradient(W / 2, artY, 80, W / 2, artY, artW);
  artBg.addColorStop(0, c0);
  artBg.addColorStop(1, "#101013");
  ctx.fillStyle = artBg;
  ctx.fillRect(artX, artY, artW, artH);
  if (card.photo) {
    const img = new Image();
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = card.photo!;
    });
    if (img.width > 0) {
      ctx.drawImage(img, artX, artY, artW, artH);
    }
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.font = "700 260px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initialsOf(card.name), W / 2, artY + artH / 2);
  }
  // bottom scrim
  const scrim = ctx.createLinearGradient(0, artY + artH - 160, 0, artY + artH);
  scrim.addColorStop(0, "rgba(0,0,0,0)");
  scrim.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = scrim;
  ctx.fillRect(artX, artY + artH - 160, artW, 160);
  ctx.restore();

  // rating chip
  ctx.fillStyle = "rgba(0,0,0,0.66)";
  ctx.beginPath();
  ctx.roundRect(artX + 16, artY + 16, 190, 96, 18);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "800 72px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(String(card.rating), artX + 34, artY + 88);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "600 26px ui-monospace, monospace";
  ctx.fillText("OVR", artX + 130, artY + 88);

  // rarity pill
  ctx.font = "700 26px ui-monospace, monospace";
  const label = card.rarity.toUpperCase();
  const lw = ctx.measureText(label).width;
  ctx.fillStyle = "rgba(0,0,0,0.66)";
  ctx.beginPath();
  ctx.roundRect(artX + artW - lw - 62, artY + 16, lw + 46, 56, 12);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillText(label, artX + artW - lw - 39, artY + 54);

  // name + title
  let y = artY + artH + 88;
  ctx.fillStyle = "#fff";
  ctx.font = "700 64px system-ui, sans-serif";
  ctx.fillText(card.name.slice(0, 24), artX + 6, y);
  y += 46;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "400 34px system-ui, sans-serif";
  ctx.fillText(card.title.slice(0, 42) || "Community collector", artX + 6, y);

  // stat bars
  y += 52;
  ctx.font = "600 26px ui-monospace, monospace";
  for (const stat of COMMUNITY_STATS) {
    const value = card.sliders[stat.key];
    ctx.fillStyle = accent;
    ctx.fillText(stat.label.toUpperCase(), artX + 6, y + 10);
    const barX = artX + 320;
    const barW = artW - 320 - 90;
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.roundRect(barX, y - 8, barW, 14, 7);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.roundRect(barX, y - 8, (barW * value) / 100, 14, 7);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.textAlign = "right";
    ctx.fillText(String(value), artX + artW - 6, y + 10);
    ctx.textAlign = "left";
    y += 54;
  }

  // footer
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "600 26px ui-monospace, monospace";
  ctx.fillText("#???/∞ · COMMUNITY SERIES", artX + 6, H - M - 44);
  ctx.textAlign = "right";
  ctx.fillStyle = accent;
  ctx.fillText("aiticker.xyz", W - M - 34, H - M - 44);
  ctx.textAlign = "left";

  await new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `aiticker-${card.name.trim().toLowerCase().replace(/\s+/g, "-")}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }
      resolve();
    }, "image/png");
  });
}

const DEFAULT_SLIDERS: CommunitySliders = {
  shipping: 60,
  yapping: 60,
  galaxyBrain: 60,
  gpuHoarding: 60,
};

export default function CreateCardStudio() {
  const savedRaw = useSyncExternalStore(
    subscribeStore,
    getSavedCommunityCardSnapshot,
    () => null,
  );
  const saved = useMemo(
    () => (savedRaw === null ? null : parseCommunityCard(savedRaw)),
    [savedRaw],
  );

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [sliders, setSliders] = useState<CommunitySliders>(DEFAULT_SLIDERS);
  const [rerollsLeft, setRerollsLeft] = useState<number | null>(null);

  if (savedRaw === null) {
    return (
      <p className="py-24 text-center font-mono text-xs uppercase tracking-[0.3em] text-white/30">
        Warming up The Algorithm…
      </p>
    );
  }

  const generate = () => {
    if (!name.trim()) return;
    const card: CommunityCard = {
      name: name.trim(),
      title: title.trim(),
      photo,
      sliders,
      rating: computeCommunityRating(name, sliders),
      rarity: rollCommunityRarity(),
      createdAt: new Date().toISOString(),
    };
    saveCommunityCard(card);
    setRerollsLeft(getRerollsLeft());
    setEditing(false);
  };

  const reroll = () => {
    if (!saved || getRerollsLeft() <= 0) return;
    setRerollsLeft(consumeReroll());
    saveCommunityCard({ ...saved, rarity: rollCommunityRarity() });
  };

  if (saved && !editing) {
    const market = toMarketCard(saved);
    const left = rerollsLeft ?? getRerollsLeft();
    return (
      <div className="grid gap-8 md:grid-cols-[minmax(0,360px)_1fr]">
        <div className="mx-auto w-full max-w-[360px]">
          <TradingCard
            card={market}
            rank={0}
            size="hero"
            community
            communityStats={COMMUNITY_STATS.map((s) => ({
              label: s.label,
              value: saved.sliders[s.key],
            }))}
          />
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-400/80">
              The Algorithm has spoken
            </p>
            <h2 className="mt-1 text-2xl font-bold text-white">
              {saved.name} · <span className="tnum">{saved.rating}</span> OVR ·{" "}
              <span className="capitalize">{saved.rarity}</span>
            </h2>
            <p className="mt-1 text-sm text-white/50">
              Same name, same rating — the verdict is deterministic. The rarity
              was luck.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => exportPng(saved)}
              className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-cyan-300"
            >
              Download card (PNG)
            </button>
            <ShareButton label="Copy share text" text={shareText(saved)} url="" className="text-sm" />
            <button
              onClick={reroll}
              disabled={left <= 0}
              className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Re-roll rarity ({left}/{REROLLS_PER_DAY} today)
            </button>
            <button
              onClick={() => {
                setName(saved.name);
                setTitle(saved.title);
                setPhoto(saved.photo);
                setSliders(saved.sliders);
                setEditing(true);
              }}
              className="rounded-lg border border-white/15 px-5 py-2.5 text-sm text-white/70 hover:bg-white/5"
            >
              Re-make
            </button>
            <button
              onClick={() => clearCommunityCard()}
              className="rounded-lg px-3 py-2.5 text-sm text-white/35 hover:text-white"
            >
              Delete
            </button>
          </div>
          <p className="font-mono text-[11px] text-white/35">
            Your photo never leaves your device — it lives in this browser
            only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div>
          <label className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-white/40">
            Name *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 32))}
            placeholder="Ada Lovelace"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-cyan-400/50"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-white/40">
            Title / role
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 48))}
            placeholder="Prompt Engineer"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-cyan-400/50"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-white/40">
            Photo <span className="normal-case text-white/30">(stays on your device)</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) setPhoto(await readPhoto(file));
              }}
              className="text-xs text-white/50 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-white/15"
            />
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt="preview"
                className="h-12 w-12 rounded-lg object-cover"
              />
            )}
          </div>
        </div>

        {COMMUNITY_STATS.map((stat) => (
          <div key={stat.key}>
            <label className="mb-1 flex justify-between font-mono text-[11px] uppercase tracking-wider text-white/40">
              <span>{stat.label}</span>
              <span className="tnum text-white/70">{sliders[stat.key]}</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={sliders[stat.key]}
              onChange={(e) =>
                setSliders((s) => ({ ...s, [stat.key]: Number(e.target.value) }))
              }
              className="w-full accent-cyan-400"
            />
          </div>
        ))}

        <button
          onClick={generate}
          disabled={!name.trim()}
          className="w-full rounded-lg bg-cyan-400 px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Face The Algorithm
        </button>
        <p className="text-center font-mono text-[11px] text-white/35">
          Photos are processed in your browser and never uploaded anywhere.
        </p>
      </div>
    </div>
  );
}
