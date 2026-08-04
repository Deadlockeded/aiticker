"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getBinderSnapshot, parseBinder, subscribeStore } from "@/lib/binder";
import { getCustodySnapshot, parseCustody } from "@/lib/custody";
import { isAuthEnabled, getSupabase } from "@/lib/sync";
import { OPEN_AUTH_EVENT } from "./AuthMenu";

/**
 * THE PROMPT MOMENT: the Custody Desk slides up exactly once, on the
 * binder, after the first-ever pack has landed (post ADD TO BINDER, cards
 * pulsed in). Never during the ceremony, never mid-reveal — this
 * component only exists on /binder. Renders nothing itself; it opens the
 * sheet in AuthMenu, which marks the prompt as spent.
 */
export default function CustodyPrompt() {
  const binderRaw = useSyncExternalStore(subscribeStore, getBinderSnapshot, () => null);
  const custodyRaw = useSyncExternalStore(subscribeStore, getCustodySnapshot, () => null);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    if (!isAuthEnabled()) return;
    getSupabase()
      ?.auth.getSession()
      .then(({ data }) => setSignedOut(!data.session))
      .catch(() => setSignedOut(true));
  }, []);

  const hasCards = binderRaw !== null && Object.keys(parseBinder(binderRaw)).length > 0;
  const prompted = parseCustody(custodyRaw).prompted;
  const due = signedOut && hasCards && !prompted && isAuthEnabled();

  useEffect(() => {
    if (!due) return;
    // let the pockets finish pulsing before the desk slides up
    const t = setTimeout(() => window.dispatchEvent(new Event(OPEN_AUTH_EVENT)), 1400);
    return () => clearTimeout(t);
  }, [due]);

  return null;
}
