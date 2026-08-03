"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthMenu from "./AuthMenu";
import Logo from "./Logo";
import ModeToggle from "./ModeToggle";

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
      <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-2 px-4 sm:px-6">
          <Link href="/" className="mr-2 flex shrink-0 items-center">
            <Logo variant="lockup" size={30} />
          </Link>
          <div className="hidden flex-1 items-center gap-1 md:flex">
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[14px] font-semibold transition-colors ${
                  isActive(href, pathname)
                    ? "bg-pink-tint text-pink"
                    : "text-ink2 hover:text-ink"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
          <div className="flex-1 md:hidden" />
          <ModeToggle />
          <AuthMenu />
          <Link
            href="/roast"
            className="shrink-0 rounded-full bg-pink px-4 py-2 text-[15px] font-semibold leading-none text-on-accent transition-transform active:scale-[.97]"
          >
            Roast me
          </Link>
        </div>
      </header>

      {/* floating tab bar — a surface object over the page, not a page edge */}
      <nav className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 md:hidden">
        <div className="grid grid-cols-5 rounded-[20px] bg-surface p-1.5 shadow-card">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`min-h-11 rounded-[15px] px-1 py-2.5 text-center text-[12px] font-semibold transition-colors ${
                isActive(href, pathname) ? "bg-pink-tint text-pink" : "text-ink2"
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
