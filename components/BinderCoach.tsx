"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import EditorCaption from "./EditorCaption";
import { readOnboarding, stampOnboarding } from "@/lib/onboarding";

const subscribeNever = () => () => {};

type CoachPhase = "caption" | "nudge" | "none";

// Capture-once: one beat per binder visit — caption 3 right after the first
// rip, the arena nudge on the following visit. Stamped at capture so neither
// ever repeats.
let phase: CoachPhase | null = null;
function coachSnapshot(): CoachPhase {
  if (phase !== null) return phase;
  const s = readOnboarding();
  if (s.pack && !s.binder) {
    stampOnboarding("binder");
    phase = "caption";
  } else if (s.pack && s.binder && !s.nudge) {
    stampOnboarding("nudge");
    phase = "nudge";
  } else {
    phase = "none";
  }
  return phase;
}

/** Binder-landing beats of the first-run tutorial. */
export default function BinderCoach() {
  const show = useSyncExternalStore(subscribeNever, coachSnapshot, () => "none" as CoachPhase);

  if (show === "caption") {
    return (
      <div className="mb-4">
        <EditorCaption ttl={8000}>
          A fresh pack every 8 hours. Complete the index. That&apos;s the whole hobby.
        </EditorCaption>
        <p className="mt-1.5 text-center">
          <Link
            href="/howto"
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#B23A2E] underline hover:text-[#8E2E24]"
          >
            How it works →
          </Link>
        </p>
      </div>
    );
  }

  if (show === "nudge") {
    return (
      <Link href="/arena" className="coupon mb-4 block p-3 text-center paper-in">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-[#B23A2E]">
          ✂ Your cards can fight → visit the arena
        </span>
      </Link>
    );
  }

  return null;
}
