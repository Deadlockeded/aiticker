"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
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
import { getScoredProfile, ScoreError, type ScoredProfile } from "@/lib/score";
import { pickStamp } from "@/lib/lines";
import ShareButton from "./ShareButton";
import { canShareFiles, canvasBlob, sharePng, type ShareOutcome } from "@/lib/share";
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
        const s = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => reject(new Error("unreadable image"));
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Load card art for canvas: data URLs direct, remote via same-origin proxy. */
function loadArt(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src.startsWith("data:")
      ? src
      : `/_next/image?url=${encodeURIComponent(src)}&w=640&q=80`;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Hand-drawn 1080×1350 card PNG. No html2canvas — pure 2D canvas. */
async function exportPng(card: CommunityCard) {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const [c0, c1] = RARITY_COLORS[card.rarity];
  const accent = RARITY_ACCENT[card.rarity];

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, c0);
  bg.addColorStop(0.65, c1);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const M = 48;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(M, M, W - M * 2, H - M * 2, 36);
  ctx.stroke();
  ctx.fillStyle = "rgba(19,19,22,0.72)";
  ctx.fill();

  const artX = M + 28;
  const artY = M + 28;
  const artW = W - (M + 28) * 2;
  const artH = artW - 120; // slightly shorter art leaves room for the verdict
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(artX, artY, artW, artH, 24);
  ctx.clip();
  const artBg = ctx.createRadialGradient(W / 2, artY, 80, W / 2, artY, artW);
  artBg.addColorStop(0, c0);
  artBg.addColorStop(1, "#101013");
  ctx.fillStyle = artBg;
  ctx.fillRect(artX, artY, artW, artH);
  const img = card.photo ? await loadArt(card.photo) : null;
  if (img) {
    // cover-crop
    const scale = Math.max(artW / img.width, artH / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, artX + (artW - dw) / 2, artY + (artH - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.font = "700 240px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initialsOf(card.name), W / 2, artY + artH / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
  const scrim = ctx.createLinearGradient(0, artY + artH - 160, 0, artY + artH);
  scrim.addColorStop(0, "rgba(0,0,0,0)");
  scrim.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = scrim;
  ctx.fillRect(artX, artY + artH - 160, artW, 160);
  ctx.restore();

  // rating chip + rarity pill
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

  ctx.font = "700 26px ui-monospace, monospace";
  const label = card.rarity.toUpperCase();
  const lw = ctx.measureText(label).width;
  ctx.fillStyle = "rgba(0,0,0,0.66)";
  ctx.beginPath();
  ctx.roundRect(artX + artW - lw - 62, artY + 16, lw + 46, 56, 12);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillText(label, artX + artW - lw - 39, artY + 54);

  // certification stamp — must survive export
  if (card.stamp) {
    ctx.save();
    ctx.translate(W / 2, artY + artH * 0.66);
    ctx.rotate((-12 * Math.PI) / 180);
    ctx.font = "900 34px ui-monospace, monospace";
    const sw = ctx.measureText(card.stamp).width;
    ctx.strokeStyle = "rgba(239,68,68,0.8)";
    ctx.lineWidth = 5;
    ctx.strokeRect(-sw / 2 - 18, -34, sw + 36, 58);
    ctx.fillStyle = "rgba(248,113,113,0.92)";
    ctx.textAlign = "center";
    ctx.fillText(card.stamp, 0, 8);
    ctx.restore();
    ctx.textAlign = "left";
  }

  // name / handle / title
  let y = artY + artH + 78;
  ctx.fillStyle = "#fff";
  ctx.font = "700 58px system-ui, sans-serif";
  ctx.fillText(card.name.slice(0, 24), artX + 6, y);
  y += 44;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "400 32px system-ui, sans-serif";
  const subtitle = card.handle
    ? `@${card.handle}${card.title ? ` · ${card.title.slice(0, 30)}` : ""}`
    : card.title.slice(0, 42) || "Community collector";
  ctx.fillText(subtitle, artX + 6, y);

  // verdict
  if (card.verdict) {
    y += 50;
    ctx.fillStyle = accent;
    ctx.font = "italic 600 30px system-ui, sans-serif";
    for (const line of wrapText(ctx, `“${card.verdict}”`, artW - 12).slice(0, 2)) {
      ctx.fillText(line, artX + 6, y);
      y += 38;
    }
    y -= 38;
  }

  // stat bars
  y += 54;
  ctx.font = "600 25px ui-monospace, monospace";
  for (const stat of COMMUNITY_STATS) {
    const value = card.sliders[stat.key];
    ctx.fillStyle = accent;
    ctx.fillText(stat.label.toUpperCase(), artX + 6, y + 10);
    const barX = artX + 300;
    const barW = artW - 300 - 90;
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
    y += 52;
  }

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "600 26px ui-monospace, monospace";
  ctx.fillText("#???/∞ · COMMUNITY SERIES", artX + 6, H - M - 44);
  ctx.textAlign = "right";
  ctx.fillStyle = accent;
  ctx.fillText("aiticker.xyz", W - M - 34, H - M - 44);
  ctx.textAlign = "left";

  const blob = await canvasBlob(canvas);
  if (!blob) return "cancelled" as const;
  return sharePng(blob, { filename: `aiticker-${card.name.trim().toLowerCase().replace(/\s+/g, "-")}.png`, text: `The Algorithm rated me ${card.rating}. ${card.rarity.toUpperCase()} tier.`, url: "https://aiticker.vercel.app/create" });
}

const DEFAULT_SLIDERS: CommunitySliders = {
  shipping: 60,
  yapping: 60,
  galaxyBrain: 60,
  gpuHoarding: 60,
};

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-cyan-400/50";

function SourceChip({ label, state }: { label: string; state: boolean | null }) {
  if (state === null) return null;
  return (
    <span
      className={`rounded-md px-2 py-0.5 font-mono text-[10px] ${
        state ? "bg-emerald-400/10 text-emerald-300" : "bg-white/5 text-white/35 line-through"
      }`}
    >
      {state ? "✓" : "✗"} {label}
    </span>
  );
}

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

  const [tab, setTab] = useState<"rated" | "manual">("rated");
  const [editing, setEditing] = useState(false);
  // rated form
  const [ghHandle, setGhHandle] = useState("");
  const [hfHandle, setHfHandle] = useState("");
  const [hnHandle, setHnHandle] = useState("");
  const [ratedTitle, setRatedTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastProfile, setLastProfile] = useState<ScoredProfile | null>(null);
  const [wasCached, setWasCached] = useState(false);
  // manual form
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [sliders, setSliders] = useState<CommunitySliders>(DEFAULT_SLIDERS);
  const [rerollsLeft, setRerollsLeft] = useState<number | null>(null);
  const [shareMode, setShareMode] = useState<ShareOutcome | null>(null);

  if (savedRaw === null) {
    return (
      <p className="py-24 text-center font-mono text-xs uppercase tracking-[0.3em] text-white/30">
        Warming up The Algorithm…
      </p>
    );
  }

  const rate = async () => {
    const handle = ghHandle.trim().replace(/^@/, "");
    if (!handle || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { profile, cached } = await getScoredProfile(handle, {
        hf: hfHandle.trim() || undefined,
        hn: hnHandle.trim() || undefined,
      });
      const card: CommunityCard = {
        name: profile.displayName,
        title: ratedTitle.trim(),
        photo: profile.avatarUrl,
        sliders: profile.stats,
        rating: computeCommunityRating(profile.handle, profile.stats),
        rarity: rollCommunityRarity(),
        createdAt: new Date().toISOString(),
        scored: true,
        handle: profile.handle,
        verdict: profile.verdict,
        stamp: pickStamp({ stats: profile.stats, scored: true }),
      };
      saveCommunityCard(card);
      setLastProfile(profile);
      setWasCached(cached);
      setRerollsLeft(getRerollsLeft());
      setEditing(false);
    } catch (err) {
      setError(
        err instanceof ScoreError
          ? err.message
          : "Something went sideways. Try again in a moment.",
      );
    } finally {
      setLoading(false);
    }
  };

  const generateManual = () => {
    if (!name.trim()) return;
    saveCommunityCard({
      name: name.trim(),
      title: title.trim(),
      photo,
      sliders,
      rating: computeCommunityRating(name, sliders),
      rarity: rollCommunityRarity(),
      createdAt: new Date().toISOString(),
      scored: false,
      stamp: pickStamp({ stats: sliders, scored: false }),
    });
    setRerollsLeft(getRerollsLeft());
    setEditing(false);
  };

  const reroll = () => {
    if (!saved || getRerollsLeft() <= 0) return;
    setRerollsLeft(consumeReroll());
    // rarity AND stamp re-roll on the same 3/day budget — hunt responsibly
    saveCommunityCard({
      ...saved,
      rarity: rollCommunityRarity(),
      stamp: pickStamp({ stats: saved.sliders, scored: saved.scored ?? false }),
    });
  };

  // ---------------- result view ----------------
  if (saved && !editing) {
    const market = toMarketCard(saved);
    const left = rerollsLeft ?? getRerollsLeft();
    const sources = saved.scored && lastProfile ? lastProfile.sources : null;
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
            stamp={saved.stamp}
          />
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-400/80">
              The Algorithm has spoken
              {saved.scored === false && " · manual build"}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-white">
              {saved.handle ? `@${saved.handle}` : saved.name} ·{" "}
              <span className="tnum">{saved.rating}</span> OVR ·{" "}
              <span className="capitalize">{saved.rarity}</span>
            </h2>
            {saved.stamp && (
              <p className="mt-2 inline-block rotate-[-3deg] rounded border-2 border-red-500/60 px-2 py-0.5 font-mono text-[11px] font-black uppercase tracking-widest text-red-400">
                {saved.stamp}
              </p>
            )}
            {saved.verdict && (
              <p className="mt-2 text-base italic text-white/70">
                “{saved.verdict}”
              </p>
            )}
            <p className="mt-1 text-sm text-white/50">
              {saved.scored
                ? "Scored from your public footprint, in your browser. Deterministic — same handle, same stats. The rarity was luck."
                : "Same name, same rating — the verdict is deterministic. The rarity was luck."}
            </p>
            {sources && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <SourceChip label="GitHub" state={sources.github} />
                <SourceChip label="Hugging Face" state={sources.huggingface} />
                <SourceChip label="Hacker News" state={sources.hackernews} />
                <SourceChip label="OpenAlex" state={sources.openalex} />
                {wasCached && (
                  <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/35">
                    cached this session
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={async () => setShareMode(await exportPng(saved))}
              className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-cyan-300"
            >
              Share card
            </button>
            <ShareButton label="Copy share text" text={shareText(saved)} url="" className="text-sm" />
            <Link
              href="/arena"
              className="rounded-lg border border-cyan-400/40 px-5 py-2.5 text-sm font-semibold text-cyan-300 transition-colors hover:bg-cyan-400/10"
            >
              Challenge someone →
            </Link>
            <button
              onClick={reroll}
              disabled={left <= 0}
              className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Re-roll rarity ({left}/{REROLLS_PER_DAY} today)
            </button>
            <button
              onClick={() => {
                if (saved.scored && saved.handle) setGhHandle(saved.handle);
                else {
                  setTab("manual");
                  setName(saved.name);
                  setTitle(saved.title);
                  setPhoto(saved.photo);
                  setSliders(saved.sliders);
                }
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
          {shareMode === "downloaded" && !canShareFiles() && (
            <p className="font-mono text-[11px] text-amber-300/80">
              This in-app browser blocks native sharing — image downloaded +
              text copied instead.{" "}
              <a href="" target="_blank" className="underline">
                open in browser ↗
              </a>
            </p>
          )}
          <p className="font-mono text-[11px] text-white/35">
            We only read public data. Nothing is stored or sent anywhere —
            scoring runs in your browser.
          </p>
        </div>
      </div>
    );
  }

  // ---------------- forms ----------------
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex rounded-lg bg-white/5 p-0.5">
        {(
          [
            ["rated", "Get rated"],
            ["manual", "Manual build"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === id ? "bg-white/12 text-white" : "text-white/50 hover:text-white/80"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "rated" ? (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div>
            <label className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-white/40">
              GitHub username *
            </label>
            <input
              value={ghHandle}
              onChange={(e) => setGhHandle(e.target.value.slice(0, 40))}
              onKeyDown={(e) => e.key === "Enter" && rate()}
              placeholder="octocat"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-white/40">
                Hugging Face <span className="text-white/25">optional</span>
              </label>
              <input
                value={hfHandle}
                onChange={(e) => setHfHandle(e.target.value.slice(0, 40))}
                placeholder="username"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-white/40">
                Hacker News <span className="text-white/25">optional</span>
              </label>
              <input
                value={hnHandle}
                onChange={(e) => setHnHandle(e.target.value.slice(0, 40))}
                placeholder="username"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-white/40">
              Title <span className="text-white/25">display only, never scored</span>
            </label>
            <input
              value={ratedTitle}
              onChange={(e) => setRatedTitle(e.target.value.slice(0, 48))}
              placeholder="Prompt Engineer"
              className={inputClass}
            />
          </div>
          {error && (
            <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
          <button
            onClick={rate}
            disabled={!ghHandle.trim() || loading}
            className="w-full rounded-lg bg-cyan-400 px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Reading your footprint…" : "Face The Algorithm"}
          </button>
          <p className="text-center font-mono text-[11px] text-white/35">
            We only read public data. Nothing is stored or sent anywhere —
            scoring runs in your browser.
          </p>
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-xs text-white/45">
            No GitHub? Build your card manually — it just won&apos;t carry the
            scored badge.
          </p>
          <div>
            <label className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-white/40">
              Name *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 32))}
              placeholder="Ada Lovelace"
              className={inputClass}
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
              className={inputClass}
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
                <img src={photo} alt="preview" className="h-12 w-12 rounded-lg object-cover" />
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
            onClick={generateManual}
            disabled={!name.trim()}
            className="w-full rounded-lg bg-cyan-400 px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Face The Algorithm
          </button>
          <p className="text-center font-mono text-[11px] text-white/35">
            Photos are processed in your browser and never uploaded anywhere.
          </p>
        </div>
      )}
    </div>
  );
}
