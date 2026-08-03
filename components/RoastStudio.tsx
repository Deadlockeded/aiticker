"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { pickRoasts, type Heat } from "@/lib/lines";
import { fnvHash } from "@/lib/rng";
import { getRoastFacts, ScoreError } from "@/lib/score";
import { brandFonts, canShareFiles, canvasBlob, drawLogoMark, sharePng, type ShareOutcome } from "@/lib/share";

const HEATS: { id: Heat; label: string }[] = [
  { id: "mild", label: "Mild" },
  { id: "medium", label: "Medium" },
  { id: "crispy", label: "Extra Crispy" },
];

/**
 * Receipt serial — client-minted like card serials: a hash of the
 * handle+heat seeds a plausible number. Not authoritative (there is no
 * server counting roasts); deterministic on purpose so a burn link shows
 * the same Nº the sender saw.
 */
const roastSerial = (handle: string, heat: Heat) =>
  (fnvHash(`roast:${handle.toLowerCase()}:${heat}`) % 9000) + 999;

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > max && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

async function exportRoastPng(handle: string, heat: Heat, lines: string[]) {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const fonts = await brandFonts();
  ctx.fillStyle = "#F4F7F0";
  ctx.fillRect(0, 0, W, H);
  // receipt frame (dashed)
  ctx.strokeStyle = "#17301F";
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 10]);
  ctx.strokeRect(60, 60, W - 120, H - 120);
  ctx.setLineDash([]);
  ctx.textAlign = "center";
  ctx.fillStyle = "#B23A2E";
  ctx.font = `400 64px ${fonts.display}`;
  ctx.fillText("ROAST RECEIPT", W / 2, 190);
  ctx.fillStyle = "#17301F";
  ctx.font = `600 44px ${fonts.mono}`;
  ctx.fillText(`@${handle}`, W / 2, 260);
  ctx.fillStyle = "#5A6E5E";
  ctx.font = `400 26px ${fonts.mono}`;
  ctx.fillText(`ROAST Nº ${roastSerial(handle, heat)}`, W / 2, 310);
  // lines
  ctx.textAlign = "left";
  ctx.fillStyle = "#17301F";
  ctx.font = `400 34px ${fonts.body}`;
  let y = 420;
  for (const line of lines) {
    for (const l of wrap(ctx, `— ${line}`, W - 260)) {
      ctx.fillText(l, 140, y);
      y += 46;
    }
    y += 26;
  }
  // heat stamp
  ctx.save();
  ctx.translate(W / 2, H - 132 - 190);
  ctx.rotate((-8 * Math.PI) / 180);
  ctx.font = `400 40px ${fonts.display}`;
  const label = `PREPARED: ${heat === "crispy" ? "EXTRA CRISPY" : heat.toUpperCase()}`;
  const sw = ctx.measureText(label).width;
  ctx.strokeStyle = "#B23A2E";
  ctx.lineWidth = 5;
  ctx.strokeRect(-sw / 2 - 24, -46, sw + 48, 72);
  ctx.fillStyle = "#B23A2E";
  ctx.textAlign = "center";
  ctx.fillText(label, 0, 6);
  ctx.restore();
  // mark + url
  drawLogoMark(ctx, 140, H - 190, 44, fonts.display);
  ctx.textAlign = "right";
  ctx.fillStyle = "#5A6E5E";
  ctx.font = `600 26px ${fonts.mono}`;
  ctx.fillText("aiticker.xyz/roast", W - 140, H - 152);
  const blob = await canvasBlob(canvas);
  if (!blob) return "cancelled" as const;
  return sharePng(blob, {
    filename: `aiticker-roast-${handle}.png`,
    text: `The AIticker scout prepared me ${heat === "crispy" ? "extra crispy" : heat}.`,
    url: "https://aiticker.xyz/roast",
  });
}

/**
 * The roast, front door. Input focused on load; heat dial; receipt with
 * serial + heat stamp; burn links open a friend's receipt directly with
 * the avenge CTA. Same line pools everywhere — patterns, not persons.
 */
