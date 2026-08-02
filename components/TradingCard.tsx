import type { Rarity } from "@/lib/types";
import type { MarketCard } from "@/lib/cards";
import { formatMove, formatTicks, getCurrentPrice, getDailyMove } from "@/lib/market";
import CardArt from "./CardArt";
import RivalryArt from "./RivalryArt";

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
    artBg: "bg-[radial-gradient(120%_100%_at_50%_0%,#27272a_0%,#161618_70%)]",
    accentText: "text-zinc-400",
    border: "border-white/10",
    glow: "",
    foilSweep: false,
    holoWash: false,
  },
  rare: {
    label: "Rare",
    artBg: "bg-[radial-gradient(120%_100%_at_50%_0%,#0c4a6e_0%,#111318_72%)]",
    accentText: "text-sky-400",
    border: "border-sky-400/25",
    glow: "",
    foilSweep: false,
    holoWash: false,
  },
  epic: {
    label: "Epic",
    artBg: "bg-[radial-gradient(120%_100%_at_50%_0%,#581c87_0%,#131117_72%)]",
    accentText: "text-fuchsia-400",
    border: "border-fuchsia-400/25",
    glow: "",
    foilSweep: false,
    holoWash: false,
  },
  legendary: {
    label: "Legendary",
    artBg: "bg-[radial-gradient(120%_100%_at_50%_0%,#78350f_0%,#141210_72%)]",
    accentText: "text-amber-400",
    border: "border-amber-400/40",
    glow: "shadow-[0_0_28px_-8px_rgba(251,191,36,0.35)]",
    foilSweep: true,
    holoWash: false,
  },
  mythic: {
    label: "Mythic",
    artBg: "bg-[radial-gradient(120%_100%_at_50%_0%,#1e1b4b_0%,#101018_72%)]",
    accentText: "text-cyan-300",
    border: "border-transparent",
    glow: "shadow-[0_0_32px_-6px_rgba(56,189,248,0.35)]",
    foilSweep: true,
    holoWash: true,
  },
};

const STAT_ROWS = [
  { key: "innovation", label: "INN" },
  { key: "influence", label: "INF" },
  { key: "momentum", label: "MOM" },
] as const;

export default function TradingCard({
  card,
  rank,
  size = "grid",
}: {
  card: MarketCard;
  rank: number;
  size?: "grid" | "hero";
}) {
  const r = RARITY[card.rarity];
  const hero = size === "hero";
  const price = getCurrentPrice(card);
  const move = getDailyMove(card);
  const mythic = card.rarity === "mythic";

  const body = (
    <div
      className={`group flex h-full flex-col overflow-hidden bg-[#131316] transition duration-200 ${
        mythic ? "rounded-[11px]" : `rounded-xl border ${r.border}`
      } ${hero ? "" : "hover:-translate-y-1 hover:bg-[#18181c]"}`}
    >
      {/* art */}
      <div
        className={`relative aspect-square overflow-hidden ${r.artBg} ${
          r.foilSweep || card.type === "moment" ? "foil-sweep" : ""
        }`}
      >
        {r.holoWash && <div className="holo-wash absolute inset-0 opacity-50" />}
        {card.type === "moment" ? (
          /* cinematic frame: letterboxed wide crop + date stamp */
          <div className="absolute inset-0 flex flex-col justify-center bg-black/30">
            <div className="flex aspect-video items-center justify-center border-y border-white/15 bg-gradient-to-b from-black/60 via-transparent to-black/60">
              <span className={hero ? "text-7xl" : "text-4xl"}>{card.avatar}</span>
            </div>
            <span
              className={`absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 font-mono uppercase tracking-wider text-white/70 ${
                hero ? "text-[11px]" : "text-[8px]"
              }`}
            >
              {card.momentDate}
            </span>
          </div>
        ) : card.type === "rivalry" && card.sides ? (
          <RivalryArt sides={card.sides} hero={hero} />
        ) : (
          <CardArt card={card} hero={hero} shape="tile" />
        )}

        {/* rating chip */}
        <div
          className={`absolute left-2 top-2 flex items-baseline gap-1 rounded-lg bg-black/60 backdrop-blur-sm ${
            hero ? "px-3 py-1.5" : "px-2 py-1"
          }`}
        >
          <span
            className={`tnum font-mono font-bold leading-none text-white ${
              hero ? "text-3xl" : "text-lg"
            }`}
          >
            {card.rating}
          </span>
          <span
            className={`font-mono uppercase text-white/50 ${hero ? "text-xs" : "text-[8px]"}`}
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

        {/* engineer photos need a bottom scrim for the info block edge */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      {/* info */}
      <div className={`flex flex-1 flex-col ${hero ? "gap-2 p-5" : "gap-1.5 p-3"}`}>
        <div className="flex items-center justify-between gap-2">
          <h3
            className={`truncate font-semibold text-white ${
              hero ? "text-xl" : "text-sm"
            }`}
          >
            {card.name}
          </h3>
          <span
            className={`tnum shrink-0 font-mono text-white/40 ${hero ? "text-sm" : "text-[10px]"}`}
          >
            #{rank}
          </span>
        </div>
        <div
          className={`flex items-center justify-between font-mono text-white/40 ${
            hero ? "text-xs" : "text-[9px]"
          }`}
        >
          <span className="uppercase tracking-wider">{card.type}</span>
          <span className="tnum">
            #{card.serial}/{card.editionSize} · S{card.series}
          </span>
        </div>

        {hero && <p className="text-sm text-white/55">{card.tagline}</p>}
        {hero && (
          <p className="text-[13px] italic leading-snug text-white/40">
            “{card.flavorText}”
          </p>
        )}

        {hero && (
          <div className="mt-1 space-y-2 border-t border-white/10 pt-3">
            {STAT_ROWS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <span className={`w-8 font-mono text-xs ${r.accentText}`}>
                  {label}
                </span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-white/60"
                    style={{ width: `${card.stats[key]}%` }}
                  />
                </div>
                <span className="tnum w-6 text-right font-mono text-xs text-white/70">
                  {card.stats[key]}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* price row */}
        <div
          className={`mt-auto flex items-center justify-between border-t border-white/10 ${
            hero ? "pt-3" : "pt-2"
          }`}
        >
          <span
            className={`tnum font-mono font-semibold text-white ${
              hero ? "text-lg" : "text-xs"
            }`}
          >
            {formatTicks(price)}
          </span>
          <span
            className={`tnum font-mono ${move >= 0 ? "text-emerald-400" : "text-red-400"} ${
              hero ? "text-sm" : "text-[10px]"
            }`}
          >
            {formatMove(move)}
          </span>
        </div>
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
