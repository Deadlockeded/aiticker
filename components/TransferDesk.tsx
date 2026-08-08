"use client";

import { useSyncExternalStore, useState } from "react";
import type { MarketCard } from "@/lib/cards";
import { SHARE } from "@/lib/tokens";
import {
  isFresh,
  transferFor,
  transferShareText,
  utcDayKey,
  type Transfer,
} from "@/lib/transfers";
import {
  brandFonts,
  canvasBlob,
  drawLogoMark,
  sharePng,
  type ShareOutcome,
} from "@/lib/share";

const subscribeNever = () => () => {};

/**
 * CAREER + THE TRANSFER — the back of the football sticker. The timeline
 * renders always (static data); the TRANSFERRED stamp, source line and the
 * OFFICIAL. announcement graphic only while the move is fresh (≤30 days).
 * Freshness is date-derived, so it resolves client-side after mount —
 * SSG pages must never bake in a day.
 */
export default function TransferDesk({ card }: { card: MarketCard }) {
  // day resolves post-hydration; server renders the timeline without a stamp
  const day = useSyncExternalStore(subscribeNever, utcDayKey, () => null);
  const [shared, setShared] = useState<ShareOutcome | null>(null);
  const career = card.career ?? [];
  const transfer = transferFor(card.id);
  if (career.length === 0 && !transfer) return null;
  const fresh = transfer !== null && day !== null && isFresh(transfer, day);

  return (
    <div className="surface-card p-4 sm:p-5">
      <div className="flex items-baseline justify-between border-b border-line2 pb-1">
        <h2 className="micro text-xs font-semibold tracking-[0.3em] text-ink">
          Career
        </h2>
        {fresh && (
          <span className="micro rotate-[-2deg] rounded-sm border border-pink px-1.5 py-0.5 text-[10px] font-black text-pink">
            Transferred
          </span>
        )}
      </div>
      <ul className="mt-3 space-y-2">
        {career.map((row, i) => {
          const isNew = fresh && transfer !== null && row.org === transfer.to;
          return (
            <li key={i} className="flex items-baseline gap-2 text-[13px]">
              <span className={`font-semibold ${isNew ? "text-pink" : "text-ink"}`}>
                {row.org}
              </span>
              <span className="min-w-0 flex-1 truncate text-ink2">{row.role}</span>
              <span className="tnum shrink-0 font-mono text-[11px] text-ink3">
                {row.years}
              </span>
              {isNew && (
                <span className="micro shrink-0 rounded-full bg-pink-tint px-1.5 py-0.5 text-[9px] font-semibold text-pink">
                  New
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {transfer && (
        <p className="micro mt-3 border-t border-dotted border-line pt-2 text-[10px] tracking-[0.1em] text-ink3">
          Transfer №{String(transfer.n).padStart(3, "0")} · {transfer.from} →{" "}
          {transfer.to} · Fee: undisclosed ·{" "}
          <a
            href={transfer.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-teal underline underline-offset-2"
          >
            Source↗
          </a>
        </p>
      )}
      {fresh && transfer && (
        <button
          onClick={async () =>
            setShared(await exportAnnouncement(card.name, transfer))
          }
          className="mt-3 w-full rounded-full bg-surface2 px-5 py-2.5 text-[14px] font-semibold text-ink transition-transform active:scale-[.97]"
        >
          {shared === "shared" || shared === "downloaded"
            ? "Announced ✓"
            : "Share the announcement →"}
        </button>
      )}
    </div>
  );
}

/** The OFFICIAL. graphic — dark share palette, old club fades, new club leads. */
async function exportAnnouncement(name: string, t: Transfer): Promise<ShareOutcome> {
  const W = 1200;
  const H = 630;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const fonts = await brandFonts();

  ctx.fillStyle = SHARE.bg;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.fillStyle = SHARE.pink;
  ctx.font = `700 34px ${fonts.mono}`;
  ctx.fillText("O F F I C I A L .", W / 2, 110);

  ctx.fillStyle = SHARE.ink;
  ctx.font = `700 92px ${fonts.display}`;
  ctx.fillText(name.toUpperCase(), W / 2, 250);

  // old club fades out left, new club arrives right
  ctx.font = `700 54px ${fonts.display}`;
  ctx.fillStyle = SHARE.ink3;
  ctx.textAlign = "right";
  ctx.fillText(t.from.toUpperCase(), W / 2 - 70, 380);
  ctx.fillStyle = SHARE.ink2;
  ctx.textAlign = "center";
  ctx.fillText("→", W / 2, 380);
  ctx.fillStyle = SHARE.up;
  ctx.textAlign = "left";
  ctx.fillText(t.to.toUpperCase(), W / 2 + 70, 380);

  ctx.textAlign = "center";
  ctx.fillStyle = SHARE.ink2;
  ctx.font = `400 30px ${fonts.display}`;
  ctx.fillText(`${t.role} · Fee: undisclosed`, W / 2, 450);

  ctx.fillStyle = SHARE.ink3;
  ctx.font = `600 24px ${fonts.mono}`;
  ctx.fillText(`TRANSFER Nº ${String(t.n).padStart(3, "0")}`, W / 2, 510);

  drawLogoMark(ctx, 80, H - 74, 44, fonts.display);
  ctx.textAlign = "right";
  ctx.fillStyle = SHARE.ink3;
  ctx.font = `600 24px ${fonts.mono}`;
  ctx.fillText("aiticker.xyz", W - 80, H - 40);

  const blob = await canvasBlob(canvas);
  if (!blob) return "cancelled";
  return sharePng(blob, {
    filename: `aiticker-transfer-${t.personId}.png`,
    text: transferShareText(t, name),
    url: `https://aiticker.xyz/cards/${t.personId}`,
  });
}
