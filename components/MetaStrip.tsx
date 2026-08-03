"use client";

import { useState, useSyncExternalStore } from "react";
import { getDailyMeta, type MetaCategory } from "@/lib/meta";

const subscribeNever = () => () => {};

/**
 * TODAY'S META chip strip (packs + arena): bordered box, one chip per
 * active category — the day's loudest (first) chip filled accent. Tap a
 * chip to expand its definition. Date-derived → client-only.
 */
export default function MetaStrip() {
  const active = useSyncExternalStore(
    subscribeNever,
    () => getDailyMeta(),
    () => null as MetaCategory[] | null,
  );
  const [open, setOpen] = useState<string | null>(null);
  if (!active) return <div className="mb-6 min-h-[52px]" />;
  const opened = active.find((c) => c.key === open);

  return (
    <div className="mb-6 border-2 border-[#17301F] bg-[#F4F7F0] p-2 text-center shadow-[3px_3px_0_#17301F]">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <span className="mr-1 font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-[#5A6E5E]">
          Today&apos;s meta
        </span>
        {active.map((cat, i) => (
          <button
            key={cat.key}
            onClick={() => setOpen(open === cat.key ? null : cat.key)}
            className={`border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors ${
              i === 0
                ? "border-[#17301F] bg-[#B23A2E] text-[#F4F7F0]"
                : open === cat.key
                  ? "border-[#17301F] bg-[#17301F] text-[#F4F7F0]"
                  : "border-[#17301F]/50 text-[#17301F] hover:border-[#17301F]"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
      {opened && (
        <p className="deal-in mt-1.5 text-[13px] italic text-[#5A6E5E]">
          {opened.name} — &ldquo;{opened.definition}&rdquo;
        </p>
      )}
    </div>
  );
}
