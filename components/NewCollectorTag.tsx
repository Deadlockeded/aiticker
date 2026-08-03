"use client";

import { useSyncExternalStore } from "react";
import { readOnboarding } from "@/lib/onboarding";

const subscribeNever = () => () => {};

/** "NEW COLLECTOR? START HERE" tag on the homepage pack coupon — first-run only. */
export default function NewCollectorTag() {
  const show = useSyncExternalStore(
    subscribeNever,
    () => !readOnboarding().pack,
    () => false,
  );
  if (!show) return null;
  return (
    <span className="mb-2 inline-block rotate-[-2deg] bg-[#17301F] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F4F7F0]">
      New collector? Start here ↓
    </span>
  );
}
