import Link from "next/link";
import { notFound } from "next/navigation";
import TradingCard from "@/components/TradingCard";
import { getAllCards, getCard, getRank } from "@/lib/cards";

export function generateStaticParams() {
  return getAllCards().map((card) => ({ id: card.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const card = getCard((await params).id);
  return { title: card ? `${card.name} · AI Index` : "AI Index" };
}

const STAT_LABELS = {
  rating: "Overall rating",
  innovation: "Innovation",
  influence: "Influence",
  momentum: "Momentum",
} as const;

export default async function CardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const card = getCard((await params).id);
  if (!card) notFound();
  const rank = getRank(card.id);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-8">
      <Link
        href="/"
        className="font-mono text-sm text-white/50 transition-colors hover:text-white"
      >
        ← Back to the index
      </Link>

      <div className="mt-8 grid gap-10 md:grid-cols-[minmax(0,340px)_1fr]">
        {/* big card */}
        <div className="mx-auto w-full max-w-[340px]">
          <TradingCard card={card} rank={rank} size="hero" />
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-white/40">
              {card.type} · Rank #{rank}
            </p>
            <h1 className="mt-2 text-4xl font-black uppercase tracking-tight text-white">
              {card.name}
            </h1>
            <p className="mt-2 text-white/60">{card.tagline}</p>
          </div>

          {/* full stat breakdown */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-white/40">
              Stats
            </h2>
            <dl className="space-y-3">
              {(Object.keys(STAT_LABELS) as (keyof typeof STAT_LABELS)[]).map(
                (key) => (
                  <div key={key} className="flex items-center gap-4">
                    <dt className="w-36 text-sm text-white/60">
                      {STAT_LABELS[key]}
                    </dt>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-400"
                        style={{ width: `${card.stats[key]}%` }}
                      />
                    </div>
                    <dd className="w-8 text-right font-mono text-sm text-white">
                      {card.stats[key]}
                    </dd>
                  </div>
                ),
              )}
            </dl>
          </div>

          {/* reserved for the future price mechanic */}
          <div className="flex min-h-48 flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-white/40">
              Price chart
            </span>
            <p className="mt-2 max-w-xs text-sm text-white/40">
              Market trading is coming in a future series. This card&apos;s
              price history will be charted here.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
