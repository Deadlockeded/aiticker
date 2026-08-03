"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Holographic tilt for rare+ hero cards. Mobile: DeviceOrientation moves a
 * sheen highlight (throttled to rAF, listeners only while visible; iOS
 * permission behind a lazy "✨ enable tilt" chip — never a popup). Desktop:
 * pointer position drives the same highlight. Degrades to nothing silently;
 * respects prefers-reduced-motion.
 */
export default function TiltFoil() {
  const ref = useRef<HTMLDivElement>(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    const host = el.parentElement;
    if (!host) return;

    let raf = 0;
    const set = (x: number, y: number) => {
      if (raf) return; // ~display-rate throttle, cheap
      raf = requestAnimationFrame(() => {
        raf = 0;
        el.style.setProperty("--foil-x", `${x}%`);
        el.style.setProperty("--foil-y", `${y}%`);
        el.style.opacity = "1";
      });
    };

    // desktop pointer foil
    const onPointer = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      set(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
    };
    host.addEventListener("pointermove", onPointer);

    // mobile tilt
    let listening = false;
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      // damped: ±30° maps to 20–80%
      set(50 + Math.max(-30, Math.min(30, e.gamma)), 50 + Math.max(-30, Math.min(30, e.beta - 40)));
    };
    const startTilt = () => {
      if (listening) return;
      listening = true;
      window.addEventListener("deviceorientation", onTilt);
      setEnabled(true);
    };

    const kickoff = setTimeout(() => {
      const anyDOE = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<string>;
      };
      if (typeof window.DeviceOrientationEvent !== "undefined") {
        if (typeof anyDOE.requestPermission === "function") {
          setNeedsPermission(true); // iOS: wait for the chip tap
        } else if ("ontouchstart" in window) {
          startTilt(); // Android and friends
        }
      }
    }, 0);

    // only listen while on screen
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && listening) {
        window.removeEventListener("deviceorientation", onTilt);
        listening = false;
      } else if (entry.isIntersecting && enabled && !listening) {
        window.addEventListener("deviceorientation", onTilt);
        listening = true;
      }
    });
    io.observe(host);

    (el as HTMLDivElement & { __startTilt?: () => void }).__startTilt = startTilt;
    return () => {
      clearTimeout(kickoff);
      host.removeEventListener("pointermove", onPointer);
      window.removeEventListener("deviceorientation", onTilt);
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestTilt = async () => {
    try {
      const anyDOE = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<string>;
      };
      const res = await anyDOE.requestPermission?.();
      if (res === "granted") {
        (ref.current as (HTMLDivElement & { __startTilt?: () => void }) | null)?.__startTilt?.();
        setNeedsPermission(false);
      } else {
        setNeedsPermission(false); // denied: degrade silently
      }
    } catch {
      setNeedsPermission(false);
    }
  };

  return (
    <>
      <div
        ref={ref}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[5] opacity-0 transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(60% 60% at var(--foil-x,50%) var(--foil-y,50%), rgba(255,255,255,0.16), rgba(120,220,255,0.05) 45%, transparent 70%)",
        }}
      />
      {needsPermission && (
        <button
          onClick={requestTilt}
          className="absolute bottom-2 left-2 z-10 rounded-md border border-line bg-black/70 px-2 py-1 font-mono text-[9px] text-ink2 backdrop-blur-sm"
        >
          ✨ enable tilt
        </button>
      )}
    </>
  );
}
