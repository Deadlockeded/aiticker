import Link from "next/link";
import CardGrid from "@/components/CardGrid";
import TrendingStrip from "@/components/TrendingStrip";
import { getAllCards, getRank } from "@/lib/cards";
import {
  formatMove,
  formatTicks,
  getCurrentPrice,
  getDailyMove,
  getMovers,
} from "@/lib/market";

export default function Home() {
  const cards = getAllCards();
  const ranks = Object.fromEntries(cards.map((c) => [c.id, getRank(c.id)]));
  const marketCap = cards.reduce((sum, c) => sum + getCurrentPrice(c), 0);
  const topMover = getMovers(cards).gainers[0];

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-8 sm:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-400/80">
            Series 1
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            The AI Index
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-white/55">
            Collect the people building the future. {cards.length} cards,
            simulated prices, free daily packs.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href="/packs"
              className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-cyan-300"
            >
              Rip a pack
            </Link>
            <Link
              href="/battle"
              className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/5"
            >
              ⚔️ Battle now
            </Link>
            <Link
              href="/today"
              className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/5"
            >
              Card of the day
            </Link>
          </div>
        </div>

        <dl className="flex gap-3">
          {[
            ["Cards", String(cards.length)],
            ["Market cap", formatTicks(Math.round(marketCap / 1000)) + "k"],
            ["Top mover 24h", `${topMover.name.split(" ")[0]} ${formatMove(getDailyMove(topMover))}`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <dt className="font-mono text-[10px] uppercase tracking-wider text-white/40">
                {label}
              </dt>
              <dd className="tnum mt-1 font-mono text-sm font-semibold text-white">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <TrendingStrip cards={cards} />
      <CardGrid cards={cards} ranks={ranks} />
    </main>
  );
}
