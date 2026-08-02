"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LevelPill from "./LevelPill";

const LINKS = [
  { href: "/", label: "Cards" },
  { href: "/market", label: "Market" },
  { href: "/packs", label: "Packs" },
  { href: "/binder", label: "Binder" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-30 border-b border-white/8 bg-[#0a0a0b]/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-1 px-3 sm:gap-2 sm:px-6">
        <Link href="/" className="mr-3 flex shrink-0 items-baseline gap-0.5">
          <span className="text-[15px] font-bold tracking-tight text-white">
            aiticker
          </span>
          <span className="font-mono text-[11px] text-white/35">.xyz</span>
        </Link>
        <div className="flex flex-1 items-center gap-0.5 overflow-x-auto sm:gap-1">
          {LINKS.map(({ href, label }) => {
            const active =
              href === "/"
                ? pathname === "/" || pathname.startsWith("/cards")
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
        <LevelPill />
        <Link
          href="/packs"
          className="hidden shrink-0 rounded-lg bg-cyan-400 px-3.5 py-1.5 text-[13px] font-semibold text-black transition-colors hover:bg-cyan-300 sm:block"
        >
          Rip a pack
        </Link>
      </div>
    </nav>
  );
}
