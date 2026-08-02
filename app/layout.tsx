import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import Toaster from "@/components/Toaster";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://aiticker.xyz"),
  title: "AI Index",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col pb-14 md:pb-0">
        <Nav />
        <Toaster />
        {children}
        <footer className="space-y-1.5 px-4 py-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-white/25">
          <p>
            aiticker is a fan-made collectible game. Simulated stats, no real
            money, no trading.
          </p>
          <p>Series 1 · aiticker.xyz</p>
          <p>
            Portraits via{" "}
            <a
              href="https://commons.wikimedia.org"
              className="underline hover:text-white/50"
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
