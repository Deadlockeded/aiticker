/**
 * Pack economy constants. One pack accrues every PACK_INTERVAL_H hours on a
 * rolling timer (claiming from a full bank starts the next interval), and
 * the bank caps at PACK_BANK_MAX so a missed window isn't fully lost.
 *
 * ─── HARD RULES (do not "improve" these away) ───────────────────────────
 * 1. NO WAGERING, EVER. Ticks can never be staked, risked, or lost by
 *    fighting. A loss still pays PURSE_LOSS. There is no bet input, no
 *    ante, no double-or-nothing, anywhere in the app.
 * 2. NO REAL MONEY. Ticks cannot be bought with money or converted to it.
 *    The only sink is the Exchange Pack; the only sources are play.
 * 3. EARNED PACKS ARE CAPPED. EARN_DAILY_CAP exists so no grind pattern
 *    can exceed ~2 earned packs per day (see PIPELINE-free math in
 *    ECONOMY.md). Rituals (daily visit, weekly round) are exempt from
 *    clipping but still count toward the cap.
 */
export const PACK_INTERVAL_H = 8;
export const PACK_BANK_MAX = 2;
export const PACK_INTERVAL_MS = PACK_INTERVAL_H * 3_600_000;

// ---- the Tick sink --------------------------------------------------------

/** Price of an Exchange Pack: identical contents and odds to a free pack. */
export const EXCHANGE_PACK_COST = 500;

// ---- the Tick sources -----------------------------------------------------

/** Arena purses. Fighting always pays; losing pays less. Never negative. */
export const PURSE_WIN = 75;
export const PURSE_LOSS = 10;
/** Upset bonus per rating point the winner was rated BELOW the opponent. */
export const PURSE_UPSET_PER_POINT = 8;
export const PURSE_UPSET_MAX = 200;
/** First win of the UTC day. */
export const PURSE_FIRST_WIN = 100;
/** Win-streak milestones (streak length → one-off bonus). Reset on a loss. */
export const PURSE_STREAK_BONUS: Record<number, number> = {
  3: 50,
  5: 150,
  10: 300,
};

/** Once per UTC day, just for showing up. */
/**
 * 2026-08 rebalance: grants sit BELOW every card's book value (artifacts
 * now floor at ₮60) — showing up must never out-earn owning a card. The
 * weekly round amounts live with their copy in lib/rounds.ts ROUND_AMOUNTS.
 */
export const DAILY_VISIT_TICKS = 25;

/** Selling a duplicate pays this share of the card's current book price. */
export const DUPE_SALE_RATE = 0.05;
export const DUPE_SALE_MIN = 5;

/**
 * Ceiling on clippable income (purses + dupe sales + royalties) per UTC
 * day. Sized so a maxed active day funds about one Exchange Pack: 500 cap
 * + 25 visit = 525 ≈ 1.05 packs; the week's round day peaks at 500 + 25 +
 * 200 round = 725 ≈ 1.45 packs (oversubscribed weeks: 825, ~once in 6).
 */
export const EARN_DAILY_CAP = 500;

// ---- purse math (pure, unit-tested) --------------------------------------

export interface Purse {
  base: number;
  upset: number;
  streak: number;
  daily: number;
  total: number;
}

export function computePurse({
  won,
  myRating,
  foeRating,
  streakAfter,
  firstWinToday,
}: {
  won: boolean;
  myRating: number;
  foeRating: number;
  /** Win streak AFTER this fight (0 on a loss). */
  streakAfter: number;
  /** True when this is the player's first win of the UTC day. */
  firstWinToday: boolean;
}): Purse {
  const base = won ? PURSE_WIN : PURSE_LOSS;
  const gap = foeRating - myRating;
  const upset =
    won && gap > 0 ? Math.min(PURSE_UPSET_MAX, gap * PURSE_UPSET_PER_POINT) : 0;
  const streak = won ? (PURSE_STREAK_BONUS[streakAfter] ?? 0) : 0;
  const daily = won && firstWinToday ? PURSE_FIRST_WIN : 0;
  return { base, upset, streak, daily, total: base + upset + streak + daily };
}
