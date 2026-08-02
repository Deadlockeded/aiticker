"use client";

import { useEffect, useState } from "react";
import { TOAST_EVENT } from "@/lib/achievements";

interface Toast {
  key: number;
  emoji: string;
  title: string;
  body: string;
}

/** Bottom-right toast stack for achievement unlocks. Mounted once in layout. */
export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

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
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-72 flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.key}
          className="deal-in flex items-start gap-3 rounded-xl border border-cyan-400/30 bg-[#131316]/95 p-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur"
        >
          <span className="text-2xl">{toast.emoji}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{toast.title}</p>
            <p className="mt-0.5 text-xs text-white/50">{toast.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
