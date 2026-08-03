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
import RoastTeaser from "./RoastTeaser";
import TodayMeta from "./TodayMeta";

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

/** "Next pack in {h}h {m}m" chip for the no-packs state. */
function ResetChip() {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const update = () => {
      const totalMin = Math.max(1, Math.ceil(msUntilNextPack() / 60_000));
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      setLabel(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    const kickoff = setTimeout(update, 0);
    const timer = setInterval(update, 30_000);
    return () => {
      clearTimeout(kickoff);
      clearInterval(timer);
    };
  }, []);
  return (
    <div className="mb-4 flex flex-col items-center gap-1">
      <span className="border-2 border-[#17301F] bg-[#EAF0E4] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[#17301F] shadow-[3px_3px_0_#17301F]">
        Next pack in {label || "…"}
      </span>
      <Link
        href="/packs"
        className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#B23A2E] underline underline-offset-4"
      >
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
          <div className="coupon p-3 text-center">
            <Link
              href="/create"
              className="font-mono text-[12px] font-semibold uppercase tracking-[0.25em] text-[#B23A2E] hover:underline"
            >
              Get scouted. Get roasted. It&apos;s the same department. →
            </Link>
          </div>
          <TodayMeta cards={cards} />
        </div>
      </div>
      <div className="mt-8">
        <h2 className="mb-3 border-b-2 border-[#17301F] pb-1 text-lg text-[#17301F]">
          The Checklist
        </h2>
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
    <div className={ceremony ? "flex min-h-[75vh] flex-col items-center justify-center py-10" : ""}>
      <div className={ceremony ? "w-full" : "hidden"}>
        {ceremony && !ripBusy && (
          <p className="mb-8 text-center font-display text-2xl uppercase text-[#17301F] sm:text-3xl">
            The AI industry is a{" "}
            <span className="text-[#B23A2E]">card game now.</span>
          </p>
        )}
      </div>
      <div className={showPack ? "mx-auto mb-10 w-full" : "hidden"}>
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
            <p className="mt-2 text-center font-mono text-[12px] uppercase tracking-[0.3em] text-[#5A6E5E]">
              Tap to rip your first pack.
            </p>
            <p className="mt-4 text-center">
              <a
                href="/roast"
                className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#9CB09E] underline underline-offset-4 hover:text-[#B23A2E]"
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
