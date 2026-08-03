"use client";

import { useEffect, useState } from "react";

/**
 * Visual pull-to-refresh on /market. Data is static per deploy, so the
 * gesture just re-renders and shows an honest "updated Xh ago" toast.
 */
export default function PullToRefresh({ lastUpdated }: { lastUpdated: string | null }) {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let startY = 0;
    let armed = false;
    const onStart = (e: TouchEvent) => {
      armed = window.scrollY <= 0;
      startY = e.touches[0].clientY;
    };
    const onEnd = (e: TouchEvent) => {
      if (!armed) return;
      if (e.changedTouches[0].clientY - startY > 90) {
        const ago = lastUpdated
          ? `${Math.max(1, Math.round((Date.now() - Date.parse(lastUpdated)) / 3_600_000))}h ago`
          : "recently";
        setToast(`Index updated ${ago} · next refresh at 02:00 UTC`);
        if (navigator.vibrate) navigator.vibrate(5);
        setTimeout(() => setToast(null), 2600);
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [lastUpdated]);

  if (!toast) return null;
  return (
    <div className="fixed inset-x-0 top-16 z-40 flex justify-center">
      <span className="deal-in rounded-full border border-[#17301F]/40 bg-[#F4F7F0] px-4 py-2 font-mono text-xs text-[#5A6E5E] shadow-xl backdrop-blur">
        {toast}
      </span>
    </div>
  );
}
