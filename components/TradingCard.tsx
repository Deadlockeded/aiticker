import type { Rarity } from "@/lib/types";
import type { MarketCard } from "@/lib/cards";
import { formatMove, formatTicks, getCurrentPrice, getDailyMove } from "@/lib/market";
import { oddsLabelFor } from "@/lib/packs";
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
    artBg: "bg-[radial-gradient(120%_100%_at_50%_0%,#e0e8d8_0%,#ccd8c4_70%)]",
    accentText: "text-zinc-400",
    border: "border-[#17301F]/30",
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
    accentText: "text-[#B23A2E]",
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
  proof = false,
  resolving = false,
  inBinder = false,
  copies,
}: {
  card: MarketCard;
  rank: number;
  size?: "grid" | "hero";
  /** Community Series (make-your-own) framing: ∞ serial, no market row. */
  community?: boolean;
  communityStats?: { label: string; value: number }[];
  /** Rubber-stamp certification overlay (community cards). */
  stamp?: string;
  /**
   * Unowned: every word stays crisp — only the ART renders as a coarse
   * halftone print proof (single-ink navy, PROOF watermark, no foil, flat
   * shadow). Ownership is the finished print.
   */
  proof?: boolean;
  /** Pack-rip payoff: the proof veil resolves away into full color. */
  resolving?: boolean;
  /** Confirmed owned: shows the IN BINDER tag (and ×N with copies). */
  inBinder?: boolean;
  copies?: number;
}) {
  const r = RARITY[card.rarity];
  const hero = size === "hero";
  const price = getCurrentPrice(card);
  const move = getDailyMove(card);
  const mythic = card.rarity === "mythic";
  const artifact = card.type === "artifact";
  const agi = card.id === "agi";
  const veiled = proof || resolving;

  const body = (
    <div
      className={`group flex h-full flex-col overflow-hidden transition duration-200 ${
        artifact && !agi
          ? "rounded-[3px] border-[3px] border-double border-[#17301F]/60 bg-[#F4F7F0]"
          : mythic
            ? "rounded-[3px] bg-[#F4F7F0]"
            : "rounded-[3px] border-2 border-[#17301F] bg-[#F4F7F0]"
      } ${proof && !resolving ? "proof-shadow" : "paper-shadow"} ${hero ? "" : "hover:-translate-y-[3px] hover:rotate-[-0.4deg]"} ${resolving ? "proof-resolving" : ""}`}
    >
      {/* art */}
      <div
        className={`relative aspect-square overflow-hidden ${r.artBg} ${
          !veiled && (r.foilSweep || card.type === "moment") ? "foil-sweep" : ""
        }`}
        style={veiled ? ({ "--dot": hero ? "11px" : "8px" } as React.CSSProperties) : undefined}
      >
        {r.holoWash && !agi && !veiled && <div className="holo-wash absolute inset-0 opacity-50" />}
        {card.type === "moment" ? (
          /* cinematic frame: letterboxed wide crop + date stamp */
          <div className="absolute inset-0 flex flex-col justify-center bg-black/30">
            <div className="flex aspect-video items-center justify-center border-y border-[#17301F]/40 bg-gradient-to-b from-black/60 via-transparent to-black/60">
              <span className={hero ? "text-7xl" : "text-4xl"}>{card.avatar}</span>
            </div>
            <span
              className={`absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 font-mono uppercase tracking-wider text-[#5A6E5E] ${
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
            className={`absolute inset-0 flex items-center justify-center ${agi ? "bg-[#0b0b0d]" : "bg-[radial-gradient(110%_100%_at_50%_0%,#e6eede_0%,#d5e2cb_70%)]"}`}
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

        {/* PRINT PROOF veil — sits on the art, UNDER every chip: only the
            art is unfinished, every word stays crisp */}
        {veiled && (
          <div className="proof-veil" aria-hidden>
            <div className="proof-tint" />
            <div className="proof-paper" />
            <div className="proof-dots" />
            <span
              className={`proof-mark font-mono font-black uppercase ${hero ? "text-2xl tracking-[0.5em]" : "text-xs tracking-[0.4em]"}`}
            >
              Proof
            </span>
          </div>
        )}
        {veiled && !resolving && (
          <span
            className={`absolute bottom-1.5 right-1.5 z-10 rounded-sm border border-dashed border-[#9CB09E] bg-[#F4F7F0]/85 px-1 font-mono uppercase tracking-wider text-[#5A6E5E] ${hero ? "text-[9px]" : "text-[6px]"}`}
          >
            Not in your binder
          </span>
        )}
        {inBinder && !veiled && (
          <span
            className={`absolute left-2 z-10 rounded-sm bg-[#17301F] px-1.5 py-0.5 font-mono uppercase tracking-[0.2em] text-[#F4F7F0] ${hero ? "top-14 text-[9px]" : "top-11 text-[7px]"}`}
          >
            In binder{copies && copies > 1 ? ` ×${copies}` : ""}
          </span>
        )}

        {/* rating chip */}
        <div
          className={`absolute left-2 top-2 flex items-baseline gap-1 rounded-lg bg-[#17301F] ${
            hero ? "px-3 py-1.5" : "px-2 py-1"
          }`}
        >
          <span
            className={`tnum font-mono font-bold leading-none text-[#F4F7F0] ${
              hero ? "text-3xl" : "text-lg"
            }`}
          >
            {agi ? "?" : card.rating}
          </span>
          <span
            className={`font-mono uppercase text-[#F4F7F0]/60 ${hero ? "text-xs" : "text-[8px]"}`}
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
        {hero && card.rarity !== "common" && !veiled && <TiltFoil />}

        {stamp && (
          <span
            className={`pointer-events-none absolute left-1/2 top-[62%] z-10 -translate-x-1/2 rotate-[-12deg] whitespace-nowrap rounded border-double border-red-500/75 px-2 py-0.5 font-mono font-black uppercase tracking-widest text-[#B23A2E] opacity-90 mix-blend-screen [border-width:4px] [text-shadow:0_0_2px_rgba(239,68,68,0.6),1px_1px_0_rgba(0,0,0,0.4)] ${
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
            className={`truncate font-semibold text-[#17301F] ${
              hero ? "text-xl" : "text-sm"
            }`}
          >
            {card.name}
          </h3>
          {!community && rank > 0 && (
            <span
              className={`tnum shrink-0 font-mono text-[#9CB09E] ${hero ? "text-sm" : "text-[10px]"}`}
            >
              #{rank}
            </span>
          )}
        </div>
        <div
          className={`flex items-center justify-between font-mono text-[#9CB09E] ${
            hero ? "text-xs" : "text-[9px]"
          }`}
        >
          <span className={`uppercase tracking-wider ${community ? "text-[#B23A2E]" : ""}`}>
            {community ? "community" : artifact ? "artifact" : card.type}
          </span>
          <span className="tnum">
            {community
              ? "#???/∞ · Community"
              : `#${card.serial}/${card.editionSize} · S${card.series}`}
          </span>
        </div>

        {hero && <p className="text-sm text-[#5A6E5E]">{card.tagline}</p>}
        {/* artifacts seed tagline === flavorText — never print it twice */}
        {hero &&
          card.flavorText.toLowerCase().replace(/[“”".]/g, "").trim() !==
            card.tagline.toLowerCase().replace(/[“”".]/g, "").trim() && (
            <p className="text-[13px] italic leading-snug text-[#9CB09E]">
              “{card.flavorText}”
            </p>
          )}

        {hero && communityStats && (
          <div className="mt-1 space-y-2 border-t border-[#17301F]/30 pt-3">
            {communityStats.map(({ label, value }) => (
              <div key={label} className="flex items-center gap-2">
                <span className={`w-24 font-mono text-xs ${r.accentText}`}>
                  {label}
                </span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#17301F]/10">
                  <div
                    className="h-full rounded-full bg-white/60"
                    style={{ width: `${value}%` }}
                  />
                </div>
                <span className="tnum w-6 text-right font-mono text-xs text-[#5A6E5E]">
                  {value}
                </span>
              </div>
            ))}
          </div>
        )}

        {hero && !communityStats && (
          <div className="mt-1 space-y-2 border-t border-[#17301F]/30 pt-3">
            {STAT_ROWS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <span className={`w-24 font-mono text-[10px] tracking-wider ${r.accentText}`}>
                  {label}
                </span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#17301F]/10">
                  <div
                    className="h-full rounded-full bg-white/60"
                    style={{ width: `${card.stats[key]}%` }}
                  />
                </div>
                <span className="tnum w-6 text-right font-mono text-xs text-[#5A6E5E]">
                  {agi ? "?" : card.stats[key]}
                </span>
                {!agi && (
                  <span
                    className={`border px-1 font-mono text-[8px] font-semibold ${
                      statTier(card.stats[key]).hot
                        ? "border-[#B23A2E] bg-[#B23A2E] text-[#F4F7F0]"
                        : "border-[#17301F]/60 text-[#17301F]"
                    }`}
                  >
                    {statTier(card.stats[key]).word}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* price row (community cards have no market; proofs pitch the pull) */}
        {!community && (
          <div
            className={`mt-auto flex items-center justify-between border-t border-[#17301F]/30 ${
              hero ? "pt-3" : "pt-2"
            }`}
          >
            {proof && !resolving ? (
              <span
                className={`font-mono font-semibold uppercase tracking-widest text-[#B23A2E] ${hero ? "text-sm" : "text-[10px]"}`}
              >
                Pull odds {oddsLabelFor(card)} →
              </span>
            ) : (
              <>
                <span
                  className={`tnum font-mono font-semibold text-[#17301F] ${
                    hero ? "text-lg" : "text-xs"
                  }`}
                >
                  {agi ? "unpriced" : formatTicks(price)}
                </span>
                <span
                  className={`tnum font-mono ${move >= 0 ? "text-[#1F6E3D]" : "text-[#B23A2E]"} ${
                    hero ? "text-sm" : "text-[10px]"
                  }`}
                >
                  {agi ? "" : formatMove(move)}
                </span>
              </>
            )}
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
