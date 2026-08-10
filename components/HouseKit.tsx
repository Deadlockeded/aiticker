"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { getBinderSnapshot, parseBinder, subscribeStore } from "@/lib/binder";
import { getAllCards } from "@/lib/cards";
import { getCustodySnapshot, parseCustody } from "@/lib/custody";
import {
  claimCut,
  cutShareText,
  defectCooldownLeft,
  getPledgeSnapshot,
  HOUSES,
  houseById,
  markHousePrompted,
  parsePledge,
  pendingCut,
  pledgeHouse,
  type House,
} from "@/lib/houses";
import { formatTicks } from "@/lib/market";
import ShareButton from "./ShareButton";

const NAMES = new Map(getAllCards().map((c) => [c.id, c.name]));

/** DS tint classes per house tint token. */
export function houseChipClass(tint: House["tint"]): string {
  return tint === "teal"
    ? "bg-teal-tint text-teal"
    : tint === "violet"
      ? "bg-violet-tint text-violet"
      : tint === "amber"
        ? "bg-amber-tint text-amber"
        : tint === "pink"
          ? "bg-pink-tint text-pink"
          : "bg-surface2 text-ink";
}

/** The small allegiance chip — profile, arena corners, binder line. */
export function HouseBadge({ className = "" }: { className?: string }) {
  const raw = useSyncExternalStore(subscribeStore, getPledgeSnapshot, () => null);
  const house = houseById(parsePledge(raw).houseId);
  if (!house) return null;
  return (
    <span
      className={`micro inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${houseChipClass(house.tint)} ${className}`}
    >
      ⌂ {house.name}
    </span>
  );
}

/**
 * PICK YOUR HOUSE — the one-time pledge sheet. Fires on the binder only,
 * after the first pack AND after the custody desk has had its moment (two
 * sheets in one visit is an ambush). Skippable; pledging later lives in
 * the binder's House line. Defection carries a 2-week cooldown.
 */
