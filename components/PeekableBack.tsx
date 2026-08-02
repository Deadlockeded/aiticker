"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { MarketCard } from "@/lib/cards";
import {
  getPeekSnapshot,
  markPeeked,
  parsePeek,
  setPeekGuard,
  subscribeStore,
} from "@/lib/binder";
import CardBackFace from "./CardBackFace";
import TradingCard from "./TradingCard";

/**
 * THE PEEK — a facedown card that flips face-up while press-and-held
 * (600ms). The first completed peek permanently stamps the card PEEKED
 * (small ink mark on the back, tracked count); with `revealWhenPeeked`
 * (gallery/detail) peeked cards render face-up thereafter, stamp on, until
 * pulled. Paper-flip animation, no sound. Never blocks parent gestures —
 * a peek-hold sets a guard the parent consumes before treating the release
 * as a tap.
 */
export default function PeekableBack({
  card,
  rank = 0,
  size = "grid",
  revealWhenPeeked = true,
  face,
}: {
  card: MarketCard;
  rank?: number;
  size?: "grid" | "hero" | "thumb";
  revealWhenPeeked?: boolean;
  /** Custom face-up content (binder pocket thumbs); default TradingCard. */
  face?: React.ReactNode;
}) {
  const raw = useSyncExternalStore(subscribeStore, getPeekSnapshot, () => null);
  const peeked = useMemo(
    () => (raw ? parsePeek(raw).ids.includes(card.id) : false),
    [raw, card.id],
  );
  const [held, setHeld] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);

  const cancelHold = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    origin.current = null;
    setHeld(false);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    origin.current = { x: e.clientX, y: e.clientY };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setHeld(true);
      setPeekGuard();
      markPeeked(card.id);
      if (navigator.vibrate) navigator.vibrate(8);
    }, 600);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    // a real drag (deck swipe, scroll) cancels the pending peek
    if (!origin.current || held) return;
    const dx = e.clientX - origin.current.x;
    const dy = e.clientY - origin.current.y;
    if (Math.hypot(dx, dy) > 10) cancelHold();
  };

  const faceUp = held || (revealWhenPeeked && peeked);
  const stampSize = size === "hero" ? "text-sm px-3 py-1" : size === "thumb" ? "text-[7px] px-1" : "text-[10px] px-2 py-0.5";

  return (
    <div
      className="relative h-full w-full [perspective:1200px]"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={cancelHold}
      onPointerCancel={cancelHold}
      onPointerLeave={cancelHold}
      onContextMenu={(e) => e.preventDefault()}
      style={{ WebkitTouchCallout: "none" } as React.CSSProperties}
    >
      <div
        className="relative h-full w-full transition-transform duration-[450ms] [transform-style:preserve-3d]"
        style={{ transform: faceUp ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        <div className="absolute inset-0 [backface-visibility:hidden]">
          <CardBackFace card={card} size={size} />
          {peeked && (
            <span
              className={`pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 rotate-[-12deg] border-2 border-[#1E2430] bg-[#FDFBF6]/85 font-mono font-black uppercase tracking-[0.2em] text-[#1E2430] ${stampSize}`}
            >
              Peeked
            </span>
          )}
        </div>
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {face ?? <TradingCard card={card} rank={rank} size={size === "thumb" ? "grid" : size} />}
          {peeked && !held && revealWhenPeeked && (
            <span
              className={`pointer-events-none absolute right-1.5 top-1.5 z-10 rotate-[6deg] border-2 border-[#1E2430] bg-[#FDFBF6]/90 font-mono font-black uppercase tracking-[0.2em] text-[#1E2430] ${stampSize}`}
            >
              Peeked
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
