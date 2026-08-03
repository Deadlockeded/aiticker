"use client";

import { useState, useSyncExternalStore } from "react";
import type { MarketCard } from "@/lib/cards";
import { getDailyQuip, utcDayKey } from "@/lib/daily";

const subscribeNever = () => () => {};

/**
 * Quip of the day on card detail pages. Date-derived, so it renders
 * client-side only (null server snapshot) — same quip for everyone today.
 */
export default function DailyQuip({ card }: { card: MarketCard }) {
  const [copied, setCopied] = useState(false);
  const quip = useSyncExternalStore(
    subscribeNever,
    () => getDailyQuip(card, utcDayKey()),
    () => null,
  );
  if (!quip) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `“${quip}” — ${card.name}, aiticker.xyz/cards/${card.id}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable — nothing to do
    }
  };

  return (
    <blockquote className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4">
      <span className="text-2xl leading-none text-pink/70">“</span>
      <p className="flex-1 text-[15px] italic leading-snug text-ink2">
        {quip}
        <span className="mt-1 block micro text-[10px] not-italic text-ink3">
          quip of the day
        </span>
      </p>
      <button
        onClick={copy}
        title="Copy quip"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink3 transition-colors hover:bg-surface2 hover:text-ink"
      >
        {copied ? "✓" : "❝"}
      </button>
    </blockquote>
  );
}
