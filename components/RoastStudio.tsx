"use client";

import { SHARE } from "@/lib/tokens";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { subscribeStore } from "@/lib/binder";
import { pickRoasts, type Heat } from "@/lib/lines";
import { fnvHash } from "@/lib/rng";
import {
  FREE_ROASTS_PER_DAY,
  getRoastQuotaSnapshot,
  roastsLeft,
  roastsLeftFrom,
  spendRoast,
} from "@/lib/roasts";
import { getRoastFacts, ScoreError } from "@/lib/score";
import { ButtonLink } from "./ui";
import { usePrefillHandle } from "./useSavedHandle";
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
  ctx.fillStyle = SHARE.surface;
  ctx.fillRect(0, 0, W, H);
  // receipt frame (dashed)
  ctx.strokeStyle = SHARE.ink;
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 10]);
  ctx.strokeRect(60, 60, W - 120, H - 120);
  ctx.setLineDash([]);
  ctx.textAlign = "center";
  ctx.fillStyle = SHARE.pink;
  ctx.font = `400 64px ${fonts.display}`;
  ctx.fillText("ROAST RECEIPT", W / 2, 190);
  ctx.fillStyle = SHARE.ink;
  ctx.font = `600 44px ${fonts.mono}`;
  ctx.fillText(`@${handle}`, W / 2, 260);
  ctx.fillStyle = SHARE.ink2;
  ctx.font = `400 26px ${fonts.mono}`;
  ctx.fillText(`ROAST Nº ${roastSerial(handle, heat)}`, W / 2, 310);
  // lines
  ctx.textAlign = "left";
  ctx.fillStyle = SHARE.ink;
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
  ctx.strokeStyle = SHARE.pink;
  ctx.lineWidth = 5;
  ctx.strokeRect(-sw / 2 - 24, -46, sw + 48, 72);
  ctx.fillStyle = SHARE.pink;
  ctx.textAlign = "center";
  ctx.fillText(label, 0, 6);
  ctx.restore();
  // mark + url
  drawLogoMark(ctx, 140, H - 190, 44, fonts.display);
  ctx.textAlign = "right";
  ctx.fillStyle = SHARE.ink2;
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
  // the daily batch — burn links never spend it, own roasts do
  const quotaRaw = useSyncExternalStore(subscribeStore, getRoastQuotaSnapshot, () => null);
  const left = roastsLeftFrom(quotaRaw);
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

  // GitHub-linked collectors get their own handle pre-loaded (still editable)
  usePrefillHandle((saved) => setHandle((h) => h || saved));

  const roast = async (h: string, asHeat: Heat, viaBurn = false) => {
    const clean = h.trim().replace(/^@/, "");
    if (!clean) return;
    if (!viaBurn && roastsLeft() <= 0) return; // gate card already showing
    setLoading(true);
    setError(null);
    try {
      const { facts } = await getRoastFacts(clean);
      // spend only on success — a typo or GitHub outage costs nothing
      if (!viaBurn) spendRoast();
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
        <div className="mb-4 border border-pink bg-pink p-3 text-center shadow-card">
          <p className="font-display text-lg uppercase text-on-accent">You&apos;ve been roasted.</p>
          <button
            onClick={() => {
              setReceipt(null);
              setBurnMode(false);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="mt-1 micro text-[11px] tracking-[0.2em] text-pink-tint underline underline-offset-2"
          >
            Avenge yourself →
          </button>
        </div>
      )}

      {/* the batch is gone — plain gate, funnel to earning surfaces */}
      {!receipt && left <= 0 && (
        <div className="surface-card p-5 text-center">
          <p className="font-display text-xl font-bold text-ink">
            That&apos;s five roasts today.
          </p>
          <p className="mt-1.5 text-[14px] text-ink2">
            The batch resets at midnight UTC.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <ButtonLink href="/arena">Fight in the Arena →</ButtonLink>
            <ButtonLink href="/packs" tone="secondary">
              Rip a pack →
            </ButtonLink>
          </div>
        </div>
      )}

      {!receipt && left > 0 && (
        <div className="surface-card p-5">
          <label className="mb-1 block micro text-[11px] text-ink3">
            GitHub username
          </label>
          <input
            ref={inputRef}
            value={handle}
            onChange={(e) => setHandle(e.target.value.slice(0, 40))}
            onKeyDown={(e) => e.key === "Enter" && roast(handle, heat)}
            placeholder="octocat"
            className="w-full rounded-full bg-surface2 px-4 py-3 text-[16px] text-ink outline-none ring-inset placeholder:text-ink3 focus:ring-2 focus:ring-pink"
          />
          <div className="mt-3 flex gap-1 rounded-full bg-surface2 p-1">
            {HEATS.map((h) => (
            <button
              key={h.id}
              onClick={() => setHeat(h.id)}
              className={`min-h-9 flex-1 rounded-full px-3 py-2 text-[14px] font-semibold transition-all ${
                heat === h.id ? "bg-pink text-on-accent" : "text-ink2 hover:text-ink"
              }`}
            >
              {h.label}
            </button>
          ))}
          </div>
          <button
            onClick={() => roast(handle, heat)}
            disabled={loading || !handle.trim()}
            className="mt-4 w-full rounded-full bg-pink px-6 py-3.5 text-[16px] font-semibold text-on-accent transition-transform active:scale-[.97] disabled:pointer-events-none disabled:opacity-40"
          >
            {loading ? "Preparing…" : "Roast me"}
          </button>
          {error && <p className="mt-2 text-sm text-pink">{error}</p>}
          <p className="mt-3 micro text-[10px] tracking-[0.15em] text-ink3">
            Patterns, not persons. Public repos only. Affection guaranteed.
            {left < FREE_ROASTS_PER_DAY &&
              ` · ${left} of ${FREE_ROASTS_PER_DAY} free roasts left today`}
          </p>
        </div>
      )}

      {receipt && (
        <div className="rounded-[22px] border border-dashed border-line2 bg-surface relative p-5">
          <p className="text-center font-display text-xl uppercase text-pink">
            Roast receipt
          </p>
          <p className="mt-0.5 text-center font-mono text-sm font-semibold text-ink">
            @{receipt.handle}
          </p>
          <p className="tnum text-center micro text-[10px] tracking-[0.2em] text-ink3">
            Roast Nº {roastSerial(receipt.handle, receipt.heat)}
          </p>
          <ul className="mt-4 space-y-3">
            {receipt.lines.map((line, i) => (
              <li key={i} className="text-[15px] leading-snug text-ink">
                — {line}
              </li>
            ))}
          </ul>
          <p className="mt-5 rotate-[-3deg] border border-pink px-2 py-1 text-center font-display text-sm uppercase text-pink">
            Prepared: {receipt.heat === "crispy" ? "Extra Crispy" : receipt.heat}
          </p>

          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={async () =>
                setShareMode(await exportRoastPng(receipt.handle, receipt.heat, receipt.lines))
              }
              className="min-h-11 border border-line2 bg-pink px-4 py-2.5 font-display text-sm uppercase text-on-accent shadow-card hover:bg-pink"
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
              className="min-h-11 border border-line2 px-4 py-2.5 micro text-xs font-semibold text-ink active:bg-surface2"
            >
              {copied ? "Link copied ✓" : "Send them this →"}
            </button>
            {shareMode === "downloaded" && !canShareFiles() && (
              <p className="text-center font-mono text-[10px] text-ink2">
                Saved the image instead — this browser blocks native share.
              </p>
            )}
          </div>

          {/* the funnel: card → ship meter → arena */}
          <div className="mt-4 grid grid-cols-3 gap-1.5 border-t border-dotted border-ink3 pt-4">
            <Link
              href={`/create?gh=${encodeURIComponent(receipt.handle)}`}
              className="min-h-11 border border-line px-1 py-2 text-center micro text-[10px] tracking-[0.1em] text-ink active:bg-surface2"
            >
              Get your card
            </Link>
            <Link
              href={`/shipmeter?a=${encodeURIComponent(receipt.handle)}`}
              className="min-h-11 border border-line px-1 py-2 text-center micro text-[10px] tracking-[0.1em] text-ink active:bg-surface2"
            >
              Ship meter
            </Link>
            <Link
              href={`/arena?vs=@${encodeURIComponent(receipt.handle)}`}
              className="min-h-11 border border-line px-1 py-2 text-center micro text-[10px] tracking-[0.1em] text-ink active:bg-surface2"
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
            className="mt-3 w-full py-2 text-center micro text-[11px] text-ink2 active:text-ink"
          >
            Roast someone else
          </button>
        </div>
      )}
    </div>
  );
}
