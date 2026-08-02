"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LevelPill from "./LevelPill";

const LINKS = [
  { href: "/", label: "Cards" },
  { href: "/market", label: "Guide" },
  { href: "/packs", label: "Packs" },
  { href: "/arena", label: "Arena" },
  { href: "/binder", label: "Binder" },
];

function isActive(href: string, pathname: string): boolean {
  return href === "/"
    ? pathname === "/" || pathname.startsWith("/cards")
    : pathname.startsWith(href);
}

export default function Nav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="sticky top-0 z-30 border-b-[3px] border-[#1E2430] bg-[#F2EDE3]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-2 px-3 sm:px-6">
          <Link href="/" className="mr-2 flex shrink-0 items-baseline">
            <span className="font-display text-lg uppercase tracking-tight text-[#1E2430]">
              ai<span className="text-[#C23B2E]">ticker</span>
            </span>
          </Link>
          <div className="hidden flex-1 items-center gap-0.5 md:flex lg:gap-1">
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`shrink-0 px-3 py-1.5 font-mono text-[13px] font-medium uppercase tracking-widest transition-colors ${
                  isActive(href, pathname)
                    ? "bg-[#1E2430] text-[#FDFBF6]"
                    : "text-[#5A6070] hover:text-[#1E2430]"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
          <div className="flex-1 md:hidden" />
          <LevelPill />
          <Link
            href="/create"
            className="shrink-0 bg-[#C23B2E] px-3.5 py-1.5 font-mono text-[13px] font-semibold uppercase tracking-widest text-[#FDFBF6] transition-colors hover:bg-[#A32F24]"
          >
            Roast me
          </Link>
        </div>
      </nav>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t-[3px] border-[#1E2430] bg-[#F2EDE3]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden">
        <div className="grid grid-cols-5">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`min-h-11 py-3 text-center font-mono text-[11px] font-medium uppercase tracking-widest ${
                isActive(href, pathname) ? "text-[#C23B2E]" : "text-[#5A6070]"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
