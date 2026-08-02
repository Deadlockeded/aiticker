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
      await navigator.clipboard.writeText(`“${quip}” — ${card.name}, aiticker.xyz`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable — nothing to do
    }
  };

  return (
    <blockquote className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <span className="text-2xl leading-none text-cyan-400/60">“</span>
      <p className="flex-1 text-[15px] italic leading-snug text-white/80">
        {quip}
        <span className="mt-1 block font-mono text-[10px] not-italic uppercase tracking-widest text-white/35">
          quip of the day
        </span>
      </p>
      <button
        onClick={copy}
        title="Copy quip"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/5 hover:text-white"
      >
        {copied ? "✓" : "❝"}
      </button>
    </blockquote>
  );
}
