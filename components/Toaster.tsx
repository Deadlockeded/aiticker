"use client";

import { useEffect, useState } from "react";
import { TOAST_EVENT } from "@/lib/achievements";
import { formatTicks } from "@/lib/market";
import { TICK_GRANT_EVENT } from "@/lib/wallet";

interface Toast {
  key: number;
  emoji: string;
  title: string;
  body: string;
}

interface TickToast {
  key: number;
  amount: number;
  reason?: string;
}

/**
 * Toast host, mounted once in the layout: achievement unlocks bottom-right,
 * and a small +₮n chip top-center for every Tick grant.
 */
export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [ticks, setTicks] = useState<TickToast[]>([]);

  useEffect(() => {
    let counter = 0;
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<Omit<Toast, "key">>).detail;
      const key = ++counter;
      setToasts((t) => [...t, { ...detail, key }]);
      setTimeout(() => {
        setToasts((t) => t.filter((toast) => toast.key !== key));
      }, 4500);
    };
    const onTicks = (e: Event) => {
      const detail = (e as CustomEvent<{ amount: number; reason?: string }>).detail;
      if (!detail?.amount) return;
      const key = ++counter;
      setTicks((t) => [...t, { ...detail, key }]);
      setTimeout(() => {
        setTicks((t) => t.filter((toast) => toast.key !== key));
      }, 2600);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    window.addEventListener(TICK_GRANT_EVENT, onTicks);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      window.removeEventListener(TICK_GRANT_EVENT, onTicks);
    };
  }, []);

  return (
    <>
      {ticks.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 top-[calc(0.75rem+env(safe-area-inset-top))] z-50 flex flex-col items-center gap-1.5">
          {ticks.map((t) => (
            <span
              key={t.key}
              data-testid="tick-toast"
              className="deal-in border-2 border-[#17301F] bg-[#F4F7F0] px-3 py-1.5 font-mono text-[12px] font-semibold uppercase tracking-[0.15em] text-[#1F6E3D] shadow-[3px_3px_0_#17301F]"
            >
              +{formatTicks(t.amount)}
              {t.reason && (
                <span className="ml-1.5 tracking-normal text-[#5A6E5E]">
                  {t.reason}
                </span>
              )}
            </span>
          ))}
        </div>
      )}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex w-72 flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.key}
              className="deal-in flex items-start gap-3 rounded-xl border border-[#B23A2E]/50 bg-[#F4F7F0] p-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur"
            >
              <span className="text-2xl">{toast.emoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#17301F]">{toast.title}</p>
                <p className="mt-0.5 text-xs text-[#5A6E5E]">{toast.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
