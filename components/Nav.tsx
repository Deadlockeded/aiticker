"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    <nav className="sticky top-0 z-30 border-b border-white/10 bg-[#07080f]/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-1 overflow-x-auto px-3 py-3 sm:gap-2 sm:px-8">
        <Link
          href="/"
          className="mr-2 hidden shrink-0 bg-gradient-to-r from-cyan-300 via-white to-fuchsia-300 bg-clip-text font-black uppercase tracking-tight text-transparent sm:block"
        >
          AI Index
        </Link>
        {LINKS.map(({ href, label }) => {
          const active =
            href === "/"
              ? pathname === "/" || pathname.startsWith("/cards")
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-white/15 text-white"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
