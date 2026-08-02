import type { MarketCard } from "./cards";
import type { CareerStop, CompanyMetrics, EngineerMetrics } from "./types";
import { dayHash, utcDayKey } from "./daily";
import { notifyStore } from "./binder";

/** Wordle-style daily guessing game. Answer pool = cards with real art. */

export const TICKERDLE_EPOCH = "2026-08-01";
export const MAX_GUESSES = 6;
export const HARD_GUESSES = 4;

export function dayNumber(key = utcDayKey()): number {
  const ms = Date.parse(key) - Date.parse(TICKERDLE_EPOCH);
  return Math.floor(ms / 86_400_000) + 1;
}

export function answerPool(cards: MarketCard[]): MarketCard[] {
  return cards.filter(
    (c) => (c.type === "company" || c.type === "engineer") && c.image !== null,
  );
}

export function getAnswer(cards: MarketCard[], key = utcDayKey()): MarketCard {
  const pool = answerPool(cards);
  return pool[dayHash(`tickerdle:${key}`) % pool.length];
}

/** Redact the answer's name tokens from its flavor text. */
function redact(text: string, name: string): string {
  let out = text;
  for (const token of name.split(/\s+/).filter((t) => t.length > 2)) {
    out = out.replace(new RegExp(token, "gi"), "▮▮▮");
  }
  return out;
}

export interface Hint {
  label: string;
  text?: string;
  /** Pixelation level for avatar hints (canvas grid size). */
  pixelate?: number;
}

export function hintsFor(answer: MarketCard): Hint[] {
  let third: string;
  if (answer.career?.length) {
    const stop = answer.career[0] as CareerStop;
    third = `Career stop: ${stop.org} (${stop.years})`;
  } else if (answer.type === "company") {
    const m = answer.metrics as CompanyMetrics;
    third = `Headcount ≈ ${m.headcount.toLocaleString()}`;
  } else {
    const m = answer.metrics as EngineerMetrics;
    third = `${m.yearsInField} years in the field`;
  }
  return [
    {
      label: "The basics",
      text: `${answer.rarity.toUpperCase()} · ${answer.type}`,
    },
    { label: "The stat", text: `Overall rating: ${answer.rating}` },
    { label: "The résumé", text: third },
    {
      label: "The lore",
      text: `“${redact(answer.flavorText, answer.name)}”`,
    },
    { label: "The blur", pixelate: 7 },
    { label: "The reveal-ish", pixelate: 20 },
  ];
}

export function guessEmoji(guess: MarketCard, answer: MarketCard): string {
  if (guess.id === answer.id) return "🟩";
  if (guess.type === answer.type) return "🟨";
  return "⬛";
}

export function shareGrid(args: {
  day: number;
  guesses: MarketCard[];
  answer: MarketCard;
  won: boolean;
  hard: boolean;
  streak: number;
}): string {
  const { day, guesses, answer, won, hard, streak } = args;
  const max = hard ? HARD_GUESSES : MAX_GUESSES;
  const score = won ? `${guesses.length}/${max}` : `X/${max}`;
  const rows = guesses.map((g) => guessEmoji(g, answer)).join("\n");
  const streakLine = streak > 0 ? `\n🔥 ${streak} day streak` : "";
  return `Tickerdle #${day} ${score}${hard ? "*" : ""}\n${rows}${streakLine}\naiticker.xyz/guess`;
}

// ---- persistent state ----

const KEY = "ai-index:tickerdle:v1";

export interface DayState {
  guesses: string[];
  done: boolean;
  won: boolean;
  hard: boolean;
}

export interface TickerdleState {
  days: Record<string, DayState>;
  current: number;
  best: number;
  lastWinDay: string;
  /** wins by guess count, 1-indexed */
  dist: Record<string, number>;
}

const EMPTY: TickerdleState = {
  days: {},
  current: 0,
  best: 0,
  lastWinDay: "",
  dist: {},
};

export function getTickerdleSnapshot(): string {
  return localStorage.getItem(KEY) ?? JSON.stringify(EMPTY);
}

export function parseTickerdle(raw: string): TickerdleState {
  try {
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY };
  }
}

function write(state: TickerdleState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
  notifyStore();
}

export function setHardMode(key: string, hard: boolean): void {
  const state = parseTickerdle(getTickerdleSnapshot());
  const day = state.days[key] ?? { guesses: [], done: false, won: false, hard };
  if (day.guesses.length > 0) return; // locked once you start
  state.days[key] = { ...day, hard };
  write(state);
}

function prevDayKey(key: string): string {
  return new Date(Date.parse(key) - 86_400_000).toISOString().slice(0, 10);
}

export function submitGuess(
  key: string,
  guessId: string,
  answerId: string,
): TickerdleState {
  const state = parseTickerdle(getTickerdleSnapshot());
  const day = state.days[key] ?? {
    guesses: [],
    done: false,
    won: false,
    hard: false,
  };
  if (day.done || day.guesses.includes(guessId)) return state;

  const guesses = [...day.guesses, guessId];
  const max = day.hard ? HARD_GUESSES : MAX_GUESSES;
  const won = guessId === answerId;
  const done = won || guesses.length >= max;

  state.days[key] = { ...day, guesses, done, won };
  if (done) {
    if (won) {
      state.current = state.lastWinDay === prevDayKey(key) ? state.current + 1 : 1;
      state.best = Math.max(state.best, state.current);
      state.lastWinDay = key;
      state.dist[String(guesses.length)] =
        (state.dist[String(guesses.length)] ?? 0) + 1;
    } else {
      state.current = 0;
    }
  }
  write(state);
  return state;
}
