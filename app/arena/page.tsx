import type { Metadata } from "next";
import Arena from "@/components/Arena";
import { getAllCards, getRank } from "@/lib/cards";

type Search = Promise<{ me?: string; vs?: string }>;

function refName(ref: string | undefined): string | null {
  if (!ref) return null;
  const card = getAllCards().find((c) => c.id === ref || `card:${c.id}` === ref);
  return card ? card.name : `@${ref.replace(/^@/, "")}`;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Search;
}): Promise<Metadata> {
  const { me, vs } = await searchParams;
  const nameA = refName(me);
  const nameB = refName(vs);
  const title =
    nameA && nameB ? `${nameA} vs ${nameB} · Arena · AI Ticker` : "Arena · AI Ticker";
  const og = `/api/og/vs?a=${encodeURIComponent(nameA ?? "You")}&b=${encodeURIComponent(nameB ?? "The Index")}`;
  return {
    title,
    description: "Fight with cards from your binder — against the index or any GitHub handle.",
    openGraph: { title, images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, images: [og] },
  };
}

export default async function ArenaPage({ searchParams }: { searchParams: Search }) {
  const { me, vs } = await searchParams;
  const cards = getAllCards();
  const ranks = Object.fromEntries(cards.map((c) => [c.id, getRank(c.id)]));

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-3 py-8 sm:px-6">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">Arena</h1>
        <p className="mt-1 text-sm text-white/50">
          Fight with your cards. Best of three stat clashes — upsets only in
          chaos mode.
        </p>
      </header>
      <Arena cards={cards} ranks={ranks} initialMe={me} initialVs={vs} />
    </main>
  );
}
