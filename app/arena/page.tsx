import type { Metadata } from "next";
import Arena from "@/components/Arena";
import MetaStrip from "@/components/MetaStrip";
import { getAllCards, getRank } from "@/lib/cards";

type Search = Promise<{ me?: string; vs?: string; auto?: string }>;

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
    nameA && nameB ? `${nameA} vs ${nameB} · Arena · AIticker` : "Arena · AIticker";
  const og = `/api/og/vs?a=${encodeURIComponent(nameA ?? "You")}&b=${encodeURIComponent(nameB ?? "The Index")}`;
  return {
    title,
    description: "Fight with cards from your binder — against the index or any GitHub handle.",
    openGraph: { title, images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, images: [og] },
  };
}

export default async function ArenaPage({ searchParams }: { searchParams: Search }) {
  const { me, vs, auto } = await searchParams;
  const cards = getAllCards();
  const ranks = Object.fromEntries(cards.map((c) => [c.id, getRank(c.id)]));

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-3 py-4 sm:px-6 sm:py-8">
      {/* tight on a phone: the fighter rail and challenger deck have to clear
          the fold, so the hero shrinks and the subtitle only shows on desktop */}
      <header className="mb-3 text-center sm:mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Arena
        </h1>
        <p className="mt-1 hidden text-sm text-ink2 sm:block">
          Fight with your cards. 3 rounds drawn from today&apos;s meta — best
          stats win.
        </p>
      </header>
      <MetaStrip />
      <Arena cards={cards} ranks={ranks} initialMe={me} initialVs={vs} autoStart={auto === "1"} />
    </main>
  );
}
