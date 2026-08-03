"use client";

import { useState } from "react";

/**
 * Copies (or natively shares) a link/text. Used on card detail pages and
 * after pack rips.
 */
export default function ShareButton({
  label = "Share",
  text,
  url,
  className = "",
}: {
  label?: string;
  /** Optional message; the URL is appended (or the current page URL). */
  text?: string;
  url?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    // url === "" means "text only" (the text already carries its own link)
    const link = url === undefined ? window.location.href : url;
    const payload = text ? (link ? `${text}\n${link}` : text) : link;
    try {
      if (navigator.share) {
        await navigator.share(text ? { text: payload } : { url: link });
        return;
      }
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  };

  return (
    <button
      onClick={share}
      className={`rounded-full border border-[#1E2430]/40 px-6 py-2.5 font-semibold uppercase tracking-wide text-[#5A6070] transition-colors hover:bg-[#1E2430]/10 ${className}`}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
