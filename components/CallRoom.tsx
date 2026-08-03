"use client";

import { useSyncExternalStore } from "react";
import type { MarketCard } from "@/lib/cards";
import type { Binder } from "@/lib/binder";
import { dayHash, utcDayKey } from "@/lib/daily";
import { fnvHash } from "@/lib/rng";
import CardArt from "./CardArt";

const subscribeNever = () => () => {};

/**
 * THE CALL — the collection as a video-call grid. Owned cards get call
 * tiles (a few are deterministically "unmuted"; one owned card per day
 * has connection issues). Missing cards are dark tiles waiting to join.
 * Presentation-only: tapping opens the shared sheet.
 */
export default function CallRoom({
  cards,
  binder,
  onOpen,
}: {
  cards: MarketCard[];
  binder: Binder;
  onOpen: (card: MarketCard) => void;
}) {
  const owned = cards.filter((c) => binder[c.id]);
  // the daily joke tile — deterministic, same for everyone (client-only)
  const unstableId = useSyncExternalStore(
    subscribeNever,
    () => (owned.length ? owned[dayHash(`unstable:${utcDayKey()}`) % owned.length].id : ""),
    () => "",
  );

  const pages: MarketCard[][] = [];
  for (let i = 0; i < cards.length; i += 9) pages.push(cards.slice(i, i + 9));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1 font-mono text-[10px] uppercase tracking-widest">
        <span className="flex items-center gap-1.5 text-[#B23A2E]">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#B23A2E]" /> REC
        </span>
        <span className="text-[#5A6E5E]">{owned.length} participants</span>
      </div>
      <div
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        {pages.map((page, pi) => (
          <div key={pi} className="w-full shrink-0 snap-start px-1 md:w-1/2">
            <div className="rounded-2xl border-2 border-[#17301F] bg-[#111114] p-2.5 shadow-[5px_5px_0_#17301F]">
              <div className="grid grid-cols-3 gap-1.5">
                {page.map((card) => {
                  const entry = binder[card.id];
                  if (!entry) {
                    return (
                      <div
                        key={card.id}
                        className="flex aspect-square items-center justify-center rounded-md bg-[#1A1A1E] p-1.5 text-center"
                      >
                        <span className="font-mono text-[7px] leading-tight text-[#5A6E5E]">
                          Waiting for {card.name} to join…
                        </span>
                      </div>
                    );
                  }
                  const unmuted = fnvHash(`mute:${card.id}`) % 4 === 0;
                  const unstable = card.id === unstableId;
                  const hasGold = entry.prints?.some((p) => p.v === "gold");
                  return (
                    <button
                      key={card.id}
                      onClick={() => onOpen(card)}
                      className={`relative aspect-square overflow-hidden rounded-md bg-[#26262c] ${hasGold ? "ring-2 ring-[#C9A227]" : ""}`}
                    >
                      <div className="relative h-full w-full opacity-90">
                        <CardArt card={card} shape="tile" />
                      </div>
                      {unstable && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/60 font-mono text-[7px] uppercase tracking-widest text-[#F0BFB6]">
                          connection unstable
                        </span>
                      )}
                      <span className="absolute bottom-0.5 left-0.5 flex max-w-[92%] items-center gap-0.5 rounded-sm bg-black/70 px-1 py-0.5">
                        <span className="text-[7px]">{unmuted ? "🎤" : "🔇"}</span>
                        <span className="truncate font-mono text-[7px] text-[#F4F7F0]">
                          {card.name}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
