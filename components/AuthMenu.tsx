"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { subscribeStore } from "@/lib/binder";
import { authEnabled, getSupabase, pullAndMerge, pushState } from "@/lib/sync";

export const OPEN_AUTH_EVENT = "ai-index:open-auth";

/**
 * The whole optional-accounts UI: SAVE PROGRESS entry, Ledger-styled
 * sign-in sheet (Google + magic link, no passwords), avatar initial,
 * debounced background sync with a tiny "saved" tick. Renders NOTHING
 * when Supabase env vars are absent — anonymous play is the default and
 * nothing is ever locked behind sign-in.
 */
export default function AuthMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [sheet, setSheet] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [saved, setSaved] = useState(false);
  const [menu, setMenu] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // session + merge-on-sign-in
  useEffect(() => {
    const supa = getSupabase();
    if (!supa) return;
    supa.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) void pullAndMerge(u.id);
    });
    const { data: sub } = supa.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (event === "SIGNED_IN" && u) void pullAndMerge(u.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // debounced (2s) local→cloud sync on any store change
  useEffect(() => {
    if (!user) return;
    const onChange = () => {
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(async () => {
        if (await pushState(user.id)) {
          setSaved(true);
          setTimeout(() => setSaved(false), 1600);
        }
      }, 2000);
    };
    return subscribeStore(onChange);
  }, [user]);

  // let other surfaces (the binder nudge) open the sheet
  useEffect(() => {
    const open = () => setSheet(true);
    window.addEventListener(OPEN_AUTH_EVENT, open);
    return () => window.removeEventListener(OPEN_AUTH_EVENT, open);
  }, []);

  if (!authEnabled) return null;

  const google = () =>
    getSupabase()?.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });

  const magicLink = async () => {
    if (!email.trim()) return;
    await getSupabase()?.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setSent(true);
  };

  return (
    <>
      {user ? (
        <div className="relative">
          <button
            onClick={() => setMenu((m) => !m)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line2 bg-surface2 font-mono text-xs font-bold text-ink"
            title={user.email ?? "Signed in"}
          >
            {(user.email ?? "?").slice(0, 1).toUpperCase()}
          </button>
          {saved && (
            <span className="absolute -bottom-1 -right-1 rounded-full bg-up px-1 font-mono text-[8px] text-on-accent">
              ✓
            </span>
          )}
          {menu && (
            <div className="absolute right-0 top-full z-40 mt-1 w-44 border border-line2 bg-surface p-2 shadow-card">
              <p className="truncate font-mono text-[10px] text-ink2">{user.email}</p>
              <button
                onClick={async () => {
                  await getSupabase()?.auth.signOut();
                  setMenu(false); // local state stays — sign-out never deletes
                }}
                className="mt-2 w-full border border-line px-2 py-1 micro text-[11px] text-ink hover:bg-surface2"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setSheet(true)}
          className="shrink-0 px-2 micro text-[11px] text-ink2 hover:text-ink"
        >
          Save progress
        </button>
      )}

      {sheet && (
        <div className="fixed inset-0 z-50" onClick={() => setSheet(false)}>
          <div className="absolute inset-0 bg-surface2" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-1/2 top-1/2 w-[min(92vw,380px)] -translate-x-1/2 -translate-y-1/2 border border-line2 bg-surface p-5 shadow-card"
          >
            <p className="font-display text-xl uppercase text-ink">Save your binder</p>
            <p className="mt-1 text-sm text-ink2">
              Your collection lives in this browser. Sign in to keep it — and
              open it anywhere.
            </p>
            <button
              onClick={google}
              className="mt-4 w-full border border-line2 bg-pink px-4 py-2.5 font-display text-sm uppercase text-on-accent shadow-card hover:bg-pink"
            >
              Continue with Google
            </button>
            <div className="my-3 border-t border-dotted border-ink3" />
            {sent ? (
              <p className="py-2 text-center font-mono text-[12px] text-up">
                Link sent. Check your email.
              </p>
            ) : (
              <div className="flex gap-2">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && magicLink()}
                  placeholder="you@example.com"
                  type="email"
                  className="min-w-0 flex-1 border border-line bg-surface2 px-3 py-2 text-sm text-ink outline-none focus:border-pink"
                />
                <button
                  onClick={magicLink}
                  className="border border-line2 px-3 py-2 micro text-[11px] text-ink hover:bg-surface2"
                >
                  Email link
                </button>
              </div>
            )}
            <p className="mt-4 micro text-[10px] tracking-[0.15em] text-ink3">
              We store your collection and nothing else.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
