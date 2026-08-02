"use client";

import { useEffect, useState } from "react";

/**
 * One-line onboarding caption in the Editor's voice. Never blocks anything:
 * auto-dismisses after `ttl` ms, or on tap. Renders inline where placed.
 */
export default function EditorCaption({
  children,
  ttl = 4500,
  className = "",
}: {
  children: React.ReactNode;
  ttl?: number;
  className?: string;
}) {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGone(true), ttl);
    return () => clearTimeout(t);
  }, [ttl]);

  if (gone) return null;
  return (
    <button
      onClick={() => setGone(true)}
      className={`paper-in mx-auto block max-w-xs border-2 border-[#1E2430] bg-[#FDFBF6] px-3 py-1.5 text-center font-mono text-[11px] uppercase tracking-[0.15em] text-[#1E2430] paper-shadow ${className}`}
      aria-label="Dismiss tip"
    >
      {children}
      <span className="ml-2 text-[#9AA0AC]">✕</span>
    </button>
  );
}
