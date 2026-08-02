import CardGrid from "@/components/CardGrid";
import { getAllCards, getRank } from "@/lib/cards";

export default function Home() {
  const cards = getAllCards();
  const ranks = Object.fromEntries(cards.map((c) => [c.id, getRank(c.id)]));

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-8">
      <header className="mb-10 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.4em] text-white/40">
          Series 1 · {cards.length} cards
        </p>
        <h1 className="mt-3 bg-gradient-to-r from-cyan-300 via-white to-fuchsia-300 bg-clip-text text-5xl font-black uppercase tracking-tight text-transparent sm:text-6xl">
          AI Index
        </h1>
        <p className="mt-3 text-white/50">
          Collect the companies and engineers shaping artificial intelligence.
        </p>
      </header>

      <CardGrid cards={cards} ranks={ranks} />
    </main>
  );
}
