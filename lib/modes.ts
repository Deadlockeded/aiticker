import type { MarketCard } from "./cards";
import { getBinder, notifyStore } from "./binder";
import { utcDayKey, utcWeekKey } from "./daily";
import { isReleased } from "./drops";
import { trackGig } from "./gigs";
import { HOUSES } from "./houses";
import { cardMetaValues, getDailyMeta, profileMetaValues, type MetaKey } from "./meta";
import { fnvHash, mulberry32 } from "./rng";
import { KEYS, readRaw, writeRaw } from "./storage";
import { cardVsStats, resolveArena, type VsResult, type VsSide } from "./vsMapping";
import { grantTicks } from "./wallet";
import type { CommunitySliders } from "./create";

/**
 * ARENA GAME MODES — four ways to use the cards (and handles) you've
 * accrued, all built on the same deterministic fight engine. Solo-safe,
 * wager-free, and every purse is a CAPPED grant inside EARN_DAILY_CAP:
 * - THE GAUNTLET: a daily 5-rung tower, same ladder for everyone.
 * - DRAFT NIGHT: fight once a day with a loaner card you don't own.
 * - TAG TEAM: 2v2, four bouts, aggregate; same-House pairs get the aura.
 * - GITHUB LEAGUE: a weekly 8-slot bracket of handles you've scouted,
 *   padded with index cards. Runs offline from scouting snapshots.
 */

export function cardSide(card: MarketCard): VsSide {
  const base = cardVsStats(card);
  return {
    kind: "card",
    label: card.name,
    avatar: card.image,
    company: card.type === "company",
    rating: card.rating,
    stats: base,
    meta: cardMetaValues(card),
    cardId: card.id,
  };
}

const releasedIndex = (cards: MarketCard[]) =>
  cards.filter((c) => c.type !== "artifact" && c.id !== "agi" && isReleased(c.id));

// ---- THE GAUNTLET ---------------------------------------------------------

export const GAUNTLET_RUNGS = 5;
export const GAUNTLET_PURSES = [10, 15, 20, 25, 30];
export const GAUNTLET_CROWN = 50;

/** The day's tower: 5 opponents rising through the rating quintiles. */
export function gauntletLadderFor(cards: MarketCard[], day = utcDayKey()): MarketCard[] {
  const pool = [...releasedIndex(cards)].sort((a, b) => a.rating - b.rating);
  const rand = mulberry32(fnvHash(`gauntlet:${day}`));
  const ladder: MarketCard[] = [];
  for (let i = 0; i < GAUNTLET_RUNGS; i++) {
    const start = Math.floor((i * pool.length) / GAUNTLET_RUNGS);
    const end = Math.floor(((i + 1) * pool.length) / GAUNTLET_RUNGS);
    const band = pool.slice(start, Math.max(start + 1, end));
    ladder.push(band[Math.floor(rand() * band.length)]);
  }
  return ladder;
}

export interface GauntletState {
  day: string;
  cardId: string | null; // the run's fighter, locked at rung 1
  rung: number; // next rung to fight, 0-based
  out: boolean; // a loss ends the day's run
  crowned: boolean;
}

export function parseGauntlet(raw: string | null): GauntletState {
  const day = utcDayKey();
  const fresh: GauntletState = { day, cardId: null, rung: 0, out: false, crowned: false };
  if (!raw) return fresh;
  try {
    const s = JSON.parse(raw) as GauntletState;
    return s.day === day ? s : fresh;
  } catch {
    return fresh;
  }
}

export function getGauntletSnapshot(): string | null {
  return readRaw(KEYS.gauntlet) ?? "";
}

function writeGauntlet(s: GauntletState) {
  writeRaw(KEYS.gauntlet, JSON.stringify(s));
  notifyStore();
}

