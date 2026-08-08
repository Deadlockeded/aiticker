"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { getAllCards } from "@/lib/cards";
import { freshTransfers, utcDayKey } from "@/lib/transfers";

const NAMES = new Map(getAllCards().map((c) => [c.id, c.name]));
const subscribeNever = () => () => {};

/**
 * DEADLINE DAY — the home ticker for fresh moves (≤30 days). One line per
 * transfer, the fee is always undisclosed (there is no fee), and the link
 * is the whole payoff. Renders nothing when the window is quiet, and only
 * after mount — the feed is date-derived and SSG must not bake in a day.
 */
export default function TransferTicker() {
  const day = useSyncExternalStore(subscribeNever, utcDayKey, () => null);
  if (day === null) return null;
  const fresh = freshTransfers(day);
  if (fresh.length === 0) return null;

  return (
    <div className="mb-4 rounded-[22px] bg-surface p-3 shadow-card">
      <p className="micro font-semibold text-pink">Transfer news</p>
      <ul className="mt-1.5 space-y-1.5">
        {fresh.map((t) => (
          <li
            key={t.n}
            className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[14px]"
          >
            <span className="font-semibold text-ink">
              {NAMES.get(t.personId) ?? t.personId}
            </span>
            <span className="text-ink2">
              {t.from} → {t.to}
            </span>
            <span className="micro text-[10px] text-ink3">Fee: undisclosed</span>
            <Link
              href={`/cards/${t.personId}`}
              className="micro ml-auto shrink-0 font-semibold text-pink"
            >
              Here we go →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
