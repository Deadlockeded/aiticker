import Link from "next/link";
import { notFound } from "next/navigation";
import TradingCard from "@/components/TradingCard";
import PriceChart from "@/components/PriceChart";
import ShareButton from "@/components/ShareButton";
import DailyQuip from "@/components/DailyQuip";
import { getAllCards, getCard, getRank } from "@/lib/cards";
import type { MarketCard } from "@/lib/cards";
import { PULL_ODDS } from "@/lib/editions";
import { formatMove, formatTicks, getChange, getCurrentPrice } from "@/lib/market";
import type {
  CompanyMetrics,
  EngineerMetrics,
  MomentMetrics,
  RivalryMetrics,
} from "@/lib/types";

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

function metricRows(card: MarketCard): [string, string][] {
  if (card.type === "company") {
    const m = card.metrics as CompanyMetrics;
    return [
      ["Valuation", `$${m.valuation.toLocaleString()}B`],
      ["Funding raised", `$${m.funding.toLocaleString()}B`],
      ["Headcount", m.headcount.toLocaleString()],
      ["Models shipped", String(m.modelCount)],
    ];
  }
  if (card.type === "engineer") {
    const m = card.metrics as EngineerMetrics;
    return [
      ["Citations", `${Math.round(m.citations / 1000)}K`],
      ["Followers", `${Math.round(m.followers / 1000)}K`],
      ["Impact score", `${m.impactScore}/100`],
      ["Years in field", String(m.yearsInField)],
    ];
  }
  if (card.type === "moment") {
    const m = card.metrics as MomentMetrics;
    return [
      ["Impact", `${m.impact}/100`],
      ["Chaos", `${m.chaos}/100`],
      ["Memeability", `${m.memeability}/100`],
      ["Legacy", `${m.legacy}/100`],
    ];
  }
  const m = card.metrics as RivalryMetrics;
  return [
    ["Heat", `${m.heat}/100`],
    ["History", `${m.history}/100`],
    ["Pettiness", `${m.pettiness}/100`],
    ["Stakes", `${m.stakes}/100`],
  ];
}

function ChangeStat({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center">
      <span className="block font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
        {label}
      </span>
      <span
        className={`mt-1 block font-mono text-sm font-semibold ${
          pct >= 0 ? "text-emerald-400" : "text-red-400"
        }`}
      >
        {formatMove(pct)}
      </span>
    </div>
  );
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
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="mb-1 font-mono text-xs uppercase tracking-[0.3em] text-white/40">
        Signals
      </h2>
      <p className="mb-4 text-xs text-white/35">
        Live public data feeding this card&apos;s rating — the receipts.
      </p>
      <dl className="space-y-3">
        {rows.map(([key, label, source]) => {
          const value = card.signals![key]!;
          return (
            <div key={key} className="flex items-center justify-between gap-3">
              <dt className="text-sm text-white/60">
                {label}{" "}
                <span className="font-mono text-[10px] text-white/30">
                  {source}
                </span>
              </dt>
              <dd className="tnum font-mono text-sm text-white">
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
  const odds = PULL_ODDS[card.rarity];

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
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.35em] text-white/40">
                {card.type} · Rank #{rank}
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {card.name}
              </h1>
              <p className="mt-2 text-white/60">{card.tagline}</p>
              <p className="mt-3 max-w-md text-sm italic text-white/40">
                “{card.flavorText}”
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="text-right">
                <span className="block font-mono text-3xl font-bold text-white">
                  {formatTicks(price)}
                </span>
                <span className="block font-mono text-xs text-white/40">
                  index value
                </span>
              </div>
              <ShareButton className="text-xs" />
            </div>
          </div>

          <DailyQuip card={card} />

          {/* 30-day chart */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-white/40">
              Price history
            </h2>
            <PriceChart history={card.priceHistory} />
            <div className="mt-4 grid grid-cols-3 gap-3">
              <ChangeStat label="24h" pct={getChange(card, 1)} />
              <ChangeStat label="7d" pct={getChange(card, 7)} />
              <ChangeStat label="30d" pct={getChange(card, 29)} />
            </div>
          </div>

          {card.career && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-white/40">
                Career
              </h2>
              <ol className="relative space-y-4 border-l border-white/15 pl-4">
                {card.career.map((stop) => (
                  <li key={`${stop.org}-${stop.years}`} className="relative">
                    <span className="absolute -left-[21.5px] top-1.5 h-2 w-2 rounded-full bg-cyan-400/70" />
                    <p className="text-sm font-semibold text-white">
                      {stop.org}
                    </p>
                    <p className="text-xs text-white/50">
                      {stop.role} ·{" "}
                      <span className="font-mono">{stop.years}</span>
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <SignalsPanel card={card} />

          <div className="grid gap-6 sm:grid-cols-2">
            {/* raw metrics */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-white/40">
                Metrics
              </h2>
              <dl className="space-y-3">
                {metricRows(card).map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <dt className="text-sm text-white/60">{label}</dt>
                    <dd className="font-mono text-sm text-white">{value}</dd>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-white/10 pt-3">
                  <dt className="text-sm text-white/60">Overall rating</dt>
                  <dd className="font-mono text-sm font-bold text-white">
                    {card.rating}
                  </dd>
                </div>
              </dl>
            </div>

            {/* edition + odds */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-white/40">
                Edition
              </h2>
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-white/60">Print</dt>
                  <dd className="font-mono text-sm text-white">
                    #{card.serial}/{card.editionSize}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-white/60">Series</dt>
                  <dd className="font-mono text-sm text-white">
                    {card.series}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-white/60">Rarity</dt>
                  <dd className="font-mono text-sm capitalize text-white">
                    {card.rarity}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-3">
                  <dt className="text-sm text-white/60">Pull odds</dt>
                  <dd className="font-mono text-sm text-white">
                    {(odds * 100).toFixed(odds < 0.01 ? 1 : 0)}% per card
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
