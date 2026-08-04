import { fnvHash } from "./rng";

/**
 * RAISE A ROUND — the weekly term-sheet generator.
 *
 * Every element (template, investor, terms, diligence, all of it) is picked
 * deterministically from the ISO week key, so the whole world sees the same
 * absurd round each week and it rolls over on Monday UTC.
 *
 * ─── HARD RULE (do not relax) ───────────────────────────────────────────
 * Every investor, firm, and event below is FICTIONAL. No real VC firm, no
 * pun on a real firm's name, no fabricated claim about a real entity, ever.
 * The mark of the joke is always the player's own imaginary lab.
 *
 * Amount mechanics stay in economy.ts; this module only decorates them —
 * except SPECIAL WEEKS (~1 in 6, by week-hash), where the amount changes
 * WITH the copy: down ₮150, bridge ₮200, oversubscribed ₮400.
 */

// ---------------------------------------------------------------- pools

export const INVESTORS = [
  "Uncle Dave",
  "Blustery Capital",
  "Your Landlord (Diversifying)",
  "Moist Ventures",
  "The Group Chat",
  "Dentist Money LLC",
  "A Guy From The Sauna",
  "FOMO Partners",
  "Your Mom's Book Club Fund",
  "Sigma Grindset Family Office",
  "Gut Feeling Capital",
  "Perpetual Motion Partners",
  "Diligence-Free Ventures",
  "The Cousin Fund",
  "Post-Rational Capital",
  "Vibe-Weighted Holdings",
  "Two Angels And A Spreadsheet",
  "A Family Office That Won't Name The Family",
  "Someone's Former Manager",
  "Slightly Bored Sovereign Wealth",
  "The Guy From The Conference Hallway",
  "A Man Who Owns Several Airports",
  "Lukewarm Intro Capital",
  "Napkin Math Partners",
  "The Airport Lounge Collective",
  "Barely Liquid Ventures",
  "Your Barber's Investment Club",
  "Exit Vibes Only LP",
  "The Podcast Cohost",
  "Grandma's Mattress Fund",
];

/** The small-print line. Uppercase register: "NO CAP, NO FLOOR, NO NOTES". */
export const TERMS = [
  "VIBES ONLY",
  "A NAPKIN, SIGNED",
  "ONE WARM INTRO, PERPETUAL",
  "PRO-RATA ON FEELINGS",
  "BOARD SEAT: THE DOG",
  "LIQUIDATION PREFERENCE: DIBS",
  "MFN WITH YOUR COUSIN",
  "SAFE (SORT OF)",
  "DUE BY VIBES",
  "NON-BINDING, LIKE EVERYTHING",
  "NO CAP, NO FLOOR, NO NOTES",
  "A HANDSHAKE AT BAGGAGE CLAIM",
  "AN OPTION POOL THAT EATS YOU LAST",
  "ANTI-DILUTION: ASKED NICELY",
  "DRAG-ALONG: EMOTIONALLY",
  "TAG-ALONG: TO BRUNCH",
  "CLIFF: EVERY MONDAY",
  "VESTING ON GOOD BEHAVIOR",
  "INFORMATION RIGHTS: THE GROUP CHAT",
  "A SIDE LETTER, LOST",
  "PAY-TO-PLAY, VENMO PENDING",
  "FULL RATCHET, WHATEVER THAT IS",
  "ROFR ON YOUR NEXT IDEA",
  "BOARD OBSERVER: MUTED",
  "EXCLUSIVITY UNTIL LUNCH",
];

export const DILIGENCE = [
  "a vibe check",
  "one squinted look at the landing page",
  "your LinkedIn banner",
  "skipped entirely",
  "outsourced to their nephew",
  "a coin, flipped once",
  "three minutes of scrolling, impressed",
  "asking around the sauna",
  "reading the README's first sentence",
  "a gut feeling, seconded by the dog",
];

export const SOURCING = [
  "a reply guy",
  "your roast receipt",
  "a podcast at 2x",
  "the group chat",
  "misreading your bio",
  "a screenshot of a screenshot",
  "the wrong search result",
  "your arena record",
  "a conference lanyard they kept",
  "an airport lounge conversation",
];

export const WIRING = [
  "eventually",
  "in exposure first",
  "pending one more call",
  "to the wrong account, then yours",
  "in three tranches of vibes",
  "after one more sauna",
  "by check, somehow",
  "the moment you stop asking",
];

export const MEETINGS = [
  "walk-and-talk",
  "voice note",
  "sauna session",
  "Zoom with cameras off",
  "chance encounter at baggage claim",
  "dinner nobody remembers ordering",
  "gym spot turned pitch",
  "car ride to the airport",
];

/** The SIGN moment. One fires per claim, seeded by the same week. */
export const SIGN_LINES = [
  "Signed. Nothing is binding.",
  "Wire pending. Forever.",
  "Congrats on the dilution.",
  "{investor} has already told three people.",
  "The napkin is countersigned.",
  "Your cap table just got more interesting.",
  "Your hoodie is in the mail.",
  "The announcement thread drafts itself.",
];

// ---------------------------------------------------------------- templates

type Slots = {
  amt: string;
  investor: string;
  investor2: string;
  diligence: string;
  sourcing: string;
  wiring: string;
  meeting: string;
};

