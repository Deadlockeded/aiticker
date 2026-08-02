/**
 * localStorage-backed collection ("binder") + daily pack allowance.
 * Client-only — every function here must be called post-mount.
 */

export interface BinderEntry {
  copies: number;
  firstPulledAt: string;
  lastPulledAt: string;
}

export type Binder = Record<string, BinderEntry>;

const BINDER_KEY = "ai-index:binder:v1";
const PACKS_KEY = "ai-index:packs:v1";
const STORE_EVENT = "ai-index:store";

export const PACKS_PER_DAY = 3;
export const CARDS_PER_PACK = 3;

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
  return localStorage.getItem(BINDER_KEY) ?? "{}";
}

export function getAllowanceSnapshot(): string {
  return localStorage.getItem(PACKS_KEY) ?? "null";
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

export function addPulls(ids: string[]): Binder {
  const binder = getBinder();
  const now = new Date().toISOString();
  for (const id of ids) {
    const entry = binder[id];
    binder[id] = entry
      ? { ...entry, copies: entry.copies + 1, lastPulledAt: now }
      : { copies: 1, firstPulledAt: now, lastPulledAt: now };
  }
  localStorage.setItem(BINDER_KEY, JSON.stringify(binder));
  notify();
  return binder;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseAllowance(raw: string): { date: string; used: number } {
  try {
    const parsed = JSON.parse(raw) as { date: string; used: number } | null;
    if (parsed && parsed.date === todayKey()) return parsed;
  } catch {
    // fall through to a fresh allowance
  }
  return { date: todayKey(), used: 0 };
}

/** Packs remaining today, derived from an allowance snapshot string. */
export function packsLeftFrom(raw: string): number {
  return Math.max(0, PACKS_PER_DAY - parseAllowance(raw).used);
}

export function getPacksLeft(): number {
  return packsLeftFrom(getAllowanceSnapshot());
}

/** Returns packs remaining after consuming one, or null if none left. */
export function consumePack(): number | null {
  const allowance = parseAllowance(getAllowanceSnapshot());
  if (allowance.used >= PACKS_PER_DAY) return null;
  const next = { date: allowance.date, used: allowance.used + 1 };
  localStorage.setItem(PACKS_KEY, JSON.stringify(next));
  notify();
  return PACKS_PER_DAY - next.used;
}

/** Ms until the allowance resets (next local midnight). */
export function msUntilReset(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}
