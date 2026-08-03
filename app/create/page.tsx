import type { Metadata } from "next";
import CreateCardStudio from "@/components/CreateCardStudio";

const title = "Make your own card · AI Ticker";
const description =
  "Get rated by The Algorithm and mint yourself into the Community Series. Your photo never leaves your device.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    images: [{ url: "/api/og/promo?page=create", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    images: ["/api/og/promo?page=create"],
  },
};

export default function CreatePage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-8 sm:px-6">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-[#17301F]">
          Make your own card
        </h1>
        <p className="mt-1 text-sm text-[#5A6E5E]">
          Rate yourself. The Algorithm has final say.
        </p>
      </header>
      <CreateCardStudio />
    </main>
  );
}
