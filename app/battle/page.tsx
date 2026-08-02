import type { Metadata } from "next";
import BattleArena from "@/components/BattleArena";
import { getAllCards, getRank } from "@/lib/cards";

export const metadata: Metadata = { title: "Battle · AI Index" };

export default function BattlePage() {
  const cards = getAllCards();
  const ranks = Object.fromEntries(cards.map((c) => [c.id, getRank(c.id)]));

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-3 py-8 sm:px-6">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">Battle</h1>
        <p className="mt-1 text-sm text-white/50">
          Best of three stat clashes. Upsets happen.
        </p>
      </header>
      <BattleArena cards={cards} ranks={ranks} />
    </main>
  );
}
