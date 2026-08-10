"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { computeCommunityRating, toMarketCard } from "@/lib/create";
import { getScoredProfile, ScoreError, type ScoredProfile } from "@/lib/score";
import { compatibility, shipBars, shipReading, type ShipBar } from "@/lib/shipmeter";
import { SHARE } from "@/lib/tokens";
import Avatar, { initialsOf, shipAvatarUrl } from "./Avatar";
import ShareButton from "./ShareButton";
import { trackGig } from "@/lib/gigs";
import { pledgedHouseShortName } from "@/lib/houses";
import { usePrefillHandle } from "./useSavedHandle";
import { brandFonts, canShareFiles, canvasBlob, drawLogoMark, sharePng, type ShareOutcome } from "@/lib/share";
import TradingCard from "./TradingCard";

async function exportPng(
  a: ScoredProfile,
  b: ScoredProfile,
  pct: number,
  reading: { title: string; line: string; equity: string },
  bars: ShipBar[],
) {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const fonts = await brandFonts();
  // share images render DARK — they read better in a feed
  ctx.fillStyle = SHARE.bg;
  ctx.fillRect(0, 0, W, H);

  // github.com/{handle}.png is CORS-friendly, so the canvas stays untainted
  // and toBlob keeps working. A failed load becomes an initials tile — a
  // share must never be blocked by someone's missing avatar.
  const load = (handle: string) =>
    new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = shipAvatarUrl(handle);
    });
  const [imgA, imgB] = await Promise.all([load(a.handle), load(b.handle)]);

  const TINTS = [SHARE.tealTint, SHARE.amberTint, SHARE.pinkTint, SHARE.violetTint];
  const face = (img: HTMLImageElement | null, x: number, handle: string, i: number) => {
    const R = 132;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, 330, R, 0, Math.PI * 2);
    ctx.clip();
    if (img) ctx.drawImage(img, x - R, 330 - R, R * 2, R * 2);
    else {
      ctx.fillStyle = TINTS[i % TINTS.length];
      ctx.fillRect(x - R, 330 - R, R * 2, R * 2);
      ctx.fillStyle = SHARE.ink;
      ctx.font = `800 78px ${fonts.display}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initialsOf(handle), x, 330);
      ctx.textBaseline = "alphabetic";
    }
    ctx.restore();
    ctx.strokeStyle = SHARE.pink;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(x, 330, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = SHARE.ink;
    ctx.font = `600 34px ${fonts.body}`;
    ctx.textAlign = "center";
    ctx.fillText(`@${handle}`.slice(0, 18), x, 520);
  };
  face(imgA, 290, a.handle, 0);
  face(imgB, W - 290, b.handle, 1);

  ctx.textAlign = "center";
  ctx.fillStyle = SHARE.ink3;
  ctx.font = `800 74px ${fonts.display}`;
  ctx.fillText("×", W / 2, 352);

  ctx.fillStyle = SHARE.pink;
  ctx.font = `800 180px ${fonts.display}`;
  ctx.fillText(`${pct}%`, W / 2, 700);
  ctx.fillStyle = SHARE.ink3;
  ctx.font = `600 26px ${fonts.mono}`;
  ctx.fillText(reading.title.toUpperCase().slice(0, 34), W / 2, 748);

  ctx.fillStyle = SHARE.ink;
  ctx.font = `500 38px ${fonts.body}`;
  let y = 830;
  let line = "";
  for (const word of reading.line.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > W - 180 && line) {
      ctx.fillText(line, W / 2, y);
      line = word;
      y += 50;
    } else line = next;
  }
  if (line) ctx.fillText(line, W / 2, y);

  // category bars
  let by = y + 80;
  for (const bar of bars) {
    ctx.textAlign = "left";
    ctx.fillStyle = SHARE.ink3;
    ctx.font = `600 22px ${fonts.mono}`;
    ctx.fillText(bar.name.toUpperCase(), 110, by);
    ctx.fillStyle = SHARE.surface2;
    ctx.beginPath();
    ctx.roundRect(110, by + 14, W - 220, 14, 7);
    ctx.fill();
    ctx.fillStyle = SHARE.pink;
    ctx.beginPath();
    ctx.roundRect(110, by + 14, ((W - 220) * bar.score) / 100, 14, 7);
    ctx.fill();
    by += 70;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = SHARE.ink3;
  ctx.font = `600 24px ${fonts.mono}`;
  drawLogoMark(ctx, W / 2 - 130, H - 120, 40, fonts.display, { onDark: true });
  const houseName = pledgedHouseShortName();
  if (houseName) {
    ctx.textAlign = "left";
    ctx.fillText(`HOUSE ${houseName}`, 110, H - 50);
    ctx.textAlign = "center";
  }
  ctx.fillText("aiticker.xyz/ship", W / 2, H - 50);

  const blob = await canvasBlob(canvas);
  if (!blob) return "cancelled" as const;
  return sharePng(blob, {
    filename: `shipmeter-${a.handle}-${b.handle}.png`,
    text: `@${a.handle} × @${b.handle}: ${pct}% compatible. ${reading.title}.`,
    url: "https://aiticker.xyz/shipmeter",
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

  // GitHub-linked collectors ship themselves first (handle one, editable)
  usePrefillHandle((saved) => setInputA((h) => h || saved));
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
      trackGig("ship_run");
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
  const reading = pair
    ? shipReading(pct, pair.a.handle, pair.b.handle)
    : { title: "", line: "", equity: "" };
  const bars = pair ? shipBars(pair.a, pair.b) : [];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <input
          value={inputA}
          onChange={(e) => setInputA(e.target.value)}
          placeholder="handle one"
          className="w-40 rounded-lg border border-line bg-surface2 px-3 py-2.5 text-sm text-ink placeholder-ink3 outline-none focus:border-line"
        />
        <span className="text-xl">×</span>
        <input
          value={inputB}
          onChange={(e) => setInputB(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run(inputA, inputB)}
          placeholder="handle two"
          className="w-40 rounded-lg border border-line bg-surface2 px-3 py-2.5 text-sm text-ink placeholder-ink3 outline-none focus:border-line"
        />
        <button
          onClick={() => run(inputA, inputB)}
          disabled={loading || !inputA.trim() || !inputB.trim()}
          className="rounded-lg bg-pink px-5 py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-pink disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Measuring…" : "Measure"}
        </button>
      </div>
      {error && (
        <p className="mt-3 text-center text-sm text-pink">{error}</p>
      )}

      {pair && !loading && (
        <div className="mt-8 text-center">
          {/* the pairing, with faces — the thing people actually share */}
          <div className="flex items-center justify-center gap-4">
            <Avatar handle={pair.a.handle} size={92} />
            <span className="font-display text-[28px] font-extrabold text-ink3">×</span>
            <Avatar handle={pair.b.handle} size={92} />
          </div>
          <p className="mt-2 text-[14px] text-ink2">
            @{pair.a.handle} × @{pair.b.handle}
            {pair.cached && " · cached"}
          </p>

          <p className="tnum mt-5 font-display text-[68px] font-extrabold leading-none text-pink">
            {pct}%
          </p>
          <p className="micro mt-1 text-ink3">Cofounder compatibility</p>
          <p className="mt-3 font-display text-[20px] font-extrabold text-ink">
            {reading.title}
          </p>
          <p className="mx-auto mt-2 max-w-md text-[16px] text-ink2">
            {reading.line}
          </p>

          <div className="mx-auto mt-6 max-w-md space-y-3 rounded-[22px] bg-surface p-4 text-left shadow-card">
            {bars.map((bar) => (
              <div key={bar.key}>
                <div className="flex items-baseline justify-between">
                  <span className="micro text-ink3">{bar.name}</span>
                  <span className="tnum font-mono text-[12px] text-ink2">{bar.score}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface2">
                  <div className="h-full rounded-full bg-pink" style={{ width: `${bar.score}%` }} />
                </div>
                <p className="mt-1 text-[13px] leading-snug text-ink2">{bar.line}</p>
              </div>
            ))}
          </div>

          {/* pure joke, and the fine print below says so */}
          <p className="mx-auto mt-4 max-w-md rounded-full bg-surface2 px-4 py-2 text-[14px] text-ink2">
            Suggested split: {reading.equity}
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
              onClick={async () =>
                setShareMode(await exportPng(pair.a, pair.b, pct, reading, bars))
              }
              className="rounded-lg bg-pink px-5 py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-pink"
            >
              Share (PNG)
            </button>
            <ShareButton
              label="Copy share text"
              text={`@${pair.a.handle} × @${pair.b.handle}: ${pct}% compatible. ${reading.title}. ${reading.line} — aiticker.xyz/shipmeter`}
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
          {/* the funnel: three ways to keep playing, both handles carried */}
          <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-2">
            <Link
              href={`/roast?burn=${pair.a.handle}&next=${pair.b.handle}`}
              className="rounded-full bg-teal px-3 py-2.5 text-center text-[14px] font-semibold text-on-accent dark-teal-ink"
            >
              Roast us both
            </Link>
            <Link
              href={`/create?gh=${pair.a.handle}`}
              className="rounded-full bg-surface2 px-3 py-2.5 text-center text-[14px] font-semibold text-ink"
            >
              Get your cards
            </Link>
            <Link
              href={`/arena?vs=@${pair.b.handle}`}
              className="rounded-full bg-surface2 px-3 py-2.5 text-center text-[14px] font-semibold text-ink"
            >
              Fight each other
            </Link>
          </div>
          <p className="mt-4 text-[13px] text-ink3">
            Deterministic — same pair, same number, either order. The equity
            split is a joke; this is entertainment, not advice.
          </p>
        </div>
      )}
    </div>
  );
}
