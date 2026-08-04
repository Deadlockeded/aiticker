"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { MarketCard } from "@/lib/cards";
import { getBinderSnapshot, parseBinder, subscribeStore } from "@/lib/binder";
import {
  getCustodySnapshot,
  markNudged,
  parseCustody,
} from "@/lib/custody";
import { KEYS, readRaw } from "@/lib/storage";
import { isAuthEnabled, getSupabase } from "@/lib/sync";
import { OPEN_AUTH_EVENT } from "./AuthMenu";

const subscribeNever = () => () => {};

/**
 * THE TWO NUDGES — after the Custody Desk was dismissed, at most two small
 * banners, ever: (a) the first rare+ pull, (b) the first return visit on a
 * later day. Whichever fires first, then the other once, then silence
 * forever. Signed-in collectors never see either. Dismissing a banner
 * spends it permanently — the "no" is remembered, not renegotiated.
 */
export default function SyncNudge({ cards }: { cards: MarketCard[] }) {
  const raw = useSyncExternalStore(subscribeStore, getBinderSnapshot, () => null);
  const custodyRaw = useSyncExternalStore(subscribeStore, getCustodySnapshot, () => null);
  const returning = useSyncExternalStore(
    subscribeNever,
    () => (parseInt(readRaw(KEYS.binderVisit) ?? "0", 10) || 0) > 0,
    () => false,
  );
  const [signedOut, setSignedOut] = useState(false);
  // a dismissal quiets the whole visit — the second nudge (if ever) waits
  // for its own day, it never queues up behind the first
  const [quietNow, setQuietNow] = useState(false);

  useEffect(() => {
    if (!isAuthEnabled()) return;
    getSupabase()
      ?.auth.getSession()
      .then(({ data }) => setSignedOut(!data.session))
      .catch(() => setSignedOut(true));
  }, []);

  const custody = parseCustody(custodyRaw);

  const rarePlus = useMemo(() => {
    if (!raw) return false;
    const binder = parseBinder(raw);
    return cards.some(
      (c) => binder[c.id] && ["rare", "epic", "legendary", "mythic"].includes(c.rarity),
    );
  }, [raw, cards]);

  // pick at most ONE due nudge; each kind fires once in a lifetime
  const kind: "rare" | "returning" | null =
    rarePlus && !custody.nudged.rare
      ? "rare"
      : returning && !custody.nudged.returning
        ? "returning"
        : null;

  if (!isAuthEnabled() || !signedOut || !custody.prompted || !kind || quietNow) return null;

  const line =
    kind === "rare"
      ? "That's a real pull. Still self-custodying? Bold."
      : "Welcome back. Your binder survived the night. It won't always.";

  return (
    <div
      data-testid={`custody-nudge-${kind}`}
      className="mb-4 flex items-center gap-3 rounded-[22px] border border-dashed border-line2 bg-surface p-3"
    >
      <p className="flex-1 text-[13px] text-ink">
        {line}{" "}
        <button
          onClick={() => {
            markNudged(kind);
            setQuietNow(true);
            window.dispatchEvent(new Event(OPEN_AUTH_EVENT));
          }}
          className="font-semibold text-pink underline underline-offset-2"
        >
          Save progress
        </button>
      </p>
      <button
        onClick={() => {
          markNudged(kind);
          setQuietNow(true);
        }}
        className="shrink-0 px-2 font-mono text-xs text-ink3 hover:text-ink"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
