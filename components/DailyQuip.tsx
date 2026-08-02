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
      // ?ref= so the quoted card opens face-up for whoever follows the link
      await navigator.clipboard.writeText(
        `“${quip}” — ${card.name}, aiticker.xyz/cards/${card.id}?ref=quote`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable — nothing to do
    }
  };

  return (
    <blockquote className="flex items-start gap-3 rounded-2xl border border-[#1E2430]/30 bg-[#FDFBF6] p-4">
      <span className="text-2xl leading-none text-[#C23B2E]/70">“</span>
      <p className="flex-1 text-[15px] italic leading-snug text-[#5A6070]">
        {quip}
        <span className="mt-1 block font-mono text-[10px] not-italic uppercase tracking-widest text-[#9AA0AC]">
          quip of the day
        </span>
      </p>
      <button
        onClick={copy}
        title="Copy quip"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#9AA0AC] transition-colors hover:bg-[#1E2430]/5 hover:text-[#1E2430]"
      >
        {copied ? "✓" : "❝"}
      </button>
    </blockquote>
  );
}
