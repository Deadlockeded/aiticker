import type { Metadata } from "next";
import BinderPages from "@/components/BinderPages";
import TradeIn from "@/components/TradeIn";
import { getAllCards, getRank } from "@/lib/cards";

export const metadata: Metadata = { title: "Binder · AI Ticker" };

type Search = Promise<{ page?: string; card?: string }>;

export default async function BinderPage({ searchParams }: { searchParams: Search }) {
  const { page, card } = await searchParams;
  const cards = getAllCards();
  const ranks = Object.fromEntries(cards.map((c) => [c.id, getRank(c.id)]));

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-6 sm:px-6">
      <BinderPages
        cards={cards}
        ranks={ranks}
        initialPage={page ? parseInt(page, 10) : undefined}
        initialCard={card}
      />
      <TradeIn cards={cards} ranks={ranks} />
    </main>
  );
}
