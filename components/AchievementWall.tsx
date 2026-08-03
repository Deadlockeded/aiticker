"use client";

import { useMemo, useSyncExternalStore } from "react";
import { subscribeStore } from "@/lib/binder";
import {
  ACHIEVEMENTS,
  getUnlockedSnapshot,
  parseUnlocked,
} from "@/lib/achievements";

/** Badge wall on /binder. */
export default function AchievementWall() {
  const raw = useSyncExternalStore(subscribeStore, getUnlockedSnapshot, () => null);
  const unlocked = useMemo(
    () => new Set(raw === null ? [] : parseUnlocked(raw)),
    [raw],
  );
  if (raw === null) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-sm font-semibold text-[#17301F]">
        Achievements{" "}
        <span className="tnum font-mono text-xs text-[#9CB09E]">
          {unlocked.size}/{ACHIEVEMENTS.length}
        </span>
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {ACHIEVEMENTS.map((a) => {
          const has = unlocked.has(a.id);
          return (
            <div
              key={a.id}
              className={`flex items-start gap-3 rounded-xl border p-3 ${
                has
                  ? "border-[#B23A2E]/50 bg-[#B23A2E]/5"
                  : "border-[#17301F]/30 bg-[#17301F]/[0.03] opacity-60"
              }`}
            >
              <span className={`text-2xl ${has ? "" : "grayscale"}`}>
                {has ? a.emoji : "🔒"}
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-[13px] font-semibold ${has ? "text-[#17301F]" : "text-[#5A6E5E]"}`}
                >
                  {a.name}
                </span>
                <span className="block text-[11px] leading-snug text-[#9CB09E]">
                  {a.desc}
                </span>
              </span>
            </div>
          );
        })}
      </div>
      {[...unlocked].filter((id) => id.startsWith("artifact-win-")).length > 0 && (
        <p className="mt-3 font-mono text-[11px] text-[#9CB09E]">
          ◆ {[...unlocked].filter((id) => id.startsWith("artifact-win-")).length}{" "}
          hidden artifact trophies earned
        </p>
      )}
    </section>
  );
}
