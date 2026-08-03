"use client";

import Logo from "@/components/Logo";

/** Route-level error boundary. Plain register, one useful action. */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <Logo variant="icon" size={64} fallen />
      <p className="text-[32px] text-ink">Something broke.</p>
      <p className="text-[15px] text-ink2">
        Refresh usually fixes it. Your binder is safe — it lives in this
        browser, not on our servers.
      </p>
      <button
        onClick={reset}
        className="bg-pink px-6 py-2.5 micro text-sm font-semibold text-on-accent hover:bg-pink"
      >
        Try again
      </button>
    </main>
  );
}
