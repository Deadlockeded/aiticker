"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LevelPill from "./LevelPill";

const LINKS = [
  { href: "/", label: "Cards" },
  { href: "/market", label: "Market" },
  { href: "/packs", label: "Packs" },
  { href: "/battle", label: "Battle" },
  { href: "/lab", label: "Lab" },
  { href: "/today", label: "Today" },
  { href: "/binder", label: "Binder" },
  { href: "/leaderboard", label: "Ranks" },
];

/** The five that fit a thumb row — the rest live in the top bar on desktop. */
const MOBILE_TABS = ["/", "/market", "/packs", "/battle", "/binder"];

function isActive(href: string, pathname: string): boolean {
  return href === "/"
    ? pathname === "/" || pathname.startsWith("/cards")
    : pathname.startsWith(href);
}

export default function Nav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="sticky top-0 z-30 border-b border-white/8 bg-[#0a0a0b]/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-2 px-3 sm:px-6">
          <Link href="/" className="mr-2 flex shrink-0 items-baseline gap-0.5">
            <span className="text-[15px] font-bold tracking-tight text-white">
              aiticker
            </span>
            <span className="font-mono text-[11px] text-white/35">.xyz</span>
          </Link>
          <div className="hidden flex-1 items-center gap-0.5 md:flex lg:gap-1">
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  isActive(href, pathname)
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
          <div className="flex-1 md:hidden" />
          <LevelPill />
          <Link
            href="/packs"
            className="hidden shrink-0 rounded-lg bg-cyan-400 px-3.5 py-1.5 text-[13px] font-semibold text-black transition-colors hover:bg-cyan-300 md:block"
          >
            Rip a pack
          </Link>
          {/* mobile overflow links */}
          <div className="flex items-center gap-0.5 md:hidden">
            {LINKS.filter((l) => !MOBILE_TABS.includes(l.href)).map(
              ({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-lg px-2 py-1.5 text-[12px] font-medium ${
                    isActive(href, pathname)
                      ? "bg-white/10 text-white"
                      : "text-white/50"
                  }`}
                >
                  {label}
                </Link>
              ),
            )}
          </div>
        </div>
      </nav>

      {/* mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0a0a0b]/92 backdrop-blur-md md:hidden">
        <div className="grid grid-cols-5">
          {LINKS.filter((l) => MOBILE_TABS.includes(l.href)).map(
            ({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`py-3 text-center text-[11px] font-medium ${
                  isActive(href, pathname)
                    ? "text-cyan-300"
                    : "text-white/45"
                }`}
              >
                {label}
              </Link>
            ),
          )}
        </div>
      </nav>
    </>
  );
}
