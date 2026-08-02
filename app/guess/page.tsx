import type { Metadata } from "next";
import GuessGame from "@/components/GuessGame";
import { getAllCards, getRank } from "@/lib/cards";

const title = "Tickerdle · AI Index";
const description = "Guess the AI figure of the day in 6 tries. New puzzle at midnight UTC.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    images: [{ url: "/api/og/promo?page=guess", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    images: ["/api/og/promo?page=guess"],
  },
};

export default function GuessPage() {
  const cards = getAllCards();
  const ranks = Object.fromEntries(cards.map((c) => [c.id, getRank(c.id)]));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-3 py-8 sm:px-6">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">Tickerdle</h1>
        <p className="mt-1 text-sm text-white/50">
          Six guesses. The hints get more embarrassing as you go.
        </p>
      </header>
      <GuessGame cards={cards} ranks={ranks} />
    </main>
  );
}
