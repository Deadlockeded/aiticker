import type { MarketCard } from "@/lib/cards";
import { formatMove, formatTicks, getCurrentPrice, getDailyMove } from "@/lib/market";
import Logo from "./Logo";

/** Hero: the rising-fan lockup + plain-register H1, live index chip right. */
export default function Masthead({ cards }: { cards: MarketCard[] }) {
  const pool = cards.filter((c) => c.id !== "agi");
  // the composite: average card price + average daily move (deterministic,
  // same on server and client — safe to SSR)
  const composite = pool.reduce((s, c) => s + getCurrentPrice(c), 0) / pool.length;
  const move = pool.reduce((s, c) => s + getDailyMove(c), 0) / pool.length;

  return (
    <header className="paper-in flex flex-col gap-5 border-b-[3px] border-[#17301F] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <Logo variant="lockup" size={56} animate />
        <h1 className="mt-4 text-3xl leading-tight text-[#17301F] sm:text-4xl">
          The AI industry is a{" "}
          <span className="text-[#B23A2E]">card game now.</span>
        </h1>
        <p className="mt-1 text-[16px] text-[#5A6E5E]">
          Real data. Fake money. One card is mythic.
        </p>
      </div>
      <div className="shrink-0 border-2 border-[#17301F] bg-[#EAF0E4] px-4 py-2.5 shadow-[4px_4px_0_#17301F]">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#5A6E5E]">
          Index
        </p>
        <p className="tnum font-mono text-2xl font-bold leading-tight text-[#17301F]">
          {formatTicks(Math.round(composite))}
        </p>
        <p className={`tnum font-mono text-sm ${move >= 0 ? "text-[#1F6E3D]" : "text-[#B23A2E]"}`}>
          {formatMove(move)} today
        </p>
      </div>
    </header>
  );
}
