import transfersJson from "@/data/transfers.json";

/**
 * THE TRANSFER WINDOW — football-style moves for real people, so the rules
 * are the strictest in the app:
 * - data/transfers.json is an EDITORIAL ledger. Every entry is a confirmed,
 *   public move with a real source URL. The nightly pipeline only FLAGS
 *   candidates (TRANSFER WATCH log lines); it never writes this file.
 * - No rumors, no "sources say", no destination before it is public.
 * - No fee, ever. The running joke is "Fee: undisclosed" — because there is
 *   no fee, and we never invent numbers about real people (same hard rule
 *   as the funding satire).
 * Committing a transfer also updates the card's `career` rows and tagline
 * in data/cards.json — transfers.test.ts asserts they agree.
 */

export interface Transfer {
  /** Ledger number — transfer №001 is Jeff Dean, forever. */
  n: number;
  personId: string;
  from: string;
  to: string;
  role: string;
  /** UTC date of the public announcement (YYYY-MM-DD). */
  date: string;
  sourceUrl: string;
}

export const TRANSFERS: Transfer[] = (transfersJson as Transfer[])
  .slice()
  .sort((a, b) => (a.date < b.date ? 1 : -1));

/** The stamp and the ticker retire after this many days; the career row stays. */
export const FRESH_DAYS = 30;

export function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Pure: is the move still news on the given UTC day? Testable with fixed keys. */
export function isFresh(t: Transfer, dayKey: string): boolean {
  const days = Math.floor(
    (Date.parse(`${dayKey}T00:00:00Z`) - Date.parse(`${t.date}T00:00:00Z`)) / 86_400_000,
  );
  return days >= 0 && days <= FRESH_DAYS;
}

/** Latest move for a card, if any. */
export function transferFor(cardId: string): Transfer | null {
  return TRANSFERS.find((t) => t.personId === cardId) ?? null;
}

/** Fresh moves, newest first — the DEADLINE DAY ticker's feed. */
export function freshTransfers(dayKey: string): Transfer[] {
  return TRANSFERS.filter((t) => isFresh(t, dayKey));
}

export function transferShareText(t: Transfer, name: string): string {
  return `OFFICIAL: ${name} — ${t.from} → ${t.to}. Fee: undisclosed. aiticker.xyz/cards/${t.personId}`;
}

// ---- the watcher (pipeline-side, flags only) ------------------------------

const MOVE_VERBS =
  /\b(joins?|joined|leaves?|leaving|departs?|departing|exits?|steps? down|stepping down|hired|to lead|co-?founds?|co-?founded|launches|named)\b/i;

export interface TransferWatchHit {
  personId: string;
  title: string;
  url?: string;
}

/**
 * Scan headlines for card names + movement verbs. This produces LOG LINES
 * for a human editor — it never writes the ledger. A hit means "read this
 * headline", nothing more.
 */
export function transferWatch(
  titles: { title: string; url?: string }[],
  people: { id: string; name: string }[],
): TransferWatchHit[] {
  const hits: TransferWatchHit[] = [];
  for (const { title, url } of titles) {
    if (!MOVE_VERBS.test(title)) continue;
    const lower = title.toLowerCase();
    for (const p of people) {
      if (!lower.includes(p.name.toLowerCase())) continue;
      if (!hits.some((h) => h.personId === p.id && h.title === title)) {
        hits.push({ personId: p.id, title, url });
      }
    }
  }
  return hits;
}
