/**
 * First-run onboarding flags — ~6 Editor one-liners total across the pack
 * flow and the arena, each shown exactly once, then never again.
 * Client-only (localStorage); read via capture-once snapshots so surfaces
 * decide what to show at mount and stamp immediately.
 */

import { KEYS, readJSON, writeJSON } from "./storage";

export interface OnboardingState {
  /** Captions 1–2 (pack tear + first flip) shown. */
  pack?: boolean;
  /** Caption 3 (landing in the binder) shown. */
  binder?: boolean;
  /** "YOUR CARDS CAN FIGHT" coupon chip shown. */
  nudge?: boolean;
  /** The two arena captions shown. */
  arena?: boolean;
}

export function readOnboarding(): OnboardingState {
  return readJSON<OnboardingState>(KEYS.onboarding, {});
}

export function stampOnboarding(flag: keyof OnboardingState) {
  writeJSON(KEYS.onboarding, { ...readOnboarding(), [flag]: true });
}

/**
 * Capture-once helper: decides at first call whether `flag`'s moment is due
 * and stamps it, so re-renders (and future visits) stay stable. Safe as a
 * useSyncExternalStore snapshot.
 */
const captured = new Map<string, boolean>();
export function captureOnboardingMoment(flag: keyof OnboardingState): boolean {
  const hit = captured.get(flag);
  if (hit !== undefined) return hit;
  const due = !readOnboarding()[flag];
  if (due) stampOnboarding(flag);
  captured.set(flag, due);
  return due;
}
