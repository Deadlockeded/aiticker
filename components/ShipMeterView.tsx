"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { computeCommunityRating, toMarketCard } from "@/lib/create";
import { getScoredProfile, ScoreError, type ScoredProfile } from "@/lib/score";
import { compatibility, shipIcon, shipVerdict } from "@/lib/shipmeter";
import ShareButton from "./ShareButton";
import { brandFonts, canShareFiles, canvasBlob, drawLogoMark, sharePng, type ShareOutcome } from "@/lib/share";
import TradingCard from "./TradingCard";

async function exportPng(a: ScoredProfile, b: ScoredProfile, pct: number, verdict: string) {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const fonts = await brandFonts();
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
    ctx.font = `700 44px ${fonts.body}`;
    ctx.textAlign = "center";
    ctx.fillText(`@${handle}`.slice(0, 18), x, 590);
  };
  face(imgA, 280, a.handle);
  face(imgB, W - 280, b.handle);

  ctx.textAlign = "center";
  ctx.font = `120px ${fonts.body}`;
  ctx.fillText(shipIcon(pct), W / 2, 400);

  ctx.fillStyle = "#fff";
  ctx.font = `900 190px ${fonts.body}`;
  ctx.fillText(`${pct}%`, W / 2, 840);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = `600 34px ${fonts.mono}`;
  ctx.fillText("COFOUNDER COMPATIBILITY", W / 2, 900);

  ctx.fillStyle = "#67e8f9";
  ctx.font = `italic 600 40px ${fonts.body}`;
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
  ctx.font = `600 28px ${fonts.mono}`;
  drawLogoMark(ctx, W / 2 - 130, H - 130, 44, fonts.display, { onDark: true });
  ctx.fillText("aiticker.xyz/shipmeter", W / 2, H - 56);

  const blob = await canvasBlob(canvas);
  if (!blob) return "cancelled" as const;
  return sharePng(blob, { filename: `shipmeter-${a.handle}-${b.handle}.png`, text: `@${a.handle} × @${b.handle}: ${pct}% compatible.`, url: "https://aiticker.vercel.app/shipmeter" });
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
  const [shareMode, setShareMode] = useState<ShareOutcome | null>(null);
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
          className="w-40 rounded-lg border border-[#17301F]/30 bg-[#17301F]/5 px-3 py-2.5 text-sm text-[#17301F] placeholder-[#9CB09E] outline-none focus:border-[#B23A2E]/70"
        />
        <span className="text-xl">×</span>
        <input
          value={inputB}
          onChange={(e) => setInputB(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run(inputA, inputB)}
          placeholder="handle two"
          className="w-40 rounded-lg border border-[#17301F]/30 bg-[#17301F]/5 px-3 py-2.5 text-sm text-[#17301F] placeholder-[#9CB09E] outline-none focus:border-[#B23A2E]/70"
        />
        <button
          onClick={() => run(inputA, inputB)}
          disabled={loading || !inputA.trim() || !inputB.trim()}
          className="rounded-lg bg-[#B23A2E] px-5 py-2.5 text-sm font-semibold text-[#F4F7F0] transition-colors hover:bg-[#8E2E24] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Measuring…" : "Measure"}
        </button>
      </div>
      {error && (
        <p className="mt-3 text-center text-sm text-[#B23A2E]">{error}</p>
      )}

      {pair && !loading && (
        <div className="mt-8 text-center">
          <p className="text-6xl">{shipIcon(pct)}</p>
          <p className="tnum mt-2 text-7xl font-black text-[#17301F]">{pct}%</p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.3em] text-[#9CB09E]">
            cofounder compatibility
            {pair.cached && " · cached"}
          </p>
          <p className="mx-auto mt-3 max-w-md text-lg italic text-[#B23A2E]">
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
              onClick={async () => setShareMode(await exportPng(pair.a, pair.b, pct, verdict))}
              className="rounded-lg bg-[#B23A2E] px-5 py-2.5 text-sm font-semibold text-[#F4F7F0] transition-colors hover:bg-[#8E2E24]"
            >
              Share (PNG)
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
          {shareMode === "downloaded" && !canShareFiles() && (
            <p className="mt-2 font-mono text-[11px] text-amber-300/80">
              In-app browser blocked native share — downloaded instead.{" "}
              <a href="" target="_blank" className="underline">open in browser ↗</a>
            </p>
          )}
          <p className="mt-4 font-mono text-[11px] text-[#9CB09E]">
            Deterministic — same pair, same number, either order. Now{" "}
            <Link href="/roast" className="text-[#B23A2E] hover:underline">
              get roasted →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
