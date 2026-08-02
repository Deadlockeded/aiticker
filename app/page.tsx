import Link from "next/link";
import CardGrid from "@/components/CardGrid";
import { getAllCards, getRank } from "@/lib/cards";

export default function Home() {
  const cards = getAllCards();
  const ranks = Object.fromEntries(cards.map((c) => [c.id, getRank(c.id)]));

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-8">
      <header className="mb-12 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.4em] text-white/40">
          Series 1 · {cards.length} cards
        </p>
        <h1 className="mt-3 bg-gradient-to-r from-cyan-300 via-white to-fuchsia-300 bg-clip-text text-5xl font-black uppercase tracking-tight text-transparent sm:text-7xl">
          The AI Index
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lg text-white/60">
          Collect the people building the future.
        </p>
        <div className="mt-7 flex items-center justify-center gap-4">
          <Link
            href="/packs"
            className="rounded-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-fuchsia-400 px-8 py-3.5 font-black uppercase tracking-wide text-slate-950 shadow-[0_0_40px_-8px_rgba(99,102,241,0.9)] transition-transform hover:scale-105"
          >
            Rip a Pack
          </Link>
          <Link
            href="/market"
            className="rounded-full border border-white/20 px-8 py-3.5 font-semibold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10"
          >
            Market
          </Link>
        </div>
      </header>

      <CardGrid cards={cards} ranks={ranks} />
    </main>
  );
}
