import type { Metadata } from "next";
import { Archivo_Black, Lora, Oswald } from "next/font/google";
import Nav from "@/components/Nav";
import StorageBoot from "@/components/StorageBoot";
import Toaster from "@/components/Toaster";
import marketMeta from "@/data/market-meta.json";
import "./globals.css";

// Price-guide identity: Lora carries body copy via the old sans var, Oswald
// takes over every font-mono label/table, Archivo Black is the display face.
const lora = Lora({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const oswald = Oswald({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const archivo = Archivo_Black({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://aiticker.xyz"),
  title: "AI Ticker",
  description:
    "Collectible trading cards for the companies and engineers shaping AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${lora.variable} ${oswald.variable} ${archivo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col pb-14 md:pb-0">
        <Nav />
        <StorageBoot />
        <Toaster />
        {children}
        <footer className="space-y-1.5 px-4 py-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[#9AA0AC]">
          <p>
            <a href="/about" className="underline hover:text-[#1E2430]">
              About
            </a>{" "}
            ·{" "}
            <a href="/howto" className="underline hover:text-[#1E2430]">
              How to collect
            </a>{" "}
            · a fan-made collectible game · est. tuesday
          </p>
          <p>
            {marketMeta.lastUpdated
              ? `Live index · updated ${new Date(marketMeta.lastUpdated).toUTCString().slice(0, 16)} · powered by public data`
              : "Series 1 · aiticker.xyz"}
          </p>
          <p>
            Portraits via{" "}
            <a
              href="https://commons.wikimedia.org"
              className="underline hover:text-[#5A6070]"
            >
              Wikimedia Commons
            </a>{" "}
            (freely licensed) · Logos via site favicons
          </p>
        </footer>
      </body>
    </html>
  );
}