/** Fight the next rung. Locks the fighter on the first rung. */
export function fightGauntletRung(
  cards: MarketCard[],
  fighterId: string,
): { result: VsResult; opponent: MarketCard; paid: number; crowned: boolean } | null {
  const s = parseGauntlet(readRaw(KEYS.gauntlet));
  if (s.out || s.rung >= GAUNTLET_RUNGS) return null;
  if (s.cardId && s.cardId !== fighterId) return null; // the run is locked
  const me = cards.find((c) => c.id === fighterId);
  if (!me) return null;
  const ladder = gauntletLadderFor(cards, s.day);
  let opponent = ladder[s.rung];
  if (opponent.id === me.id) {
    // fighting yourself is a bye nobody wants — swap in the band neighbour
    const pool = releasedIndex(cards).filter((c) => c.id !== me.id);
    opponent = pool[fnvHash(`gauntlet-sub:${s.day}:${s.rung}`) % pool.length];
  }
  const result = resolveArena(cardSide(me), cardSide(opponent), false, getDailyMeta());
  trackGig("arena_fight");
  let paid = 0;
  let crowned = false;
  if (result.winner === "a") {
    trackGig("arena_win");
    paid = grantTicks(GAUNTLET_PURSES[s.rung], { reason: `gauntlet rung ${s.rung + 1}` });
    const next = s.rung + 1;
    crowned = next >= GAUNTLET_RUNGS;
    if (crowned) paid += grantTicks(GAUNTLET_CROWN, { reason: "gauntlet crown", silent: true });
    writeGauntlet({ ...s, cardId: me.id, rung: next, crowned });
  } else {
    writeGauntlet({ ...s, cardId: me.id, out: true });
  }
  return { result, opponent, paid, crowned };
}

// ---- DRAFT NIGHT ----------------------------------------------------------

export const DRAFT_WIN = 40;
export const DRAFT_LOSS = 10;

/** Three loaners you DON'T own — same seed, filtered per binder. */
export function draftChoicesFor(
  cards: MarketCard[],
  owned: Set<string>,
  day = utcDayKey(),
): MarketCard[] {
  const pool = releasedIndex(cards).filter((c) => !owned.has(c.id));
  const rand = mulberry32(fnvHash(`draft:${day}`));
  const picks: MarketCard[] = [];
  const bag = [...pool];
  while (picks.length < Math.min(3, pool.length) && bag.length > 0) {
    picks.push(bag.splice(Math.floor(rand() * bag.length), 1)[0]);
  }
  return picks;
}

/** The loaner's opponent: nearest-rated card, hash-picked from ±6. */
export function draftOpponentFor(
  cards: MarketCard[],
  loaner: MarketCard,
  day = utcDayKey(),
): MarketCard {
  const pool = releasedIndex(cards).filter(
    (c) => c.id !== loaner.id && Math.abs(c.rating - loaner.rating) <= 6,
  );
  const fallback = releasedIndex(cards).filter((c) => c.id !== loaner.id);
  const bag = pool.length > 0 ? pool : fallback;
  return bag[fnvHash(`draft-foe:${day}:${loaner.id}`) % bag.length];
}

export interface DraftState {
  day: string;
  used: boolean;
  pickedId: string | null;
  won: boolean;
}

export function parseDraft(raw: string | null): DraftState {
  const day = utcDayKey();
  const fresh: DraftState = { day, used: false, pickedId: null, won: false };
  if (!raw) return fresh;
  try {
    const s = JSON.parse(raw) as DraftState;
    return s.day === day ? s : fresh;
  } catch {
    return fresh;
  }
}

export function getDraftSnapshot(): string | null {
  return readRaw(KEYS.draft) ?? "";
}

export function fightDraft(
  cards: MarketCard[],
  loanerId: string,
): { result: VsResult; loaner: MarketCard; opponent: MarketCard; paid: number } | null {
  const s = parseDraft(readRaw(KEYS.draft));
  if (s.used) return null;
  const owned = new Set(Object.keys(getBinder()));
  const loaner = draftChoicesFor(cards, owned, s.day).find((c) => c.id === loanerId);
  if (!loaner) return null;
  const opponent = draftOpponentFor(cards, loaner, s.day);
  const result = resolveArena(cardSide(loaner), cardSide(opponent), false, getDailyMeta());
  trackGig("arena_fight");
  const won = result.winner === "a";
  if (won) trackGig("arena_win");
  const paid = grantTicks(won ? DRAFT_WIN : DRAFT_LOSS, { reason: "draft night" });
  writeRaw(KEYS.draft, JSON.stringify({ day: s.day, used: true, pickedId: loaner.id, won }));
  notifyStore();
  return { result, loaner, opponent, paid };
}

// ---- TAG TEAM -------------------------------------------------------------

export const TAG_WIN = 60;
export const TAG_LOSS = 10;
/** Both fighters from one Family: the aura. Small, visible, never decisive. */
export const FAMILY_AURA = 2;

