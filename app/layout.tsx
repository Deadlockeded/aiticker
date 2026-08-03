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
          {/* one item per line — links first, then the fine print */}
          <div className="mx-auto max-w-sm px-4 pb-8 text-center">
            <nav className="flex flex-col gap-2.5">
              <a href="/about" className="text-[15px] font-semibold text-ink2 hover:text-ink">
                About
              </a>
              <a href="/howto" className="text-[15px] font-semibold text-ink2 hover:text-ink">
                How to collect
              </a>
            </nav>
            <div className="mt-5 flex flex-col gap-1.5 text-[12px] text-ink3">
              <p>A fan-made collectible game.</p>
              <p>
                {marketMeta.lastUpdated
                  ? `Live index · updated ${new Date(marketMeta.lastUpdated).toUTCString().slice(0, 16)}`
                  : "Series 1 · aiticker.xyz"}
              </p>
              <p>
                Portraits via{" "}
                <a href="https://commons.wikimedia.org" className="underline hover:text-ink2">
                  Wikimedia Commons
                </a>{" "}
                (freely licensed).
              </p>
              <p>Logos via site favicons.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
