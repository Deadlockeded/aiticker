import type { Metadata } from "next";
import TierBoard from "@/components/TierBoard";
import { getAllCards } from "@/lib/cards";

const title = "Tier list maker · AI Ticker";
const description = "Rank the labs, the founders, or the full chaos. Export and start arguments.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    images: [{ url: "/api/og/promo?page=tiers", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    images: ["/api/og/promo?page=tiers"],
  },
};

export default function TiersPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Tier list maker
        </h1>
        <p className="mt-1 text-sm text-white/50">
          S through F. Someone will be mad either way.
        </p>
      </header>
      <TierBoard cards={getAllCards()} />
    </main>
  );
}
