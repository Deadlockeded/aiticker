import type { MarketCard } from "@/lib/cards";

const RARITY_CHIP: Record<string, string> = {
  common: "bg-[#5A6070]",
  rare: "bg-[#1F4E79]",
  epic: "bg-[#6B3FA0]",
  legendary: "bg-[#8a6d1d]",
  mythic: "bg-[#C23B2E]",
};

/**
 * The designed card back — what unpulled cards show. Cream stock, ink
 * border, aiticker crest, repeating pattern; a rarity chip + name strip
 * keep browsing useful without spoiling the art.
 */
export default function CardBackFace({
  card,
  size = "grid",
}: {
  card: MarketCard;
  size?: "grid" | "hero" | "thumb";
}) {
  const hero = size === "hero";
  const thumb = size === "thumb";
  return (
    <div
      className={`relative flex h-full w-full flex-col overflow-hidden rounded-[3px] border-2 border-[#1E2430] bg-[#FDFBF6] ${thumb ? "" : "paper-shadow"}`}
    >
      {/* repeating pattern */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #1E2430 0 1.5px, transparent 1.5px 9px)",
        }}
      />
      {/* crest */}
      <div className="flex flex-1 items-center justify-center">
        <div
          className={`flex items-center justify-center rounded-full border-[3px] border-[#1E2430] bg-[#F2EDE3] ${
            hero ? "h-28 w-28" : thumb ? "h-8 w-8 border-2" : "h-16 w-16"
          }`}
        >
          <span className={`font-display text-[#1E2430] ${hero ? "text-3xl" : thumb ? "text-[9px]" : "text-lg"}`}>
            a<span className="text-[#C23B2E]">t</span>
          </span>
        </div>
      </div>
      {/* rarity chip */}
      <span
        className={`absolute right-1.5 top-1.5 rounded-sm px-1 font-mono uppercase tracking-wider text-[#FDFBF6] ${RARITY_CHIP[card.rarity]} ${
          hero ? "text-[10px]" : "text-[7px]"
        }`}
      >
        {card.rarity}
      </span>
      {/* name strip */}
      {!thumb && (
        <div className="relative border-t-2 border-[#1E2430] bg-[#1E2430] px-2 py-1.5 text-center">
          <p className={`truncate font-mono uppercase tracking-widest text-[#FDFBF6] ${hero ? "text-sm" : "text-[10px]"}`}>
            {card.name}
          </p>
        </div>
      )}
    </div>
  );
}
