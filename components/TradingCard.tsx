import type { Rarity } from "@/lib/types";
import type { MarketCard } from "@/lib/cards";
import { formatMove, formatTicks, getCurrentPrice, getDailyMove } from "@/lib/market";
import CardArt from "./CardArt";
import RivalryArt from "./RivalryArt";
import HotBadge from "./HotBadge";
import { statTier } from "@/lib/lines";
import TiltFoil from "./TiltFoil";

/**
 * All rarity-driven styling lives here. The design is marketplace-tile
 * first: full-bleed square art, restrained chrome, rarity expressed through
 * the art backdrop, a label tint, and (legendary+) a quiet foil.
 */
const RARITY: Record<
  Rarity,
  {
    label: string;
    /** Backdrop behind the art tile. */
    artBg: string;
    /** Text tint for the rarity label. */
    accentText: string;
    /** Card border (mythic uses the animated conic wrapper instead). */
    border: string;
    glow: string;
    foilSweep: boolean;
    holoWash: boolean;
  }
> = {
  common: {
    label: "Common",
    artBg: "bg-[radial-gradient(120%_100%_at_50%_0%,#e8e1d0_0%,#d9d2bf_70%)]",
    accentText: "text-zinc-400",
    border: "border-[#1E2430]/30",
    glow: "",
    foilSweep: false,
    holoWash: false,
  },
  rare: {
    label: "Rare",
    artBg: "bg-[radial-gradient(120%_100%_at_50%_0%,#cfd9e4_0%,#b9c6d4_72%)]",
    accentText: "text-sky-400",
    border: "border-sky-400/25",
    glow: "",
    foilSweep: false,
    holoWash: false,
  },
  epic: {
    label: "Epic",
    artBg: "bg-[radial-gradient(120%_100%_at_50%_0%,#dccbe0_0%,#c5aecb_72%)]",
    accentText: "text-fuchsia-400",
    border: "border-fuchsia-400/25",
    glow: "",
    foilSweep: false,
    holoWash: false,
  },
  legendary: {
    label: "Legendary",
    artBg: "bg-[radial-gradient(120%_100%_at_50%_0%,#e8cf9a_0%,#d4b26a_72%)]",
    accentText: "text-amber-400",
    border: "border-amber-400/40",
    glow: "shadow-[0_0_28px_-8px_rgba(251,191,36,0.35)]",
    foilSweep: true,
    holoWash: false,
  },
  mythic: {
    label: "Mythic",
    artBg: "bg-[radial-gradient(120%_100%_at_50%_0%,#d8d3e6_0%,#bfb8d6_72%)]",
    accentText: "text-[#C23B2E]",
    border: "border-transparent",
    glow: "shadow-[0_0_32px_-6px_rgba(56,189,248,0.35)]",
    foilSweep: true,
    holoWash: true,
  },
};

const STAT_ROWS = [
  { key: "innovation", label: "INNOVATION" },
  { key: "influence", label: "INFLUENCE" },
  { key: "momentum", label: "MOMENTUM" },
] as const;

