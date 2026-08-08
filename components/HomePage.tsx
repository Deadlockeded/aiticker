"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { MarketCard } from "@/lib/cards";
import {
  getAllowanceSnapshot,
  getBinderSnapshot,
  msUntilNextPack,
  packsLeftFrom,
  parseBinder,
  subscribeStore,
} from "@/lib/binder";
import { EXCHANGE_PACK_COST } from "@/lib/economy";
import { formatTicks } from "@/lib/market";
import CardGrid from "./CardGrid";
import CoverStar from "./CoverStar";
import HotList from "./HotList";
import Masthead from "./Masthead";
import NextDrop from "./NextDrop";
import MetaStrip from "./MetaStrip";
import PackRipper from "./PackRipper";
import RaiseARound from "./RaiseARound";
import RoyaltiesCard from "./RoyaltiesCard";
import TransferTicker from "./TransferTicker";
import RoastTeaser from "./RoastTeaser";
import TodayMeta from "./TodayMeta";
import HomeStats from "./HomeStats";
import { ButtonLink } from "./ui";

type HomeState = "ceremony" | "packs" | "index";

/**
 * The homepage is state-aware and pack-first. Storage is read via
 * useSyncExternalStore with a null server snapshot, so the server (and the
 * first client paint) render a neutral paper stub — never a flash of the
 * wrong homepage. Only "/" behaves this way; deep links are untouched.
 */
function homeSnapshot(): HomeState {
  const hasPulls = Object.keys(parseBinder(getBinderSnapshot())).length > 0;
  if (!hasPulls) return "ceremony";
  return packsLeftFrom(getAllowanceSnapshot()) > 0 ? "packs" : "index";
}

/** Prominent live countdown for the no-packs state — the return visit's
 * main event is "when do I rip again", so it gets real digits. */
function ResetChip() {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const update = () => {
      const total = Math.max(1, Math.ceil(msUntilNextPack() / 1000));
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      setLabel(h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    const kickoff = setTimeout(update, 0);
    const timer = setInterval(update, 1000);
    return () => {
      clearTimeout(kickoff);
      clearInterval(timer);
    };
  }, []);
  return (
    <div className="mx-auto mb-4 max-w-[280px] rounded-[22px] bg-surface p-3.5 text-center shadow-card">
      <p className="micro text-[10px] tracking-[0.3em] text-ink3">Next pack in</p>
      <p className="tnum mt-1 font-display text-[26px] font-extrabold leading-none text-ink">
        {label || "…"}
      </p>
      <Link href="/packs" className="micro mt-2 inline-block font-semibold text-pink">
        or trade {formatTicks(EXCHANGE_PACK_COST)} for one now →
      </Link>
    </div>
  );
}

/** The index: meta, movers, featured, and the grid — states 2 and 3. */
function IndexSections({
  cards,
  ranks,
  children,
}: {
  cards: MarketCard[];
  ranks: Record<string, number>;
  children?: React.ReactNode;
}) {
  return (
    <>
      {children}
      <TransferTicker />
      <HomeStats cards={cards} />
      <RoyaltiesCard />
      <RaiseARound />
      <RoastTeaser />
      <NextDrop />
      <MetaStrip />
      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <CoverStar cards={cards} ranks={ranks} />
        </div>
        <div className="space-y-4">
          <HotList cards={cards} />
          <TodayMeta cards={cards} />
        </div>
      </div>
      <div className="mt-8">
        <h2 className="mb-3 text-[20px] text-ink">The checklist</h2>
        <CardGrid cards={cards} ranks={ranks} />
      </div>
    </>
  );
}

export default function HomePage({
  cards,
  ranks,
}: {
  cards: MarketCard[];
  ranks: Record<string, number>;
}) {
  const state = useSyncExternalStore(
    subscribeStore,
    homeSnapshot,
    () => null as HomeState | null,
  );
  // Set synchronously by PackRipper's rip() — BEFORE the store notify
  // flips `state` — so the pack keeps its tree position and never remounts
  // mid-rip (that remount was the "pack vanishes into a fresh idle pack" bug).
  const [ripBusy, setRipBusy] = useState(false);

  // neutral paper until storage resolves — no flash of the wrong homepage
  if (state === null) return <div className="min-h-[70vh]" aria-hidden />;

  const ceremony = state === "ceremony";
  const showPack = state !== "index" || ripBusy;

  // ONE stable tree: the PackRipper slot never moves between states, so
  // React reconciles (keeps rip/reveal state) instead of remounting.
  return (
    <div className={ceremony ? "ceremony-h flex flex-col items-center justify-center py-4" : ""}>
      <div className={ceremony ? "w-full" : "hidden"}>
        {ceremony && !ripBusy && (
          <h1 className="mb-5 text-center text-[30px] leading-[1.08] text-ink sm:mb-8 sm:text-[40px]">
            The AI industry is a <span className="text-pink">card game</span> now.
          </h1>
        )}
      </div>
      <div className={showPack ? (ceremony ? "mx-auto w-full" : "mx-auto mb-10 w-full") : "hidden"}>
        {showPack && (
          <PackRipper
            cards={cards}
            ranks={ranks}
            minimal={ceremony}
            onRevealChange={setRipBusy}
          />
        )}
      </div>
      <div className={ceremony ? "w-full" : "hidden"}>
        {ceremony && !ripBusy && (
          <>
            <p className="mt-3 text-center text-[15px] text-ink2">
              Peel the strip. Rip your first pack.
            </p>
            <p className="mt-2.5 text-center">
              <a
                href="/roast"
                className="text-[14px] text-ink3 underline underline-offset-4 hover:text-pink"
              >
                or get roasted first →
              </a>
            </p>
          </>
        )}
      </div>
      {!ceremony && (
        <div>
          {state === "index" && !ripBusy && (
            <>
              <Masthead cards={cards} />
              <div className="mt-6">
                <ResetChip />
              </div>
            </>
          )}
          <IndexSections cards={cards} ranks={ranks} />
        </div>
      )}
    </div>
  );
}
