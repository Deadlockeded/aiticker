"use client";

import { useEffect } from "react";
import { trackGig, type GigAction } from "@/lib/gigs";

/** Counts a page visit for the gig board — once per mount, post-hydration. */
export default function GigPing({ action }: { action: GigAction }) {
  useEffect(() => {
    const t = setTimeout(() => trackGig(action), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
