"use client";

import { useState, useSyncExternalStore } from "react";
import { getDailyMeta, type MetaCategory } from "@/lib/meta";

const subscribeNever = () => () => {};

/**
 * TODAY'S META chip strip (packs + arena): one compact chip per active
 * category, the day's loudest (first) filled accent. Tap a chip for its
 * definition. Chips render small but keep a 44px touch target via the
 * before: overlay — don't swap that for padding, it bloats the strip.
 * Date-derived → client-only.
 */
export default function MetaStrip() {
  const active = useSyncExternalStore(
    subscribeNever,
    () => getDailyMeta(),
    () => null as MetaCategory[] | null,
  );
  const [open, setOpen] = useState<string | null>(null);
  if (!active) return <div className="mb-5 min-h-[46px]" />;
  const opened = active.find((c) => c.key === open);

  return (
    <div className="mb-5 border-2 border-[#17301F] bg-[#F4F7F0] px-2.5 py-1.5 text-center shadow-[3px_3px_0_#17301F]">
      <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.3em] text-[#9CB09E]">
        Today&apos;s meta
      </p>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
        {active.map((cat, i) => (
          <button
            key={cat.key}
            onClick={() => setOpen(open === cat.key ? null : cat.key)}
            className={`relative border px-2 py-[3px] font-mono text-[10px] uppercase leading-tight tracking-[0.1em] transition-colors before:absolute before:inset-x-0 before:-inset-y-2 before:content-[''] ${
              i === 0
                ? "border-[#17301F] bg-[#B23A2E] text-[#F4F7F0]"
                : open === cat.key
                  ? "border-[#17301F] bg-[#17301F] text-[#F4F7F0]"
                  : "border-[#17301F]/40 text-[#17301F] hover:border-[#17301F]"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
      {opened && (
        <p className="deal-in mt-1 text-[12px] italic leading-snug text-[#5A6E5E]">
          {opened.name} — &ldquo;{opened.definition}&rdquo;
        </p>
      )}
    </div>
  );
}
