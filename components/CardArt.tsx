"use client";

import { useState } from "react";
import Image from "next/image";
import type { Card } from "@/lib/types";
import { fnvHash } from "@/lib/rng";


/**
 * THE MISSING-PORTRAIT TREATMENT. When no freely licensed image exists, the
 * tile gets an ORIGINAL generic doodle (one shared sketch — deliberately
 * resembling nobody, so there is no likeness to license), the initials, and
 * a rotating caption. Captions joke about LICENSING and our print — never
 * about the person (standing tone rules).
 */
const NO_PHOTO_CAPTIONS = [
  "No freely licensed photo exists. Respect.",
  "Portrait pending. Our sketch artist is training.",
  "The likeness rights were not royalty-free.",
  "Artist's impression: withheld by the artist.",
  "Awaiting one (1) freely licensed photograph.",
  "The reference photo wanted royalties. We declined.",
  "Rendered from vibes, not photographs.",
  "This space reserved for a public-domain moment.",
];

const captionFor = (id: string) =>
  NO_PHOTO_CAPTIONS[fnvHash(`no-photo:${id}`) % NO_PHOTO_CAPTIONS.length];

/** Generic bust: head + shoulders line art, initials on the face. */
function SketchBust({ initials, hero }: { initials: string; hero: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={hero ? "h-44 w-44" : "h-24 w-24"} aria-hidden>
      <circle cx="50" cy="34" r="20" fill="none" stroke="var(--ink3)" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 6" />
      <path d="M16 92 C20 66 34 60 50 60 C66 60 80 66 84 92" fill="none" stroke="var(--ink3)" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 6" />
      <text x="50" y="41" textAnchor="middle" fontSize="17" fontWeight="700" fill="var(--ink2)" fontFamily="var(--font-martian)">
        {initials}
      </text>
    </svg>
  );
}

/** Generic HQ: a doodled office nobody can claim as theirs. */
function SketchOffice({ initials, hero }: { initials: string; hero: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={hero ? "h-44 w-44" : "h-24 w-24"} aria-hidden>
      <rect x="26" y="22" width="34" height="66" rx="3" fill="none" stroke="var(--ink3)" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 6" />
      <path d="M60 44 h16 v44" fill="none" stroke="var(--ink3)" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 6" />
      <path d="M34 34 h6 M46 34 h6 M34 46 h6 M46 46 h6 M34 58 h6 M46 58 h6 M66 54 h4 M66 64 h4" stroke="var(--ink3)" strokeWidth="3" strokeLinecap="round" />
      <text x="50" y="97" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--ink2)" fontFamily="var(--font-martian)">
        {initials}
      </text>
    </svg>
  );
}

/**
 * Card art with monogram fallback. Two shapes:
 * - "circle": avatar disc (market-table thumbs, OG-adjacent uses)
 * - "tile": full-bleed square art for the marketplace card — engineer photos
 *   cover the tile, company logos sit on a floating light disc.
 */
export default function CardArt({
  card,
  hero = false,
  shape = "circle",
}: {
  card: Card;
  hero?: boolean;
  shape?: "circle" | "tile";
}) {
  const [failed, setFailed] = useState(false);
  const showImage = card.image !== null && !failed;

  // user-uploaded photos are data URLs that never leave the device —
  // bypass the optimizer for those
  const local = card.image?.startsWith("data:") ?? false;

  if (shape === "tile") {
    if (showImage && card.type === "engineer") {
      return (
        <Image
          src={card.image!}
          alt={card.name}
          fill
          priority={hero}
          unoptimized={local}
          sizes={hero ? "340px" : "220px"}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      );
    }
    if (showImage) {
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`relative overflow-hidden rounded-2xl bg-white shadow-[0_8px_32px_rgba(0,0,0,0.45)] ${hero ? "h-28 w-28 p-5" : "h-[42%] w-[42%] p-[9%]"}`}>
            <Image
              src={card.image!}
              alt={card.name}
              fill
              priority={hero}
              sizes={hero ? "112px" : "96px"}
              className="object-contain p-2.5"
              onError={() => setFailed(true)}
            />
          </div>
        </div>
      );
    }
    // artifacts keep their glyph; people and companies get the sketch
    if (card.type === "artifact") {
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`font-mono font-bold tracking-tight text-ink/35 ${
              hero ? "text-7xl" : "text-4xl"
            }`}
          >
            {card.avatar}
          </span>
        </div>
      );
    }
    const initials = card.avatar ?? card.name.slice(0, 2).toUpperCase();
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-surface2 px-3">
        {card.type === "company" ? (
          <SketchOffice initials={initials} hero={hero} />
        ) : (
          <SketchBust initials={initials} hero={hero} />
        )}
        <p
          className={`micro text-center leading-snug text-ink3 ${hero ? "text-[10px]" : "text-[8px]"}`}
        >
          {captionFor(card.id)}
        </p>
      </div>
    );
  }

  if (!showImage) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-full bg-zinc-900">
        <span
          className={`font-mono font-bold tracking-tighter text-ink2 ${
            hero ? "text-4xl" : "text-xs"
          }`}
        >
          {card.avatar}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-full ${
        card.type === "company" ? "bg-white" : "bg-zinc-900"
      }`}
    >
      <Image
        src={card.image!}
        alt={card.name}
        fill
        priority={hero}
        sizes={hero ? "128px" : "80px"}
        className={
          card.type === "company" ? "object-contain p-1.5" : "object-cover"
        }
        onError={() => setFailed(true)}
      />
    </div>
  );
}