export default function RoastStudio({
  initialBurn,
  initialHeat,
}: {
  initialBurn?: string;
  initialHeat?: Heat;
}) {
  const [handle, setHandle] = useState("");
  const [heat, setHeat] = useState<Heat>(initialHeat ?? "medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ handle: string; heat: Heat; lines: string[] } | null>(null);
  const [burnMode, setBurnMode] = useState(Boolean(initialBurn));
  const [copied, setCopied] = useState(false);
  const [shareMode, setShareMode] = useState<ShareOutcome | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const burnRan = useRef(false);

  // ready to type on arrival
  useEffect(() => {
    if (!initialBurn) inputRef.current?.focus();
  }, [initialBurn]);

  const roast = async (h: string, asHeat: Heat, viaBurn = false) => {
    const clean = h.trim().replace(/^@/, "");
    if (!clean) return;
    setLoading(true);
    setError(null);
    try {
      const { facts } = await getRoastFacts(clean);
      setReceipt({ handle: facts.handle, heat: asHeat, lines: pickRoasts(facts, asHeat) });
      setBurnMode(viaBurn);
    } catch (err) {
      setError(err instanceof ScoreError ? err.message : "GitHub didn't pick up. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // burn links auto-run their receipt
  useEffect(() => {
    if (!initialBurn || burnRan.current) return;
    burnRan.current = true;
    const kickoff = setTimeout(() => void roast(initialBurn, initialHeat ?? "medium", true), 0);
    return () => clearTimeout(kickoff);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const burnLink = receipt
    ? `https://aiticker.xyz/roast?burn=${encodeURIComponent(receipt.handle)}&heat=${receipt.heat}`
    : "";

  return (
    <div className="mx-auto max-w-md">
      {burnMode && receipt && (
        <div className="mb-4 border-2 border-[#B23A2E] bg-[#B23A2E] p-3 text-center shadow-[3px_3px_0_#17301F]">
          <p className="font-display text-lg uppercase text-[#F4F7F0]">You&apos;ve been roasted.</p>
          <button
            onClick={() => {
              setReceipt(null);
              setBurnMode(false);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[#F0BFB6] underline underline-offset-2"
          >
            Avenge yourself →
          </button>
        </div>
      )}

      {!receipt && (
        <div className="paper-card p-5">
          <label className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-[#9CB09E]">
            GitHub username
          </label>
          <input
            ref={inputRef}
            value={handle}
            onChange={(e) => setHandle(e.target.value.slice(0, 40))}
            onKeyDown={(e) => e.key === "Enter" && roast(handle, heat)}
            placeholder="octocat"
            className="w-full border-2 border-[#17301F]/40 bg-[#EAF0E4] px-3 py-2.5 text-base text-[#17301F] outline-none focus:border-[#B23A2E]"
          />
          <div className="mt-3 flex gap-1.5">
            {HEATS.map((h) => (
              <button
                key={h.id}
                onClick={() => setHeat(h.id)}
                className={`min-h-11 flex-1 border px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors ${
                  heat === h.id
                    ? "border-[#17301F] bg-[#B23A2E] text-[#F4F7F0]"
                    : "border-[#17301F]/50 text-[#17301F] active:bg-[#17301F]/10"
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => roast(handle, heat)}
            disabled={loading || !handle.trim()}
            className="mt-4 w-full border-2 border-[#17301F] bg-[#B23A2E] px-5 py-3 font-display text-sm uppercase text-[#F4F7F0] shadow-[3px_3px_0_#17301F] hover:bg-[#8E2E24] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Preparing…" : "Roast me"}
          </button>
          {error && <p className="mt-2 text-sm text-[#B23A2E]">{error}</p>}
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-[#9CB09E]">
            Patterns, not persons. Public repos only. Affection guaranteed.
          </p>
        </div>
      )}

      {receipt && (
        <div className="coupon relative p-5">
          <p className="text-center font-display text-xl uppercase text-[#B23A2E]">
            Roast receipt
          </p>
          <p className="mt-0.5 text-center font-mono text-sm font-semibold text-[#17301F]">
            @{receipt.handle}
          </p>
          <p className="tnum text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[#9CB09E]">
            Roast Nº {roastSerial(receipt.handle, receipt.heat)}
          </p>
          <ul className="mt-4 space-y-3">
            {receipt.lines.map((line, i) => (
              <li key={i} className="text-[15px] leading-snug text-[#17301F]">
                — {line}
              </li>
            ))}
          </ul>
          <p className="mt-5 rotate-[-3deg] border-2 border-[#B23A2E] px-2 py-1 text-center font-display text-sm uppercase text-[#B23A2E]">
            Prepared: {receipt.heat === "crispy" ? "Extra Crispy" : receipt.heat}
          </p>

          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={async () =>
                setShareMode(await exportRoastPng(receipt.handle, receipt.heat, receipt.lines))
              }
              className="min-h-11 border-2 border-[#17301F] bg-[#B23A2E] px-4 py-2.5 font-display text-sm uppercase text-[#F4F7F0] shadow-[3px_3px_0_#17301F] hover:bg-[#8E2E24]"
            >
              Share the receipt
            </button>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(burnLink);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                } catch {
                  // clipboard blocked — nothing to do
                }
              }}
              className="min-h-11 border-2 border-[#17301F] px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-[#17301F] active:bg-[#17301F]/10"
            >
              {copied ? "Link copied ✓" : "Send them this →"}
            </button>
            {shareMode === "downloaded" && !canShareFiles() && (
              <p className="text-center font-mono text-[10px] text-[#5A6E5E]">
                Saved the image instead — this browser blocks native share.
              </p>
            )}
          </div>

          {/* the funnel: card → ship meter → arena */}
          <div className="mt-4 grid grid-cols-3 gap-1.5 border-t border-dotted border-[#9CB09E] pt-4">
            <Link
              href={`/create?gh=${encodeURIComponent(receipt.handle)}`}
              className="min-h-11 border border-[#17301F]/60 px-1 py-2 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-[#17301F] active:bg-[#17301F]/10"
            >
              Get your card
            </Link>
            <Link
              href={`/shipmeter?a=${encodeURIComponent(receipt.handle)}`}
              className="min-h-11 border border-[#17301F]/60 px-1 py-2 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-[#17301F] active:bg-[#17301F]/10"
            >
              Ship meter
            </Link>
            <Link
              href={`/arena?vs=@${encodeURIComponent(receipt.handle)}`}
              className="min-h-11 border border-[#17301F]/60 px-1 py-2 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-[#17301F] active:bg-[#17301F]/10"
            >
              Fight the index
            </Link>
          </div>

          <button
            onClick={() => {
              setReceipt(null);
              setBurnMode(false);
              setHandle("");
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="mt-3 w-full py-2 text-center font-mono text-[11px] uppercase tracking-widest text-[#5A6E5E] active:text-[#17301F]"
          >
            Roast someone else
          </button>
        </div>
      )}
    </div>
  );
}
