"use client";

import { useState } from "react";
import type { RivalrySide } from "@/lib/types";

/**
 * Dual-face rivalry art: two half-faces split by a diagonal lightning seam.
 * Tapping flips which side is "active" — pure visual, never navigates.
 */
export default function RivalryArt({
  sides,
  hero = false,
}: {
  sides: [RivalrySide, RivalrySide];
  hero?: boolean;
}) {
  const [active, setActive] = useState(0);

  const half = (i: 0 | 1) => {
    const isActive = active === i;
    const clip =
      i === 0
        ? "polygon(0 0, 62% 0, 38% 100%, 0 100%)"
        : "polygon(62% 0, 100% 0, 100% 100%, 38% 100%)";
    return (
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center transition duration-300 ${
          i === 0
            ? "bg-gradient-to-br from-red-950/80 to-transparent"
            : "bg-gradient-to-tl from-sky-950/80 to-transparent"
        } ${isActive ? "opacity-100" : "opacity-40 grayscale"}`}
        style={{ clipPath: clip }}
      >
        <div
          className={`flex flex-col items-center ${i === 0 ? "-translate-x-1/4" : "translate-x-1/4"}`}
        >
          <span className={`font-mono font-bold text-[#1E2430] ${hero ? "text-4xl" : "text-xl"}`}>
            {sides[i].avatar}
          </span>
          <span
            className={`mt-1 font-mono uppercase tracking-wider text-[#5A6070] ${
              hero ? "text-xs" : "text-[8px]"
            }`}
          >
            {sides[i].name}
          </span>
        </div>
      </div>
    );
  };

  return (
    <button
      className="absolute inset-0 cursor-pointer"
      aria-label={`Flip active side (now ${sides[active].name})`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setActive((a) => (a === 0 ? 1 : 0));
      }}
    >
      {half(0)}
      {half(1)}
      {/* lightning seam */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        <polyline
          points="62,0 52,38 58,52 44,66 50,100"
          fill="none"
          stroke="#fbbf24"
          strokeWidth={hero ? 1 : 1.6}
          className="drop-shadow-[0_0_4px_rgba(251,191,36,0.9)]"
        />
      </svg>
    </button>
  );
}
