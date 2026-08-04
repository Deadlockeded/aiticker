import type { Metadata } from "next";
import MetaStrip from "@/components/MetaStrip";
import PackRipper from "@/components/PackRipper";
import SessionlessNotice from "@/components/SessionlessNotice";
import { getAllCards, getRank } from "@/lib/cards";

export const metadata: Metadata = { title: "Packs · AIticker" };

export default function PacksPage() {
  const cards = getAllCards();
  const ranks = Object.fromEntries(cards.map((c) => [c.id, getRank(c.id)]));

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          Rip a pack
        </h1>
        <p className="mt-2 text-sm text-ink2">
          Two cards per pack. Commons are common. Mythics are not.
        </p>
      </header>
      <SessionlessNotice />
      <MetaStrip />
      <PackRipper cards={cards} ranks={ranks} />
      <p className="mt-8 text-center micro text-[10px] text-ink3">
        Per-card odds · artifacts 35% · commons 35.2% · rare 22% · epic 6.5%
        · legendary 1.2% · ??? 0.1%
        <br />
        Parallels per card · silver 9% (/100) · gold 2.5% (/25) · holo 0.5% (/10)
      </p>
    </main>
  );
}
