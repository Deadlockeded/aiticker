"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { MarketCard } from "@/lib/cards";
import { getBinderSnapshot, parseBinder, subscribeStore } from "@/lib/binder";
import { KEYS, readRaw, writeRaw } from "@/lib/storage";
import { authEnabled, getSupabase } from "@/lib/sync";
import { OPEN_AUTH_EVENT } from "./AuthMenu";

const NUDGE_KEY = "ai-index:sync-nudge:v1";
const subscribeNever = () => () => {};

/**
 * One-time, dismissible save-progress nudge in the binder. Appears ONLY
 * once value exists (a rare+ pull, or a return visit) and only while
 * signed out. Renders nothing when auth is disabled.
 */
export default function SyncNudge({ cards }: { cards: MarketCard[] }) {
  const raw = useSyncExternalStore(subscribeStore, getBinderSnapshot, () => null);
  const dismissed = useSyncExternalStore(
    subscribeNever,
    () => readRaw(NUDGE_KEY) === "1",
    () => true,
  );
  const returning = useSyncExternalStore(
    subscribeNever,
    () => (parseInt(readRaw(KEYS.binderVisit) ?? "0", 10) || 0) > 0,
    () => false,
  );
  const [hidden, setHidden] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  const hasValue = useMemo(() => {
    if (!raw) return false;
    const binder = parseBinder(raw);
    const rarePlus = cards.some(
      (c) => binder[c.id] && ["rare", "epic", "legendary", "mythic"].includes(c.rarity),
    );
    return rarePlus || returning;
  }, [raw, cards, returning]);

  // session check without rendering any auth UI ourselves
  useMemo(() => {
    if (!authEnabled) return;
    getSupabase()
      ?.auth.getSession()
      .then(({ data }) => setSignedIn(!!data.session))
      .catch(() => setSignedIn(false));
  }, []);

  if (!authEnabled || dismissed || hidden || !hasValue || signedIn !== false) return null;

  return (
    <div className="rounded-[22px] border border-dashed border-line2 bg-surface mb-4 flex items-center gap-3 p-3">
      <p className="flex-1 text-[13px] text-ink">
        Your binder lives in this browser.{" "}
        <button
          onClick={() => window.dispatchEvent(new Event(OPEN_AUTH_EVENT))}
          className="font-semibold text-pink underline underline-offset-2"
        >
          Sign in to keep it.
        </button>
      </p>
      <button
        onClick={() => {
          writeRaw(NUDGE_KEY, "1");
          setHidden(true);
        }}
        className="shrink-0 px-2 font-mono text-xs text-ink3 hover:text-ink"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
