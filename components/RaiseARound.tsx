"use client";

import { useState, useSyncExternalStore } from "react";
import { subscribeStore } from "@/lib/binder";
import { formatTicks } from "@/lib/market";
import {
  claimRound,
  getCapTable,
  getRitualsSnapshot,
  getRound,
  roundClaimedFrom,
} from "@/lib/rituals";
import { roundShareText } from "@/lib/rounds";
import ShareButton from "./ShareButton";

/**
 * RAISE A ROUND — the weekly term sheet, assembled by lib/rounds.ts (every
 * element week-seeded, so the whole world sees the same round). The grant is
 * a ritual, never clipped by the daily earn cap. Special weeks change the
 * amount with the copy and the button. After the session it was claimed in,
 * the card disappears until Monday; the cap table (binder only) remains.
 */
export default function RaiseARound({
  showHistory = false,
}: {
  /** Binder passes true: the fictional cap table accumulates below. */
  showHistory?: boolean;
}) {
  const raw = useSyncExternalStore(subscribeStore, getRitualsSnapshot, () => null);
  const [justRaised, setJustRaised] = useState<number | null>(null);
  if (raw === null) return null;
  const claimed = roundClaimedFrom(raw);
  const round = getRound();
  const history = showHistory ? getCapTable() : [];

  const card =
    claimed && justRaised === null ? null : justRaised !== null ? (
      <div className="rounded-[22px] border border-dashed border-line2 bg-surface p-4 text-center">
        <p className="font-display text-[15px] font-bold text-up">
          Round closed — +{formatTicks(justRaised)}
        </p>
        {/* the SIGN moment — week-seeded, same for everyone */}
        <p className="mt-1 text-[13px] text-ink2">{round.signLine}</p>
        <div className="mt-2 flex justify-center">
          <ShareButton
            label="Share the round"
            text={roundShareText(round)}
            url=""
            className="text-xs"
          />
        </div>
      </div>
    ) : (
      <div className="rounded-[22px] border border-dashed border-line2 bg-surface p-4 text-center">
        <p className="micro font-semibold text-pink">This week&apos;s round</p>
        {round.preline && (
          <p className="mt-1.5 text-[13px] italic text-ink2">{round.preline}</p>
        )}
        <p className="mt-1.5 text-[15px] leading-snug text-ink">{round.headline}</p>
        <p className="micro mt-1.5 text-ink2">Terms: {round.term}</p>
        <button
          data-testid="claim-round"
          onClick={() => setJustRaised(claimRound())}
          className="mt-3 rounded-full bg-pink px-6 py-2.5 text-[16px] font-semibold text-on-accent transition-transform active:scale-[.97]"
        >
          {round.button}
        </button>
      </div>
    );

  if (!card && history.length === 0) return null;

  return (
    <div className="mb-5 space-y-2">
      {card}
      {history.length > 0 && (
        <div className="rounded-[22px] bg-surface p-3 shadow-card">
          <p className="micro text-ink3">Cap table</p>
          <ul className="mt-1.5 space-y-1">
            {[...history].reverse().map((row) => (
              <li
                key={row.week}
                className="flex items-baseline justify-between gap-2 text-[13px]"
              >
                <span className="truncate text-ink">{row.investor}</span>
                <span className="micro shrink-0 text-ink3">{row.week.replace("20", "'")}</span>
                <span className="tnum shrink-0 font-mono text-[12px] text-ink2">
                  {formatTicks(row.amount)}
                </span>
              </li>
            ))}
          </ul>
          <p className="micro mt-2 text-ink3">
            Fully diluted. Emotionally, at least.
          </p>
        </div>
      )}
    </div>
  );
}
