import drops from "@/data/drops.json";

/**
 * DROP SYSTEM. Cards listed in data/drops.json with a future releaseDate
 * are fully hidden (gallery, market, packs, binder chase, arena pools).
 * On the release date (UTC) they enter everything automatically — the
 * check is a client-side date compare, so no deploy is needed beyond the
 * data already being present. (SSG surfaces re-check at render; the site
 * also rebuilds nightly with the market data, so build-time filters are
 * at most a day behind — release moments resolve client-side regardless.)
 */

export interface Drop {
  id: string;
  name: string;
  /** ISO date (UTC) — cards go live at 00:00 UTC this day. */
  releaseDate: string;
  cardIds: string[];
}

const DROPS = drops as Drop[];

const releaseByCard = new Map<string, number>();
for (const drop of DROPS) {
  const at = Date.parse(drop.releaseDate);
  for (const id of drop.cardIds) releaseByCard.set(id, at);
}

/** Cards not listed in any drop are always released (Series 1). */
export function isReleased(cardId: string, now = Date.now()): boolean {
  const at = releaseByCard.get(cardId);
  return at === undefined || now >= at;
}

export function releasedOnly<T extends { id: string }>(cards: T[], now = Date.now()): T[] {
  return cards.filter((c) => isReleased(c.id, now));
}

/** The next unreleased drop within `windowDays`, for the homepage tease. */
export function upcomingDrop(
  now = Date.now(),
  windowDays = 7,
): { name: string; count: number; days: number } | null {
  const future = DROPS.map((d) => ({ d, at: Date.parse(d.releaseDate) }))
    .filter(({ at }) => at > now)
    .sort((a, b) => a.at - b.at)[0];
  if (!future) return null;
  const days = Math.ceil((future.at - now) / 86_400_000);
  if (days > windowDays) return null;
  return { name: future.d.name, count: future.d.cardIds.length, days };
}
