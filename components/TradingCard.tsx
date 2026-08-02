import type { Rarity } from "@/lib/types";
import type { MarketCard } from "@/lib/cards";
import CardArt from "./CardArt";

/**
 * All rarity-driven styling lives here: border treatment, panel gradient,
 * accent colors, and which foil overlays are active for a tier.
 */
const RARITY: Record<
  Rarity,
  {
    label: string;
    border: string;
    panel: string;
    accentText: string;
    statBar: string;
    emblemRing: string;
    glow: string;
    foilSweep: boolean;
    holoWash: boolean;
  }
> = {
  common: {
    label: "Common",
    border: "bg-gradient-to-b from-zinc-500 via-zinc-700 to-zinc-800",
    panel: "bg-gradient-to-b from-zinc-800/90 via-zinc-900 to-zinc-950",
    accentText: "text-zinc-300",
    statBar: "bg-zinc-400",
    emblemRing: "bg-gradient-to-br from-zinc-400 to-zinc-600",
    glow: "",
    foilSweep: false,
    holoWash: false,
  },
  rare: {
    label: "Rare",
    border: "bg-gradient-to-b from-sky-400 via-blue-600 to-blue-900",
    panel: "bg-gradient-to-b from-sky-950/90 via-slate-900 to-slate-950",
    accentText: "text-sky-300",
    statBar: "bg-sky-400",
    emblemRing: "bg-gradient-to-br from-sky-300 to-blue-600",
    glow: "shadow-[0_0_24px_-6px_rgba(56,189,248,0.45)]",
    foilSweep: false,
    holoWash: false,
  },
  epic: {
    label: "Epic",
    border: "bg-gradient-to-b from-fuchsia-400 via-purple-600 to-purple-950",
    panel: "bg-gradient-to-b from-purple-950/90 via-slate-900 to-slate-950",
    accentText: "text-fuchsia-300",
    statBar: "bg-fuchsia-400",
    emblemRing: "bg-gradient-to-br from-fuchsia-300 to-purple-600",
    glow: "shadow-[0_0_28px_-6px_rgba(217,70,239,0.5)]",
    foilSweep: false,
    holoWash: false,
  },
  legendary: {
    label: "Legendary",
    border: "bg-gradient-to-b from-amber-200 via-amber-500 to-yellow-800",
    panel: "bg-gradient-to-b from-amber-950/80 via-stone-900 to-stone-950",
    accentText: "text-amber-300",
    statBar: "bg-amber-400",
    emblemRing: "bg-gradient-to-br from-amber-200 to-amber-600",
    glow: "shadow-[0_0_32px_-6px_rgba(251,191,36,0.55)]",
    foilSweep: true,
    holoWash: false,
  },
  mythic: {
    label: "Mythic",
    border: "mythic-border",
    panel: "bg-gradient-to-b from-indigo-950/90 via-slate-900 to-slate-950",
    accentText: "text-cyan-300",
    statBar: "bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300",
    emblemRing: "mythic-border",
    glow: "shadow-[0_0_36px_-4px_rgba(56,189,248,0.5)]",
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

  return (
    <div
      className={`group relative aspect-[5/7] w-full select-none rounded-2xl p-[3px] transition-transform duration-300 ${r.border} ${r.glow} ${
        hero ? "" : "hover:-translate-y-1.5 hover:scale-[1.02]"
      }`}
    >
      <div
        className={`relative flex h-full w-full flex-col overflow-hidden rounded-[13px] ${r.panel} ${
          r.foilSweep ? "foil-sweep" : ""
        }`}
      >
        {r.holoWash && <div className="holo-wash absolute inset-0 opacity-70" />}

        {/* subtle texture */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_55%)]" />

        {/* header: rank badge + rarity */}
        <div className={`relative flex items-start justify-between ${hero ? "p-5" : "p-3"}`}>
          <div className="flex flex-col items-center leading-none">
            <span
              className={`font-mono font-bold tracking-tight ${hero ? "text-5xl" : "text-2xl"}`}
            >
              {card.rating}
            </span>
            <span
              className={`mt-1 rounded-full bg-white/10 px-1.5 py-0.5 font-mono text-white/70 ${
                hero ? "text-xs" : "text-[9px]"
              }`}
            >
              #{rank}
            </span>
          </div>
          <span
            className={`rounded-full border border-white/15 bg-black/30 font-semibold uppercase tracking-[0.18em] ${r.accentText} ${
              hero ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[8px]"
            }`}
          >
            {r.label}
          </span>
        </div>

        {/* emblem */}
        <div className="relative flex flex-1 flex-col items-center justify-center gap-1">
          <div
            className={`rounded-full p-[3px] ${r.emblemRing} ${hero ? "h-32 w-32" : "h-16 w-16 sm:h-20 sm:w-20"}`}
          >
            <CardArt card={card} hero={hero} />
          </div>
          <span
            className={`mt-2 font-mono uppercase tracking-[0.3em] text-white/40 ${
              hero ? "text-xs" : "text-[8px]"
            }`}
          >
            {card.type}
          </span>
        </div>

        {/* name + tagline */}
        <div className={`relative text-center ${hero ? "px-6 pb-4" : "px-3 pb-2"}`}>
          <h3
            className={`font-bold uppercase tracking-wide text-white ${
              hero ? "text-2xl" : "text-xs sm:text-sm"
            }`}
          >
            {card.name}
          </h3>
          <p
            className={`mt-0.5 text-white/50 ${hero ? "text-sm" : "hidden text-[9px] leading-tight sm:block"}`}
          >
            {card.tagline}
          </p>
        </div>

        {/* stat lines */}
        <div
          className={`relative border-t border-white/10 bg-black/30 ${
            hero ? "space-y-2.5 px-6 py-5" : "space-y-1.5 px-3 py-2.5"
          }`}
        >
          {STAT_ROWS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <span
                className={`w-7 font-mono font-semibold ${r.accentText} ${
                  hero ? "text-xs" : "text-[8px]"
                }`}
              >
                {label}
              </span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full ${r.statBar}`}
                  style={{ width: `${card.stats[key]}%` }}
                />
              </div>
              <span
                className={`w-6 text-right font-mono text-white/80 ${
                  hero ? "text-xs" : "text-[9px]"
                }`}
              >
                {card.stats[key]}
              </span>
            </div>
          ))}
        </div>

        {/* footer */}
        <div
          className={`relative flex items-center justify-center border-t border-white/10 bg-black/40 font-mono tracking-[0.2em] text-white/40 ${
            hero ? "py-2.5 text-[10px]" : "py-1.5 text-[7px]"
          }`}
        >
          #{card.serial}/{card.editionSize} · Series {card.series}
        </div>
      </div>
    </div>
  );
}
