import type { Metadata } from "next";
import ShipMeterView from "@/components/ShipMeterView";

type Search = Promise<{ a?: string; b?: string }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Search;
}): Promise<Metadata> {
  const { a, b } = await searchParams;
  const title =
    a && b
      ? `@${a} × @${b} · Ship Meter · AIticker`
      : "Ship Meter · AIticker";
  const og = `/api/og/vs?mode=ship&a=${encodeURIComponent(a ? `@${a}` : "You")}&b=${encodeURIComponent(b ? `@${b}` : "Them")}`;
  return {
    title,
    description: "Cofounder compatibility from public GitHub footprints. Deterministic. Argue accordingly.",
    openGraph: { title, images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, images: [og] },
  };
}

export default async function ShipMeterPage({ searchParams }: { searchParams: Search }) {
  const { a, b } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-3 py-8 sm:px-6">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-[#17301F]">Ship Meter</h1>
        <p className="mt-1 text-sm text-[#5A6E5E]">
          Cofounder compatibility, computed from public footprints. Science-ish.
        </p>
      </header>
      <ShipMeterView initialA={a} initialB={b} />
    </main>
  );
}
