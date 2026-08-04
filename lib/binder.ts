import { PACK_BANK_MAX, PACK_INTERVAL_MS } from "./economy";
import { startSerial, type Variant } from "./variants";
import { KEYS, readRaw, writeRaw } from "./storage";

/**
 * localStorage-backed collection ("binder") + daily pack allowance.
 * Client-only — every function here must be called post-mount.
 */

export interface PrintCopy {
  /** Variant of this printed copy. */
  v: Variant;
  /** Serial number within the variant's edition. */
  n: number;
}

export interface BinderEntry {
  copies: number;
  firstPulledAt: string;
  lastPulledAt: string;
  /**
   * Per-copy print records (variant + serial), minted at pull time.
   * Entries from before parallels existed have no prints — those copies
   * render as unstamped base prints.
   */
  prints?: PrintCopy[];
}

export type Binder = Record<string, BinderEntry>;

const STORE_EVENT = "ai-index:store";

export const CARDS_PER_PACK = 2;

/** Notify same-tab subscribers (the storage event only fires cross-tab). */
export function notifyStore() {
  window.dispatchEvent(new Event(STORE_EVENT));
}
const notify = notifyStore;

/** Subscribe/snapshot pair for useSyncExternalStore. */
export function subscribeStore(cb: () => void): () => void {
  window.addEventListener(STORE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(STORE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function getBinderSnapshot(): string {
  return readRaw(KEYS.binder) ?? "{}";
}

export function getAllowanceSnapshot(): string {
  return readRaw(KEYS.packs) ?? "null";
}

export function parseBinder(raw: string): Binder {
  try {
    return JSON.parse(raw) as Binder;
  } catch {
    return {};
  }
}

export function getBinder(): Binder {
  return parseBinder(getBinderSnapshot());
}

export interface Mint {
  id: string;
  variant: Variant;
  /** Base edition size of the card (for base-variant serial seeding). */
  editionSize: number;
}

/**
 * Add pulled copies, minting a print record (variant + serial) for each.
 * Serials increment locally per card+variant from a seeded start — see
 * lib/variants.ts for the no-server rationale.
 */
export function addPulls(mints: Mint[]): number[] {
  const binder = getBinder();
  const now = new Date().toISOString();
  const serials: number[] = [];
  for (const { id, variant, editionSize } of mints) {
    const entry = binder[id];
    const prints = entry?.prints ?? [];
    const already = prints.filter((p) => p.v === variant).length;
    const serial = startSerial(id, variant, editionSize) + already;
    serials.push(serial);
    binder[id] = {
      copies: (entry?.copies ?? 0) + 1,
      firstPulledAt: entry?.firstPulledAt ?? now,
      lastPulledAt: now,
      prints: [...prints, { v: variant, n: serial }],
    };
  }
  writeRaw(KEYS.binder, JSON.stringify(binder));
  notify();
  return serials;
}

/**
 * Trade-in burns: remove N copies per id. BASE prints burn first — silver
 * gold/holo copies are pull-only scarcity and The House never takes them
 * unless nothing else is left.
 */
export function burnCopies(counts: Record<string, number>): Binder {
  const binder = getBinder();
  for (const [id, n] of Object.entries(counts)) {
    const entry = binder[id];
    if (!entry) continue;
    const copies = Math.max(0, entry.copies - n);
    if (copies === 0) {
      delete binder[id];
      continue;
    }
    const prints = [...(entry.prints ?? [])];
    let toBurn = n;
    // unstamped legacy copies burn silently first (copies > prints.length)
    const unstamped = entry.copies - prints.length;
    toBurn -= Math.min(toBurn, Math.max(0, unstamped));
    for (const v of ["base", "silver", "gold", "holo"] as const) {
      while (toBurn > 0) {
        const i = prints.findIndex((p) => p.v === v);
        if (i === -1) break;
        prints.splice(i, 1);
        toBurn--;
      }
    }
    binder[id] = { ...entry, copies, prints };
  }
  writeRaw(KEYS.binder, JSON.stringify(binder));
  notify();
  return binder;
}

// ---- pack bank (1 pack / 8h, cap 2) ---------------------------------------

export interface PackBank {
  /** Claimable packs (before accrual is applied). */
  bank: number;
  /** Accrual checkpoint (epoch ms). Idle while the bank is full. */
  ts: number;
  /** Lifetime packs ripped in this profile — feeds the pull engine. */
  ripped: number;
}

/**
 * Parse either shape: the current bank, or the legacy daily allowance
 * ({date, used}) which converts in place — remaining daily packs carry
 * over (capped) and legacy profiles are marked non-fresh (high ripped)
 * so they never hit the deterministic first-pack path.
 */
export function parsePackState(raw: string, now = Date.now()): PackBank {
  try {
    const p = JSON.parse(raw) as Partial<PackBank> & { date?: string; used?: number };
    if (p && typeof p.used === "number" && p.date) {
      return { bank: Math.min(PACK_BANK_MAX, Math.max(0, 3 - p.used)), ts: now, ripped: 99 };
    }
    if (p && typeof p.bank === "number" && typeof p.ts === "number") {
      return { bank: p.bank, ts: p.ts, ripped: p.ripped ?? 0 };
    }
  } catch {
    // fresh profile below
  }
  // fresh profiles start with a full bank — the ceremony needs a pack
  return { bank: PACK_BANK_MAX, ts: now, ripped: 0 };
}

/** Apply rolling accrual: +1 pack per interval, timer idle at the cap. */
export function normalizeBank(state: PackBank, now = Date.now()): PackBank {
  if (state.bank >= PACK_BANK_MAX) return { ...state, bank: PACK_BANK_MAX, ts: now };
  const earned = Math.floor((now - state.ts) / PACK_INTERVAL_MS);
  if (earned <= 0) return state;
  const bank = Math.min(PACK_BANK_MAX, state.bank + earned);
  return { ...state, bank, ts: bank >= PACK_BANK_MAX ? now : state.ts + earned * PACK_INTERVAL_MS };
}

/** Claimable packs, derived from an allowance snapshot string. */
export function packsLeftFrom(raw: string, now = Date.now()): number {
  return normalizeBank(parsePackState(raw, now), now).bank;
}

export function getPacksLeft(): number {
  return packsLeftFrom(getAllowanceSnapshot());
}

export function getRippedCount(): number {
  return parsePackState(getAllowanceSnapshot()).ripped;
}

/** Claim a pack: returns packs remaining after, or null if none banked. */
export function consumePack(now = Date.now()): number | null {
  const s = normalizeBank(parsePackState(getAllowanceSnapshot(), now), now);
  if (s.bank <= 0) return null;
  const wasFull = s.bank >= PACK_BANK_MAX;
  const next: PackBank = {
    bank: s.bank - 1,
    // claiming from a full bank starts the next 8h window now
    ts: wasFull ? now : s.ts,
    ripped: s.ripped + 1,
  };
  writeRaw(KEYS.packs, JSON.stringify(next));
  notify();
  return next.bank;
}

/**
 * Count a pack that was paid for with Ticks: the bank and its timer are
 * untouched, but `ripped` still advances so the pull engine (and the
 * deterministic first-two-packs path) sees every pack this profile opened.
 */
export function countExchangePack(): number {
  const s = parsePackState(getAllowanceSnapshot());
  const next: PackBank = { ...s, ripped: s.ripped + 1 };
  writeRaw(KEYS.packs, JSON.stringify(next));
  notify();
  return next.ripped;
}

/** Ms until the next pack accrues (0 when the bank is full). */
export function msUntilNextPack(now = Date.now()): number {
  const s = normalizeBank(parsePackState(getAllowanceSnapshot(), now), now);
  if (s.bank >= PACK_BANK_MAX) return 0;
  return Math.max(0, s.ts + PACK_INTERVAL_MS - now);
}
