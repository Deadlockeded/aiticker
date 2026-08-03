"use client";

import type { MarketCard } from "@/lib/cards";
import type { Binder } from "@/lib/binder";
import CardArt from "./CardArt";

/**
 * THE BOARDROOM — owned cards hang as framed portraits on a dark
 * wood-paneled wall (pure CSS, no images). Brass nameplates; legendaries
 * get the big frames; gold copies hang in gold frames. Missing cards are
 * vacant frames. Presentation-only: tapping opens the shared sheet.
 */
export default function BoardroomRoom({
  cards,
  binder,
  onOpen,
}: {
  cards: MarketCard[];
  binder: Binder;
  onOpen: (card: MarketCard) => void;
}) {
  const walls: MarketCard[][] = [];
  for (let i = 0; i < cards.length; i += 6) walls.push(cards.slice(i, i + 6));

  return (
    <div
      className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
      style={{ scrollbarWidth: "none" }}
    >
      {walls.map((wall, wi) => (
        <div key={wi} className="w-full shrink-0 snap-start px-1 md:w-1/2">
          <div
            className="rounded-2xl border border-line2 p-4 shadow-card"
            style={{
              background:
                "linear-gradient(180deg, #3E2C20 0%, #2E2016 55%, #241812 100%)",
              backgroundImage:
                "repeating-linear-gradient(90deg, rgba(0,0,0,0.18) 0 2px, transparent 2px 56px), linear-gradient(180deg, #3E2C20 0%, #2E2016 55%, #241812 100%)",
            }}
          >
            <div className="grid grid-cols-3 gap-3">
              {wall.map((card) => {
                const entry = binder[card.id];
                const legendary = card.rarity === "legendary" || card.rarity === "mythic";
                const hasGold = entry?.prints?.some((p) => p.v === "gold");
                if (!entry) {
                  return (
                    <div key={card.id} className={legendary ? "col-span-2" : ""}>
                      <div className="aspect-[4/5] rounded-[2px] border-[5px] border-[#4A3626] bg-[#241a12] shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]" />
                      <div className="mx-auto mt-1 w-max rounded-[2px] bg-[#6B5B3A]/60 px-1.5 py-0.5 micro text-[7px] text-[#D8CBA8]/70">
                        vacant
                      </div>
                    </div>
                  );
                }
                return (
                  <button
                    key={card.id}
                    onClick={() => onOpen(card)}
                    className={legendary ? "col-span-2" : ""}
                  >
                    <div
                      className={`relative aspect-[4/5] overflow-hidden rounded-[2px] border-[5px] shadow-[0_4px_10px_rgba(0,0,0,0.55)] ${
                        hasGold
                          ? "border-amber"
                          : legendary
                            ? "border-amber"
                            : "border-[#6B4B2A]"
                      }`}
                    >
                      <div className="relative h-full w-full bg-surface">
                        <CardArt card={card} shape="tile" />
                      </div>
                    </div>
                    <div
                      className={`mx-auto mt-1 w-max max-w-full truncate rounded-[2px] px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-widest ${
                        hasGold ? "bg-amber text-surface2" : "bg-amber text-on-accent"
                      }`}
                    >
                      {card.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
