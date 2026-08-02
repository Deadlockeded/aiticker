import { KEYS, readRaw, writeRaw } from "./storage";

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

export function addPulls(ids: string[]): Binder {
  const binder = getBinder();
  const now = new Date().toISOString();
  for (const id of ids) {
    const entry = binder[id];
    binder[id] = {
      copies: (entry?.copies ?? 0) + 1,
      firstPulledAt: entry?.firstPulledAt ?? now,
      lastPulledAt: now,
    };
  }
  writeRaw(KEYS.binder, JSON.stringify(binder));
  clearPeeked(ids); // pulling clears the PEEKED stamp (its own notify)
  notify();
  return binder;
}

// ---- THE PEEK --------------------------------------------------------------
// Press-and-hold on a facedown card flips it while held; the first peek
// permanently stamps the card PEEKED (until pulled). `total` is lifetime —
// pulling clears the stamp, not the count.

export interface PeekState {
  ids: string[];
  total: number;
}

export function getPeekSnapshot(): string {
  return readRaw(KEYS.peeked) ?? '{"ids":[],"total":0}';
}

export function parsePeek(raw: string): PeekState {
  try {
    const p = JSON.parse(raw) as Partial<PeekState> | null;
    return { ids: p?.ids ?? [], total: p?.total ?? 0 };
  } catch {
    return { ids: [], total: 0 };
  }
}

export function markPeeked(id: string) {
  const p = parsePeek(getPeekSnapshot());
  if (p.ids.includes(id)) return;
  writeRaw(
    KEYS.peeked,
    JSON.stringify({ ids: [...p.ids, id], total: p.total + 1 }),
  );
  notify();
}

function clearPeeked(ids: string[]) {
  const p = parsePeek(getPeekSnapshot());
  const next = p.ids.filter((id) => !ids.includes(id));
  if (next.length === p.ids.length) return;
  writeRaw(KEYS.peeked, JSON.stringify({ ids: next, total: p.total }));
}

// A peek-hold shouldn't count as the tap/click that follows it — surfaces
// consume this guard before navigating.
let peekGuard = false;
export function setPeekGuard() {
  peekGuard = true;
}
export function consumePeekGuard(): boolean {
  const g = peekGuard;
  peekGuard = false;
  return g;
}

/** Trade-in burns: remove N copies per id. */
export function burnCopies(counts: Record<string, number>): Binder {
  const binder = getBinder();
  for (const [id, n] of Object.entries(counts)) {
    const entry = binder[id];
    if (!entry) continue;
    const copies = Math.max(0, entry.copies - n);
    if (copies === 0) delete binder[id];
    else binder[id] = { ...entry, copies };
  }
  writeRaw(KEYS.binder, JSON.stringify(binder));
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
  writeRaw(KEYS.packs, JSON.stringify(next));
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
