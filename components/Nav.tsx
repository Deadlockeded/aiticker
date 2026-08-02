"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LevelPill from "./LevelPill";

const PRIMARY = [
  { href: "/", label: "Cards" },
  { href: "/market", label: "Market" },
  { href: "/packs", label: "Packs" },
  { href: "/arena", label: "Arena" },
  { href: "/create", label: "Get Rated" },
  { href: "/binder", label: "Binder" },
];

const MORE = [
  { href: "/roast", label: "Roast" },
  { href: "/shipmeter", label: "Ship Meter" },
  { href: "/leaderboard", label: "Ranks" },
];

const MOBILE_TABS = ["/", "/market", "/packs", "/arena", "/create"];
const MOBILE_LABELS: Record<string, string> = { "/create": "Rated" };

function isActive(href: string, pathname: string): boolean {
  return href === "/"
    ? pathname === "/" || pathname.startsWith("/cards")
    : pathname.startsWith(href);
}

export default function Nav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const linkClass = (href: string, compact = false) =>
    `shrink-0 rounded-lg font-medium transition-colors ${
      compact ? "px-2.5 py-3 text-[12px]" : "px-3 py-1.5 text-[13px]"
    } ${
      isActive(href, pathname)
        ? "bg-white/10 text-white"
        : "text-white/50 hover:text-white"
    }`;

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

          {/* desktop */}
          <div className="hidden flex-1 items-center gap-0.5 md:flex lg:gap-1">
            {PRIMARY.map(({ href, label }) => (
              <Link key={href} href={href} className={linkClass(href)}>
                {label}
              </Link>
            ))}
            <div ref={moreRef} className="relative">
              <button
                onClick={() => setMoreOpen((o) => !o)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  MORE.some((l) => isActive(l.href, pathname))
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white"
                }`}
              >
                More ▾
              </button>
              {moreOpen && (
                <div className="absolute left-0 top-full z-40 mt-1 w-36 overflow-hidden rounded-xl border border-white/15 bg-[#131316] py-1 shadow-xl">
                  {MORE.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMoreOpen(false)}
                      className={`block px-4 py-2 text-[13px] ${
                        isActive(href, pathname)
                          ? "bg-white/10 text-white"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* mobile top row: everything not in the bottom tabs */}
          <div className="flex flex-1 items-center gap-0.5 overflow-x-auto md:hidden">
            {[...PRIMARY, ...MORE]
              .filter((l) => !MOBILE_TABS.includes(l.href))
              .map(({ href, label }) => (
                <Link key={href} href={href} className={linkClass(href, true)}>
                  {label}
                </Link>
              ))}
          </div>

          <LevelPill />
          <Link
            href="/packs"
            className="hidden shrink-0 rounded-lg bg-cyan-400 px-3.5 py-1.5 text-[13px] font-semibold text-black transition-colors hover:bg-cyan-300 md:block"
          >
            Rip a pack
          </Link>
        </div>
      </nav>

      {/* mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0a0a0b]/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        <div className="grid grid-cols-5">
          {MOBILE_TABS.map((href) => {
            const link = [...PRIMARY, ...MORE].find((l) => l.href === href)!;
            return (
              <Link
                key={href}
                href={href}
                className={`min-h-11 py-3 text-center text-[11px] font-medium ${
                  isActive(href, pathname) ? "text-cyan-300" : "text-white/45"
                }`}
              >
                {MOBILE_LABELS[href] ?? link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