export interface TagBout {
  a: MarketCard;
  b: MarketCard;
  result: VsResult;
}

export interface TagOutcome {
  bouts: TagBout[];
  aWins: number;
  bWins: number;
  winner: "a" | "b" | "tie";
  aura: boolean;
}

/** The day's opposing duo — one upper-half card, one lower-half card. */
export function tagOpponentsFor(cards: MarketCard[], day = utcDayKey()): [MarketCard, MarketCard] {
  const pool = [...releasedIndex(cards)].sort((a, b) => b.rating - a.rating);
  const top = pool.slice(0, Math.floor(pool.length / 2));
  const rest = pool.slice(Math.floor(pool.length / 2));
  return [
    top[fnvHash(`tag-a:${day}`) % top.length],
    rest[fnvHash(`tag-b:${day}`) % rest.length],
  ];
}

function auraSide(card: MarketCard): VsSide {
  const side = cardSide(card);
  const lift = (v: number) => Math.min(99, v + FAMILY_AURA);
  return {
    ...side,
    rating: lift(side.rating),
    stats: Object.fromEntries(
      Object.entries(side.stats).map(([k, v]) => [k, lift(v as number)]),
    ) as unknown as CommunitySliders,
    meta: side.meta
      ? (Object.fromEntries(
          Object.entries(side.meta).map(([k, v]) => [k, lift(v)]),
        ) as Record<MetaKey, number>)
      : undefined,
  };
}

export function sameFamily(aId: string, bId: string): boolean {
  return HOUSES.some((h) => h.cards.includes(aId) && h.cards.includes(bId));
}

/** 2v2: four bouts (each of mine fights each of theirs), aggregate wins. */
export function resolveTagTeam(
  mine: [MarketCard, MarketCard],
  theirs: [MarketCard, MarketCard],
): TagOutcome {
  const aura = sameFamily(mine[0].id, mine[1].id);
  const meta = getDailyMeta();
  const side = (c: MarketCard) => (aura ? auraSide(c) : cardSide(c));
  const bouts: TagBout[] = [];
  for (const a of mine) {
    for (const b of theirs) {
      bouts.push({ a, b, result: resolveArena(side(a), cardSide(b), false, meta) });
    }
  }
  const aWins = bouts.filter((x) => x.result.winner === "a").length;
  const bWins = bouts.filter((x) => x.result.winner === "b").length;
  return {
    bouts,
    aWins,
    bWins,
    winner: aWins > bWins ? "a" : bWins > aWins ? "b" : "tie",
    aura,
  };
}

export function parseTagDay(raw: string | null): { day: string; paid: boolean } {
  const day = utcDayKey();
  if (!raw) return { day, paid: false };
  try {
    const s = JSON.parse(raw) as { day: string; paid: boolean };
    return s.day === day ? s : { day, paid: false };
  } catch {
    return { day, paid: false };
  }
}

export function getTagSnapshot(): string | null {
  return readRaw(KEYS.tagteam) ?? "";
}

/** Play a tag match. The purse pays once per day; play stays unlimited. */
export function playTagTeam(
  mine: [MarketCard, MarketCard],
  theirs: [MarketCard, MarketCard],
): { outcome: TagOutcome; paid: number } {
  const outcome = resolveTagTeam(mine, theirs);
  trackGig("arena_fight");
  if (outcome.winner === "a") trackGig("arena_win");
  const s = parseTagDay(readRaw(KEYS.tagteam));
  let paid = 0;
  if (!s.paid) {
    paid = grantTicks(outcome.winner === "a" ? TAG_WIN : TAG_LOSS, { reason: "tag team" });
    writeRaw(KEYS.tagteam, JSON.stringify({ day: s.day, paid: true }));
    notifyStore();
  }
  return { outcome, paid };
}

// ---- GITHUB LEAGUE --------------------------------------------------------

export const LEAGUE_SIZE = 8;
export const LEAGUE_WIN = 75;
export const LEAGUE_RAN = 25;

export interface ProspectSnap {
  handle: string;
  rating: number;
  stats: CommunitySliders;
  at: string;
}

export function parseProspects(raw: string | null): ProspectSnap[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as ProspectSnap[];
    return Array.isArray(list) ? list.slice(-16) : [];
  } catch {
    return [];
  }
}

