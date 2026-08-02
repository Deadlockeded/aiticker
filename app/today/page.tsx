import type { Metadata } from "next";
import TodayView from "@/components/TodayView";
import { getAllCards, getRank } from "@/lib/cards";

export const metadata: Metadata = { title: "Today · AI Index" };

export default function TodayPage() {
  const cards = getAllCards();
  const ranks = Object.fromEntries(cards.map((c) => [c.id, getRank(c.id)]));

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Today</h1>
        <p className="mt-1 text-sm text-white/50">
          One card, one question, every day. Same for everyone.
        </p>
      </header>
      <TodayView cards={cards} ranks={ranks} />
    </main>
  );
}
