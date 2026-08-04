"use client";

import { useState, useSyncExternalStore } from "react";
import { getBinderSnapshot, parseBinder, subscribeStore } from "@/lib/binder";
import { formatTicks } from "@/lib/market";
import { getCapTable, getRitualsSnapshot, roundClaimedFrom } from "@/lib/rituals";
import {
  FUNDING_SET,
  getRoyaltyClaimSnapshot,
  hasTheFund,
  owedNow,
} from "@/lib/royalties";
import FundStrip from "./FundStrip";
import RaiseARound from "./RaiseARound";
import RoyaltiesCard from "./RoyaltiesCard";

/**
 * THE TREASURY — the binder's one-line money desk. Royalties, the weekly
 * round, and Fund progress fold behind a single slim strip so the collection
 * stays above the fold; tapping opens a sheet with the full cards (claiming,
 * receipts, cap table) exactly as they render on home. The strip hides only
 * when there is truly nothing inside.
 */
export default function TreasuryStrip() {
  const binderRaw = useSyncExternalStore(subscribeStore, getBinderSnapshot, () => null);
  const ritualsRaw = useSyncExternalStore(subscribeStore, getRitualsSnapshot, () => null);
  // claims subscription: the "to collect" segment must clear after claiming
  useSyncExternalStore(subscribeStore, getRoyaltyClaimSnapshot, () => null);
  const [sheet, setSheet] = useState(false);

  if (binderRaw === null || ritualsRaw === null) return null;
  const binder = parseBinder(binderRaw);
  const owed = owedNow(binder);
  const roundReady = !roundClaimedFrom(ritualsRaw);
  const fundOwned = FUNDING_SET.filter((id) => (binder[id]?.copies ?? 0) > 0).length;
  const fundComplete = hasTheFund(binder);
  const capCount = getCapTable().length;

  if (owed.total <= 0 && !roundReady && fundOwned === 0 && capCount === 0) return null;

  return (
    <div className="mb-3">
      <button
        data-testid="treasury-strip"
        onClick={() => setSheet(true)}
        className="flex w-full items-center gap-2 rounded-[22px] bg-surface px-3.5 py-2.5 shadow-card transition-transform active:scale-[.99]"
      >
        {/* segments scroll under the pinned arrow on the busiest days */}
        <span
          className="flex flex-1 items-center gap-2 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          <span className="micro shrink-0 font-semibold text-ink3">Treasury</span>
          {owed.total > 0 && (
            <span className="micro shrink-0 font-semibold text-amber">
              ⚡ {formatTicks(owed.total)} to collect
            </span>
          )}
          {roundReady && (
            <span className="micro shrink-0 font-semibold text-pink">Round ready</span>
          )}
          {fundOwned > 0 && (
            <span
              className={`micro shrink-0 ${fundComplete ? "font-semibold text-amber" : "text-ink3"}`}
            >
              {fundComplete ? "🏛 Fund complete" : `Fund ${fundOwned}/${FUNDING_SET.length}`}
            </span>
          )}
          {owed.total <= 0 && !roundReady && capCount > 0 && (
            <span className="micro shrink-0 text-ink3">Cap table</span>
          )}
        </span>
        <span className="shrink-0 text-[13px] text-ink3">→</span>
      </button>

      {sheet && (
        <div className="fixed inset-0 z-40" onClick={() => setSheet(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-line bg-bg p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          >
            <div className="mx-auto max-w-md">
              <p className="font-display text-[20px] font-extrabold text-ink">Treasury</p>
              <p className="mb-4 mt-0.5 text-[13px] text-ink2">
                Royalties, rounds, and the Fund.
              </p>
              <RoyaltiesCard />
              <RaiseARound showHistory />
              <FundStrip />
              <button
                onClick={() => setSheet(false)}
                className="mt-2 w-full rounded-full bg-surface2 px-6 py-3 text-[16px] font-semibold text-ink transition-transform active:scale-[.97]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
