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
import { generateRound, roundShareText, type SpecialWeek } from "@/lib/rounds";
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
  const [ledgerOpen, setLedgerOpen] = useState(false);
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
        <button
          onClick={() => setLedgerOpen(true)}
          className="block w-full rounded-[22px] bg-surface p-3 text-left shadow-card transition-transform active:scale-[.99]"
        >
          <p className="micro text-ink3">Cap table</p>
          <ul className="mt-1.5 space-y-1">
            {[...history].slice(-3).reverse().map((row) => (
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
          <p className="micro mt-2 text-pink">
            {history.length > 3
              ? `All ${history.length} bad deals →`
              : "Review the damage →"}
          </p>
        </button>
      )}

      {/* THE LEDGER — every deal you shouldn't have taken. Each row's terms
          regenerate from its week key, so history costs no extra storage. */}
      {ledgerOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setLedgerOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[22px] bg-bg p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
          >
            <div className="mx-auto max-w-md">
              <p className="font-display text-[20px] font-extrabold text-ink">
                Cap table
              </p>
              <p className="mt-0.5 text-[13px] text-ink2">
                Every deal you shouldn&apos;t have taken.
              </p>
              <ul className="mt-4 space-y-2">
                {[...history].reverse().map((row) => {
                  const deal = generateRound(row.week);
                  return (
                    <li key={row.week} className="rounded-[16px] bg-surface p-3 shadow-card">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[15px] font-semibold text-ink">
                          {row.investor}
                        </span>
                        <span className="tnum shrink-0 font-mono text-[13px] text-ink">
                          {formatTicks(row.amount)}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="micro text-ink3">{row.week.replace("20", "'")}</span>
                        {deal.special && <SpecialChip kind={deal.special} />}
                      </div>
                      <p className="micro mt-1.5 text-ink2">Terms: {deal.term}</p>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 rounded-[16px] bg-surface2 p-3 text-center">
                <p className="tnum font-display text-[18px] font-extrabold text-ink">
                  {formatTicks(history.reduce((s, r) => s + r.amount, 0))} raised to date
                </p>
                <p className="micro mt-1 text-ink3">
                  Diligence performed: none · Nothing is binding · Everything vested
                </p>
              </div>
              <button
                onClick={() => setLedgerOpen(false)}
                className="mt-4 w-full rounded-full bg-surface2 px-6 py-3 text-[16px] font-semibold text-ink transition-transform active:scale-[.97]"
              >
                Close the books
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Special-week badge on a ledger row. */
function SpecialChip({ kind }: { kind: Exclude<SpecialWeek, null> }) {
  const label =
    kind === "down" ? "Down round" : kind === "oversub" ? "Oversubscribed" : "Bridge";
  const tone =
    kind === "down"
      ? "bg-pink-tint text-pink"
      : kind === "oversub"
        ? "bg-teal-tint text-teal"
        : "bg-amber-tint text-amber";
  return (
    <span className={`micro rounded-full px-1.5 py-0.5 font-semibold ${tone}`}>{label}</span>
  );
}
