"use client";

import { useSyncExternalStore } from "react";
import { issueNumber } from "@/lib/daily";

const subscribeNever = () => () => {};
const MONTHS = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];

/** Magazine masthead — issue line renders client-side (date-derived). */
export default function Masthead({ cardCount }: { cardCount: number }) {
  const issue = useSyncExternalStore(
    subscribeNever,
    () => `ISSUE Nº ${issueNumber()} · ${MONTHS[new Date().getUTCMonth()]} ${new Date().getUTCFullYear()}`,
    () => null,
  );

  return (
    <header className="paper-in border-b-[3px] border-[#1E2430] pb-3 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#5A6070]">
        {issue ?? "ISSUE Nº — · —"} · ₮ FREE FOREVER
      </p>
      <h1 className="mt-1 text-5xl leading-none text-[#1E2430] sm:text-7xl">
        ai<span className="text-[#C23B2E]">ticker</span>
      </h1>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[#5A6070]">
        {cardCount} cards · rip packs · build your binder · fight the index
      </p>
      <div className="mt-2 bg-[#1E2430] py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-[#FDFBF6]">
        The hobby&apos;s official* price guide — *self-declared
      </div>
    </header>
  );
}
