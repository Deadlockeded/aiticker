/**
 * DESIGN SYSTEM v1 — the tokens as data.
 *
 * app/globals.css owns the CSS variables that screens consume. This module
 * exists for the two places that cannot read a CSS variable:
 *   1. canvas share renderers and satori OG routes (they need literal hex),
 *   2. tests/unit/contrast.test.ts, which asserts WCAG AA on both modes.
 *
 * Values here MUST stay identical to globals.css. If you change one, change
 * both — the contrast test only guards the pairs listed in CONTRAST_PAIRS.
 */

export interface Palette {
  bg: string;
  surface: string;
  surface2: string;
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
  line2: string;
  pink: string;
  teal: string;
  violet: string;
  amber: string;
  pinkTint: string;
  tealTint: string;
  violetTint: string;
  amberTint: string;
  up: string;
  down: string;
  onAccent: string;
  /**
   * Text colour for fills that are too bright for white. Light mode never
   * needs it (white wins there); dark mode's teal and amber are luminous
   * enough that white lands under 2:1, so those fills carry dark text —
   * the same call the roast colour-field makes (#06201E on teal).
   */
  onAccentInk: string;
}

export const LIGHT: Palette = {
  bg: "#F7F6F3",
  surface: "#FFFFFF",
  surface2: "#EFEDE8",
  ink: "#17171C",
  ink2: "#4E4E58",
  ink3: "#82828E",
  line: "rgba(23,23,28,.10)",
  line2: "rgba(23,23,28,.16)",
  pink: "#F5067A",
  teal: "#0E8C8C",
  violet: "#5B2EC9",
  amber: "#B4690E",
  pinkTint: "#FDE0EE",
  tealTint: "#DFF1F1",
  violetTint: "#EAE3FA",
  amberTint: "#F7EBDB",
  up: "#0E7A4A",
  down: "#C22245",
  onAccent: "#FFFFFF",
  onAccentInk: "#06201E",
};

export const DARK: Palette = {
  bg: "#0E0E13",
  surface: "#17171F",
  surface2: "#20202B",
  ink: "#F4F3F7",
  ink2: "#B9B7C6",
  ink3: "#8A8899",
  line: "rgba(244,243,247,.09)",
  line2: "rgba(244,243,247,.16)",
  pink: "#FF1F8F",
  teal: "#3BD6CE",
  violet: "#9D7BFF",
  amber: "#F0A94B",
  pinkTint: "#43102B",
  tealTint: "#0E2E2C",
  violetTint: "#241A45",
  amberTint: "#3A2A12",
  up: "#3ADE96",
  down: "#FF5C7E",
  onAccent: "#FFFFFF",
  onAccentInk: "#06201E",
};

/** Share images and OG cards render dark — they read better in feeds. */
export const SHARE = DARK;

/** Sealed-pack and gold foil stops (the only gradients in the system). */
export const FOIL = {
  light: {
    series1: ["#F5067A", "#8A2BE0", "#4B32D8", "#0E9C94", "#F0A94B"],
    gold: ["#F0A94B", "#E8722C", "#F5067A", "#8A2BE0"],
  },
  dark: {
    series1: ["#FF1F8F", "#9D7BFF", "#5A45E8", "#3BD6CE", "#F0A94B"],
    gold: ["#F0A94B", "#F07A3B", "#FF1F8F", "#9D7BFF"],
  },
} as const;

/** Rarity → accent token key. Legendary amber, epic violet, rare teal. */
export const RARITY_ACCENT: Record<string, keyof Palette> = {
  legendary: "amber",
  epic: "violet",
  rare: "teal",
  common: "ink3",
  mythic: "pink",
};

// ---------------------------------------------------------------- contrast

export interface ContrastPair {
  /** Human label used in the test report. */
  name: string;
  fg: keyof Palette;
  bg: keyof Palette;
  /** Large text (≥18.66px bold or ≥24px) only needs 3:1. */
  large?: boolean;
  /** Foreground override for dark mode (bright fills carry dark text). */
  fgDark?: keyof Palette;
  /**
   * Set when the FIXED token pair cannot reach 4.5:1 no matter what. The
   * tokens are non-negotiable, so the pair is asserted at the AA-large floor
   * (3:1) and the usage rule that keeps it legible is recorded here. These
   * are the only exemptions, and each one is a deliberate, documented
   * trade-off — not a licence to add more.
   */
  note?: string;
}