export function getProspectsSnapshot(): string | null {
  return readRaw(KEYS.prospects) ?? "";
}

/** Called from lib/score.ts on every successful scoring — the league roster. */
export function rememberProspect(handle: string, rating: number, stats: CommunitySliders) {
  const list = parseProspects(readRaw(KEYS.prospects)).filter(
    (p) => p.handle.toLowerCase() !== handle.toLowerCase(),
  );
  list.push({ handle, rating, stats, at: new Date().toISOString() });
  writeRaw(KEYS.prospects, JSON.stringify(list.slice(-16)));
  notifyStore();
}

export interface LeagueEntrant {
  side: VsSide;
  isHandle: boolean;
}

/** The week's bracket: scouted handles first, padded with index cards. */
export function leagueEntrantsFor(
  cards: MarketCard[],
  prospects: ProspectSnap[],
  week = utcWeekKey(),
): LeagueEntrant[] {
  const rand = mulberry32(fnvHash(`league:${week}`));
  const handles: LeagueEntrant[] = prospects.slice(-LEAGUE_SIZE).map((p) => ({
    isHandle: true,
    side: {
      kind: "profile",
      label: `@${p.handle}`,
      avatar: null,
      company: false,
      rating: p.rating,
      stats: p.stats,
      meta: profileMetaValues(p.handle, p.stats, p.rating),
    },
  }));
  const pool = [...releasedIndex(cards)];
  while (handles.length < LEAGUE_SIZE && pool.length > 0) {
    const card = pool.splice(Math.floor(rand() * pool.length), 1)[0];
    handles.push({ isHandle: false, side: cardSide(card) });
  }
  // week-seeded seeding order
  return handles
    .map((e) => ({ e, sort: fnvHash(`league-seed:${week}:${e.side.label}`) }))
    .sort((x, y) => x.sort - y.sort)
    .map(({ e }) => e);
}

export interface LeagueRound {
  a: VsSide;
  b: VsSide;
  winner: "a" | "b";
}

export interface LeagueOutcome {
  rounds: LeagueRound[][]; // [QF(4), SF(2), F(1)]
  champion: VsSide;
}

/** Single-elim, resolved on the fixed axes (no daily meta) — one result
 * per week no matter which day you press the button. Ties break to the
 * higher seed hash, never a coin flip. */
export function runLeague(entrants: LeagueEntrant[], week = utcWeekKey()): LeagueOutcome {
  let field = entrants.map((e) => e.side);
  const rounds: LeagueRound[][] = [];
  while (field.length > 1) {
    const round: LeagueRound[] = [];
    const next: VsSide[] = [];
    for (let i = 0; i < field.length; i += 2) {
      const [a, b] = [field[i], field[i + 1]];
      const r = resolveArena(a, b, false);
      const winner: "a" | "b" =
        r.winner === "tie"
          ? fnvHash(`league-tie:${week}:${a.label}`) % 2 === 0
            ? "a"
            : "b"
          : r.winner;
      round.push({ a, b, winner });
      next.push(winner === "a" ? a : b);
    }
    rounds.push(round);
    field = next;
  }
  return { rounds, champion: field[0] };
}

export interface LeagueState {
  week: string;
  ran: boolean;
  championLabel?: string;
}

export function parseLeague(raw: string | null): LeagueState {
  const week = utcWeekKey();
  if (!raw) return { week, ran: false };
  try {
    const s = JSON.parse(raw) as LeagueState;
    return s.week === week ? s : { week, ran: false };
  } catch {
    return { week, ran: false };
  }
}

export function getLeagueSnapshot(): string | null {
  return readRaw(KEYS.league) ?? "";
}

/** Run this week's bracket once; the purse depends on whether YOUR handle
 * (the GitHub-linked one) lifts the trophy. */
export function claimLeagueRun(outcome: LeagueOutcome, myHandle: string | null): number {
  const s = parseLeague(readRaw(KEYS.league));
  if (s.ran) return 0;
  const mine =
    myHandle && outcome.champion.label.toLowerCase() === `@${myHandle.toLowerCase()}`;
  writeRaw(
    KEYS.league,
    JSON.stringify({ week: s.week, ran: true, championLabel: outcome.champion.label }),
  );
  notifyStore();
  return grantTicks(mine ? LEAGUE_WIN : LEAGUE_RAN, {
    reason: mine ? "league champion" : "league week",
  });
}
