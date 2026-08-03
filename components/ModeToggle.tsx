"use client";

import { useSyncExternalStore } from "react";
import { getModeSnapshot, subscribeTheme, toggleMode } from "@/lib/theme";

/**
 * Light/dark switch. The applied mode is read off <html data-theme>, which the
 * boot script stamps before paint — so the server snapshot is null and this
 * renders a neutral slot until hydration rather than guessing wrong.
 */
export default function ModeToggle() {
  const mode = useSyncExternalStore(subscribeTheme, getModeSnapshot, () => null);
  if (mode === null) return <span className="h-9 w-9 shrink-0" aria-hidden />;

  const dark = mode === "dark";
  return (
    <button
      onClick={() => toggleMode()}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink2 transition-colors hover:bg-surface2 hover:text-ink"
    >
      {dark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="4.4" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