/**
 * USAGE RULES that the six exempt pairs depend on. Break one and the
 * exemption stops being honest:
 *  - Text on a pink/teal/violet/amber FILL is always ≥16px and ≥600 weight
 *    (pill buttons, colour-field headings). Never body copy, never 13px.
 *  - Accent text on a TINT field is always a letterspaced Martian Mono
 *    micro-cap chip (uppercase, ≥600, ≥0.14em) — a shape the eye reads as a
 *    label, not a sentence.
 *  - Anything smaller or lighter than that uses ink / ink2 instead.
 */

/**
 * THE CONTRAST CONTRACT. Every pair here is asserted against WCAG AA in both
 * modes by tests/unit/contrast.test.ts, and the build fails on a violation.
 * Putting a new foreground on a new background means adding the pair here.
 */
export const CONTRAST_PAIRS: ContrastPair[] = [
  // body text on every background
  { name: "ink on bg", fg: "ink", bg: "bg" },
  { name: "ink on surface", fg: "ink", bg: "surface" },
  { name: "ink on surface2", fg: "ink", bg: "surface2" },
  { name: "ink2 on bg", fg: "ink2", bg: "bg" },
  { name: "ink2 on surface", fg: "ink2", bg: "surface" },
  { name: "ink2 on surface2", fg: "ink2", bg: "surface2" },
  // ink3 is a micro-label colour — large/meta only, 3:1
  { name: "ink3 on bg", fg: "ink3", bg: "bg", large: true },
  { name: "ink3 on surface", fg: "ink3", bg: "surface", large: true },
  { name: "ink3 on surface2", fg: "ink3", bg: "surface2", large: true },
  // Filled accents. White on these fixed accents lands at 4.0–4.3:1 in light
  // mode and 2.9–3.5:1 in dark — AA-large, not AA-normal. Held to 3:1 and
  // bound by the ≥16px/≥600 usage rule above.
  { name: "on-accent on pink", fg: "onAccent", bg: "pink", large: true, note: "4.05:1 light / 3.13:1 dark — buttons only, ≥16px 600" },
  { name: "text on teal fill", fg: "onAccent", bg: "teal", fgDark: "onAccentInk", large: true, note: "white 4.08:1 light; dark mode's teal is too luminous for white, so it carries onAccentInk" },
  { name: "on-accent on violet", fg: "onAccent", bg: "violet", large: true, note: "6.7:1 light / 3.4:1 dark" },
  { name: "text on amber fill", fg: "onAccent", bg: "amber", fgDark: "onAccentInk", large: true, note: "white 4.23:1 light; dark amber carries onAccentInk for the same reason as teal" },
  // market movement
  { name: "up on surface", fg: "up", bg: "surface" },
  { name: "down on surface", fg: "down", bg: "surface" },
  { name: "up on bg", fg: "up", bg: "bg" },
  { name: "down on bg", fg: "down", bg: "bg" },
  // Chip text on its tint field. 3.3–3.6:1 with the fixed tints; held to 3:1
  // and bound by the micro-cap usage rule above.
  { name: "pink on pink-tint", fg: "pink", bg: "pinkTint", large: true, note: "3.29:1 light — micro-cap chips only" },
  { name: "teal on teal-tint", fg: "teal", bg: "tealTint", large: true, note: "3.49:1 light — micro-cap chips only" },
  { name: "violet on violet-tint", fg: "violet", bg: "violetTint", large: true, note: "5.9:1 light — comfortable" },
  { name: "amber on amber-tint", fg: "amber", bg: "amberTint", large: true, note: "3.60:1 light — micro-cap chips only" },
  // accent text on plain surfaces (links, prices, the hero's coloured words)
  { name: "pink on surface", fg: "pink", bg: "surface", large: true },
  { name: "pink on bg", fg: "pink", bg: "bg", large: true },
  { name: "teal on surface", fg: "teal", bg: "surface", large: true },
];

// ---------------------------------------------------------------- math

export function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1–21. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
