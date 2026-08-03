import type { Metadata } from "next";
import MarketTable from "@/components/MarketTable";
import HotList from "@/components/HotList";
import { getAllCards, getRank } from "@/lib/cards";
import marketMeta from "@/data/market-meta.json";
import PullToRefresh from "@/components/PullToRefresh";

export const metadata: Metadata = { title: "Market · AI Ticker" };

export default function MarketPage() {
  const cards = getAllCards().filter((c) => c.id !== "agi"); // unpriced, unlisted
  const ranks = Object.fromEntries(cards.map((c) => [c.id, getRank(c.id)]));

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-8">
      <PullToRefresh lastUpdated={marketMeta.lastUpdated} />
      <header className="mb-8">
        <h1 className="text-3xl text-[#17301F]">Market</h1>
        <p className="mt-1 text-sm text-[#5A6E5E]">
          {marketMeta.lastUpdated
            ? `Live index · updated ${new Date(marketMeta.lastUpdated).toUTCString().slice(0, 22)} UTC · powered by public data`
            : "Daily moves across the whole index."}
        </p>
      </header>

      <section className="mb-8">
        <HotList cards={cards} />
      </section>

      <section>
        <h2 className="mb-3 border-b-2 border-[#17301F] pb-1 text-lg text-[#17301F]">
          Book values — all cards
        </h2>
        <MarketTable cards={cards} ranks={ranks} />
      </section>
    </main>
  );
}
