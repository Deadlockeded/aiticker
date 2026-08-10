"use client";

import { useState, useSyncExternalStore } from "react";
import type { MarketCard } from "@/lib/cards";
import { getBinderSnapshot, parseBinder, subscribeStore } from "@/lib/binder";
import { getSavedHandleSnapshot } from "@/lib/custody";
import { formatTicks } from "@/lib/market";
import {
  DRAFT_WIN,
  draftChoicesFor,
  fightDraft,
  fightGauntletRung,
  GAUNTLET_PURSES,
  GAUNTLET_RUNGS,
  gauntletLadderFor,
  getDraftSnapshot,
  getGauntletSnapshot,
  getLeagueSnapshot,
  getProspectsSnapshot,
  getTagSnapshot,
  claimLeagueRun,
  leagueEntrantsFor,
  parseDraft,
  parseGauntlet,
  parseLeague,
  parseProspects,
  parseTagDay,
  playTagTeam,
  runLeague,
  TAG_WIN,
  tagOpponentsFor,
  type LeagueOutcome,
  type TagOutcome,
} from "@/lib/modes";
import type { VsResult } from "@/lib/vsMapping";
import CardArt from "./CardArt";
import { HouseBadge } from "./HouseKit";
import { Button, ButtonLink } from "./ui";

