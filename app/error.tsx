"use client";

/** Route-level error boundary. Plain register, one useful action. */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="font-display text-4xl uppercase text-[#1E2430]">Something broke.</p>
      <p className="text-sm text-[#5A6070]">
        Refresh usually fixes it. Your binder is safe — it lives in this
        browser, not on our servers.
      </p>
      <button
        onClick={reset}
        className="bg-[#C23B2E] px-6 py-2.5 font-mono text-sm font-semibold uppercase tracking-widest text-[#FDFBF6] hover:bg-[#A32F24]"
      >
        Try again
      </button>
    </main>
  );
}
