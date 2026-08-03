import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How it works · AIticker",
  description: "The full rules. There are not many.",
};

const INK = "#17301F";
const S = {
  fill: "none",
  stroke: INK,
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Hand-diagram SVG line illustrations, ink on cream. */
function ArtRip() {
  return (
    <svg viewBox="0 0 96 96" className="h-20 w-20" aria-hidden>
      <rect x="24" y="22" width="48" height="60" rx="3" {...S} />
      <path d="M24 34 l6 -4 6 4 6 -4 6 4 6 -4 6 4 6 -4 6 4" {...S} />
      <path d="M20 18 l10 8" {...S} />
      <path d="M76 16 l-8 10" {...S} strokeDasharray="3 3" />
      <circle cx="48" cy="58" r="12" {...S} />
      <text x="48" y="63" textAnchor="middle" fontFamily="monospace" fontSize="12" fill={INK}>AI</text>
    </svg>
  );
}
function ArtBinder() {
  return (
    <svg viewBox="0 0 96 96" className="h-20 w-20" aria-hidden>
      <rect x="18" y="20" width="60" height="58" rx="4" {...S} />
      <path d="M18 34 h60 M18 49 h60 M18 64 h60" {...S} strokeDasharray="2 4" />
      <rect x="26" y="26" width="12" height="16" rx="1" {...S} />
      <rect x="42" y="26" width="12" height="16" rx="1" {...S} />
      <rect x="58" y="26" width="12" height="16" rx="1" {...S} strokeDasharray="3 3" />
      <circle cx="14" cy="34" r="3" {...S} />
      <circle cx="14" cy="62" r="3" {...S} />
    </svg>
  );
}
function ArtFight() {
  return (
    <svg viewBox="0 0 96 96" className="h-20 w-20" aria-hidden>
      <g transform="rotate(-10 34 50)">
        <rect x="20" y="28" width="28" height="42" rx="2" {...S} />
      </g>
      <g transform="rotate(10 62 50)">
        <rect x="48" y="28" width="28" height="42" rx="2" {...S} />
      </g>
      <path d="M44 44 l8 8 M52 44 l-8 8" {...S} />
      <path d="M48 20 v-6 M40 24 l-4 -5 M56 24 l4 -5" {...S} />
    </svg>
  );
}
function ArtTrade() {
  return (
    <svg viewBox="0 0 96 96" className="h-20 w-20" aria-hidden>
      <rect x="20" y="30" width="56" height="40" rx="3" {...S} />
      <path d="M20 42 h56" {...S} />
      <path d="M28 52 h18 M28 60 h14" {...S} />
      <path d="M60 50 l8 8 M68 50 l-8 8" {...S} />
      <path d="M36 22 c4 -8 20 -8 24 0" {...S} strokeDasharray="3 3" />
    </svg>
  );
}
function ArtScout() {
  return (
    <svg viewBox="0 0 96 96" className="h-20 w-20" aria-hidden>
      <rect x="26" y="22" width="34" height="48" rx="2" {...S} />
      <circle cx="43" cy="38" r="7" {...S} />
      <path d="M32 56 h22 M32 62 h16" {...S} />
      <circle cx="62" cy="58" r="14" {...S} />
      <path d="M72 68 l10 10" {...S} strokeWidth={3} />
    </svg>
  );
}
function ArtFinePrint() {
  return (
    <svg viewBox="0 0 96 96" className="h-20 w-20" aria-hidden>
      <path d="M30 18 h28 l10 10 v50 h-38 z" {...S} />
      <path d="M58 18 v10 h10" {...S} />
      <path d="M38 40 h22 M38 47 h22 M38 54 h22 M38 61 h14" {...S} strokeDasharray="1 3" />
      <path d="M36 30 h12" {...S} />
    </svg>
  );
}

const PANELS: { n: string; title: string; copy: React.ReactNode; art: React.ReactNode }[] = [
  {
    n: "01",
    title: "Rip",
    art: <ArtRip />,
    copy: (
      <>
        A fresh pack every 8 hours. Odds posted on the{" "}
        <Link href="/packs" className="underline decoration-[#B23A2E] underline-offset-2">
          packs page
        </Link>
        .
      </>
    ),
  },
  {
    n: "02",
    title: "Collect",
    art: <ArtBinder />,
    copy: (
      <>
        Series 1 is public. Pulling a card prints your copy to the{" "}
        <Link href="/binder" className="underline decoration-[#B23A2E] underline-offset-2">binder</Link>.
      </>
    ),
  },
  {
    n: "03",
    title: "Fight",
    art: <ArtFight />,
    copy: (
      <>
        Take any card to the <Link href="/arena" className="underline decoration-[#B23A2E] underline-offset-2">Arena</Link>.
        3 rounds, best stats win, and every fight pays a purse. Win fights,
        earn Ticks, trade Ticks for packs. Nothing is ever staked.
      </>
    ),
  },
  {
    n: "04",
    title: "Trade",
    art: <ArtTrade />,
    copy: (
      <>
        Sell spare copies in the{" "}
        <Link href="/binder" className="underline decoration-[#B23A2E] underline-offset-2">binder</Link>, or
        trade ₮500 for an Exchange Pack. Ticks are fake. The feelings are real.
      </>
    ),
  },
  {
    n: "05",
    title: "Get scouted",
    art: <ArtScout />,
    copy: (
      <>
        <Link href="/create" className="underline decoration-[#B23A2E] underline-offset-2">
          &ldquo;Roast me&rdquo;
        </Link>{" "}
        turns your GitHub into a prospect card. It is not gentle.
      </>
    ),
  },
  {
    n: "06",
    title: "The fine print",
    art: <ArtFinePrint />,
    copy: <>No real money in, none out, ever. Ticks cannot be bought, and nothing can be wagered. Never rip packs angry.</>,
  },
];

export default function HowToPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-8">
      <header className="mb-8 border-b-[3px] border-[#17301F] pb-4 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#B23A2E]">
          The full rules · there are not many
        </p>
        <h1 className="mt-1 text-3xl text-[#17301F] sm:text-4xl">How it works</h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {PANELS.map((p) => (
          <section key={p.n} className="paper-card flex items-start gap-4 p-5">
            <div className="shrink-0">{p.art}</div>
            <div className="min-w-0">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-[#B23A2E]">
                {p.n} — {p.title}
              </p>
              <p className="mt-1.5 text-[15px] leading-snug text-[#5A6E5E]">{p.copy}</p>
            </div>
          </section>
        ))}
      </div>

      <Link href="/packs" className="coupon mt-8 block p-5 text-center paper-in">
        <span className="bg-[#B23A2E] px-8 py-3 font-mono text-sm font-semibold uppercase tracking-widest text-[#F4F7F0] hover:bg-[#8E2E24]">
          Rip your first pack →
        </span>
      </Link>

    </main>
  );
}
