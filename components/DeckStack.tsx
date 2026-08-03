"use client";

import { useRef, useState, useSyncExternalStore } from "react";

export interface DeckStackProps<T> {
  items: T[];
  keyOf: (item: T) => string;
  renderCard: (item: T, isTop: boolean) => React.ReactNode;
  /** Tap on the top card. */
  onTap?: (item: T) => void;
  /** Swipe right (when set, right != "next" — it commits, e.g. FIGHT). */
  onSwipeRight?: (item: T) => void;
  /** Called whenever a card is dismissed to the back (left, or right without onSwipeRight). */
  onPass?: (item: T) => void;
  /** Ink stamp shown while dragging left ("PASSED"). */
  leftStamp?: string;
  /** Optional line rendered under the top card (e.g. trash-talk quip). */
  footerFor?: (item: T) => React.ReactNode;
  className?: string;
}

/**
 * The deck: top card full-size, 2 peeking behind. Drag the top card away
 * to cycle (infinite loop), tap to act. Pointer-event physics with a
 * spring-ish settle + haptic tick; reduced-motion gets a crossfade.
 * Facedown mystery rules are the caller's job via renderCard.
 */
export default function DeckStack<T>({
  items,
  keyOf,
  renderCard,
  onTap,
  onSwipeRight,
  onPass,
  leftStamp,
  footerFor,
  className = "",
}: DeckStackProps<T>) {
  const [head, setHead] = useState(0);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const [leaving, setLeaving] = useState<"left" | "right" | null>(null);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const reduced = useSyncExternalStore(
    () => () => {},
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  if (items.length === 0) return null;
  const n = items.length;
  const top = items[head % n];

  const dismiss = (dir: "left" | "right") => {
    if (dir === "right" && onSwipeRight) {
      onSwipeRight(top);
      setDrag(null);
      return;
    }
    if (navigator.vibrate) navigator.vibrate(5);
    onPass?.(top);
    if (reduced) {
      setHead((h) => h + 1);
      setDrag(null);
      return;
    }
    setLeaving(dir);
    setTimeout(() => {
      setHead((h) => h + 1);
      setLeaving(null);
      setDrag(null);
    }, 220);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    setDrag({ dx: e.clientX - start.current.x, dy: e.clientY - start.current.y });
  };
  const onPointerUp = () => {
    const dx = drag?.dx ?? 0;
    start.current = null;
    setDragging(false);
    if (Math.abs(dx) > 80) dismiss(dx < 0 ? "left" : "right");
    else if (Math.abs(dx) < 6 && onTap) {
      onTap(top);
      setDrag(null);
    } else setDrag(null); // spring back
  };

  const dx = leaving ? (leaving === "left" ? -520 : 520) : (drag?.dx ?? 0);
  const rot = Math.max(-14, Math.min(14, dx / 14));
  const showStamp = leftStamp && dx < -40;

  return (
    <div className={`select-none ${className}`}>
      <div className="relative" style={{ touchAction: "pan-y" }}>
        {/* peekers */}
        {[2, 1].map((depth) => {
          const item = items[(head + depth) % n];
          return (
            <div
              key={`${keyOf(item)}-peek-${depth}`}
              aria-hidden
              className="absolute inset-0"
              style={{
                transform: `translateY(${depth * 7}px) rotate(${depth % 2 ? 1.6 : -1.4}deg) scale(${1 - depth * 0.035})`,
                zIndex: 3 - depth,
                opacity: 0.9,
              }}
            >
              {renderCard(item, false)}
            </div>
          );
        })}
        {/* top card */}
        <div
          role="button"
          aria-label="Top card — drag to cycle, tap to open"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            start.current = null;
            setDragging(false);
            setDrag(null);
          }}
          className="relative z-10 cursor-grab active:cursor-grabbing"
          style={{
            transform: `translate(${dx}px, ${(drag?.dy ?? 0) / 8}px) rotate(${rot}deg)`,
            transition: dragging ? "none" : "transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1.2)",
            opacity: leaving && reduced ? 0 : 1,
          }}
        >
          {renderCard(top, true)}
          {showStamp && (
            <span className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 rotate-[-16deg] border-[3px] border-[#17301F] bg-[#F4F7F0]/90 px-3 py-1 font-mono text-sm font-black uppercase tracking-[0.3em] text-[#17301F]">
              {leftStamp}
            </span>
          )}
        </div>
      </div>

      {footerFor && <div className="mt-8">{footerFor(top)}</div>}

      {/* progress strip */}
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#17301F]/15">
          <div
            className="h-full rounded-full bg-[#17301F]"
            style={{ width: `${(((head % n) + 1) / n) * 100}%` }}
          />
        </div>
        <span className="tnum shrink-0 font-mono text-[10px] text-[#5A6E5E]">
          {(head % n) + 1} / {n}
        </span>
        <button
          onClick={() => dismiss("left")}
          className="shrink-0 px-2 font-mono text-[11px] uppercase tracking-widest text-[#5A6E5E] hover:text-[#17301F]"
          aria-label="Next card"
        >
          next →
        </button>
      </div>
    </div>
  );
}