export default function TradingCard({
  card,
  rank,
  size = "grid",
  community = false,
  communityStats,
  stamp,
}: {
  card: MarketCard;
  rank: number;
  size?: "grid" | "hero";
  /** Community Series (make-your-own) framing: ∞ serial, no market row. */
  community?: boolean;
  communityStats?: { label: string; value: number }[];
  /** Rubber-stamp certification overlay (community cards). */
  stamp?: string;
}) {
  const r = RARITY[card.rarity];
  const hero = size === "hero";
  const price = getCurrentPrice(card);
  const move = getDailyMove(card);
  const mythic = card.rarity === "mythic";
  const artifact = card.type === "artifact";
  const agi = card.id === "agi";

  const body = (
    <div
      className={`group flex h-full flex-col overflow-hidden transition duration-200 ${
        artifact && !agi
          ? "rounded-[3px] border-[3px] border-double border-[#1E2430]/60 bg-[#FDFBF6] paper-shadow"
          : mythic
            ? "rounded-[3px] bg-[#FDFBF6]"
            : "rounded-[3px] border-2 border-[#1E2430] bg-[#FDFBF6] paper-shadow"
      } ${hero ? "" : "hover:-translate-y-1"}`}
    >
      {/* art */}
      <div
        className={`relative aspect-square overflow-hidden ${r.artBg} ${
          r.foilSweep || card.type === "moment" ? "foil-sweep" : ""
        }`}
      >
        {r.holoWash && !agi && <div className="holo-wash absolute inset-0 opacity-50" />}
        {card.type === "moment" ? (
          /* cinematic frame: letterboxed wide crop + date stamp */
          <div className="absolute inset-0 flex flex-col justify-center bg-black/30">
            <div className="flex aspect-video items-center justify-center border-y border-[#1E2430]/40 bg-gradient-to-b from-black/60 via-transparent to-black/60">
              <span className={hero ? "text-7xl" : "text-4xl"}>{card.avatar}</span>
            </div>
            <span
              className={`absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 font-mono uppercase tracking-wider text-[#5A6070] ${
                hero ? "text-[11px]" : "text-[8px]"
              }`}
            >
              {card.momentDate}
            </span>
          </div>
        ) : card.type === "rivalry" && card.sides ? (
          <RivalryArt sides={card.sides} hero={hero} />
        ) : artifact ? (
          <div
            className={`absolute inset-0 flex items-center justify-center ${agi ? "bg-[#0b0b0d]" : "bg-[radial-gradient(110%_100%_at_50%_0%,#efe8d6_0%,#e0d7c0_70%)]"}`}
          >
            <svg
              viewBox="0 0 48 48"
              className={hero ? "h-36 w-36" : "h-20 w-20"}
              dangerouslySetInnerHTML={{ __html: card.icon ?? "" }}
            />
          </div>
        ) : (
          <CardArt card={card} hero={hero} shape="tile" />
        )}

        {/* rating chip */}
        <div
          className={`absolute left-2 top-2 flex items-baseline gap-1 rounded-lg bg-[#1E2430] ${
            hero ? "px-3 py-1.5" : "px-2 py-1"
          }`}
        >
          <span
            className={`tnum font-mono font-bold leading-none text-[#FDFBF6] ${
              hero ? "text-3xl" : "text-lg"
            }`}
          >
            {agi ? "?" : card.rating}
          </span>
          <span
            className={`font-mono uppercase text-[#FDFBF6]/60 ${hero ? "text-xs" : "text-[8px]"}`}
          >
            ovr
          </span>
        </div>

        {/* rarity pill */}
        <span
          className={`absolute right-2 top-2 rounded-md bg-black/60 font-mono uppercase tracking-wider backdrop-blur-sm ${r.accentText} ${
            hero ? "px-2.5 py-1 text-[11px]" : "px-1.5 py-0.5 text-[8px]"
          }`}
        >
          {r.label}
        </span>
        <HotBadge cardId={card.id} />
        {hero && card.rarity !== "common" && <TiltFoil />}

        {stamp && (
          <span
            className={`pointer-events-none absolute left-1/2 top-[62%] z-10 -translate-x-1/2 rotate-[-12deg] whitespace-nowrap rounded border-double border-red-500/75 px-2 py-0.5 font-mono font-black uppercase tracking-widest text-[#C23B2E] opacity-90 mix-blend-screen [border-width:4px] [text-shadow:0_0_2px_rgba(239,68,68,0.6),1px_1px_0_rgba(0,0,0,0.4)] ${
              hero ? "text-xs" : "text-[8px]"
            }`}
          >
            {stamp}
          </span>
        )}

        {/* engineer photos need a bottom scrim for the info block edge */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      {/* info */}
      <div className={`flex flex-1 flex-col ${hero ? "gap-2 p-5" : "gap-1.5 p-3"}`}>
        <div className="flex items-center justify-between gap-2">
          <h3
            className={`truncate font-semibold text-[#1E2430] ${
              hero ? "text-xl" : "text-sm"
            }`}
          >
            {card.name}
          </h3>
          {!community && (
            <span
              className={`tnum shrink-0 font-mono text-[#9AA0AC] ${hero ? "text-sm" : "text-[10px]"}`}
            >
              #{rank}
            </span>
          )}
        </div>
        <div
          className={`flex items-center justify-between font-mono text-[#9AA0AC] ${
            hero ? "text-xs" : "text-[9px]"
          }`}
        >
          <span className={`uppercase tracking-wider ${community ? "text-[#C23B2E]" : ""}`}>
            {community ? "community" : artifact ? "artifact" : card.type}
          </span>
          <span className="tnum">
            {community
              ? "#???/∞ · Community"
              : `#${card.serial}/${card.editionSize} · S${card.series}`}
          </span>
        </div>

        {hero && <p className="text-sm text-[#5A6070]">{card.tagline}</p>}
        {hero && (
          <p className="text-[13px] italic leading-snug text-[#9AA0AC]">
            “{card.flavorText}”
          </p>
        )}

        {hero && communityStats && (
          <div className="mt-1 space-y-2 border-t border-[#1E2430]/30 pt-3">
            {communityStats.map(({ label, value }) => (
              <div key={label} className="flex items-center gap-2">
                <span className={`w-24 font-mono text-xs ${r.accentText}`}>
                  {label}
                </span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#1E2430]/10">
                  <div
                    className="h-full rounded-full bg-white/60"
                    style={{ width: `${value}%` }}
                  />
                </div>
                <span className="tnum w-6 text-right font-mono text-xs text-[#5A6070]">
                  {value}
                </span>
              </div>
            ))}
          </div>
        )}

        {hero && !communityStats && (
          <div className="mt-1 space-y-2 border-t border-[#1E2430]/30 pt-3">
            {STAT_ROWS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <span className={`w-24 font-mono text-[10px] tracking-wider ${r.accentText}`}>
                  {label}
                </span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#1E2430]/10">
                  <div
                    className="h-full rounded-full bg-white/60"
                    style={{ width: `${card.stats[key]}%` }}
                  />
                </div>
                <span className="tnum w-6 text-right font-mono text-xs text-[#5A6070]">
                  {agi ? "?" : card.stats[key]}
                </span>
                {!agi && (
                  <span
                    className={`border px-1 font-mono text-[8px] font-semibold ${
                      statTier(card.stats[key]).hot
                        ? "border-[#C23B2E] bg-[#C23B2E] text-[#FDFBF6]"
                        : "border-[#1E2430]/60 text-[#1E2430]"
                    }`}
                  >
                    {statTier(card.stats[key]).word}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* price row (community cards have no market) */}
        {!community && (
          <div
            className={`mt-auto flex items-center justify-between border-t border-[#1E2430]/30 ${
              hero ? "pt-3" : "pt-2"
            }`}
          >
            <span
              className={`tnum font-mono font-semibold text-[#1E2430] ${
                hero ? "text-lg" : "text-xs"
              }`}
            >
              {agi ? "unpriced" : formatTicks(price)}
            </span>
            <span
              className={`tnum font-mono ${move >= 0 ? "text-[#1F7A3D]" : "text-[#C23B2E]"} ${
                hero ? "text-sm" : "text-[10px]"
              }`}
            >
              {agi ? "" : formatMove(move)}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  if (mythic) {
    return (
      <div className={`mythic-border h-full rounded-xl p-[1.5px] ${r.glow}`}>
        {body}
      </div>
    );
  }
  return <div className={`h-full ${r.glow}`}>{body}</div>;
}
