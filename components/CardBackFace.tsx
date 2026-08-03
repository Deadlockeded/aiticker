import type { MarketCard } from "@/lib/cards";

/**
 * The card back — the pack's pre-flip state, and nothing else. DS v1: the
 * brand tile at card size. Flat pink field (the gradient licence does not
 * cover card backs), the white fan, the wordmark, SERIES chip. Identical in
 * both modes on purpose: a printed object doesn't re-ink itself at night.
 *
 * `anonymous` is kept for signature compatibility; the back never shows
 * rarity or name — nothing may spoil the pull.
 */
export default function CardBackFace({
  card,
  size = "grid",
  anonymous = true,
}: {
  card: MarketCard;
  size?: "grid" | "hero" | "thumb";
  anonymous?: boolean;
}) {
  void card;
  void anonymous;
  const thumb = size === "thumb";
  const hero = size === "hero";

  return (
    <div className="card-back relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[16px] bg-[#F5067A] shadow-card">
      {/* quiet depth: a darker pink inner panel, flat — no gradients here */}
      <div className="absolute inset-[7%] rounded-[12px] border-2 border-white/25" />
      {!thumb && <div className="back-sheen" aria-hidden />}

      {/* the fan, white on pink — same geometry as the logo glyph */}
      <svg
        viewBox="0 0 40 40"
        className={hero ? "h-28 w-28" : thumb ? "h-8 w-8" : "h-16 w-16"}
        aria-hidden
      >
        <rect
          x="13.5" y="8" width="14" height="21" rx="4"
          fill="none" stroke="#FFFFFF" strokeWidth="3"
          transform="rotate(-16 20 29)"
        />
        <rect
          x="13.5" y="8" width="14" height="21" rx="4"
          fill="none" stroke="#FFFFFF" strokeWidth="3"
        />
        <g transform="rotate(16 20 29)">
          <rect x="13.5" y="8" width="14" height="21" rx="4" fill="#FFFFFF" />
          <path
            d="M17.5 21.5 L19.8 23.8 L24 17.5"
            fill="none" stroke="#F5067A" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round"
          />
        </g>
      </svg>

      {!thumb && (
        <>
          <p
            className={`mt-2 font-display font-extrabold tracking-[-0.03em] text-white ${
              hero ? "text-[26px]" : "text-[15px]"
            }`}
          >
            aiticker
          </p>
          <p className={`micro mt-1 text-white/70 ${hero ? "text-[11px]" : ""}`}>
            Series 1
          </p>
        </>
      )}
    </div>
  );
}
