import { notifyStore } from "./binder";
import { KEYS, readRaw, writeRaw } from "./storage";

/**
 * THE CUSTODY DESK — prompt-state for the save system. The rules protect
 * the player's "no":
 * - the desk sheet fires ONCE, after the first-ever pack lands in the
 *   binder (never during the ceremony or mid-reveal)
 * - after a dismissal, at most TWO later nudges ever — small banners, one
 *   per trigger (first rare+ pull, first return visit), then silence
 * - signed-in players see none of it
 * Copy vocabulary is save/keep/custody — never account/register/sign up.
 */

export interface CustodyState {
  /** The desk sheet has been shown (or legacy nudge dismissed). */
  prompted: boolean;
  /** Which follow-up nudges have fired (each at most once). */
  nudged: { rare: boolean; returning: boolean };
}

const LEGACY_NUDGE_KEY = "ai-index:sync-nudge:v1";

export function parseCustody(raw: string | null): CustodyState {
  const legacy = readRaw(LEGACY_NUDGE_KEY) === "1";
  if (!raw) return { prompted: legacy, nudged: { rare: false, returning: false } };
  try {
    const c = JSON.parse(raw) as Partial<CustodyState>;
    return {
      prompted: Boolean(c.prompted) || legacy,
      nudged: {
        rare: Boolean(c.nudged?.rare),
        returning: Boolean(c.nudged?.returning),
      },
    };
  } catch {
    return { prompted: legacy, nudged: { rare: false, returning: false } };
  }
}

export function getCustodySnapshot(): string | null {
  return readRaw(KEYS.custody);
}

export function getCustody(): CustodyState {
  return parseCustody(readRaw(KEYS.custody));
}

function writeCustody(state: CustodyState) {
  writeRaw(KEYS.custody, JSON.stringify(state));
  notifyStore();
}

export function markPrompted() {
  writeCustody({ ...getCustody(), prompted: true });
}

export function markNudged(kind: "rare" | "returning") {
  const c = getCustody();
  writeCustody({ ...c, nudged: { ...c.nudged, [kind]: true } });
}

/** Both nudges spent → the save system never speaks unprompted again. */
export function nudgesExhausted(c = getCustody()): boolean {
  return c.nudged.rare && c.nudged.returning;
}

// ---- the GitHub identity (a perk, never a lock) ---------------------------

/**
 * After a GitHub sign-in the username prefills roast/scout/ship/arena
 * handle inputs. Always editable, never enforced — it is a convenience,
 * and clearing the field is fully supported.
 */
export function getSavedHandleSnapshot(): string | null {
  return readRaw(KEYS.ghHandle);
}

export function getSavedHandle(): string {
  return readRaw(KEYS.ghHandle) ?? "";
}

export function saveHandle(handle: string) {
  if (!handle) return;
  writeRaw(KEYS.ghHandle, handle);
  notifyStore();
}

export function clearSavedHandle() {
  writeRaw(KEYS.ghHandle, "");
  notifyStore();
}

// ---- sync bookkeeping -----------------------------------------------------

export function stampSynced() {
  writeRaw(KEYS.syncedAt, String(Date.now()));
  notifyStore();
}

export function getSyncedAtSnapshot(): string | null {
  return readRaw(KEYS.syncedAt);
}

/** "just now" / "2m ago" / "3h ago" / "2d ago" — menu label material. */
export function relativeTime(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
