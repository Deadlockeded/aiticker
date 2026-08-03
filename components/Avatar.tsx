"use client";

import { useState } from "react";
import { tintFor } from "./ui";

/**
 * A GitHub avatar with a guaranteed fallback. github.com/{handle}.png is
 * CORS-friendly (it redirects to avatars.githubusercontent.com), so the same
 * URL works on screen AND on the share canvas — see shipAvatarUrl.
 *
 * A failed load never shows a broken image and never blocks a share: it falls
 * back to an initials tile in the entity's rotating tint.
 */
export function shipAvatarUrl(handle: string): string {
  return `https://github.com/${encodeURIComponent(handle.replace(/^@/, ""))}.png?size=460`;
}

export function initialsOf(handle: string): string {
  const clean = handle.replace(/^@/, "");
  return clean.slice(0, 2).toUpperCase();
}

export default function Avatar({
  handle,
  size = 96,
  ring = true,
}: {
  handle: string;
  size?: number;
  ring?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size };

  if (failed) {
    return (
      <div
        style={box}
        className={`flex shrink-0 items-center justify-center rounded-full font-display text-[22px] font-extrabold text-ink ${tintFor(handle)} ${
          ring ? "ring-[3px] ring-pink" : ""
        }`}
      >
        {initialsOf(handle)}
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={shipAvatarUrl(handle)}
      alt={`@${handle.replace(/^@/, "")}`}
      style={box}
      crossOrigin="anonymous"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full bg-surface2 object-cover ${ring ? "ring-[3px] ring-pink" : ""}`}
    />
  );
}