export function PledgeSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const raw = useSyncExternalStore(subscribeStore, getPledgeSnapshot, () => null);
  const [confirmDefect, setConfirmDefect] = useState<House | null>(null);
  if (!open || raw === null) return null;
  const pledge = parsePledge(raw);
  const current = houseById(pledge.houseId);
  const cooldown = defectCooldownLeft(pledge);

  const pick = (h: House) => {
    if (current && current.id !== h.id) {
      setConfirmDefect(h);
      return;
    }
    pledgeHouse(h.id);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[60]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-2xl border-t border-line bg-bg p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto max-w-md">
          {confirmDefect ? (
            <div className="text-center">
              <p className="font-display text-[20px] font-extrabold text-ink">
                Defecting to {confirmDefect.name}.
              </p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink2">
                Your old House will remember this. They won&apos;t do anything.
                But they&apos;ll remember.
              </p>
              {cooldown > 0 ? (
                <p className="mt-3 text-[13px] text-pink">
                  The ink on your last pledge is still wet — {cooldown} day
                  {cooldown === 1 ? "" : "s"} before you can move.
                </p>
              ) : (
                <button
                  data-testid="confirm-defect"
                  onClick={() => {
                    pledgeHouse(confirmDefect.id);
                    setConfirmDefect(null);
                    onClose();
                  }}
                  className="mt-4 w-full rounded-full bg-pink px-6 py-3 text-[16px] font-semibold text-on-accent transition-transform active:scale-[.97]"
                >
                  Defect
                </button>
              )}
              <button
                onClick={() => setConfirmDefect(null)}
                className="mt-2 w-full px-4 py-2 micro text-[11px] text-ink3 hover:text-ink"
              >
                Stay loyal
              </button>
            </div>
          ) : (
            <>
              <p className="font-display text-[22px] font-extrabold text-ink">
                Pick your House.
              </p>
              <p className="mt-1 text-[13px] text-ink2">
                Each week the Houses are scored on their cards&apos; real
                market week. Members collect the dividend. Pledging is free.
              </p>
              <div className="mt-4 space-y-2">
                {HOUSES.map((h) => (
                  <button
                    key={h.id}
                    data-testid={`pledge-${h.id}`}
                    onClick={() => pick(h)}
                    className={`w-full rounded-[16px] bg-surface p-3 text-left shadow-card transition-transform active:scale-[.99] ${
                      current?.id === h.id ? "ring-2 ring-pink" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`micro rounded-full px-2 py-0.5 font-semibold ${houseChipClass(h.tint)}`}>
                        ⌂ {h.name}
                      </span>
                      {current?.id === h.id && (
                        <span className="micro text-[9px] text-pink">Your House</span>
                      )}
                    </div>
                    <p className="mt-1.5 text-[13px] italic text-ink2">“{h.motto}”</p>
                    <p className="micro mt-1 truncate text-[10px] text-ink3">
                      {h.cards.map((id) => NAMES.get(id) ?? id).join(" · ")}
                    </p>
                  </button>
                ))}
              </div>
              <button
                data-testid="pledge-skip"
                onClick={onClose}
                className="mt-3 w-full px-4 py-2 micro text-[11px] text-ink3 hover:text-ink"
              >
                Unaffiliated, for now
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** The binder's allegiance line: House + member-cards-owned, or the way in. */
export function BinderHouseLine() {
  const binderRaw = useSyncExternalStore(subscribeStore, getBinderSnapshot, () => null);
  const pledgeRaw = useSyncExternalStore(subscribeStore, getPledgeSnapshot, () => null);
  const [open, setOpen] = useState(false);
  if (binderRaw === null || pledgeRaw === null) return null;
  const house = houseById(parsePledge(pledgeRaw).houseId);
  const binder = parseBinder(binderRaw);
  const held = house ? house.cards.filter((id) => binder[id]).length : 0;

  return (
    <>
      <button
        data-testid="binder-house-line"
        onClick={() => setOpen(true)}
        className="mb-3 flex w-full items-center gap-2 rounded-[22px] bg-surface px-3.5 py-2 shadow-card transition-transform active:scale-[.99]"
      >
        {house ? (
          <>
            <span className={`micro shrink-0 rounded-full px-2 py-0.5 font-semibold ${houseChipClass(house.tint)}`}>
              ⌂ {house.name}
            </span>
            <span className="micro min-w-0 truncate text-[10px] text-ink3">
              You hold {held} of the Family&apos;s {house.cards.length} cards
            </span>
          </>
        ) : (
          <span className="micro text-[10px] font-semibold text-ink2">
            No House. Pick one →
          </span>
        )}
        <span className="ml-auto shrink-0 text-[13px] text-ink3">→</span>
      </button>
      <PledgeSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** Fires the one-time pledge prompt on the binder (after custody's turn). */
export function PledgePrompt() {
  const binderRaw = useSyncExternalStore(subscribeStore, getBinderSnapshot, () => null);
  const pledgeRaw = useSyncExternalStore(subscribeStore, getPledgeSnapshot, () => null);
  const custodyRaw = useSyncExternalStore(subscribeStore, getCustodySnapshot, () => null);
  const [open, setOpen] = useState(false);

  const hasCards = binderRaw !== null && Object.keys(parseBinder(binderRaw)).length > 0;
  const pledge = parsePledge(pledgeRaw);
  const custodyDone = parseCustody(custodyRaw).prompted;
  const due = hasCards && !pledge.prompted && custodyDone && !open;

  useEffect(() => {
    if (!due) return;
    const t = setTimeout(() => {
      markHousePrompted();
      setOpen(true);
    }, 1600);
    return () => clearTimeout(t);
  }, [due]);

  return <PledgeSheet open={open} onClose={() => setOpen(false)} />;
}

/**
 * TURF WAR results card — home, only while a finalized week is unclaimed.
 * The score is the House's real market week; the cut is the dividend.
 */
export function TurfWarCard() {
  const raw = useSyncExternalStore(subscribeStore, getPledgeSnapshot, () => null);
  const [paidCut, setPaidCut] = useState<ReturnType<typeof pendingCut>>(null);
  if (raw === null) return null;
  const cut = paidCut ?? pendingCut(parsePledge(raw));
  if (!cut) return null;
  const collected = paidCut !== null;
  const weekNo = cut.week.split("-W")[1];

  return (
    <div className="mb-5 rounded-[22px] bg-surface p-4 shadow-card">
      <div className="flex items-baseline justify-between gap-2">
        <p className="micro font-semibold text-amber">Turf war · week {weekNo}</p>
        <span className={`micro rounded-full px-2 py-0.5 font-semibold ${houseChipClass(cut.house.tint)}`}>
          ⌂ {cut.house.name.replace("House ", "")}
        </span>
      </div>
      <p className="mt-1.5 text-[15px] leading-snug text-ink">
        {cut.winner.name} took the week ({cut.winnerScore >= 0 ? "+" : ""}
        {cut.winnerScore.toFixed(1)}%). Your cut: {formatTicks(cut.total)}.
      </p>
      {cut.loyalty > 0 && (
        <p className="micro mt-1 text-ink3">
          includes ₮{cut.loyalty} loyalty stipend — you showed up all week
        </p>
      )}
      {collected ? (
        <div className="mt-3 flex justify-center">
          <ShareButton label="Share the week" text={cutShareText(cut)} url="" className="text-xs" />
        </div>
      ) : (
        <button
          data-testid="claim-cut"
          onClick={() => {
            const snapshot = cut;
            if (claimCut() > 0) setPaidCut(snapshot);
          }}
          className="mt-3 w-full rounded-full bg-pink px-6 py-3 text-[16px] font-semibold text-on-accent transition-transform active:scale-[.97]"
        >
          Collect {formatTicks(cut.total)}
        </button>
      )}
    </div>
  );
}
