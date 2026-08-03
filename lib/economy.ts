/**
 * Pack economy constants. One pack accrues every PACK_INTERVAL_H hours on a
 * rolling timer (claiming from a full bank starts the next interval), and
 * the bank caps at PACK_BANK_MAX so a missed window isn't fully lost.
 */
export const PACK_INTERVAL_H = 8;
export const PACK_BANK_MAX = 2;
export const PACK_INTERVAL_MS = PACK_INTERVAL_H * 3_600_000;
