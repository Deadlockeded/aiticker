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
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#17301F] bg-[#EAF0E4] font-mono text-xs font-bold text-[#17301F]"
            title={user.email ?? "Signed in"}
          >
            {(user.email ?? "?").slice(0, 1).toUpperCase()}
          </button>
          {saved && (
            <span className="absolute -bottom-1 -right-1 rounded-full bg-[#1F6E3D] px-1 font-mono text-[8px] text-[#F4F7F0]">
              ✓
            </span>
          )}
          {menu && (
            <div className="absolute right-0 top-full z-40 mt-1 w-44 border-2 border-[#17301F] bg-[#F4F7F0] p-2 shadow-[3px_3px_0_#17301F]">
              <p className="truncate font-mono text-[10px] text-[#5A6E5E]">{user.email}</p>
              <button
                onClick={async () => {
                  await getSupabase()?.auth.signOut();
                  setMenu(false); // local state stays — sign-out never deletes
                }}
                className="mt-2 w-full border border-[#17301F]/50 px-2 py-1 font-mono text-[11px] uppercase tracking-widest text-[#17301F] hover:bg-[#17301F]/5"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setSheet(true)}
          className="shrink-0 px-2 font-mono text-[11px] uppercase tracking-widest text-[#5A6E5E] hover:text-[#17301F]"
        >
          Save progress
        </button>
      )}

      {sheet && (
        <div className="fixed inset-0 z-50" onClick={() => setSheet(false)}>
          <div className="absolute inset-0 bg-[#17301F]/60" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-1/2 top-1/2 w-[min(92vw,380px)] -translate-x-1/2 -translate-y-1/2 border-2 border-[#17301F] bg-[#F4F7F0] p-5 shadow-[6px_6px_0_#17301F]"
          >
            <p className="font-display text-xl uppercase text-[#17301F]">Save your binder</p>
            <p className="mt-1 text-sm text-[#5A6E5E]">
              Your collection lives in this browser. Sign in to keep it — and
              open it anywhere.
            </p>
            <button
              onClick={google}
              className="mt-4 w-full border-2 border-[#17301F] bg-[#B23A2E] px-4 py-2.5 font-display text-sm uppercase text-[#F4F7F0] shadow-[3px_3px_0_#17301F] hover:bg-[#8E2E24]"
            >
              Continue with Google
            </button>
            <div className="my-3 border-t border-dotted border-[#9CB09E]" />
            {sent ? (
              <p className="py-2 text-center font-mono text-[12px] text-[#1F6E3D]">
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
                  className="min-w-0 flex-1 border-2 border-[#17301F]/40 bg-[#EAF0E4] px-3 py-2 text-sm text-[#17301F] outline-none focus:border-[#B23A2E]"
                />
                <button
                  onClick={magicLink}
                  className="border-2 border-[#17301F] px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-[#17301F] hover:bg-[#17301F]/5"
                >
                  Email link
                </button>
              </div>
            )}
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.15em] text-[#9CB09E]">
              We store your collection and nothing else.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
