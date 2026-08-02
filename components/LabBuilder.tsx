"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { MarketCard } from "@/lib/cards";
import { subscribeStore } from "@/lib/binder";
import {
  deleteLab,
  getLabsSnapshot,
  LAB_SIZE,
  MAX_LABS,
  parseLabs,
  saveLab,
  scoreLab,
} from "@/lib/lab";
import TradingCard from "./TradingCard";
import CardArt from "./CardArt";
import ShareButton from "./ShareButton";

export default function LabBuilder({
  cards,
  ranks,
  initialIds,
  initialName,
}: {
  cards: MarketCard[];
  ranks: Record<string, number>;
  /** From a shared /lab?ids=… link. */
  initialIds: string[];
  initialName: string;
}) {
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const [picked, setPicked] = useState<string[]>(
    initialIds.filter((id) => byId.has(id)).slice(0, LAB_SIZE),
  );
  const [name, setName] = useState(initialName);
  const [query, setQuery] = useState("");

  const labsRaw = useSyncExternalStore(subscribeStore, getLabsSnapshot, () => null);
  const labs = useMemo(
    () => (labsRaw === null ? [] : parseLabs(labsRaw)),
    [labsRaw],
  );

  const members = picked.map((id) => byId.get(id)!);
  const { teamRating, base, bonuses } = scoreLab(members);
  const full = picked.length === LAB_SIZE;

  const toggle = (id: string) => {
    setPicked((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : p.length < LAB_SIZE ? [...p, id] : p,
    );
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards.slice(0, 24);
    return cards.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 24);
  }, [cards, query]);

  const shareUrl = () =>
    `${window.location.origin}/lab?ids=${picked.join(",")}&name=${encodeURIComponent(name || "My Lab")}`;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        {/* lineup */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 32))}
              placeholder="Name your lab…"
              className="min-w-40 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white placeholder-white/30 outline-none focus:border-cyan-400/50"
            />
            <div className="text-right">
              <span className="tnum block font-mono text-3xl font-bold text-white">
                {picked.length ? teamRating : "—"}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
                team rating
              </span>
            </div>
          </div>

          {/* fanned lineup */}
          <div className="flex justify-center py-2">
            {Array.from({ length: LAB_SIZE }, (_, i) => {
              const card = members[i];
              return (
                <div
                  key={i}
                  className="w-28 shrink-0 sm:w-32 [&:not(:first-child)]:-ml-6"
                  style={{ transform: `rotate(${(i - 2) * 3}deg) translateY(${Math.abs(i - 2) * 6}px)` }}
                >
                  {card ? (
                    <button onClick={() => toggle(card.id)} className="block w-full text-left">
                      <TradingCard card={card} rank={ranks[card.id]} />
                    </button>
                  ) : (
                    <div className="flex aspect-[1/1.42] items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] font-mono text-lg text-white/20">
                      {i + 1}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {bonuses.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              <span className="rounded-md bg-white/5 px-2 py-1 font-mono text-[11px] text-white/50">
                base {base}
              </span>
              {bonuses.map((b) => (
                <span
                  key={b.label}
                  className="rounded-md bg-cyan-400/10 px-2 py-1 font-mono text-[11px] text-cyan-300"
                >
                  +{b.points} {b.label}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              disabled={!full || !name.trim() || labs.length >= MAX_LABS && !labs.some((l) => l.name === name.trim())}
              onClick={() =>
                saveLab({ name: name.trim(), ids: picked, savedAt: new Date().toISOString() })
              }
              className="rounded-lg bg-cyan-400 px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save lab
            </button>
            {full && (
              <ShareButton
                label="Copy share link"
                url={typeof window !== "undefined" ? shareUrl() : "/lab"}
                className="text-sm"
              />
            )}
          </div>
          {!full && (
            <p className="mt-3 text-center font-mono text-[11px] text-white/35">
              Pick exactly {LAB_SIZE} cards — any cards, owned or not. Dream big.
            </p>
          )}
        </div>

        {/* picker */}
        <div className="mt-6">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search all ${cards.length} cards…`}
            className="mb-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-cyan-400/50"
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {results.map((card) => {
              const selected = picked.includes(card.id);
              return (
                <button
                  key={card.id}
                  onClick={() => toggle(card.id)}
                  className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors ${
                    selected
                      ? "border-cyan-400/60 bg-cyan-400/10"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="h-8 w-8 shrink-0">
                    <CardArt card={card} />
                  </div>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-white">
                      {card.name}
                    </span>
                    <span className="tnum font-mono text-[11px] text-white/40">
                      {card.rating} · {card.type}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* saved labs */}
      <aside>
        <h2 className="mb-3 text-sm font-semibold text-white">
          Saved labs{" "}
          <span className="font-mono text-xs text-white/40">
            {labs.length}/{MAX_LABS}
          </span>
        </h2>
        {labs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-white/40">
            No labs yet. Draft five cards and save your first lineup.
          </p>
        ) : (
          <ul className="space-y-2">
            {labs.map((lab) => {
              const labCards = lab.ids
                .map((id) => byId.get(id))
                .filter(Boolean) as MarketCard[];
              const { teamRating: r } = scoreLab(labCards);
              return (
                <li
                  key={lab.name}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setPicked(lab.ids);
                        setName(lab.name);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-sm font-semibold text-white">
                        {lab.name}
                      </span>
                      <span className="tnum font-mono text-xs text-white/40">
                        team {r}
                      </span>
                    </button>
                    <div className="flex -space-x-2">
                      {labCards.slice(0, 5).map((c) => (
                        <div key={c.id} className="h-7 w-7 rounded-full ring-2 ring-[#0a0a0b]">
                          <CardArt card={c} />
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => deleteLab(lab.name)}
                      className="rounded-md px-2 py-1 font-mono text-xs text-white/30 hover:bg-white/10 hover:text-white"
                      aria-label={`Delete ${lab.name}`}
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </aside>
    </div>
  );
}
