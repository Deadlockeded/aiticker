import type { Card, CardSignals } from "../../lib/types";

export type StatUpdate = Partial<CardSignals>;

export interface Source {
  name: string;
  /** Whether this card has the ids this source needs. */
  applies(card: Card): boolean;
  fetchFor(card: Card): Promise<StatUpdate>;
}

export const MAILTO = "peepatma@gmail.com";
export const UA = `aiticker-pipeline/1.0 (https://aiticker.vercel.app; ${MAILTO})`;

/** 10s-timeout JSON fetch. Throws on non-2xx — callers catch per source. */
export async function fetchJson<T>(
  url: string,
  headers: Record<string, string> = {},
): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, ...headers },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return (await res.json()) as T;
}

export function utcDay(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86_400_000)
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
}
