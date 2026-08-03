import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getBinderSnapshot, notifyStore, parseBinder, type Binder } from "./binder";
import { getBattleRecordSnapshot, parseBattleRecord, type BattleRecord } from "./battle";
import { getUnlockedSnapshot, parseUnlocked } from "./achievements";
import { getXPSnapshot } from "./xp";
import { KEYS, readRaw, writeRaw } from "./storage";

/**
 * OPTIONAL account sync (Supabase). Hard rules, forever:
 * - anonymous play is the default; nothing is gated behind sign-in
 * - localStorage remains the session source of truth
 * - sync failures are silent and never block play or lose local state
 * - with the env vars absent, `authEnabled` is false and the entire auth
 *   layer does not render — the app behaves exactly as before
 * We store the collection and nothing else (see README-AUTH.md).
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const authEnabled = Boolean(url && anonKey);

let client: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient | null {
  if (!authEnabled) return null;
  if (!client) client = createClient(url!, anonKey!);
  return client;
}

/** Everything a collector can lose: the synced slice of localStorage. */
export interface CollectorState {
  binder: Binder;
  xp: number;
  achievements: string[];
  battle: BattleRecord;
}

export function readLocalState(): CollectorState {
  return {
    binder: parseBinder(getBinderSnapshot()),
    xp: parseInt(getXPSnapshot(), 10) || 0,
    achievements: parseUnlocked(getUnlockedSnapshot()),
    battle: parseBattleRecord(getBattleRecordSnapshot()),
  };
}

export function writeLocalState(state: CollectorState) {
  writeRaw(KEYS.binder, JSON.stringify(state.binder));
  writeRaw(KEYS.xp, String(state.xp));
  writeRaw(KEYS.achievements, JSON.stringify(state.achievements));
  writeRaw(KEYS.battle, JSON.stringify(state.battle));
  notifyStore();
}

/**
 * MERGE, never overwrite: union of owned cards with max copies per card
 * (earliest first-pull wins), max of every counter/streak, union of
 * achievements. Safe when either side is empty; a conflict always keeps
 * the better half of each side.
 */
export function mergeStates(local: CollectorState, cloud: Partial<CollectorState> | null): CollectorState {
  if (!cloud) return local;
  const binder: Binder = { ...(cloud.binder ?? {}) };
  for (const [id, mine] of Object.entries(local.binder)) {
    const theirs = binder[id];
    binder[id] = theirs
      ? {
          copies: Math.max(mine.copies, theirs.copies),
          firstPulledAt:
            mine.firstPulledAt < theirs.firstPulledAt ? mine.firstPulledAt : theirs.firstPulledAt,
          lastPulledAt:
            mine.lastPulledAt > theirs.lastPulledAt ? mine.lastPulledAt : theirs.lastPulledAt,
        }
      : mine;
  }
  const cb = cloud.battle;
  return {
    binder,
    xp: Math.max(local.xp, cloud.xp ?? 0),
    achievements: [...new Set([...(cloud.achievements ?? []), ...local.achievements])],
    battle: {
      current: Math.max(local.battle.current, cb?.current ?? 0),
      best: Math.max(local.battle.best, cb?.best ?? 0),
      wins: Math.max(local.battle.wins, cb?.wins ?? 0),
      losses: Math.max(local.battle.losses, cb?.losses ?? 0),
      giantSlain: Boolean(local.battle.giantSlain || cb?.giantSlain),
    },
  };
}

/** Pull cloud state, merge with local, write BOTH. Silent on failure. */
export async function pullAndMerge(userId: string): Promise<void> {
  const supa = getSupabase();
  if (!supa) return;
  try {
    const { data } = await supa
      .from("profiles")
      .select("state")
      .eq("user_id", userId)
      .maybeSingle();
    const merged = mergeStates(readLocalState(), (data?.state as CollectorState) ?? null);
    writeLocalState(merged);
    await pushState(userId);
  } catch {
    // offline / RLS hiccup — local play continues untouched
  }
}

/** Background local→cloud write. Silent on failure; retried on next change. */
export async function pushState(userId: string): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return false;
  try {
    const { error } = await supa.from("profiles").upsert({
      user_id: userId,
      state: readLocalState(),
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}
