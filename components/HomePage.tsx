"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { MarketCard } from "@/lib/cards";
import {
  getAllowanceSnapshot,
  getBinderSnapshot,
  msUntilReset,
  packsLeftFrom,
  parseBinder,
  subscribeStore,
} from "@/lib/binder";
import CardGrid from "./CardGrid";
import CoverStar from "./CoverStar";
import HotList from "./HotList";
import Masthead from "./Masthead";
import MetaStrip from "./MetaStrip";
import PackRipper from "./PackRipper";
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

/** "Next free packs in {X}h" chip for the no-packs state. */
function ResetChip() {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const update = () => {
      const ms = msUntilReset();
      const h = Math.floor(ms / 3_600_000);
      const m = Math.ceil((ms % 3_600_000) / 60_000);
      setLabel(h > 0 ? `${h}h` : `${m}m`);
    };
    const kickoff = setTimeout(update, 0);
    const timer = setInterval(update, 30_000);
    return () => {
      clearTimeout(kickoff);
      clearInterval(timer);
    };
  }, []);
  return (
    <div className="mb-4 flex justify-center">
      <span className="border-2 border-[#17301F] bg-[#EAF0E4] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[#17301F] shadow-[3px_3px_0_#17301F]">
        Next free packs in {label || "…"}
      </span>
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
          The Checklist — Series 1
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
  const allowanceRaw = useSyncExternalStore(subscribeStore, getAllowanceSnapshot, () => null);
  const packsLeft = allowanceRaw === null ? 0 : packsLeftFrom(allowanceRaw);

  // neutral paper until storage resolves — no flash of the wrong homepage
  if (state === null) return <div className="min-h-[70vh]" aria-hidden />;

  if (state === "ceremony") {
    return (
      <div className="flex min-h-[75vh] flex-col items-center justify-center py-10">
        <p className="mb-8 text-center font-display text-2xl uppercase text-[#17301F] sm:text-3xl">
          Trading cards for the{" "}
          <span className="text-[#B23A2E]">AI industry.</span>
        </p>
        <div className="w-full max-w-[280px]">
          <PackRipper cards={cards} ranks={ranks} minimal />
        </div>
        <p className="mt-8 text-center font-mono text-[12px] uppercase tracking-[0.3em] text-[#5A6E5E]">
          Tap to rip your first pack.
        </p>
      </div>
    );
  }

  if (state === "packs") {
    return (
      <div>
        <div className="mx-auto mb-10 mt-2 w-full max-w-[210px]">
          <PackRipper cards={cards} ranks={ranks} minimal />
          <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.25em] text-[#5A6E5E]">
            {packsLeft} pack{packsLeft === 1 ? "" : "s"} left today
          </p>
        </div>
        <IndexSections cards={cards} ranks={ranks} />
      </div>
    );
  }

  // index-first: the pack object does not render
  return (
    <div>
      <Masthead cards={cards} />
      <div className="mt-6">
        <ResetChip />
        <IndexSections cards={cards} ranks={ranks} />
      </div>
    </div>
  );
}
