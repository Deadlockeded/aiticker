"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Card-detail swipe navigation: swipe left/right for next/prev card, with
 * faint edge chevrons hinting the gesture on touch screens.
 */
export default function SwipeNav({
  prevId,
  nextId,
}: {
  prevId: string | null;
  nextId: string | null;
}) {
  const router = useRouter();

  useEffect(() => {
    let startX = 0;
    let startY = 0;
    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) < 70 || Math.abs(dy) > 60) return;
      if (dx < 0 && nextId) router.push(`/cards/${nextId}`);
      if (dx > 0 && prevId) router.push(`/cards/${prevId}`);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [prevId, nextId, router]);

  return (
    <div className="pointer-events-none fixed inset-y-0 left-0 right-0 z-10 hidden items-center justify-between px-1 font-mono text-2xl text-ink/20 [@media(hover:none)]:flex">
      <span>{prevId ? "‹" : ""}</span>
      <span>{nextId ? "›" : ""}</span>
    </div>
  );
}
