import type { Metadata } from "next";
import { Instrument_Sans, Martian_Mono, Sora } from "next/font/google";
import Logo from "@/components/Logo";
import Nav from "@/components/Nav";
import StorageBoot from "@/components/StorageBoot";
import Toaster from "@/components/Toaster";
import marketMeta from "@/data/market-meta.json";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import "./globals.css";

// Three faces, three jobs. Sora titles and card names, Instrument Sans all
// body/UI copy, Martian Mono every number, serial and micro-label.
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const martian = Martian_Mono({
  variable: "--font-martian",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://aiticker.xyz"),
  title: "aiticker",
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
      suppressHydrationWarning
      className={`${sora.variable} ${instrument.variable} ${martian.variable} h-full`}
    >
      <head>
        {/* stamps data-theme before first paint — an effect here would flash */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-bg pb-20 md:pb-0">
        {/* card art hosts — shave DNS+TLS off the first image fetch */}
        <link rel="preconnect" href="https://upload.wikimedia.org" />
        <link rel="preconnect" href="https://www.google.com" />
        <Nav />
        <StorageBoot />
        <Toaster />
        {children}
        <footer className="mt-10">
          <div className="flex justify-center border-t border-line py-6">
            <Logo variant="lockup" size={26} />
          </div>
          <div className="space-y-2 px-4 pb-8 text-center text-[13px] text-ink3">
            <p>
              <a href="/about" className="hover:text-ink2">
                About
              </a>{" "}
              ·{" "}
              <a href="/howto" className="hover:text-ink2">
                How to collect
              </a>{" "}
              · a fan-made collectible game
            </p>
            <p className="micro text-ink3">
              {marketMeta.lastUpdated
                ? `Live index · updated ${new Date(marketMeta.lastUpdated).toUTCString().slice(0, 16)} · public data`
                : "Series 1 · aiticker.xyz"}
            </p>
            <p className="text-[12px]">
              Portraits via{" "}
              <a href="https://commons.wikimedia.org" className="underline hover:text-ink2">
                Wikimedia Commons
              </a>{" "}
              (freely licensed) · logos via site favicons
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
