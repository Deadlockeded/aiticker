"use client";

import { useEffect } from "react";
import { runMigrations } from "@/lib/storage";

/** Runs the one-time storage migration at boot. Mounted once in the layout. */
export default function StorageBoot() {
  useEffect(() => {
    runMigrations();
  }, []);
  return null;
}
