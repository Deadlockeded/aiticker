import Link from "next/link";
import type { MarketCard } from "@/lib/cards";
import { formatMove, formatTicks, getCurrentPrice, getDailyMove, getMovers } from "@/lib/market";

/** THE HOT LIST — red-bordered movers box, print-guide style. */
export default function HotList({ cards }: { cards: MarketCard[] }) {
  const { gainers, losers } = getMovers(cards.filter((c) => c.id !== "agi"));
  const rows = [...gainers.slice(0, 4), ...losers.slice(0, 2)];

  return (
    <div className="border-[3px] border-[#C23B2E] bg-[#FDFBF6] paper-shadow">
      <p className="bg-[#C23B2E] px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-[#FDFBF6]">
        🔥 The Hot List
      </p>
      <ul>
        {rows.map((card) => {
          const move = getDailyMove(card);
          return (
            <li key={card.id} className="border-b border-dotted border-[#9AA0AC] last:border-0">
              <Link
                href={`/cards/${card.id}`}
                className="flex items-center justify-between px-3 py-2 hover:bg-[#1E2430]/5"
              >
                <span className="truncate text-sm font-semibold text-[#1E2430]">
                  {card.name}
                </span>
                <span className="tnum ml-3 shrink-0 font-mono text-xs">
                  <span className="text-[#5A6070]">{formatTicks(getCurrentPrice(card))}</span>{" "}
                  <span className={move >= 0 ? "text-[#1F7A3D]" : "text-[#C23B2E]"}>
                    {formatMove(move)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
