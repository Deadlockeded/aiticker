/**
 * The single localStorage gateway. Every persistent key is registered here
 * (see STORAGE.md for the schema of each), all reads/writes go through the
 * safe accessors (private-mode webviews throw on access — the app must keep
 * rendering), and stale keys from removed features are migrated away once.
 *
 * Key prefix stays `ai-index:` intentionally — it predates the aiticker
 * rename and existing collectors' binders live under it.
 */

export const KEYS = {
  binder: "ai-index:binder:v1",
  packs: "ai-index:packs:v1",
  xp: "ai-index:xp:v1",
  achievements: "ai-index:achievements:v1",
  battle: "ai-index:battle:v1",
  binderVisit: "ai-index:binder-visit:v1",
  communityCard: "ai-index:community-card:v1",
  reroll: "ai-index:reroll:v1",
  onboarding: "ai-index:onboarding:v1",
  binderRoom: "ai-index:binder-room:v1",
  wallet: "ai-index:wallet:v1",
  rituals: "ai-index:rituals:v1",
  theme: "ai-index:theme:v1",
  royalties: "ai-index:royalties:v1",
  roasts: "ai-index:roasts:v1",
  custody: "ai-index:custody:v1",
  gigs: "ai-index:gigs:v1",
  house: "ai-index:house:v1",
  ghHandle: "ai-index:gh-handle:v1",
  syncedAt: "ai-index:synced-at:v1",
  capTable: "ai-index:cap-table:v1",
  roomsSeen: "ai-index:rooms-seen:v1",
  storageVersion: "ai-index:storage-version",
} as const;

/** Keys written by since-removed features (draft lab, Tickerdle, tier lists, visit streaks, daily votes, the peek system). */
const STALE_KEYS = [
  "ai-index:labs:v1",
  "ai-index:tickerdle:v1",
  "ai-index:tiers:v1",
  "ai-index:visits:v1",
  "ai-index:votes:v1",
  "ai-index:peeked:v1",
];

const CURRENT_VERSION = 3;

/** Read a raw string; null when missing or storage is unavailable. */
export function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Write a raw string; silently a no-op when storage is unavailable. */
export function writeRaw(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private-mode webview or quota — sessionless browsing still works
  }
}

export function removeRaw(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function readJSON<T>(key: string, fallback: T): T {
  const raw = readRaw(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown) {
  writeRaw(key, JSON.stringify(value));
}

/** One feature-detect for surfaces that want to explain sessionless mode. */
export function storageAvailable(): boolean {
  try {
    const probe = "ai-index:probe";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * Versioned one-time migration, run once per client at boot (StorageBoot).
 * v2: clear keys orphaned by removed features. v3: clear the peek system.
 */
export function runMigrations() {
  const version = parseInt(readRaw(KEYS.storageVersion) ?? "1", 10) || 1;
  if (version >= CURRENT_VERSION) return;
  for (const key of STALE_KEYS) removeRaw(key);
  writeRaw(KEYS.storageVersion, String(CURRENT_VERSION));
}
