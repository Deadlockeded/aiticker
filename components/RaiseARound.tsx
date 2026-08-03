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
      <div className={`coupon p-4 text-center ${compact ? "" : "mb-5"}`}>
        <p className="font-display text-sm uppercase text-[#1F6E3D]">
          Round closed — +{formatTicks(justRaised)}
        </p>
        <p className="mt-1 text-[13px] text-[#5A6E5E]">
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
    <div className={`coupon p-4 text-center ${compact ? "" : "mb-5"}`}>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-[#B23A2E]">
        This week&apos;s round
      </p>
      <p className="mt-1.5 text-[15px] leading-snug text-[#17301F]">
        <span className="font-semibold">{formatTicks(round.amount)}</span> from{" "}
        {round.investor}, at a valuation nobody verified.
      </p>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.15em] text-[#5A6E5E]">
        Terms: {round.term}
      </p>
      <button
        onClick={() => setJustRaised(claimRound())}
        className="mt-3 border-2 border-[#17301F] bg-[#B23A2E] px-6 py-2.5 font-display text-sm uppercase text-[#F4F7F0] shadow-[3px_3px_0_#17301F] hover:bg-[#8E2E24]"
      >
        Sign it →
      </button>
    </div>
  );
}
