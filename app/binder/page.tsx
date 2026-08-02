import type { Metadata } from "next";
import BinderView from "@/components/BinderView";
import TradeIn from "@/components/TradeIn";
import AchievementWall from "@/components/AchievementWall";
import { getAllCards, getRank } from "@/lib/cards";

export const metadata: Metadata = { title: "Binder · AI Index" };

export default function BinderPage() {
  const cards = getAllCards();
  const ranks = Object.fromEntries(cards.map((c) => [c.id, getRank(c.id)]));

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">Binder</h1>
        <p className="mt-1 text-sm text-white/50">
          Your collection. Fill every slot.
        </p>
      </header>
      <BinderView cards={cards} ranks={ranks} />
      <TradeIn cards={cards} ranks={ranks} />
      <AchievementWall />
    </main>
  );
}
