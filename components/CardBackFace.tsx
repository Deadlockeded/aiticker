import type { MarketCard } from "@/lib/cards";

const RARITY_CHIP: Record<string, string> = {
  common: "bg-[#5A6E5E]",
  rare: "bg-[#2E5E8E]",
  epic: "bg-[#6B4FA0]",
  legendary: "bg-[#8C6D1F]",
  mythic: "bg-[#B23A2E]",
};

/** Frame tints, brightened to read against the ink base. */
const RARITY_FRAME: Record<string, string> = {
  common: "#5A6E5E",
  rare: "#4E7FB8",
  epic: "#8B5CC9",
  legendary: "#C9A227",
  mythic: "#B23A2E",
};

/** The circular seal: "at" monogram in a double ring, AIticker / SERIES 1. */
function Crest({ withRing }: { withRing: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
      {withRing && (
        <>
          <circle cx="50" cy="50" r="46" fill="none" stroke="#F4F7F0" strokeWidth="1.6" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="#F4F7F0" strokeWidth="1.2" />
          <defs>
            {/* over the top, left→right (sweep 1) — upright text */}
            <path id="crest-top" d="M 12,50 A 38,38 0 0 1 88,50" />
            {/* under the bottom, left→right (sweep 0) — upright text */}
            <path id="crest-bot" d="M 12,50 A 38,38 0 0 0 88,50" />
          </defs>
          <text
            fill="#F4F7F0"
            fontSize="9.5"
            fontFamily="var(--font-geist-mono)"
            letterSpacing="3.5"
          >
            <textPath href="#crest-top" startOffset="50%" textAnchor="middle">
              AIticker
            </textPath>
          </text>
          <text
            fill="#F4F7F0"
            fontSize="8"
            fontFamily="var(--font-geist-mono)"
            letterSpacing="3"
          >
            <textPath href="#crest-bot" startOffset="50%" textAnchor="middle">
              SERIES 1
            </textPath>
          </text>
        </>
      )}
      {!withRing && (
        <circle cx="50" cy="50" r="34" fill="none" stroke="#F4F7F0" strokeWidth="2.5" />
      )}
      <text
        x="50"
        y="50"
        dy="8.5"
        textAnchor="middle"
        fill="#F4F7F0"
        fontSize="24"
        fontFamily="var(--font-display)"
      >
        a<tspan fill="#B23A2E">t</tspan>
      </text>
    </svg>
  );
}

/**
 * The printed side. Ink base, two-tone guilloche lattice edge to edge, the
 * aiticker seal in the center, a 3px rarity-tinted frame (dashed for
 * artifacts — a facedown legendary should feel exciting), corner rarity
 * chip, and the name strip for browsability. `anonymous` (pack pre-flip)
 * drops everything that would spoil the pull: neutral frame, no chip, no
 * name. Hover gets a faint sheen sweep (reduced-motion: none).
 */
export default function CardBackFace({
  card,
  size = "grid",
  anonymous = false,
}: {
  card: MarketCard;
  size?: "grid" | "hero" | "thumb";
  anonymous?: boolean;
}) {
  const hero = size === "hero";
  const thumb = size === "thumb";
  const artifact = card.type === "artifact";
  const frame = anonymous ? "#5A6E5E" : RARITY_FRAME[card.rarity];
  return (
    <div
      className={`card-back relative flex h-full w-full flex-col overflow-hidden rounded-[3px] bg-[#17301F] ${thumb ? "border-2" : "border-[3px] paper-shadow"} ${artifact && !anonymous ? "border-dashed" : ""}`}
      style={{ borderColor: frame }}
    >
      {/* two-tone guilloche lattice — deliberate print, never empty space */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            "repeating-linear-gradient(45deg, #2C3347 0 1px, transparent 1px 7px)",
            "repeating-linear-gradient(-45deg, #2C3347 0 1px, transparent 1px 7px)",
            "repeating-linear-gradient(45deg, transparent 0 20px, #2C3347 20px 21px, transparent 21px 28px)",
            "repeating-linear-gradient(-45deg, transparent 0 20px, #2C3347 20px 21px, transparent 21px 28px)",
          ].join(", "),
        }}
      />
      {/* faint hover sheen — far subtler than the face foils */}
      {!thumb && <div className="back-sheen" aria-hidden />}
      {/* seal */}
      <div className="relative flex flex-1 items-center justify-center">
        <div className={hero ? "h-40 w-40" : thumb ? "h-10 w-10" : "h-24 w-24"}>
          <Crest withRing={!thumb} />
        </div>
      </div>
      {/* rarity chip */}
      {!anonymous && (
        <span
          className={`absolute right-1.5 top-1.5 rounded-sm px-1 font-mono uppercase tracking-wider text-[#F4F7F0] ${RARITY_CHIP[card.rarity]} ${
            hero ? "text-[10px]" : "text-[7px]"
          }`}
        >
          {card.rarity}
        </span>
      )}
      {/* name strip — ink on cream, browsing stays useful */}
      {!thumb && !anonymous && (
        <div className="relative border-t-2 bg-[#F4F7F0] px-2 py-1.5 text-center" style={{ borderColor: frame }}>
          <p className={`truncate font-mono uppercase tracking-widest text-[#17301F] ${hero ? "text-sm" : "text-[10px]"}`}>
            {card.name}
          </p>
        </div>
      )}
    </div>
  );
}
