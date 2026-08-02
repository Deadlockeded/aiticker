"use client";

import { useState } from "react";
import Image from "next/image";
import type { Card } from "@/lib/types";

/**
 * Circular card art: remote image when available (Wikimedia portrait for
 * engineers, site favicon for companies), monogram fallback when the card has
 * no image or it fails to load.
 */
export default function CardArt({
  card,
  hero = false,
}: {
  card: Card;
  hero?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = card.image !== null && !failed;

  if (!showImage) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-950/90">
        <span
          className={`font-mono font-bold tracking-tighter text-white/90 ${
            hero ? "text-4xl" : "text-lg sm:text-2xl"
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
        card.type === "company" ? "bg-white" : "bg-slate-950/90"
      }`}
    >
      <Image
        src={card.image!}
        alt={card.name}
        fill
        priority={hero}
        sizes={hero ? "128px" : "80px"}
        className={
          card.type === "company"
            ? `object-contain ${hero ? "p-5" : "p-3"}`
            : "object-cover"
        }
        onError={() => setFailed(true)}
      />
    </div>
  );
}
