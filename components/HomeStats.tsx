"use client";

import { useSyncExternalStore } from "react";
import type { MarketCard } from "@/lib/cards";
import {
  getAllowanceSnapshot,
  getBinderSnapshot,
  packsLeftFrom,
  parseBinder,
  subscribeStore,
} from "@/lib/binder";
import { releasedOnly } from "@/lib/drops";
import { formatTicks, getCurrentPrice } from "@/lib/market";
import { balanceFrom, getWalletSnapshot } from "@/lib/wallet";
import { StatTile } from "./ui";

/**
 * The three tiles under the hero: the index, your lab, your packs. All three
 * read localStorage, so they hold a reserved-height stub until hydration
 * rather than popping in.
 */
export default function HomeStats({ cards }: { cards: MarketCard[] }) {
  const binderRaw = useSyncExternalStore(subscribeStore, getBinderSnapshot, () => null);
  const packsRaw = useSyncExternalStore(subscribeStore, getAllowanceSnapshot, () => null);
  const walletRaw = useSyncExternalStore(subscribeStore, getWalletSnapshot, () => null);

  const live = releasedOnly(cards.filter((c) => c.id !== "agi"));
  const index = Math.round(
    live.reduce((sum, c) => sum + getCurrentPrice(c), 0) / Math.max(1, live.length),
  );

  if (binderRaw === null || packsRaw === null || walletRaw === null) {
    return <div className="mb-5 min-h-[86px]" aria-hidden />;
  }

  const binder = parseBinder(binderRaw);
  const owned = Object.keys(binder).length;
  const valuation = Math.round(
    live.filter((c) => binder[c.id]).reduce((sum, c) => sum + getCurrentPrice(c) * binder[c.id].copies, 0),
  );
  const packs = packsLeftFrom(packsRaw);

  return (
    <div className="mb-5 grid grid-cols-3 gap-2">
      <StatTile label="Index" value={formatTicks(index)} sub="avg card" href="/market" />
      <StatTile
        label="Your lab"
        value={formatTicks(valuation)}
        sub={`${owned} card${owned === 1 ? "" : "s"}`}
        href="/binder"
      />
      <StatTile
        label="Packs"
        value={packs}
        sub={`${formatTicks(balanceFrom(walletRaw))} banked`}
        href="/packs"
      />
    </div>
  );
}
