"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { computeCommunityRating, toMarketCard } from "@/lib/create";
import { getScoredProfile, ScoreError, type ScoredProfile } from "@/lib/score";
import { compatibility, shipIcon, shipVerdict } from "@/lib/shipmeter";
import ShareButton from "./ShareButton";
import TradingCard from "./TradingCard";

async function exportPng(a: ScoredProfile, b: ScoredProfile, pct: number, verdict: string) {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, pct >= 70 ? "#7f1d1d" : pct >= 45 ? "#713f12" : "#1e1b4b");
  bg.addColorStop(0.6, "#0a0a0b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const load = (src: string) =>
    new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = `/_next/image?url=${encodeURIComponent(src)}&w=384&q=80`;
    });
  const [imgA, imgB] = await Promise.all([load(a.avatarUrl), load(b.avatarUrl)]);

  const face = (img: HTMLImageElement | null, x: number, handle: string) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, 360, 150, 0, Math.PI * 2);
    ctx.clip();
    if (img) ctx.drawImage(img, x - 150, 210, 300, 300);
    else {
      ctx.fillStyle = "#27272a";
      ctx.fillRect(x - 150, 210, 300, 300);
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x, 360, 150, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "700 44px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`@${handle}`.slice(0, 18), x, 590);
  };
  face(imgA, 280, a.handle);
  face(imgB, W - 280, b.handle);

  ctx.textAlign = "center";
  ctx.font = "120px system-ui, sans-serif";
  ctx.fillText(shipIcon(pct), W / 2, 400);

  ctx.fillStyle = "#fff";
  ctx.font = "900 190px system-ui, sans-serif";
  ctx.fillText(`${pct}%`, W / 2, 840);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "600 34px ui-monospace, monospace";
  ctx.fillText("COFOUNDER COMPATIBILITY", W / 2, 900);

  ctx.fillStyle = "#67e8f9";
  ctx.font = "italic 600 40px system-ui, sans-serif";
  const words = verdict.split(" ");
  let line = "";
  let y = 1000;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > W - 160 && line) {
      ctx.fillText(line, W / 2, y);
      line = word;
      y += 52;
    } else line = next;
  }
  if (line) ctx.fillText(line, W / 2, y);

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "600 28px ui-monospace, monospace";
  ctx.fillText("aiticker.xyz/shipmeter", W / 2, H - 70);

  await new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `shipmeter-${a.handle}-${b.handle}.png`;
        link.click();
        URL.revokeObjectURL(link.href);
      }
      resolve();
    }, "image/png");
  });
}

function profileCard(profile: ScoredProfile) {
  return toMarketCard({
    name: profile.displayName,
    title: "",
    photo: profile.avatarUrl,
    sliders: profile.stats,
    rating: computeCommunityRating(profile.handle, profile.stats),
    rarity: "rare",
    createdAt: "",
    scored: true,
    handle: profile.handle,
    verdict: profile.verdict,
  });
}

export default function ShipMeterView({
  initialA,
  initialB,
}: {
  initialA?: string;
  initialB?: string;
}) {
  const [inputA, setInputA] = useState(initialA ?? "");
  const [inputB, setInputB] = useState(initialB ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pair, setPair] = useState<{ a: ScoredProfile; b: ScoredProfile; cached: boolean } | null>(null);
  const autoRan = useRef(false);

  const run = async (ha: string, hb: string) => {
    const a = ha.trim().replace(/^@/, "");
    const b = hb.trim().replace(/^@/, "");
    if (!a || !b || loading) return;
    setLoading(true);
    setError(null);
    try {
      const ra = await getScoredProfile(a);
      const rb = await getScoredProfile(b);
      setPair({ a: ra.profile, b: rb.profile, cached: ra.cached || rb.cached });
    } catch (err) {
      setError(err instanceof ScoreError ? err.message : "Fetch failed — try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    if (initialA && initialB) {
      const kickoff = setTimeout(() => run(initialA, initialB), 0);
      return () => clearTimeout(kickoff);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = pair ? compatibility(pair.a.handle, pair.a.stats, pair.b.handle, pair.b.stats) : 0;
  const verdict = pair
    ? shipVerdict({ pct, a: { handle: pair.a.handle, stats: pair.a.stats }, b: { handle: pair.b.handle, stats: pair.b.stats } })
    : "";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <input
          value={inputA}
          onChange={(e) => setInputA(e.target.value)}
          placeholder="handle one"
          className="w-40 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-cyan-400/50"
        />
        <span className="text-xl">×</span>
        <input
          value={inputB}
          onChange={(e) => setInputB(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run(inputA, inputB)}
          placeholder="handle two"
          className="w-40 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-cyan-400/50"
        />
        <button
          onClick={() => run(inputA, inputB)}
          disabled={loading || !inputA.trim() || !inputB.trim()}
          className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Measuring…" : "Measure"}
        </button>
      </div>
      {error && (
        <p className="mt-3 text-center text-sm text-red-300">{error}</p>
      )}

      {pair && !loading && (
        <div className="mt-8 text-center">
          <p className="text-6xl">{shipIcon(pct)}</p>
          <p className="tnum mt-2 text-7xl font-black text-white">{pct}%</p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.3em] text-white/40">
            cofounder compatibility
            {pair.cached && " · cached"}
          </p>
          <p className="mx-auto mt-3 max-w-md text-lg italic text-cyan-300">
            “{verdict}”
          </p>

          <div className="mx-auto mt-6 grid max-w-lg grid-cols-2 gap-4">
            {[pair.a, pair.b].map((p) => (
              <TradingCard
                key={p.handle}
                card={profileCard(p)}
                rank={0}
                community
              />
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => exportPng(pair.a, pair.b, pct, verdict)}
              className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-cyan-300"
            >
              Download (PNG)
            </button>
            <ShareButton
              label="Copy share text"
              text={`@${pair.a.handle} × @${pair.b.handle}: ${pct}% compatible. ${verdict} — aiticker.xyz/shipmeter`}
              url=""
              className="text-sm"
            />
            <ShareButton
              label="Copy challenge link"
              url={
                typeof window !== "undefined"
                  ? `${window.location.origin}/shipmeter?a=${pair.a.handle}&b=${pair.b.handle}`
                  : "/shipmeter"
              }
              className="text-sm"
            />
          </div>
          <p className="mt-4 font-mono text-[11px] text-white/35">
            Deterministic — same pair, same number, either order. Now{" "}
            <Link href="/roast" className="text-cyan-300 hover:underline">
              get roasted →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
