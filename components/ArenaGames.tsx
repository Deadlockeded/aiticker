"use client";

import { useState } from "react";
import type { MarketCard } from "@/lib/cards";
import Arena from "./Arena";
import { DraftMode, GauntletMode, LeagueMode, TagTeamMode } from "./ArenaModes";

export type ArenaGameMode = "classic" | "gauntlet" | "draft" | "tag" | "league";

const MODES: { id: ArenaGameMode; label: string; icon: string }[] = [
  { id: "classic", label: "Classic", icon: "⚔️" },
  { id: "gauntlet", label: "Gauntlet", icon: "🗼" },
  { id: "draft", label: "Draft", icon: "🃏" },
  { id: "tag", label: "Tag Team", icon: "🤼" },
  { id: "league", label: "League", icon: "🏆" },
];

/**
 * THE GAMES MENU — the arena is a venue with five events, not one form.
 * Classic keeps every existing flow (challenge links, MAIN EVENT auto,
 * the crossover); the other four are quick deterministic modes from
 * lib/modes.ts. Deep-linkable via /arena?mode=…
 */
export default function ArenaGames({
  cards,
  ranks,
  initialMode,
  initialMe,
  initialVs,
  autoStart,
}: {
  cards: MarketCard[];
  ranks: Record<string, number>;
  initialMode?: string;
  initialMe?: string;
  initialVs?: string;
  autoStart?: boolean;
}) {
  const valid = MODES.some((m) => m.id === initialMode);
  const [mode, setMode] = useState<ArenaGameMode>(
    valid ? (initialMode as ArenaGameMode) : "classic",
  );

  return (
    <div>
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            data-testid={`mode-${m.id}`}
            onClick={() => setMode(m.id)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors ${
              mode === m.id ? "bg-pink text-on-accent" : "bg-surface2 text-ink2"
            }`}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Classic stays mounted-by-mode only; each quick mode is its own card */}
      {mode === "classic" && (
        <Arena
          cards={cards}
          ranks={ranks}
          initialMe={initialMe}
          initialVs={initialVs}
          autoStart={autoStart}
        />
      )}
      {mode === "gauntlet" && <GauntletMode cards={cards} />}
      {mode === "draft" && <DraftMode cards={cards} />}
      {mode === "tag" && <TagTeamMode cards={cards} />}
      {mode === "league" && <LeagueMode cards={cards} />}
    </div>
  );
}
