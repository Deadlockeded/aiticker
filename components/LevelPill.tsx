"use client";

import { useSyncExternalStore } from "react";
import { subscribeStore } from "@/lib/binder";
import { getXPSnapshot, levelFor } from "@/lib/xp";

/** Nav chip: level + collector title, live from the XP store. */
export default function LevelPill() {
  const raw = useSyncExternalStore(subscribeStore, getXPSnapshot, () => null);
  if (raw === null) return null;
  const xp = parseInt(raw, 10) || 0;
  const { level, title, progress } = levelFor(xp);

  return (
    <span
      className="relative hidden shrink-0 items-center gap-1.5 overflow-hidden rounded-lg border border-line bg-surface2 px-2.5 py-1.5 sm:flex"
      title={`${xp} XP`}
    >
      <span
        className="absolute inset-y-0 left-0 bg-pink/10"
        style={{ width: `${progress * 100}%` }}
      />
      <span className="tnum relative font-mono text-[11px] font-bold text-pink">
        Lv{level}
      </span>
      <span className="relative text-[11px] text-ink2">{title}</span>
    </span>
  );
}
