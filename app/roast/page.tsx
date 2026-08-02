import type { Metadata } from "next";
import RoastView from "@/components/RoastView";

export const metadata: Metadata = {
  title: "Roast my repos · AI Ticker",
  description:
    "Three personalized roasts about your actual GitHub. Affectionate dunks only.",
};

export default function RoastPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-3 py-8 sm:px-6">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-[#1E2430]">
          Roast my repos
        </h1>
        <p className="mt-1 text-sm text-[#5A6070]">
          We roast the patterns, never the person. The patterns, though…
        </p>
      </header>
      <RoastView />
    </main>
  );
}
