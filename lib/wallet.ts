import { burnCopies, getBinder, notifyStore } from "./binder";
import { utcDayKey } from "./daily";
import { DUPE_SALE_MIN, DUPE_SALE_RATE, EARN_DAILY_CAP } from "./economy";
import { KEYS, readRaw, writeRaw } from "./storage";

/**
 * The Tick wallet. Ticks (₮) are play-money: they are earned by playing and
 * spent only on Exchange Packs. They can never be bought, cashed out, or
 * WAGERED — see the hard rules in economy.ts.
 *
 * Shape: { bal, day, earned } where `earned` is today's capped income and
 * resets on UTC day rollover.
 */

export interface Wallet {
  bal: number;
  /** UTC day key the `earned` counter belongs to. */
  day: string;
  /** Capped income granted so far today (rituals are exempt). */
  earned: number;
}

export const TICK_GRANT_EVENT = "ai-index:ticks";

/** Every player starts with a token float so the first Exchange Pack is visible, not theoretical. */
const OPENING_BALANCE = 100;

export function getWalletSnapshot(): string {
  return readRaw(KEYS.wallet) ?? "";
}

export function parseWallet(raw: string, day = utcDayKey()): Wallet {
  try {
    const p = JSON.parse(raw) as Partial<Wallet>;
    if (p && typeof p.bal === "number") {
      return {
        bal: Math.max(0, Math.round(p.bal)),
        day: p.day ?? day,
        earned: p.day === day ? (p.earned ?? 0) : 0,
      };
    }
  } catch {
    // fresh wallet below
  }
  return { bal: OPENING_BALANCE, day, earned: 0 };
}

export function balanceFrom(raw: string): number {
  return parseWallet(raw).bal;
}

export function getWallet(): Wallet {
  return parseWallet(getWalletSnapshot());
}

export function getBalance(): number {
  return getWallet().bal;
}

function write(w: Wallet) {
  writeRaw(KEYS.wallet, JSON.stringify(w));
}

/** Ticks still grantable today under the daily earn cap. */
export function earnRoomLeft(): number {
  return Math.max(0, EARN_DAILY_CAP - getWallet().earned);
}

export interface GrantOptions {
  /** Short label for the toast, e.g. "arena purse". */
  reason?: string;
  /**
   * Ritual grants (daily visit, weekly round) pass false: they are never
   * clipped by the daily cap, but they still count toward it so the ceiling
   * in economy.ts holds.
   */
  capped?: boolean;
  /** Suppress the toast when the surface already animates the amount. */
  silent?: boolean;
}

/**
 * Add Ticks. Returns the amount actually granted — capped grants are clipped
 * to the remaining daily room (and can come back as 0).
 */
export function grantTicks(amount: number, opts: GrantOptions = {}): number {
  const { reason, capped = true, silent = false } = opts;
  if (amount <= 0) return 0;
  const w = getWallet();
  const granted = capped ? Math.min(amount, Math.max(0, EARN_DAILY_CAP - w.earned)) : amount;
  if (granted <= 0) return 0;
  write({ bal: w.bal + granted, day: w.day, earned: w.earned + granted });
  notifyStore();
  if (!silent) announceGrant(granted, reason);
  return granted;
}

/** Fire the +₮n toast without moving the balance (for surfaces that already granted silently). */
export function announceGrant(amount: number, reason?: string) {
  if (typeof window === "undefined" || amount <= 0) return;
  window.dispatchEvent(
    new CustomEvent(TICK_GRANT_EVENT, { detail: { amount, reason } }),
  );
}

/** Spend Ticks. Returns false (and changes nothing) when the balance is short. */
export function spendTicks(amount: number): boolean {
  const w = getWallet();
  if (amount <= 0 || w.bal < amount) return false;
  write({ ...w, bal: w.bal - amount });
  notifyStore();
  return true;
}

export function canAfford(amount: number): boolean {
  return getBalance() >= amount;
}

// ---- dupe sales -----------------------------------------------------------

/** What a spare copy of this card fetches at today's book price. */
export function dupeValue(bookPrice: number): number {
  return Math.max(DUPE_SALE_MIN, Math.round(bookPrice * DUPE_SALE_RATE));
}

/**
 * Sell one duplicate. Never sells your last copy, and BASE prints go first
 * (burnCopies handles that) so parallels stay pull-only. Returns the Ticks
 * paid, or 0 when there was nothing spare to sell.
 */
export function sellDupe(cardId: string, bookPrice: number): number {
  const entry = getBinder()[cardId];
  if (!entry || entry.copies < 2) return 0;
  const payout = dupeValue(bookPrice);
  burnCopies({ [cardId]: 1 });
  return grantTicks(payout, { reason: "dupe sold" });
}
