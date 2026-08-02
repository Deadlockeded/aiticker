import { notFound } from "next/navigation";
import PriceChart from "@/components/PriceChart";
import ShareButton from "@/components/ShareButton";
import CardReveal from "@/components/CardReveal";
import StatBlock from "@/components/StatBlock";
import Link from "next/link";
import SwipeNav from "@/components/SwipeNav";
import { getAllCards, getCard, getRank } from "@/lib/cards";
import type { MarketCard } from "@/lib/cards";
import { formatTicks, getCurrentPrice } from "@/lib/market";

export function generateStaticParams() {
  return getAllCards().map((card) => ({ id: card.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const card = getCard((await params).id);
  if (!card) return { title: "AI Ticker" };
  const title = `${card.name} · AI Ticker`;
  const description = `${card.rarity.toUpperCase()} · rating ${card.rating} · ${card.tagline}`;
  const ogImage = `/api/og/${card.id}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
      images: [ogImage],
    },
  };
}

const SIGNAL_LABELS: [keyof NonNullable<MarketCard["signals"]>, string, string][] = [
  ["attention7d", "Wikipedia views (7d)", "Wikimedia Pageviews"],
  ["attentionDelta", "Attention Δ vs prior week", "Wikimedia Pageviews"],
  ["citations", "Citations", "OpenAlex"],
  ["hIndex", "h-index", "OpenAlex"],
  ["works", "Published works", "OpenAlex"],
  ["stars", "GitHub stars (top 10 repos)", "GitHub"],
  ["ghFollowers", "GitHub followers", "GitHub"],
  ["hfDownloads30d", "HF downloads (30d)", "Hugging Face"],
  ["hfLikes", "HF likes", "Hugging Face"],
  ["hnMentions7d", "HN stories (7d)", "Hacker News"],
];

function SignalsPanel({ card }: { card: MarketCard }) {
  const rows = SIGNAL_LABELS.filter(
    ([key]) => typeof card.signals?.[key] === "number",
  );
  if (rows.length === 0) return null;
  return (
    <div className="rounded-2xl border border-[#1E2430]/30 bg-[#1E2430]/5 p-6">
      <h2 className="mb-1 font-mono text-xs uppercase tracking-[0.3em] text-[#9AA0AC]">
        Signals
      </h2>
      <p className="mb-4 text-xs text-[#9AA0AC]">
        Live public data feeding this card&apos;s rating — the receipts.
      </p>
      <dl className="space-y-3">
        {rows.map(([key, label, source]) => {
          const value = card.signals![key]!;
          return (
            <div key={key} className="flex items-center justify-between gap-3">
              <dt className="text-sm text-[#5A6070]">
                {label}{" "}
                <span className="font-mono text-[10px] text-[#9AA0AC]">
                  {source}
                </span>
              </dt>
              <dd className="tnum font-mono text-sm text-[#1E2430]">
                {key === "attentionDelta"
                  ? `${value >= 0 ? "+" : ""}${value}%`
                  : value.toLocaleString()}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

export default async function CardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const card = getCard((await params).id);
  if (!card) notFound();
  const rank = getRank(card.id);
  const price = getCurrentPrice(card);
  const ranked = getAllCards();
  const idx = ranked.findIndex((c) => c.id === card.id);
  const prevId = idx > 0 ? ranked[idx - 1].id : null;
  const nextId = idx < ranked.length - 1 ? ranked[idx + 1].id : null;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8">
      <SwipeNav prevId={prevId} nextId={nextId} />
      <Link
        href="/"
        className="font-mono text-sm uppercase tracking-widest text-[#5A6070] transition-colors hover:text-[#1E2430]"
      >
        ← Back to the checklist
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,340px)_1fr]">
        {/* THE CARD — single source; facedown until pulled, quip included in reveal */}
        <div className="mx-auto w-full max-w-[340px]">
          <CardReveal card={card} rank={rank} />
        </div>

        <div className="flex flex-col gap-4">

          {/* price chart + book values */}
          <div className="paper-card p-4 sm:p-5">
            <div className="flex items-baseline justify-between border-b-2 border-[#1E2430] pb-1">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-[#1E2430]">
                Price history
              </h2>
              <span className="tnum font-mono text-xs text-[#5A6070]">
                {card.id === "agi"
                  ? "unpriced"
                  : `Book: ${formatTicks(Math.round(price * 0.95))}–${formatTicks(Math.round(price * 1.08))}`}
              </span>
            </div>
            <div className="mt-3">
              {card.id === "agi" ? (
                <p className="py-16 text-center font-mono text-sm text-[#9AA0AC]">
                  unpriced
                </p>
              ) : (
                <PriceChart history={card.priceHistory} />
              )}
            </div>
          </div>

          <StatBlock card={card} allCards={ranked} />

          <SignalsPanel card={card} />

          {/* actions */}
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/arena?vs=${card.id}`}
              className="bg-[#C23B2E] px-5 py-2.5 font-mono text-sm font-semibold uppercase tracking-widest text-[#FDFBF6] transition-colors hover:bg-[#A32F24]"
            >
              Fight this card
            </Link>
            <Link
              href={`/arena?me=${card.id}`}
              className="border-2 border-[#1E2430] px-5 py-2.5 font-mono text-sm font-semibold uppercase tracking-widest text-[#1E2430] transition-colors hover:bg-[#1E2430]/5"
            >
              Use in Arena
            </Link>
            <ShareButton className="text-sm" />
          </div>
        </div>
      </div>
    </main>
  );
}
