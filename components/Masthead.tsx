import type { MarketCard } from "@/lib/cards";
import { formatMove, formatTicks, getCurrentPrice, getDailyMove } from "@/lib/market";

/** Hero: the Sora headline — "card game" is the only coloured phrase on the page. */
export default function Masthead({ cards }: { cards: MarketCard[] }) {
  const pool = cards.filter((c) => c.id !== "agi");
  // the composite: average card price + average daily move (deterministic,
  // same on server and client — safe to SSR)
  const composite = pool.reduce((s, c) => s + getCurrentPrice(c), 0) / pool.length;
  const move = pool.reduce((s, c) => s + getDailyMove(c), 0) / pool.length;

  return (
    <header className="mb-6">
      <h1 className="text-[34px] leading-[1.05] text-ink sm:text-[44px]">
        The AI industry is a{" "}
        <span className="text-pink">card game</span> now.
      </h1>
      <p className="mt-2 text-[16px] text-ink2">
        Real data. Fake money. One card is mythic.
      </p>
      <div className="mt-4 flex items-center gap-2">
        <span className="micro rounded-full bg-surface2 px-2.5 py-1.5 font-semibold text-ink2">
          Index
        </span>
        <span className="tnum font-display text-[20px] font-extrabold text-ink">
          {formatTicks(Math.round(composite))}
        </span>
        <span className={`tnum font-mono text-[13px] ${move >= 0 ? "text-up" : "text-down"}`}>
          {formatMove(move)} today
        </span>
      </div>
    </header>
  );
}
