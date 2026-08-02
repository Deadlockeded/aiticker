"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { MarketCard } from "@/lib/cards";
import { subscribeStore } from "@/lib/binder";
import { utcDayKey } from "@/lib/daily";
import {
  dayNumber,
  getAnswer,
  getTickerdleSnapshot,
  guessEmoji,
  HARD_GUESSES,
  hintsFor,
  MAX_GUESSES,
  parseTickerdle,
  setHardMode,
  shareGrid,
  submitGuess,
} from "@/lib/tickerdle";
import TradingCard from "./TradingCard";
import ShareButton from "./ShareButton";

/** Canvas pixelation: downscale to `level`² then upscale with smoothing off. */
function PixelAvatar({ src, level }: { src: string; level: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const img = new Image();
    // same-origin optimizer proxy keeps the canvas untainted
    img.src = `/_next/image?url=${encodeURIComponent(src)}&w=256&q=75`;
    img.onload = () => {
      const canvas = ref.current;
      if (!canvas) return;
      const tiny = document.createElement("canvas");
      tiny.width = level;
      tiny.height = level;
      tiny.getContext("2d")!.drawImage(img, 0, 0, level, level);
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(tiny, 0, 0, canvas.width, canvas.height);
    };
  }, [src, level]);
  return (
    <canvas ref={ref} width={176} height={176} className="rounded-xl border border-white/10" />
  );
}

export default function GuessGame({
  cards,
  ranks,
}: {
  cards: MarketCard[];
  ranks: Record<string, number>;
}) {
  const raw = useSyncExternalStore(subscribeStore, getTickerdleSnapshot, () => null);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const view = useMemo(() => {
    if (raw === null) return null;
    const key = utcDayKey();
    const state = parseTickerdle(raw);
    const day = state.days[key] ?? {
      guesses: [],
      done: false,
      won: false,
      hard: false,
    };
    const answer = getAnswer(cards, key);
    return { key, state, day, answer, num: dayNumber(key) };
  }, [raw, cards]);

  const matches = useMemo(() => {
    if (!view) return [];
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    return cards
      .filter(
        (c) =>
          (c.type === "company" || c.type === "engineer") &&
          !view.day.guesses.includes(c.id) &&
          c.name.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [query, cards, view]);

  if (!view) {
    return (
      <p className="py-24 text-center font-mono text-xs uppercase tracking-[0.3em] text-white/30">
        Shuffling the deck…
      </p>
    );
  }

  const { key, state, day, answer, num } = view;
  const max = day.hard ? HARD_GUESSES : MAX_GUESSES;
  const guessCards = day.guesses.map((id) => cards.find((c) => c.id === id)!);
  const hints = hintsFor(answer);
  const revealed = hints.slice(0, Math.min(day.guesses.length, hints.length));

  const pick = (card: MarketCard) => {
    submitGuess(key, card.id, answer.id);
    setQuery("");
    setHighlight(0);
  };

  return (
    <div className="mx-auto max-w-xl">
      <p className="mb-4 text-center font-mono text-xs text-white/40">
        Tickerdle <span className="text-white">#{num}</span> · guess the AI
        figure in {max} tries
        {state.current > 0 && (
          <span className="ml-2 text-amber-400">🔥 {state.current}</span>
        )}
      </p>

      {!day.done && (
        <>
          <label className="mb-4 flex items-center justify-center gap-2 font-mono text-[11px] text-white/40">
            <input
              type="checkbox"
              checked={day.hard}
              disabled={day.guesses.length > 0}
              onChange={(e) => setHardMode(key, e.target.checked)}
              className="accent-cyan-400"
            />
            Hard mode ({HARD_GUESSES} guesses, * in share)
          </label>

          <div className="relative">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlight((h) => Math.min(h + 1, matches.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlight((h) => Math.max(h - 1, 0));
                } else if (e.key === "Enter" && matches[highlight]) {
                  pick(matches[highlight]);
                }
              }}
              placeholder={`Guess ${day.guesses.length + 1} of ${max} — type a name…`}
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-cyan-400/60"
            />
            {matches.length > 0 && (
              <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-white/15 bg-[#131316] shadow-xl">
                {matches.map((card, i) => (
                  <li key={card.id}>
                    <button
                      onClick={() => pick(card)}
                      onMouseEnter={() => setHighlight(i)}
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm ${
                        i === highlight ? "bg-cyan-400/15 text-white" : "text-white/70"
                      }`}
                    >
                      {card.name}
                      <span className="font-mono text-[10px] uppercase text-white/30">
                        {card.type}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {/* guesses so far */}
      {guessCards.length > 0 && (
        <ul className="mt-5 space-y-1.5">
          {guessCards.map((g) => (
            <li
              key={g.id}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm"
            >
              <span className="text-white/80">{g.name}</span>
              <span>
                {guessEmoji(g, answer)}
                <span className="ml-2 font-mono text-[10px] uppercase text-white/30">
                  {g.type === answer.type ? "right type" : "wrong type"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* hints */}
      {!day.done && revealed.length > 0 && (
        <div className="mt-5 space-y-2">
          {revealed.map((hint) => (
            <div
              key={hint.label}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
            >
              <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-400/70">
                {hint.label}
              </p>
              {hint.text && <p className="mt-1 text-sm text-white/75">{hint.text}</p>}
              {hint.pixelate && answer.image && (
                <div className="mt-2 flex justify-center">
                  <PixelAvatar src={answer.image} level={hint.pixelate} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* result */}
      {day.done && (
        <div className="mt-6 flex flex-col items-center gap-5">
          <p className="text-xl font-bold text-white">
            {day.won
              ? `Got it in ${day.guesses.length}/${max}${day.hard ? "*" : ""}`
              : `It was ${answer.name}`}
          </p>
          <div className="w-full max-w-[300px]">
            <TradingCard card={answer} rank={ranks[answer.id]} size="hero" />
          </div>
          <ShareButton
            label="Copy result"
            text={shareGrid({
              day: num,
              guesses: guessCards,
              answer,
              won: day.won,
              hard: day.hard,
              streak: state.current,
            })}
            url=""
            className="text-sm"
          />
          {/* distribution */}
          <div className="w-full max-w-sm">
            <p className="mb-2 text-center font-mono text-[10px] uppercase tracking-widest text-white/40">
              Guess distribution · best streak {state.best}
            </p>
            {Array.from({ length: MAX_GUESSES }, (_, i) => {
              const n = state.dist[String(i + 1)] ?? 0;
              const total = Math.max(
                1,
                ...Array.from({ length: MAX_GUESSES }, (_, j) => state.dist[String(j + 1)] ?? 0),
              );
              return (
                <div key={i} className="mb-1 flex items-center gap-2">
                  <span className="tnum w-3 font-mono text-xs text-white/50">{i + 1}</span>
                  <div className="h-4 flex-1 overflow-hidden rounded bg-white/5">
                    <div
                      className={`flex h-full items-center justify-end rounded pr-1.5 font-mono text-[10px] text-black ${
                        n > 0 ? "bg-cyan-400" : ""
                      }`}
                      style={{ width: n > 0 ? `${(n / total) * 100}%` : "0%" }}
                    >
                      {n > 0 ? n : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="font-mono text-[11px] text-white/35">
            New Tickerdle at midnight UTC.
          </p>
        </div>
      )}
    </div>
  );
}