/** Compact 3-round result — the shared scoreboard for the quick modes. */
function MiniResult({ result }: { result: VsResult }) {
  return (
    <div className="mt-2 space-y-1">
      {result.rounds.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className={`tnum w-6 text-right font-mono text-[11px] ${r.winner === "a" ? "font-bold text-up" : "text-ink3"}`}>
            {r.a}
          </span>
          <span className="micro flex-1 truncate text-center text-[9px] text-ink3">
            {r.label}
          </span>
          <span className={`tnum w-6 font-mono text-[11px] ${r.winner === "b" ? "font-bold text-up" : "text-ink3"}`}>
            {r.b}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Small owned-card picker chip row (shared by Gauntlet and Tag Team). */
function OwnedPicker({
  cards,
  selected,
  onPick,
  disabled = false,
}: {
  cards: MarketCard[];
  selected: string[];
  onPick: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {cards.map((card) => (
        <button
          key={card.id}
          disabled={disabled}
          onClick={() => onPick(card.id)}
          className={`flex w-[96px] shrink-0 flex-col items-center gap-1 rounded-lg border p-1.5 text-center disabled:opacity-50 ${
            selected.includes(card.id)
              ? "border-pink bg-pink/10"
              : "border-line bg-ink/[0.03]"
          }`}
        >
          <span className="h-7 w-7 shrink-0">
            <CardArt card={card} />
          </span>
          <span className="w-full truncate text-[11px] font-medium leading-tight text-ink">
            {card.name}
          </span>
          <span className="tnum font-mono text-[10px] text-ink3">{card.rating}</span>
        </button>
      ))}
    </div>
  );
}

const useOwnedCards = (cards: MarketCard[]) => {
  const raw = useSyncExternalStore(subscribeStore, getBinderSnapshot, () => null);
  if (raw === null) return null;
  const binder = parseBinder(raw);
  return cards
    .filter((c) => binder[c.id] && c.id !== "agi")
    .sort((a, b) => b.rating - a.rating);
};

// ---- THE GAUNTLET ---------------------------------------------------------

export function GauntletMode({ cards }: { cards: MarketCard[] }) {
  const raw = useSyncExternalStore(subscribeStore, getGauntletSnapshot, () => null);
  const owned = useOwnedCards(cards);
  const [fighter, setFighter] = useState<string | null>(null);
  const [last, setLast] = useState<ReturnType<typeof fightGauntletRung>>(null);
  if (raw === null || owned === null) return null;
  const s = parseGauntlet(raw);
  const ladder = gauntletLadderFor(cards, s.day);
  const activeFighter = s.cardId ?? fighter;
  const cleared = s.rung >= GAUNTLET_RUNGS;

  return (
    <div className="rounded-[22px] bg-surface p-4 shadow-card">
      <div className="flex items-baseline justify-between">
        <p className="micro font-semibold text-pink">The Gauntlet</p>
        <p className="micro text-ink3">one run a day · same tower for everyone</p>
      </div>
      <ul className="mt-3 space-y-1.5">
        {ladder.map((opp, i) => {
          const won = i < s.rung;
          const isNext = i === s.rung && !s.out && !cleared;
          return (
            <li key={opp.id} className="flex items-center gap-2.5">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  won ? "bg-up text-on-accent" : isNext ? "bg-pink text-on-accent" : "bg-surface2 text-ink3"
                }`}
              >
                {won ? "✓" : i + 1}
              </span>
              <span className={`min-w-0 flex-1 truncate text-[14px] ${isNext ? "font-semibold text-ink" : "text-ink2"}`}>
                {opp.name}
              </span>
              <span className="tnum shrink-0 font-mono text-[11px] text-ink3">
                {opp.rating} · ₮{GAUNTLET_PURSES[i]}
              </span>
            </li>
          );
        })}
      </ul>

      {cleared ? (
        <p className="mt-3 rotate-[-1deg] rounded-sm border border-line2 px-2 py-1 text-center micro font-black text-amber">
          👑 Tower cleared · come back tomorrow
        </p>
      ) : s.out ? (
        <p className="mt-3 text-center text-[13px] text-ink2">
          Run over at rung {s.rung + 1}. The tower resets at midnight UTC.
        </p>
      ) : (
        <>
          <p className="micro mt-3 text-ink3">
            {s.cardId ? "Your fighter (locked for the run)" : "Pick your fighter"}
          </p>
          <div className="mt-1.5">
            <OwnedPicker
              cards={s.cardId ? owned.filter((c) => c.id === s.cardId) : owned}
              selected={activeFighter ? [activeFighter] : []}
              onPick={(id) => !s.cardId && setFighter(id)}
            />
          </div>
          <Button
            data-testid="gauntlet-fight"
            disabled={!activeFighter}
            onClick={() => setLast(fightGauntletRung(cards, activeFighter!))}
            className="mt-2 w-full"
          >
            Fight rung {s.rung + 1} →
          </Button>
        </>
      )}
      {last && (
        <div className="mt-3 rounded-[16px] bg-surface2 p-3">
          <p className="text-center text-[14px] font-semibold text-ink">
            {last.result.winner === "a"
              ? `Rung taken — +${formatTicks(last.paid)}`
              : `${last.opponent.name} ends the run.`}
            {last.crowned && " 👑"}
          </p>
          <MiniResult result={last.result} />
        </div>
      )}
    </div>
  );
}

// ---- DRAFT NIGHT ----------------------------------------------------------

export function DraftMode({ cards }: { cards: MarketCard[] }) {
  const raw = useSyncExternalStore(subscribeStore, getDraftSnapshot, () => null);
  const binderRaw = useSyncExternalStore(subscribeStore, getBinderSnapshot, () => null);
  const [last, setLast] = useState<ReturnType<typeof fightDraft>>(null);
  if (raw === null || binderRaw === null) return null;
  const s = parseDraft(raw);
  const owned = new Set(Object.keys(parseBinder(binderRaw)));
  const choices = draftChoicesFor(cards, owned, s.day);

  return (
    <div className="rounded-[22px] bg-surface p-4 shadow-card">
      <div className="flex items-baseline justify-between">
        <p className="micro font-semibold text-pink">Draft Night</p>
        <p className="micro text-ink3">one loaner fight a day</p>
      </div>
      <p className="mt-1.5 text-[13px] text-ink2">
        Borrow a card you don&apos;t own for one fight. Win {formatTicks(DRAFT_WIN)}.
        The card goes back at midnight.
      </p>
      {s.used && !last ? (
        <p className="mt-3 text-center text-[13px] text-ink2">
          Tonight&apos;s loan is spent{s.won ? " — and it won." : "."} Fresh
          choices tomorrow.
        </p>
      ) : !last ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {choices.map((card) => (
            <button
              key={card.id}
              data-testid={`draft-pick-${card.id}`}
              onClick={() => setLast(fightDraft(cards, card.id))}
              className="rounded-[14px] border border-line bg-ink/[0.03] p-2 text-center transition-transform active:scale-[.97]"
            >
              <span className="mx-auto block h-9 w-9">
                <CardArt card={card} />
              </span>
              <span className="mt-1 block truncate text-[11px] font-medium text-ink">
                {card.name}
              </span>
              <span className="tnum font-mono text-[10px] text-ink3">{card.rating}</span>
            </button>
          ))}
        </div>
      ) : null}
      {last && (
        <div className="mt-3 rounded-[16px] bg-surface2 p-3">
          <p className="text-center text-[14px] font-semibold text-ink">
            {last.loaner.name} {last.result.winner === "a" ? "delivered" : "did not deliver"} vs{" "}
            {last.opponent.name} — +{formatTicks(last.paid)}
          </p>
          <MiniResult result={last.result} />
          <ButtonLink href="/packs" tone="secondary" className="mt-3 w-full text-[14px]">
            Want them for keeps? Rip packs →
          </ButtonLink>
        </div>
      )}
    </div>
  );
}


// ---- TAG TEAM -------------------------------------------------------------

export function TagTeamMode({ cards }: { cards: MarketCard[] }) {
  const raw = useSyncExternalStore(subscribeStore, getTagSnapshot, () => null);
  const owned = useOwnedCards(cards);
  const [picked, setPicked] = useState<string[]>([]);
  const [last, setLast] = useState<{ outcome: TagOutcome; paid: number } | null>(null);
  if (raw === null || owned === null) return null;
  const s = parseTagDay(raw);
  const [oppA, oppB] = tagOpponentsFor(cards, s.day);

  const toggle = (id: string) =>
    setPicked((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : p.length < 2 ? [...p, id] : [p[1], id],
    );

  return (
    <div className="rounded-[22px] bg-surface p-4 shadow-card">
      <div className="flex items-baseline justify-between">
        <p className="micro font-semibold text-pink">Tag Team</p>
        <p className="micro text-ink3">2v2 · purse pays once a day</p>
      </div>
      <p className="mt-1.5 text-[13px] text-ink2">
        Today&apos;s duo: <span className="font-semibold text-ink">{oppA.name}</span> ({oppA.rating}) &{" "}
        <span className="font-semibold text-ink">{oppB.name}</span> ({oppB.rating}).
        Same-Family pairs fight with the aura.
      </p>
      <p className="micro mt-3 text-ink3">Pick two ({picked.length}/2)</p>
      <div className="mt-1.5">
        <OwnedPicker cards={owned} selected={picked} onPick={toggle} />
      </div>
      <Button
        data-testid="tag-fight"
        disabled={picked.length !== 2}
        onClick={() => {
          const mine = picked.map((id) => owned.find((c) => c.id === id)!) as [
            MarketCard,
            MarketCard,
          ];
          setLast(playTagTeam(mine, [oppA, oppB]));
        }}
        className="mt-2 w-full"
      >
        Fight {s.paid ? "(exhibition)" : `— win ${formatTicks(TAG_WIN)}`} →
      </Button>
      {last && (
        <div className="mt-3 rounded-[16px] bg-surface2 p-3 text-center">
          <p className="text-[15px] font-semibold text-ink">
            {last.outcome.winner === "a"
              ? `Your team takes it ${last.outcome.aWins}–${last.outcome.bWins}`
              : last.outcome.winner === "b"
                ? `Their duo takes it ${last.outcome.bWins}–${last.outcome.aWins}`
                : `Split ${last.outcome.aWins}–${last.outcome.bWins}`}
            {last.paid > 0 && ` · +${formatTicks(last.paid)}`}
          </p>
          {last.outcome.aura && (
            <p className="micro mt-1 font-semibold text-amber">
              ⌂ Family aura active (+2 across the board)
            </p>
          )}
          <ul className="mt-2 space-y-1 text-left">
            {last.outcome.bouts.map((b, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-[12px]">
                <span className="truncate text-ink2">
                  {b.a.name} vs {b.b.name}
                </span>
                <span className={`tnum shrink-0 font-mono text-[11px] ${b.result.winner === "a" ? "text-up" : "text-ink3"}`}>
                  {b.result.aWins}–{b.result.bWins}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---- GITHUB LEAGUE --------------------------------------------------------

export function LeagueMode({ cards }: { cards: MarketCard[] }) {
  const raw = useSyncExternalStore(subscribeStore, getLeagueSnapshot, () => null);
  const prospectsRaw = useSyncExternalStore(subscribeStore, getProspectsSnapshot, () => null);
  const handleRaw = useSyncExternalStore(subscribeStore, getSavedHandleSnapshot, () => null);
  const [outcome, setOutcome] = useState<LeagueOutcome | null>(null);
  const [paid, setPaid] = useState(0);
  if (raw === null || prospectsRaw === null) return null;
  const s = parseLeague(raw);
  const prospects = parseProspects(prospectsRaw);
  const entrants = leagueEntrantsFor(cards, prospects, s.week);
  const myHandle = handleRaw || null;
  const roundNames = ["Quarterfinals", "Semifinals", "The Final"];

  return (
    <div className="rounded-[22px] bg-surface p-4 shadow-card">
      <div className="flex items-baseline justify-between">
        <p className="micro font-semibold text-pink">GitHub League</p>
        <p className="micro text-ink3">week {s.week.split("-W")[1]} · one bracket</p>
      </div>
      <p className="mt-1.5 text-[13px] text-ink2">
        Every handle you scout enters the week&apos;s bracket. Empty slots go
        to the index.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {entrants.map((e) => (
          <span
            key={e.side.label}
            className={`micro rounded-full px-2 py-0.5 font-semibold ${
              e.isHandle ? "bg-teal-tint text-teal" : "bg-surface2 text-ink2"
            }`}
          >
            {e.side.label} · {e.side.rating}
          </span>
        ))}
      </div>
      {s.ran && !outcome ? (
        <p className="mt-3 text-center text-[13px] text-ink2">
          This week&apos;s bracket is settled
          {s.championLabel ? ` — ${s.championLabel} holds the trophy.` : "."}{" "}
          New field on Monday.
        </p>
      ) : !outcome ? (
        <Button
          data-testid="run-league"
          onClick={() => {
            const o = runLeague(entrants, s.week);
            setPaid(claimLeagueRun(o, myHandle));
            setOutcome(o);
          }}
          className="mt-3 w-full"
        >
          Run the bracket →
        </Button>
      ) : null}
      {outcome && (
        <div className="mt-3 rounded-[16px] bg-surface2 p-3">
          {outcome.rounds.map((round, ri) => (
            <div key={ri} className="mt-2 first:mt-0">
              <p className="micro text-[9px] text-ink3">{roundNames[ri] ?? `Round ${ri + 1}`}</p>
              <ul className="mt-1 space-y-0.5">
                {round.map((m, mi) => (
                  <li key={mi} className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="truncate text-ink2">
                      <span className={m.winner === "a" ? "font-semibold text-ink" : ""}>{m.a.label}</span>
                      {" vs "}
                      <span className={m.winner === "b" ? "font-semibold text-ink" : ""}>{m.b.label}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="mt-3 text-center text-[15px] font-semibold text-ink">
            🏆 {outcome.champion.label} takes the week
            {paid > 0 && ` · +${formatTicks(paid)}`}
          </p>
          <p className="mt-1 text-center">
            <HouseBadge />
          </p>
        </div>
      )}
    </div>
  );
}
