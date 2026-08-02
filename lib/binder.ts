/**
 * localStorage-backed collection ("binder") + daily pack allowance.
 * Client-only — every function here must be called post-mount.
 */

/** Card condition, rolled at pull time: Mint 10%, Near Mint 30%, Played 60%. */
export type Condition = "mint" | "nearMint" | "played";

export interface BinderEntry {
  copies: number;
  firstPulledAt: string;
  lastPulledAt: string;
  /** Per-condition copy counts. Absent (pre-grading pulls) = all played. */
  conditions?: Record<Condition, number>;
}

export function rollCondition(): Condition {
  const roll = Math.random();
  return roll < 0.1 ? "mint" : roll < 0.4 ? "nearMint" : "played";
}

export function conditionsOf(entry: BinderEntry): Record<Condition, number> {
  return (
    entry.conditions ?? { mint: 0, nearMint: 0, played: entry.copies }
  );
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

export function addPulls(ids: string[], conditions?: Condition[]): Binder {
  const binder = getBinder();
  const now = new Date().toISOString();
  ids.forEach((id, i) => {
    const condition = conditions?.[i] ?? "played";
    const entry = binder[id];
    const prev = entry ? conditionsOf(entry) : { mint: 0, nearMint: 0, played: 0 };
    binder[id] = {
      copies: (entry?.copies ?? 0) + 1,
      firstPulledAt: entry?.firstPulledAt ?? now,
      lastPulledAt: now,
      conditions: { ...prev, [condition]: prev[condition] + 1 },
    };
  });
  localStorage.setItem(BINDER_KEY, JSON.stringify(binder));
  notify();
  return binder;
}

/** Trade-in burns: remove N copies per id (worst condition first). */
export function burnCopies(counts: Record<string, number>): Binder {
  const binder = getBinder();
  for (const [id, n] of Object.entries(counts)) {
    const entry = binder[id];
    if (!entry) continue;
    let remaining = n;
    const conditions = conditionsOf(entry);
    for (const grade of ["played", "nearMint", "mint"] as Condition[]) {
      const take = Math.min(conditions[grade], remaining);
      conditions[grade] -= take;
      remaining -= take;
    }
    const copies = Math.max(0, entry.copies - n);
    if (copies === 0) delete binder[id];
    else binder[id] = { ...entry, copies, conditions };
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
