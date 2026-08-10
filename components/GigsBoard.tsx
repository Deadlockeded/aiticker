"use client";

import { useState, useSyncExternalStore } from "react";
import { subscribeStore } from "@/lib/binder";
import {
  BOARD_CLEAR_BONUS,
  boardFor,
  claimGig,
  claimWeeklyGig,
  getGigsSnapshot,
  gigProgress,
  parseGigs,
  weeklyGigFor,
} from "@/lib/gigs";
import { formatTicks } from "@/lib/market";

/**
 * GIGS — the day's to-do list. Three day-seeded gigs (same board for
 * everyone), one weekly arc with a progress bar. Tap-to-claim when done;
 * clearing the whole board stamps the bonus. Compact mode renders the
 * same rows tighter for sheets.
 */
/** One-line gigs status for the profile menu. */
export function GigsMenuLine() {
  const raw = useSyncExternalStore(subscribeStore, getGigsSnapshot, () => null);
  if (raw === null) return null;
  const s = parseGigs(raw);
  const done = boardFor(s.day).filter((g) => s.claimed.includes(g.id)).length;
  return (
    <p className="mt-1.5 micro text-[9px] tracking-[0.15em] text-ink3">
      Gigs · {done}/3 today
    </p>
  );
}

export default function GigsBoard({ compact = false }: { compact?: boolean }) {
  const raw = useSyncExternalStore(subscribeStore, getGigsSnapshot, () => null);
  const [justPaid, setJustPaid] = useState<Record<string, number>>({});
  if (raw === null) return null;
  const s = parseGigs(raw);
  const board = boardFor(s.day);
  const weekly = weeklyGigFor(s.week);
  const weeklyDone = gigProgress(weekly, s, true);
  const cleared = board.every((g) => s.claimed.includes(g.id));

  return (
    <div className={`${compact ? "mb-3" : "mb-5"} rounded-[22px] bg-surface p-4 shadow-card`}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="micro font-semibold text-pink">Gigs</p>
        {cleared ? (
          <p className="micro rotate-[-2deg] rounded-sm border border-line2 px-1.5 py-0.5 font-black text-up">
            Board cleared +₮{BOARD_CLEAR_BONUS}
          </p>
        ) : (
          <p className="micro text-ink3">fresh board daily</p>
        )}
      </div>
      <ul className={`${compact ? "mt-2 space-y-1.5" : "mt-3 space-y-2"}`}>
        {board.map((gig) => {
          const done = gigProgress(gig, s);
          const complete = done >= gig.target;
          const claimed = s.claimed.includes(gig.id);
          return (
            <li key={gig.id} className="flex items-center gap-2.5">
              <span
                aria-hidden
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  claimed
                    ? "bg-up text-on-accent"
                    : complete
                      ? "bg-pink text-on-accent"
                      : "bg-surface2 text-ink3"
                }`}
              >
                {claimed || complete ? "✓" : ""}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-[14px] font-semibold ${claimed ? "text-ink3 line-through" : "text-ink"}`}>
                  {gig.title}
                </p>
                {!compact && (
                  <p className="truncate micro text-[10px] text-ink3">{gig.subline}</p>
                )}
              </div>
              {claimed ? (
                <span className="tnum shrink-0 font-mono text-[12px] text-up">
                  +{formatTicks(justPaid[gig.id] ?? gig.pay)}
                </span>
              ) : complete ? (
                <button
                  data-testid={`claim-gig-${gig.id}`}
                  onClick={() => {
                    const paid = claimGig(gig.id);
                    if (paid > 0) setJustPaid((m) => ({ ...m, [gig.id]: paid }));
                  }}
                  className="shrink-0 rounded-full bg-pink px-3 py-1.5 text-[13px] font-semibold text-on-accent transition-transform active:scale-[.95]"
                >
                  Claim {formatTicks(gig.pay)}
                </button>
              ) : (
                <span className="tnum shrink-0 font-mono text-[11px] text-ink3">
                  {done}/{gig.target}
                </span>
              )}
            </li>
          );
        })}
        {/* the weekly arc */}
        <li className="border-t border-dotted border-line pt-2">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                s.weekClaimed
                  ? "bg-up text-on-accent"
                  : weeklyDone >= weekly.target
                    ? "bg-pink text-on-accent"
                    : "bg-surface2 text-ink3"
              }`}
            >
              {s.weekClaimed || weeklyDone >= weekly.target ? "✓" : ""}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`truncate text-[14px] font-semibold ${s.weekClaimed ? "text-ink3 line-through" : "text-ink"}`}>
                {weekly.title}
              </p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface2">
                <div
                  className="h-full rounded-full bg-teal transition-[width] duration-500"
                  style={{ width: `${(weeklyDone / weekly.target) * 100}%` }}
                />
              </div>
            </div>
            {s.weekClaimed ? (
              <span className="tnum shrink-0 font-mono text-[12px] text-up">
                +{formatTicks(weekly.pay)}
              </span>
            ) : weeklyDone >= weekly.target ? (
              <button
                data-testid="claim-weekly-gig"
                onClick={() => claimWeeklyGig()}
                className="shrink-0 rounded-full bg-pink px-3 py-1.5 text-[13px] font-semibold text-on-accent transition-transform active:scale-[.95]"
              >
                Claim {formatTicks(weekly.pay)}
              </button>
            ) : (
              <span className="tnum shrink-0 font-mono text-[11px] text-ink3">
                {weeklyDone}/{weekly.target}
              </span>
            )}
          </div>
        </li>
      </ul>
    </div>
  );
}