/** Normal-week sentence structures — one rotates in per week. */
const TEMPLATES: ((s: Slots) => string)[] = [
  (s) => `₮${s.amt} from ${s.investor}, at a valuation nobody verified.`,
  (s) => `₮${s.amt} from ${s.investor}. Diligence was ${s.diligence}.`,
  (s) => `${s.investor} is in for ₮${s.amt}. They found you via ${s.sourcing}.`,
  (s) => `₮${s.amt} led by ${s.investor}, who asked zero questions and answered none.`,
  (s) => `Oversubscribed: ${s.investor} AND ${s.investor2} want in. Still ₮${s.amt}.`,
  (s) => `₮${s.amt} from ${s.investor}, wired ${s.wiring}.`,
  (s) => `${s.investor} offers ₮${s.amt} and "as much help as you need," which is none.`,
  (s) => `₮${s.amt} from ${s.investor} after a ${s.meeting} that ran long.`,
];

// ---------------------------------------------------------------- generator

export type SpecialWeek = "down" | "oversub" | "bridge" | null;

export interface WeeklyRound {
  week: string;
  amount: number;
  /** The assembled headline sentence. */
  headline: string;
  /** Optional line ABOVE the headline (down rounds apologise first). */
  preline: string | null;
  /** The small print, uppercase. */
  term: string;
  /** The claim button label. */
  button: string;
  /** Fires as the confirmation after signing. */
  signLine: string;
  investor: string;
  investor2: string | null;
  special: SpecialWeek;
}

const pick = <T,>(pool: T[], week: string, salt: string): T =>
  pool[fnvHash(`round-${salt}:${week}`) % pool.length];

/** ~1 week in 6 is special; which kind is a second independent roll. */
export function specialFor(week: string): SpecialWeek {
  if (fnvHash(`round-special:${week}`) % 6 !== 0) return null;
  const kind = fnvHash(`round-special-type:${week}`) % 3;
  return kind === 0 ? "down" : kind === 1 ? "oversub" : "bridge";
}

/** Base ₮200; special weeks change the amount WITH the copy (see economy.ts). */
export const ROUND_AMOUNTS: Record<Exclude<SpecialWeek, null> | "base", number> = {
  base: 200,
  down: 100,
  oversub: 300,
  bridge: 150,
};

export function generateRound(week: string): WeeklyRound {
  const special = specialFor(week);
  const amount = ROUND_AMOUNTS[special ?? "base"];

  const investor = pick(INVESTORS, week, "inv");
  // second investor must differ — offset into the rest of the pool
  const i1 = INVESTORS.indexOf(investor);
  const investor2 =
    INVESTORS[(i1 + 1 + (fnvHash(`round-inv2:${week}`) % (INVESTORS.length - 1))) % INVESTORS.length];

  const slots: Slots = {
    amt: String(amount),
    investor,
    investor2,
    diligence: pick(DILIGENCE, week, "dil"),
    sourcing: pick(SOURCING, week, "src"),
    wiring: pick(WIRING, week, "wire"),
    meeting: pick(MEETINGS, week, "meet"),
  };

  let headline: string;
  let preline: string | null = null;
  let button: string;
  let usedSecond = false;

  if (special === "down") {
    preline = "Market conditions. Their words.";
    headline = `₮${amount} from ${investor}, reluctantly.`;
    button = "Take it →";
  } else if (special === "oversub") {
    headline = TEMPLATES[4](slots);
    button = "Sign it all →";
    usedSecond = true;
  } else if (special === "bridge") {
    headline = `₮${amount} from ${investor}. A bridge to the next bridge.`;
    button = "Shake on it →";
  } else {
    const tpl = TEMPLATES[fnvHash(`round-tpl:${week}`) % TEMPLATES.length];
    headline = tpl(slots);
    usedSecond = headline.includes(investor2);
    button = "Sign it →";
  }

  const signLine = pick(SIGN_LINES, week, "sign").replace("{investor}", investor);

  return {
    week,
    amount,
    headline,
    preline,
    term: pick(TERMS, week, "term"),
    button,
    signLine,
    investor,
    investor2: usedSecond ? investor2 : null,
    special,
  };
}

/** Share text for a closed round. */
export function roundShareText(round: WeeklyRound): string {
  return `Just closed ₮${round.amount.toLocaleString("en-US")} from ${round.investor}. Terms: ${round.term}. aiticker.xyz`;
}

// ---------------------------------------------------------------- cap table

export interface CapTableRow {
  week: string;
  investor: string;
  amount: number;
}

/**
 * The long-running joke: a cap table of cursed names. Storage keeps a year of
 * weeks (tiny rows); the binder shows the newest few and the tap-through
 * sheet shows everything. Each row regenerates its full round (terms,
 * special) from the week key — deterministic, so nothing extra is stored.
 */
export const CAP_TABLE_MAX = 52;

export function capTableWith(prev: CapTableRow[], row: CapTableRow): CapTableRow[] {
  // idempotent per week — a double-tap must not double-list the round
  if (prev.some((r) => r.week === row.week)) return prev;
  return [...prev, row].slice(-CAP_TABLE_MAX);
}
