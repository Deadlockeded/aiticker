import { fnvHash } from "./rng";

/**
 * PARALLELS — every card exists in four print variants. Same card data,
 * different print. The variant roll is INDEPENDENT of the rarity roll: a
 * holo common is a real chase, a gold legendary is a grail. Mythic (AGI)
 * has no variants — it is its own thing.
 */

export type Variant = "base" | "silver" | "gold" | "holo";

/** Published variant odds per pulled card (independent of card odds). */
export const VARIANT_ODDS: Record<Variant, number> = {
  base: 0.88,
  silver: 0.09,
  gold: 0.025,
  holo: 0.005,
};

/** Print run per card+variant (base uses the card's own edition size). */
export const VARIANT_EDITIONS: Record<Exclude<Variant, "base">, number> = {
  silver: 100,
  gold: 25,
  holo: 10,
};

/** Sell-value multipliers, ready for a future trading floor. The House
 * only ever deals in BASE — silver+ are pull-only; that scarcity is the
 * point. */
export const VARIANT_MULTIPLIER: Record<Variant, number> = {
  base: 1,
  silver: 3,
  gold: 8,
  holo: 20,
};

export const VARIANT_ORDER: Variant[] = ["base", "silver", "gold", "holo"];

/** Roll a variant from the published odds; injectable rand for the
 * deterministic first-pack path. */
export function rollVariant(rand: () => number = Math.random): Variant {
  const r = rand();
  if (r < VARIANT_ODDS.holo) return "holo";
  if (r < VARIANT_ODDS.holo + VARIANT_ODDS.gold) return "gold";
  if (r < VARIANT_ODDS.holo + VARIANT_ODDS.gold + VARIANT_ODDS.silver) return "silver";
  return "base";
}

/**
 * Serial minting. With no server, serials are minted client-side — the
 * starting number is seeded from (cardId+variant) into the low third of
 * the edition so numbers feel plausible and scarce, then increments
 * locally per copy. When Supabase auth is enabled, signed-in mints can
 * become authoritative server-side; local serials would then be
 * reconciled on first sync.
 */
export function startSerial(cardId: string, variant: Variant, editionSize: number): number {
  const edition = variant === "base" ? editionSize : VARIANT_EDITIONS[variant];
  const low = Math.max(1, Math.floor(edition / 3));
  return (fnvHash(`serial:${cardId}:${variant}`) % low) + 1;
}

export function editionFor(variant: Variant, cardEditionSize: number): number {
  return variant === "base" ? cardEditionSize : VARIANT_EDITIONS[variant];
}

export function variantLabel(v: Variant): string {
  return v.toUpperCase();
}

/** Display odds string for the published table. */
export function variantOddsLine(): string {
  return `silver ${(VARIANT_ODDS.silver * 100).toFixed(0)}% · gold ${(VARIANT_ODDS.gold * 100).toFixed(1)}% · holo ${(VARIANT_ODDS.holo * 100).toFixed(1)}%`;
}
