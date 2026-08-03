import type { Metadata } from "next";
import HomePage from "@/components/HomePage";
import { getAllCards, getRank } from "@/lib/cards";

const title = "aiticker — trading cards for the AI industry";
const description = "Real data. Fake money. Rip a pack.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    images: [{ url: "/api/og/promo?page=create", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title, description },
};

export default function Home() {
  const cards = getAllCards();
  const ranks = Object.fromEntries(cards.map((c) => [c.id, getRank(c.id)]));

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-6 sm:px-6">
      <HomePage cards={cards} ranks={ranks} />
    </main>
  );
}
