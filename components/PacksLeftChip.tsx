"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  getAllowanceSnapshot,
  packsLeftFrom,
  subscribeStore,
} from "@/lib/binder";

/** Floating clip-out chip on the binder when free packs remain. */
export default function PacksLeftChip() {
  const raw = useSyncExternalStore(subscribeStore, getAllowanceSnapshot, () => null);
  if (raw === null) return null;
  const left = packsLeftFrom(raw);
  if (left === 0) return null;

  return (
    <Link
      href="/packs"
      className="rounded-[22px] border border-dashed border-line2 bg-surface deal-in fixed bottom-20 right-3 z-30 px-4 py-2.5 micro text-[11px] font-semibold text-pink md:bottom-6"
    >
      ✂ {left} pack{left === 1 ? "" : "s"} left — rip another →
    </Link>
  );
}
