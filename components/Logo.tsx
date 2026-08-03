import type { MarketCard } from "@/lib/cards";
import { getDailyMove, getMovers } from "@/lib/market";

/**
 * The aiticker logo system — Ledger identity.
 * TickerTapeLogo: brick ribbon, live index quotes on the tails.
 * SlabLogo: compact ink-bordered lockup.
 * TapeChip: the favicon mark, used in the header at ~16px.
 */

/** Live tails: top gainer + one artifact, from real index data. */
function tapeQuotes(cards: MarketCard[]): { left: string; right: string } {
  const pool = cards.filter((c) => c.id !== "agi");
  const { gainers } = getMovers(pool.filter((c) => c.type !== "artifact"));
  const top = gainers[0];
  const artifact = pool.find((c) => c.type === "artifact");
  const short = (name: string) =>
    name.replace(/^the /i, "").split(/\s+/)[0].toUpperCase().slice(0, 6);
  return {
    left: top ? `${short(top.name)} +${Math.abs(getDailyMove(top)).toFixed(1)} ▲` : "INDEX ▲",
    right: artifact ? `${short(artifact.name)} ${Math.round(getDailyMove(artifact) * 10) / 10} ·` : "S1 ·",
  };
}

export function TickerTapeLogo({
  cards,
  size = "md",
}: {
  cards: MarketCard[];
  size?: "md" | "lg";
}) {
  const q = tapeQuotes(cards);
  const lg = size === "lg";
  return (
    <div className="inline-flex rotate-[-2.5deg] items-center" aria-label="aiticker">
      <span className={`font-mono text-[#5A6E5E] ${lg ? "mr-3 text-[11px]" : "mr-2 text-[9px]"} tracking-widest`}>
        {q.left}
      </span>
      <span
        className="relative flex items-center border-y-[2.5px] border-[#17301F] bg-[#B23A2E] shadow-[4px_5px_0_#17301F]"
        style={{
          clipPath:
            "polygon(0 0, 100% 0, calc(100% - 10px) 50%, 100% 100%, 0 100%, 10px 50%)",
        }}
      >
        <span className={`font-display leading-none tracking-tight ${lg ? "px-8 py-2.5 text-4xl sm:text-5xl" : "px-6 py-1.5 text-2xl"}`}>
          <span className="text-[#F4F7F0]">AI</span>
          <span className="text-[#F0BFB6]">TICKER</span>
        </span>
      </span>
      <span className={`font-mono text-[#5A6E5E] ${lg ? "ml-3 text-[11px]" : "ml-2 text-[9px]"} tracking-widest`}>
        {q.right}
      </span>
    </div>
  );
}

export function SlabLogo() {
  return (
    <span className="inline-flex items-stretch border-2 border-[#17301F] bg-[#F4F7F0] shadow-[3px_3px_0_#17301F]">
      <span className="flex flex-col px-2.5 py-1">
        <span className="font-display text-lg leading-none text-[#17301F]">
          AI<span className="text-[#B23A2E]">TICKER</span>
        </span>
        <span className="mt-0.5 font-mono text-[7px] uppercase tracking-[0.5em] text-[#5A6E5E]">
          The AI card index
        </span>
      </span>
      <span className="flex items-center border-l-2 border-[#17301F] bg-[#EAF0E4] px-1.5 text-[10px] text-[#B23A2E]">
        ▲
      </span>
    </span>
  );
}

export function TapeChip({ size = 16 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 rotate-[-2deg] items-center justify-center rounded-[3px] border-2 border-[#17301F] bg-[#B23A2E] shadow-[2px_2px_0_#17301F]"
      style={{ width: size + 8, height: size + 8 }}
      aria-hidden
    >
      <span className="font-display leading-none text-[#F4F7F0]" style={{ fontSize: size * 0.55 }}>
        AT
      </span>
    </span>
  );
}
