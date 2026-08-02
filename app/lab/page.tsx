import type { Metadata } from "next";
import LabBuilder from "@/components/LabBuilder";
import { getAllCards, getRank } from "@/lib/cards";
import { scoreLab } from "@/lib/lab";

type Search = Promise<{ ids?: string; name?: string }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Search;
}): Promise<Metadata> {
  const { ids, name } = await searchParams;
  if (!ids) return { title: "Draft your lab · AI Ticker" };

  const cards = getAllCards();
  const members = ids
    .split(",")
    .map((id) => cards.find((c) => c.id === id))
    .filter(Boolean) as ReturnType<typeof getAllCards>;
  const { teamRating } = scoreLab(members);
  const labName = name || "My Lab";
  const title = `${labName} · team ${teamRating} · AI Ticker`;
  const og = `/api/og/lab?ids=${ids}&name=${encodeURIComponent(labName)}`;
  return {
    title,
    description: `A drafted AI lab: ${members.map((m) => m.name).join(", ")}.`,
    openGraph: { title, images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, images: [og] },
  };
}

export default async function LabPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const { ids, name } = await searchParams;
  const cards = getAllCards();
  const ranks = Object.fromEntries(cards.map((c) => [c.id, getRank(c.id)]));

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Draft your lab
        </h1>
        <p className="mt-1 text-sm text-white/50">
          Five cards, any cards. Alumni stack, rivals combust, moments echo.
        </p>
      </header>
      <LabBuilder
        cards={cards}
        ranks={ranks}
        initialIds={ids ? ids.split(",") : []}
        initialName={name ?? ""}
      />
    </main>
  );
}
