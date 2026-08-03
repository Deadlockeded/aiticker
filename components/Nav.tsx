"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LevelPill from "./LevelPill";

const LINKS = [
  { href: "/", label: "Cards" },
  { href: "/market", label: "Market" },
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
      <nav className="sticky top-0 z-30 border-b-[3px] border-[#17301F] bg-[#F4F7F0]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-2 px-3 sm:px-6">
          <Link href="/" className="mr-2 flex shrink-0 items-baseline">
            <span className="font-display text-lg uppercase tracking-tight text-[#17301F]">
              ai<span className="text-[#B23A2E]">ticker</span>
            </span>
          </Link>
          <div className="hidden flex-1 items-center gap-0.5 md:flex lg:gap-1">
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`shrink-0 px-3 py-1.5 font-mono text-[13px] font-medium uppercase tracking-widest transition-colors ${
                  isActive(href, pathname)
                    ? "bg-[#17301F] text-[#F4F7F0]"
                    : "text-[#5A6E5E] hover:text-[#17301F]"
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
            className="shrink-0 bg-[#B23A2E] px-3.5 py-1.5 font-mono text-[13px] font-semibold uppercase tracking-widest text-[#F4F7F0] transition-colors hover:bg-[#8E2E24]"
          >
            Roast me
          </Link>
        </div>
      </nav>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t-[3px] border-[#17301F] bg-[#F4F7F0]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden">
        <div className="grid grid-cols-5">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`min-h-11 py-3 text-center font-mono text-[11px] font-medium uppercase tracking-widest ${
                isActive(href, pathname) ? "text-[#B23A2E]" : "text-[#5A6E5E]"
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
