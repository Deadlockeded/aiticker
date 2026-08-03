"use client";

import { useState, useSyncExternalStore } from "react";
import { subscribeStore } from "@/lib/binder";
import { formatTicks } from "@/lib/market";
import {
  claimRound,
  getRitualsSnapshot,
  getRound,
  roundClaimedFrom,
} from "@/lib/rituals";
import ShareButton from "./ShareButton";

/**
 * RAISE A ROUND — the weekly term sheet. Investor and terms are deterministic
 * from the week key (everyone gets the same absurd round); the grant is a
 * ritual, so it is never clipped by the daily earn cap. Renders nothing once
 * this week's round is claimed, except for the session it was claimed in.
 */
export default function RaiseARound({ compact = false }: { compact?: boolean }) {
  const raw = useSyncExternalStore(subscribeStore, getRitualsSnapshot, () => null);
  const [justRaised, setJustRaised] = useState<number | null>(null);
  if (raw === null) return null;
  const claimed = roundClaimedFrom(raw);
  if (claimed && justRaised === null) return null;

  const round = getRound();

  if (justRaised !== null) {
    return (
      <div className={`rounded-[22px] border border-dashed border-line2 bg-surface p-4 text-center ${compact ? "" : "mb-5"}`}>
        <p className="font-display text-sm uppercase text-up">
          Round closed — +{formatTicks(justRaised)}
        </p>
        <p className="mt-1 text-[13px] text-ink2">
          {round.investor} is in. Nobody read the terms.
        </p>
        <div className="mt-2 flex justify-center">
          <ShareButton
            label="Share the round"
            text={`My lab just raised ${formatTicks(round.amount)} from ${round.investor} on AIticker. Terms: ${round.term}. Diligence: none. aiticker.xyz`}
            url=""
            className="text-xs"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-[22px] border border-dashed border-line2 bg-surface p-4 text-center ${compact ? "" : "mb-5"}`}>
      <p className="micro text-[10px] font-semibold tracking-[0.3em] text-pink">
        This week&apos;s round
      </p>
      <p className="mt-1.5 text-[15px] leading-snug text-ink">
        <span className="font-semibold">{formatTicks(round.amount)}</span> from{" "}
        {round.investor}, at a valuation nobody verified.
      </p>
      <p className="mt-1 micro text-[11px] tracking-[0.15em] text-ink2">
        Terms: {round.term}
      </p>
      <button
        onClick={() => setJustRaised(claimRound())}
        className="mt-3 border border-line2 bg-pink px-6 py-2.5 font-display text-sm uppercase text-on-accent shadow-card hover:bg-pink"
      >
        Sign it →
      </button>
    </div>
  );
}
