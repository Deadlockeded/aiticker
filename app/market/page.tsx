import type { Metadata } from "next";
import MarketTable, { MoverCard } from "@/components/MarketTable";
import { getAllCards, getRank } from "@/lib/cards";
import { getMovers } from "@/lib/market";
import marketMeta from "@/data/market-meta.json";
import PullToRefresh from "@/components/PullToRefresh";

export const metadata: Metadata = { title: "Market · AI Ticker" };

export default function MarketPage() {
  const cards = getAllCards();
  const ranks = Object.fromEntries(cards.map((c) => [c.id, getRank(c.id)]));
  const { gainers, losers } = getMovers(cards);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-8">
      <PullToRefresh lastUpdated={marketMeta.lastUpdated} />
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">Market</h1>
        <p className="mt-1 text-sm text-white/50">
          {marketMeta.lastUpdated
            ? `Live index · updated ${new Date(marketMeta.lastUpdated).toUTCString().slice(0, 22)} UTC · powered by public data`
            : "Daily moves across the whole index."}
        </p>
      </header>

      <section className="mb-10 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-emerald-400">
            Top gainers
          </h2>
          <div className="space-y-2">
            {gainers.map((card) => (
              <MoverCard key={card.id} card={card} rank={ranks[card.id]} />
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-red-400">
            Top losers
          </h2>
          <div className="space-y-2">
            {losers.map((card) => (
              <MoverCard key={card.id} card={card} rank={ranks[card.id]} />
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-white/40">
          Full index
        </h2>
        <MarketTable cards={cards} ranks={ranks} />
      </section>
    </main>
  );
}
