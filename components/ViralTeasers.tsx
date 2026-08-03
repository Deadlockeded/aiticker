"use client";

import { useState } from "react";
import Link from "next/link";

/** Homepage teaser tiles. */
export function HomeTeasers() {
  return (
    <section className="mb-6 grid gap-3 sm:grid-cols-2">
      <Link
        href="/create"
        className="flex items-center justify-between rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line"
      >
        <div>
          <p className="font-semibold text-ink">Get rated</p>
          <p className="mt-0.5 text-xs text-ink3">
            The Algorithm scores your public footprint.{" "}
            <span className="text-pink">Roast included. →</span>
          </p>
        </div>
        <span className="text-2xl">🪪</span>
      </Link>
      <Link
        href="/arena?vs=andrej-karpathy"
        className="flex items-center justify-between rounded-xl border border-amber-400/25 bg-amber-400/[0.04] p-4 transition-colors hover:border-amber-400/50 sm:col-span-2"
      >
        <div>
          <p className="font-semibold text-ink">
            Think you can beat the index?
          </p>
          <p className="mt-0.5 text-xs text-ink3">
            Fight Karpathy&apos;s card with one of yours. Best of three. ⚔️
          </p>
        </div>
        <span className="text-2xl">⚡</span>
      </Link>
    </section>
  );
}

const NUDGES = [
  { href: "/create", label: "Get scouted & roasted →" },
  { href: "/create", label: "Make your own card →" },
];

/** One-line nudge shown after pack rips / battle wins. Alternates randomly. */
export function ViralNudge() {
  const [nudge] = useState(() => NUDGES[Math.floor(Math.random() * NUDGES.length)]);
  return (
    <Link
      href={nudge.href}
      className="font-mono text-xs text-pink underline-offset-4 hover:underline"
    >
      {nudge.label}
    </Link>
  );
}
