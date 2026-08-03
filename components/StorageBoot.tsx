"use client";

import { useEffect } from "react";
import { claimDailyVisit } from "@/lib/rituals";
import { runMigrations } from "@/lib/storage";

/**
 * Boot chores, mounted once in the layout: the one-time storage migration,
 * then the once-per-UTC-day visit stipend (idempotent — every later page
 * view that day is a no-op). Deferred so the +₮ toast lands after paint.
 */
export default function StorageBoot() {
  useEffect(() => {
    runMigrations();
    const kickoff = setTimeout(() => claimDailyVisit(), 1200);
    return () => clearTimeout(kickoff);
  }, []);
  return null;
}
