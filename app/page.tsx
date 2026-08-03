import Link from "next/link";
import CardGrid from "@/components/CardGrid";
import CoverStar from "@/components/CoverStar";
import HotList from "@/components/HotList";
import Masthead from "@/components/Masthead";
import NewCollectorTag from "@/components/NewCollectorTag";
import TodayMeta from "@/components/TodayMeta";
import { getAllCards, getRank } from "@/lib/cards";

export default function Home() {
  const cards = getAllCards();
  const ranks = Object.fromEntries(cards.map((c) => [c.id, getRank(c.id)]));

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-6 sm:px-6">
      <Masthead cardCount={cards.filter((c) => c.id !== "agi").length} />

      <div className="mt-6 grid gap-4 md:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <CoverStar cards={cards} ranks={ranks} />
          <Link href="/packs" className="coupon block p-4 text-center paper-in">
            <NewCollectorTag />
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-[#1E2430]">
              ✂ 3 free packs daily,
              <br />
              straight to your binder
            </p>
            <span className="mt-2 inline-block bg-[#C23B2E] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-widest text-[#FDFBF6] hover:bg-[#A32F24]">
              Rip a pack →
            </span>
          </Link>
        </div>
        <div className="space-y-4">
          <HotList cards={cards} />
          <div className="coupon p-3 text-center">
            <Link
              href="/create"
              className="font-mono text-[12px] font-semibold uppercase tracking-[0.25em] text-[#C23B2E] hover:underline"
            >
              Get scouted. Get roasted. It&apos;s the same department. →
            </Link>
          </div>
          <TodayMeta cards={cards} />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 border-b-2 border-[#1E2430] pb-1 text-lg text-[#1E2430]">
          The Checklist — Series 1
        </h2>
        <CardGrid cards={cards} ranks={ranks} />
      </div>
    </main>
  );
}
