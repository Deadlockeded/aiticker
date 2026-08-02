"use client";

import { useState, useSyncExternalStore } from "react";
import { getDailyMeta, type MetaCategory } from "@/lib/meta";

const subscribeNever = () => () => {};

/**
 * "TODAY'S META: SHITPOSTING · AURA · …" magazine strip on the Arena page.
 * Date-derived → client-only render (null server snapshot). Tap a category
 * to expand the Editor's definition.
 */
export default function MetaStrip() {
  const active = useSyncExternalStore(
    subscribeNever,
    () => getDailyMeta(),
    () => null as MetaCategory[] | null,
  );
  const [open, setOpen] = useState<string | null>(null);
  if (!active) return null;
  const opened = active.find((c) => c.key === open);

  return (
    <div className="mb-6 border-y-2 border-[#1E2430] py-2 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#5A6070]">
        <span className="mr-1 font-semibold text-[#C23B2E]">Today&apos;s meta:</span>
        {active.map((cat, i) => (
          <span key={cat.key}>
            {i > 0 && <span className="mx-1 text-[#9AA0AC]">·</span>}
            <button
              onClick={() => setOpen(open === cat.key ? null : cat.key)}
              className={`uppercase tracking-[0.25em] underline decoration-dotted underline-offset-4 ${
                open === cat.key ? "text-[#1E2430]" : "hover:text-[#1E2430]"
              }`}
            >
              {cat.name}
            </button>
          </span>
        ))}
      </p>
      {opened && (
        <p className="deal-in mt-1.5 text-[13px] italic text-[#5A6070]">
          {opened.name} — &ldquo;{opened.definition}&rdquo;
        </p>
      )}
    </div>
  );
}
