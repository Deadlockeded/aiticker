"use client";

import { useState } from "react";
import type { MarketCard } from "@/lib/cards";
import type { ArtifactMetrics } from "@/lib/types";
import { STAT_ADJECTIVES, STAT_DEFS, statTier } from "@/lib/lines";

function TierChip({ value }: { value: number }) {
  const tier = statTier(value);
  return (
    <span
      className={`border px-1 py-0.5 font-mono text-[9px] font-semibold tracking-wider ${
        tier.hot
          ? "border-pink bg-pink text-on-accent"
          : "border-line2 text-ink"
      }`}
    >
      {tier.word}
    </span>
  );
}

/**
 * The stat system: full-word labels, tier chips, tap-to-expand Editor's
 * definitions (one open at a time), and a best-stat percentile line
 * computed against the whole index.
 */
export default function StatBlock({
  card,
  allCards,
}: {
  card: MarketCard;
  allCards: MarketCard[];
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const agi = card.id === "agi";

  const rows: { key: string; label: string; value: number }[] =
    card.type === "artifact"
      ? (["uselessness", "ubiquity", "lore", "vibes"] as const).map((k) => ({
          key: k,
          label: k.toUpperCase(),
          value: (card.metrics as ArtifactMetrics)[k],
        }))
      : (
          [
            ["innovation", "INNOVATION"],
            ["influence", "INFLUENCE"],
            ["momentum", "MOMENTUM"],
          ] as const
        ).map(([k, label]) => ({ key: k, label, value: card.stats[k] }));

  // percentile of the card's best stat vs the index (same stat, same pool)
  const best = [...rows].sort((a, b) => b.value - a.value)[0];
  const pool = allCards.filter((c) => c.id !== "agi" &&
    (card.type === "artifact" ? c.type === "artifact" : c.type !== "artifact"));
  const below = pool.filter((c) => {
    const v =
      card.type === "artifact"
        ? (c.metrics as ArtifactMetrics)[best.key as keyof ArtifactMetrics]
        : c.stats[best.key as "innovation" | "influence" | "momentum"];
    return v < best.value;
  }).length;
  const pct = Math.round((below / Math.max(1, pool.length)) * 100);

  return (
    <div className="surface-card p-4">
      <h2 className="border-b border-line2 pb-1 micro text-xs font-semibold tracking-[0.3em] text-ink">
        The stat line
      </h2>
      <ul className="mt-2">
        {rows.map(({ key, label, value }) => (
          <li key={key} className="border-b border-dotted border-ink3 last:border-0">
            <button
              onClick={() => setOpenKey(openKey === key ? null : key)}
              className="flex min-h-11 w-full items-center gap-2 py-1.5 text-left"
            >
              <span className="w-32 font-mono text-[11px] font-semibold tracking-widest text-ink">
                {label}
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface2">
                <span
                  className="block h-full rounded-full bg-ink"
                  style={{ width: agi ? "0%" : `${value}%` }}
                />
              </span>
              <span className="tnum w-7 text-right font-mono text-sm font-bold text-ink">
                {agi ? "?" : value}
              </span>
              {!agi && <TierChip value={value} />}
            </button>
            {openKey === key && (
              <p className="pb-2 pl-1 text-[13px] italic leading-snug text-ink2">
                {STAT_DEFS[key]}
              </p>
            )}
          </li>
        ))}
      </ul>
      {!agi && (
        <p className="mt-2 micro text-[11px] text-pink">
          More {STAT_ADJECTIVES[best.key] ?? best.key} than {pct}% of the index.
        </p>
      )}
    </div>
  );
}
