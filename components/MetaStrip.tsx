"use client";

import { useState, useSyncExternalStore } from "react";
import { getDailyMeta, type MetaCategory } from "@/lib/meta";

const subscribeNever = () => () => {};

/**
 * TODAY'S META — the four active fight categories as chips. The day's
 * loudest (first) is the filled one. Tap for its definition. Date-derived,
 * so client-only with a null server snapshot.
 */
export default function MetaStrip() {
  const active = useSyncExternalStore(
    subscribeNever,
    () => getDailyMeta(),
    () => null as MetaCategory[] | null,
  );
  const [open, setOpen] = useState<string | null>(null);
  if (!active) return <div className="mb-5 h-[82px]" aria-hidden />;
  const opened = active.find((c) => c.key === open);

  return (
    <div className="mb-5 rounded-[22px] bg-surface p-3 shadow-card">
      <p className="micro text-center text-ink3">Today&apos;s meta</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
        {active.map((cat, i) => (
          <button
            key={cat.key}
            onClick={() => setOpen(open === cat.key ? null : cat.key)}
            className={`micro relative rounded-full px-2.5 py-1.5 font-semibold transition-colors before:absolute before:inset-x-0 before:-inset-y-2 before:content-[''] ${
              i === 0
                ? "bg-pink text-on-accent"
                : open === cat.key
                  ? "bg-ink text-bg"
                  : "bg-surface2 text-ink2"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
      {opened && (
        <p className="deal-in mt-2 text-center text-[13px] leading-snug text-ink2">
          {opened.definition}
        </p>
      )}
    </div>
  );
}
