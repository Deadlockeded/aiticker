"use client";

import Link from "next/link";

/**
 * DESIGN SYSTEM v1 — the component primitives. Every screen composes these;
 * nothing forks them locally. If a screen needs a new shape, it belongs here.
 *
 * Contrast rule that these encode (see lib/tokens.ts): text on an accent FILL
 * is always ≥16px and ≥600 weight, and accent text on a TINT field is always
 * a letterspaced micro-cap. That is what keeps the fixed tokens legible.
 */

type ButtonTone = "primary" | "secondary" | "ghost" | "teal";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[16px] font-semibold leading-none transition-[transform,background-color,opacity] duration-150 active:scale-[.97] disabled:pointer-events-none disabled:opacity-40";

const TONES: Record<ButtonTone, string> = {
  primary: "bg-pink text-on-accent hover:opacity-92",
  secondary: "bg-surface2 text-ink hover:opacity-90",
  ghost: "text-ink ring-[1.5px] ring-inset ring-line2 hover:bg-surface2",
  // dark mode's teal is luminous — it carries dark text, not white
  teal: "bg-teal text-on-accent hover:opacity-92 dark-teal-ink",
};

export function Button({
  tone = "primary",
  size = "md",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-4 py-2 text-[15px]" : "";
  return <button className={`${BUTTON_BASE} ${TONES[tone]} ${pad} ${className}`} {...rest} />;
}

export function ButtonLink({
  tone = "primary",
  size = "md",
  className = "",
  href,
  children,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  tone?: ButtonTone;
  size?: "sm" | "md";
  href: string;
}) {
  const pad = size === "sm" ? "px-4 py-2 text-[15px]" : "";
  return (
    <Link href={href} className={`${BUTTON_BASE} ${TONES[tone]} ${pad} ${className}`} {...rest}>
      {children}
    </Link>
  );
}

// ------------------------------------------------------------------ chips

type ChipTone = "owned" | "locked" | "legendary" | "epic" | "rare" | "common" | "neutral";

const CHIP_TONES: Record<ChipTone, string> = {
  owned: "bg-pink text-on-accent",
  locked: "text-ink2 ring-[1.5px] ring-inset ring-line2",
  legendary: "bg-amber-tint text-amber",
  epic: "bg-violet-tint text-violet",
  rare: "bg-teal-tint text-teal",
  common: "bg-surface2 text-ink2",
  neutral: "bg-surface2 text-ink2",
};

export function Chip({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: ChipTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`micro inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${CHIP_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export const rarityTone = (rarity: string): ChipTone =>
  rarity === "legendary" || rarity === "mythic"
    ? "legendary"
    : rarity === "epic"
      ? "epic"
      : rarity === "rare"
        ? "rare"
        : "common";

// ------------------------------------------------- segmented control (iOS)

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`inline-flex w-full rounded-full bg-surface2 p-1 ${className}`} role="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`min-h-9 flex-1 rounded-full px-3 py-1.5 text-[14px] font-semibold transition-all ${
              active ? "bg-surface text-ink shadow-card" : "text-ink2 hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------ stat tiles

export function StatTile({
  label,
  value,
  sub,
  href,
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  /** Makes the whole tile a link to its own page. */
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <p className="micro text-ink3">{label}</p>
      <p className="mt-1 font-display text-[22px] font-extrabold leading-none text-ink">
        {value}
      </p>
      {sub && <p className="mt-1 text-[13px] text-ink2">{sub}</p>}
    </>
  );
  const shell = `block rounded-[18px] bg-surface p-3 shadow-card ${className}`;
  if (href) {
    return (
      <Link href={href} className={`${shell} transition-transform active:scale-[.97]`}>
        {body}
      </Link>
    );
  }
  return <div className={shell}>{body}</div>;
}

// ------------------------------------------------------------- surfaces

export function Panel({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`surface-card p-4 ${className}`}>{children}</div>;
}

/**
 * The tinted entity tile used by market rows and compact lists. The tint
 * rotates per entity so a long list has rhythm without ever being decorative.
 */
const TINTS = ["bg-teal-tint", "bg-amber-tint", "bg-pink-tint", "bg-violet-tint"];

export function tintFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}
