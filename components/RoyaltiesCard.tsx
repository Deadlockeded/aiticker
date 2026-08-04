"use client";

import { useState, useSyncExternalStore } from "react";
import { getBinderSnapshot, parseBinder, subscribeStore } from "@/lib/binder";
import { getAllCards } from "@/lib/cards";
import { formatTicks } from "@/lib/market";
import {
  claimRoyalties,
  getRoyaltyClaimSnapshot,
  owedNow,
  parseClaimed,
  ROYALTY_CONFIG,
  type Owed,
} from "@/lib/royalties";

const NAMES = new Map(getAllCards().map((c) => [c.id, c.name]));

/**
 * COLLECT ROYALTIES — appears only when the real world paid your artifacts.
 * One tap claims every unclaimed trigger day in the 7-day window; the
 * receipts say exactly which headline paid and how much.
 */
export default function RoyaltiesCard() {
  const binderRaw = useSyncExternalStore(subscribeStore, getBinderSnapshot, () => null);
  const claimRaw = useSyncExternalStore(subscribeStore, getRoyaltyClaimSnapshot, () => null);
  const [justPaid, setJustPaid] = useState<Owed | null>(null);

  if (binderRaw === null || claimRaw === null) return null;
  const owed = justPaid ?? owedNow(parseBinder(binderRaw));
  if (owed.total <= 0 && !justPaid) return null;

  const collected = justPaid !== null;
  const flavor =
    ROYALTY_CONFIG[owed.lines[0]?.entry.artifactId]?.flavor ?? "the news";

  return (
    <div className="mb-5 rounded-[22px] bg-surface p-4 shadow-card">
      <div className="flex items-baseline justify-between gap-2">
        <p className="micro font-semibold text-amber">⚡ Royalties</p>
        <p className="micro text-ink3">real headlines, real Ticks</p>
      </div>
      <p className="mt-1.5 text-[15px] leading-snug text-ink">
        {collected
          ? "Collected. Your artifacts remain gainfully employed."
          : "The news did your artifacts a favour."}
      </p>
      <ul className="mt-3 space-y-2">
        {owed.lines.map((line, i) => (
          <li key={i} className="rounded-[14px] bg-surface2 p-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[14px] font-semibold text-ink">
                {NAMES.get(line.entry.artifactId) ?? line.entry.artifactId}
              </span>
              <span className="tnum shrink-0 font-mono text-[13px] text-up">
                +{formatTicks(line.amount)}
              </span>
            </div>
            <p className="micro mt-0.5 text-ink3">
              ₮{line.entry.payoutPerCopy} × {line.copies}{" "}
              {line.copies === 1 ? "copy" : "copies"}
              {line.fundBoosted && " · ×1.5 THE FUND"} · {line.entry.date.slice(5)}
            </p>
            <p className="mt-1 truncate text-[12px] italic text-ink2">
              “{line.entry.receipt.headline}”
              {line.entry.receipt.url && (
                <>
                  {" "}
                  <a
                    href={line.entry.receipt.url}
                    target="_blank"
                    rel="noreferrer"
                    className="not-italic text-teal underline"
                  >
                    {line.entry.receipt.source.toUpperCase()}↗
                  </a>
                </>
              )}
            </p>
          </li>
        ))}
      </ul>
      {!collected ? (
        <button
          onClick={() => {
            const snapshot = owed;
            claimRoyalties();
            setJustPaid(snapshot);
          }}
          className="mt-3 w-full rounded-full bg-pink px-6 py-3 text-[16px] font-semibold text-on-accent transition-transform active:scale-[.97]"
        >
          Collect royalties {formatTicks(owed.total)}
        </button>
      ) : (
        owed.total >= 30 && (
          <button
            onClick={() =>
              navigator.share?.({
                text: `My artifacts paid ${formatTicks(owed.total)} today because the internet did ${flavor}. aiticker.xyz`,
              }).catch(() => {})
            }
            className="mt-3 w-full rounded-full bg-surface2 px-6 py-3 text-[15px] font-semibold text-ink transition-transform active:scale-[.97]"
          >
            Share the payday →
          </button>
        )
      )}
    </div>
  );
}
