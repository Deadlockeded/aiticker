import type { Rarity } from "./types";

/** Edition size per rarity tier — printed on every card as #serial/size. */
export const EDITION_SIZES: Record<Rarity, number> = {
  common: 500,
  rare: 100,
  epic: 25,
  legendary: 10,
  mythic: 5,
};

/** Pack pull odds per rarity. Must sum to 1. */
export const PULL_ODDS: Record<Rarity, number> = {
  common: 0.7,
  rare: 0.22,
  epic: 0.065,
  legendary: 0.012,
  mythic: 0.003,
};

export function formatSerial(serial: string, editionSize: number): string {
  return `#${serial}/${editionSize}`;
}
