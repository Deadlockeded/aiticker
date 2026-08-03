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
      className="coupon paper-in fixed bottom-20 right-3 z-30 px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-[#B23A2E] md:bottom-6"
    >
      ✂ {left} pack{left === 1 ? "" : "s"} left — rip another →
    </Link>
  );
}
