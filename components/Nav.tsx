"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthMenu from "./AuthMenu";
import LevelPill from "./LevelPill";
import Logo from "./Logo";

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
          <Link href="/" className="mr-2 flex shrink-0 items-center">
            <Logo variant="chip" />
          </Link>
          <div className="hidden flex-1 items-center gap-0.5 md:flex lg:gap-1">
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`shrink-0 border-b-[2.5px] px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.2em] transition-colors ${
                  isActive(href, pathname)
                    ? "border-[#B23A2E] text-[#17301F]"
                    : "border-transparent text-[#5A6E5E] hover:text-[#17301F]"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
          <div className="flex-1 md:hidden" />
          <LevelPill />
          <AuthMenu />
          <Link
            href="/create"
            className="shrink-0 border-2 border-[#17301F] bg-[#B23A2E] px-3.5 py-1 font-display text-[13px] uppercase text-[#F4F7F0] shadow-[3px_3px_0_#17301F] transition-colors hover:bg-[#8E2E24]"
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
