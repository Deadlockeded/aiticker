import type { Metadata } from "next";
import RoastStudio from "@/components/RoastStudio";
import type { Heat } from "@/lib/lines";

type Search = Promise<{ burn?: string; heat?: string }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Search;
}): Promise<Metadata> {
  const { burn, heat } = await searchParams;
  const title = burn
    ? `@${burn} just got roasted — AIticker`
    : "Get your GitHub roasted — AIticker";
  const og = `/api/og/roast?handle=${encodeURIComponent(burn ?? "sample_dev")}&heat=${heat ?? "medium"}${burn ? "&burn=1" : ""}`;
  return {
    title,
    description: "Three lines, prepared to order. Patterns, not persons.",
    openGraph: { title, images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, images: [og] },
  };
}

const HEATS = new Set(["mild", "medium", "crispy"]);

export default async function RoastPage({ searchParams }: { searchParams: Search }) {
  const { burn, heat } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-8">
      <header className="mb-6 text-center">
        <h1 className="text-3xl text-ink">Your GitHub has it coming.</h1>
        <p className="mt-1 text-sm text-ink2">
          Three lines, prepared to order. Choose your heat.
        </p>
      </header>
      <RoastStudio
        initialBurn={burn}
        initialHeat={heat && HEATS.has(heat) ? (heat as Heat) : undefined}
      />
    </main>
  );
}
