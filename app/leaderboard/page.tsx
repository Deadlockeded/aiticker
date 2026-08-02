import type { Metadata } from "next";
import Leaderboard from "@/components/Leaderboard";
import { getAllCards } from "@/lib/cards";

export const metadata: Metadata = { title: "Leaderboard · AI Ticker" };

export default function LeaderboardPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-8">
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-[#1E2430]">
          Leaderboard
        </h1>
        <p className="mt-1 text-sm text-[#5A6070]">
          Top collectors by portfolio value.
        </p>
      </header>
      <Leaderboard cards={getAllCards()} />
    </main>
  );
}
