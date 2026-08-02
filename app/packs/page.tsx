import type { Metadata } from "next";
import PackRipper from "@/components/PackRipper";
import SessionlessNotice from "@/components/SessionlessNotice";
import { getAllCards, getRank } from "@/lib/cards";

export const metadata: Metadata = { title: "Packs · AI Ticker" };

export default function PacksPage() {
  const cards = getAllCards();
  const ranks = Object.fromEntries(cards.map((c) => [c.id, getRank(c.id)]));

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-[#1E2430]">
          Rip a pack
        </h1>
        <p className="mt-2 text-sm text-[#5A6070]">
          Three cards per pack. Commons are common. Mythics are not.
        </p>
      </header>
      <SessionlessNotice />
      <PackRipper cards={cards} ranks={ranks} />
      <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-widest text-[#9AA0AC]">
        Per-card odds · artifacts 35% · commons 35.2% · rare 22% · epic 6.5%
        · legendary 1.2% · ??? 0.1%
      </p>
    </main>
  );
}
