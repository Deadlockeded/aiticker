import type { Metadata } from "next";
import PackRipper from "@/components/PackRipper";
import { getAllCards, getRank } from "@/lib/cards";

export const metadata: Metadata = { title: "Packs · AI Ticker" };

export default function PacksPage() {
  const cards = getAllCards();
  const ranks = Object.fromEntries(cards.map((c) => [c.id, getRank(c.id)]));

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Rip a pack
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Three cards per pack. Commons are common. Mythics are not.
        </p>
      </header>
      <PackRipper cards={cards} ranks={ranks} />
    </main>
  );
}
