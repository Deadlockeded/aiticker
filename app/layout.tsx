import type { Metadata } from "next";
import { Archivo_Black, Lora, Oswald } from "next/font/google";
import Logo from "@/components/Logo";
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
  title: "AIticker",
  icons: {
    icon: [
      { url: "/icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-64.png", sizes: "64x64", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
  description:
    "The AI industry is a card game now. Real data. Fake money. One card is mythic.",
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
        {/* card art hosts — shave DNS+TLS off the first image fetch */}
        <link rel="preconnect" href="https://upload.wikimedia.org" />
        <link rel="preconnect" href="https://www.google.com" />
        <Nav />
        <StorageBoot />
        <Toaster />
        {children}
        <footer className="mt-6">
        <div className="flex justify-center border-t-[3px] border-[#17301F] bg-[#17301F] py-4">
          <Logo variant="lockup" size={28} onDark />
        </div>
        <div className="space-y-1.5 px-4 py-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[#9CB09E]">
          <p>
            <a href="/about" className="underline hover:text-[#17301F]">
              About
            </a>{" "}
            ·{" "}
            <a href="/howto" className="underline hover:text-[#17301F]">
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
              className="underline hover:text-[#5A6E5E]"
            >
              Wikimedia Commons
            </a>{" "}
            (freely licensed) · Logos via site favicons
          </p>
        </div>
        </footer>
      </body>
    </html>
  );
}
