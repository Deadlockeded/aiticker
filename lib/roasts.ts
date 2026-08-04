import { utcDayKey } from "./daily";
import { notifyStore } from "./binder";
import { KEYS, readRaw, writeRaw } from "./storage";

/**
 * ROAST QUOTA — the roast is the viral front door, but unlimited free runs
 * invited handle-spamming. Five fresh roasts per UTC day; burn links (a
 * friend's receipt arriving via URL) never spend quota, only roasts the
 * visitor fires themselves. The gate resets at midnight UTC with everything
 * else daily. Gating card-vs-GitHub arena fights is a separate, still-open
 * decision — this module is roasts only.
 */

export const FREE_ROASTS_PER_DAY = 5;

type Quota = { day: string; used: number };

function parseQuota(raw: string | null): Quota {
  const today = utcDayKey();
  if (!raw) return { day: today, used: 0 };
  try {
    const q = JSON.parse(raw) as Quota;
    // a new UTC day resets the batch
    return q.day === today ? q : { day: today, used: 0 };
  } catch {
    return { day: today, used: 0 };
  }
}

export function getRoastQuotaSnapshot(): string | null {
  return readRaw(KEYS.roasts);
}

export function roastsLeftFrom(raw: string | null): number {
  return Math.max(0, FREE_ROASTS_PER_DAY - parseQuota(raw).used);
}

export function roastsLeft(): number {
  return roastsLeftFrom(readRaw(KEYS.roasts));
}

/** Spend one roast. Returns false (and spends nothing) when the batch is gone. */
export function spendRoast(): boolean {
  const q = parseQuota(readRaw(KEYS.roasts));
  if (q.used >= FREE_ROASTS_PER_DAY) return false;
  writeRaw(KEYS.roasts, JSON.stringify({ day: q.day, used: q.used + 1 }));
  notifyStore();
  return true;
}
