"use client";

import { useState } from "react";
import Link from "next/link";
import { ROAST_LINES, type RoastFacts } from "@/lib/lines";
import { getRoastFacts, ScoreError } from "@/lib/score";
import ShareButton from "./ShareButton";

/** First 3 matching lines by specificity (array order); fallbacks guarantee 3. */
export function pickRoasts(facts: RoastFacts): string[] {
  return ROAST_LINES.filter((r) => r.when(facts))
    .slice(0, 3)
    .map((r) => r.line(facts));
}

async function exportPng(facts: RoastFacts, roasts: string[]) {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0a0a0b";
  ctx.fillRect(0, 0, W, H);

  // thermal paper
  const paperX = 120;
  const paperW = W - 240;
  ctx.fillStyle = "#f5f1e6";
  ctx.fillRect(paperX, 80, paperW, H - 220);
  // torn bottom edge
  ctx.beginPath();
  ctx.moveTo(paperX, H - 140);
  for (let x = paperX; x <= paperX + paperW; x += 28) {
    ctx.lineTo(x + 14, H - 118);
    ctx.lineTo(x + 28, H - 140);
  }
  ctx.lineTo(paperX + paperW, H - 140);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#1c1917";
  ctx.textAlign = "center";
  ctx.font = "700 52px ui-monospace, monospace";
  ctx.fillText("ROAST RECEIPT", W / 2, 190);
  ctx.font = "400 30px ui-monospace, monospace";
  ctx.fillText("aiticker.xyz/roast", W / 2, 240);
  ctx.fillText("· · · · · · · · · · · · · · · ·", W / 2, 300);
  ctx.font = "700 38px ui-monospace, monospace";
  ctx.fillText(`@${facts.handle}`, W / 2, 370);
  ctx.font = "400 28px ui-monospace, monospace";
  ctx.fillText(new Date().toISOString().slice(0, 10), W / 2, 415);

  ctx.textAlign = "left";
  let y = 510;
  roasts.forEach((roast, i) => {
    ctx.font = "700 30px ui-monospace, monospace";
    ctx.fillText(`ITEM ${i + 1}`, paperX + 60, y);
    y += 44;
    ctx.font = "400 30px ui-monospace, monospace";
    const words = roast.split(" ");
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > paperW - 120 && line) {
        ctx.fillText(line, paperX + 60, y);
        y += 40;
        line = word;
      } else line = next;
    }
    if (line) {
      ctx.fillText(line, paperX + 60, y);
      y += 68;
    }
  });

  ctx.textAlign = "center";
  ctx.font = "400 28px ui-monospace, monospace";
  ctx.fillText("· · · · · · · · · · · · · · · ·", W / 2, y + 20);
  ctx.font = "700 30px ui-monospace, monospace";
  ctx.fillText("THANK YOU, SHIP AGAIN SOON", W / 2, y + 80);

  await new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `roast-${facts.handle}.png`;
        link.click();
        URL.revokeObjectURL(link.href);
      }
      resolve();
    }, "image/png");
  });
}

export default function RoastView() {
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ facts: RoastFacts; roasts: string[] } | null>(null);

  const roast = async () => {
    const h = handle.trim().replace(/^@/, "");
    if (!h || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { facts } = await getRoastFacts(h);
      setResult({ facts, roasts: pickRoasts(facts) });
    } catch (err) {
      setError(err instanceof ScoreError ? err.message : "Fetch failed — try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="flex gap-2">
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && roast()}
          placeholder="your GitHub handle"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-cyan-400/50"
        />
        <button
          onClick={roast}
          disabled={loading || !handle.trim()}
          className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Reading…" : "Roast me"}
        </button>
      </div>
      {error && <p className="mt-3 text-center text-sm text-red-300">{error}</p>}
      <p className="mt-2 text-center font-mono text-[11px] text-white/35">
        For laughs — we only read public data, nothing is stored.
      </p>

      {result && (
        <div className="mt-8">
          {/* receipt */}
          <div
            className="mx-auto max-w-sm bg-[#f5f1e6] px-6 pb-8 pt-6 font-mono text-[13px] text-stone-900 shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
            style={{
              clipPath:
                "polygon(0 0, 100% 0, 100% calc(100% - 12px), 96% 100%, 92% calc(100% - 12px), 88% 100%, 84% calc(100% - 12px), 80% 100%, 76% calc(100% - 12px), 72% 100%, 68% calc(100% - 12px), 64% 100%, 60% calc(100% - 12px), 56% 100%, 52% calc(100% - 12px), 48% 100%, 44% calc(100% - 12px), 40% 100%, 36% calc(100% - 12px), 32% 100%, 28% calc(100% - 12px), 24% 100%, 20% calc(100% - 12px), 16% 100%, 12% calc(100% - 12px), 8% 100%, 4% calc(100% - 12px), 0 100%)",
            }}
          >
            <p className="text-center text-lg font-bold tracking-widest">
              ROAST RECEIPT
            </p>
            <p className="text-center text-[11px] text-stone-500">
              aiticker.xyz/roast
            </p>
            <p className="my-2 text-center text-stone-400">
              · · · · · · · · · · · · · · · ·
            </p>
            <p className="text-center font-bold">@{result.facts.handle}</p>
            <p className="text-center text-[11px] text-stone-500">
              {new Date().toISOString().slice(0, 10)}
            </p>
            <div className="mt-4 space-y-3">
              {result.roasts.map((roast, i) => (
                <div key={i}>
                  <p className="font-bold">ITEM {i + 1}</p>
                  <p className="leading-snug">{roast}</p>
                </div>
              ))}
            </div>
            <p className="my-3 text-center text-stone-400">
              · · · · · · · · · · · · · · · ·
            </p>
            <p className="text-center font-bold tracking-wide">
              THANK YOU, SHIP AGAIN SOON
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => exportPng(result.facts, result.roasts)}
              className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-cyan-300"
            >
              Download receipt (PNG)
            </button>
            <ShareButton
              label="Copy roast"
              text={`The Algorithm roasted @${result.facts.handle}:\n${result.roasts.map((r, i) => `${i + 1}. ${r}`).join("\n")}\naiticker.xyz/roast`}
              url=""
              className="text-sm"
            />
          </div>
          <p className="mt-4 text-center font-mono text-[11px] text-white/40">
            <Link href="/vs" className="text-cyan-300 hover:underline">
              Avenge yourself →
            </Link>{" "}
            ·{" "}
            <Link href="/create" className="text-cyan-300 hover:underline">
              Get rated →
            </Link>{" "}
            ·{" "}
            <Link href="/shipmeter" className="text-cyan-300 hover:underline">
              Now run the compatibility check →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
