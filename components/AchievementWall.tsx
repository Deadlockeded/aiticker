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
      <h2 className="mb-3 text-sm font-semibold text-[#1E2430]">
        Achievements{" "}
        <span className="tnum font-mono text-xs text-[#9AA0AC]">
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
                  ? "border-[#C23B2E]/50 bg-[#C23B2E]/5"
                  : "border-[#1E2430]/30 bg-[#1E2430]/[0.03] opacity-60"
              }`}
            >
              <span className={`text-2xl ${has ? "" : "grayscale"}`}>
                {has ? a.emoji : "🔒"}
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-[13px] font-semibold ${has ? "text-[#1E2430]" : "text-[#5A6070]"}`}
                >
                  {a.name}
                </span>
                <span className="block text-[11px] leading-snug text-[#9AA0AC]">
                  {a.desc}
                </span>
              </span>
            </div>
          );
        })}
      </div>
      {[...unlocked].filter((id) => id.startsWith("artifact-win-")).length > 0 && (
        <p className="mt-3 font-mono text-[11px] text-[#9AA0AC]">
          ◆ {[...unlocked].filter((id) => id.startsWith("artifact-win-")).length}{" "}
          hidden artifact trophies earned
        </p>
      )}
    </section>
  );
}
