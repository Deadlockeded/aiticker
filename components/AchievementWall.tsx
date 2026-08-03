"use client";

import { useMemo, useSyncExternalStore } from "react";
import { subscribeStore } from "@/lib/binder";
import {
  ACHIEVEMENTS,
  getUnlockedSnapshot,
  parseUnlocked,
} from "@/lib/achievements";
import { getXPSnapshot, levelFor, levelShareText, raiseLine } from "@/lib/xp";
import ShareButton from "./ShareButton";

/** Badge wall on /binder. */
export default function AchievementWall({ valuation = 0 }: { valuation?: number }) {
  const raw = useSyncExternalStore(subscribeStore, getUnlockedSnapshot, () => null);
  const xpRaw = useSyncExternalStore(subscribeStore, getXPSnapshot, () => null);
  const unlocked = useMemo(
    () => new Set(raw === null ? [] : parseUnlocked(raw)),
    [raw],
  );
  if (raw === null) return null;
  const stage = levelFor(parseInt(xpRaw ?? "0", 10) || 0);

  return (
    <section className="mt-10">
      {/* the funding ladder — the XP levels, dressed for the industry */}
      <div className="mb-5 border border-line2 bg-surface p-3 text-center shadow-card">
        <p className="micro text-[10px] tracking-[0.3em] text-ink3">
          Stage
        </p>
        <p className="mt-0.5 font-display text-lg uppercase text-ink">
          {stage.title}
        </p>
        <p className="mt-0.5 text-[13px] italic text-ink2">
          {raiseLine(stage.level)}
        </p>
        <div className="mx-auto mt-2 h-1.5 w-40 border border-line">
          <div
            className="h-full bg-pink"
            style={{ width: `${Math.round(stage.progress * 100)}%` }}
          />
        </div>
        <div className="mt-2 flex justify-center">
          <ShareButton
            label="Share the round"
            text={levelShareText(stage.level, Math.round(valuation))}
            url=""
            className="text-xs"
          />
        </div>
      </div>
      <h2 className="mb-3 text-sm font-semibold text-ink">
        Achievements{" "}
        <span className="tnum font-mono text-xs text-ink3">
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
                  ? "border-line bg-pink/5"
                  : "border-line bg-ink/[0.03] opacity-60"
              }`}
            >
              <span className={`text-2xl ${has ? "" : "grayscale"}`}>
                {has ? a.emoji : "🔒"}
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-[13px] font-semibold ${has ? "text-ink" : "text-ink2"}`}
                >
                  {a.name}
                </span>
                <span className="block text-[11px] leading-snug text-ink3">
                  {a.desc}
                </span>
              </span>
            </div>
          );
        })}
      </div>
      {[...unlocked].filter((id) => id.startsWith("artifact-win-")).length > 0 && (
        <p className="mt-3 font-mono text-[11px] text-ink3">
          ◆ {[...unlocked].filter((id) => id.startsWith("artifact-win-")).length}{" "}
          hidden artifact trophies earned
        </p>
      )}
    </section>
  );
}
