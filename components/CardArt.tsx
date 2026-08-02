"use client";

import { useState } from "react";
import Image from "next/image";
import type { Card } from "@/lib/types";

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
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`font-mono font-bold tracking-tight text-[#1E2430]/35 ${
            hero ? "text-7xl" : "text-4xl"
          }`}
        >
          {card.avatar}
        </span>
      </div>
    );
  }

  if (!showImage) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-full bg-zinc-900">
        <span
          className={`font-mono font-bold tracking-tighter text-[#5A6070] ${
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
