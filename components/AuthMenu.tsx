"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { User } from "@supabase/supabase-js";
import { subscribeStore } from "@/lib/binder";
import {
  getSyncedAtSnapshot,
  markPrompted,
  relativeTime,
  saveHandle,
  stampSynced,
} from "@/lib/custody";
import { isAuthEnabled, getSupabase, pullAndMerge, pushState } from "@/lib/sync";
import { fireToast } from "@/lib/toast";

export const OPEN_AUTH_EVENT = "ai-index:open-auth";

/**
 * THE CUSTODY DESK — the whole save system UI. Two ways in, no passwords:
 * - GitHub OAuth (primary): also captures the username to prefill every
 *   handle input in the app (a perk, always editable).
 * - Email OTP (secondary): a 6-digit code, NOT a magic link — codes
 *   survive in-app webviews (WhatsApp/Instagram) where a link would open
 *   in another browser and strand the session in the wrong storage.
 * Vocabulary is save/keep/custody — never account/register/sign up.
 * Renders NOTHING when auth is disabled; anonymous play is the default.
 */
export default function AuthMenu() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [sheet, setSheet] = useState(false);
  const [mode, setMode] = useState<"desk" | "email" | "otp">("desk");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [menu, setMenu] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const [saved, setSaved] = useState(false);
  const boxRefs = useRef<(HTMLInputElement | null)[]>([]);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncedRaw = useSyncExternalStore(subscribeStore, getSyncedAtSnapshot, () => null);

  // client-only render: the test seam can enable auth after hydration
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  // session + merge-on-sign-in (+ GitHub username capture)
  useEffect(() => {
    if (!mounted) return;
    const supa = getSupabase();
    if (!supa) return;
    const arrive = async (u: User, announce: boolean) => {
      const gh =
        (u.user_metadata?.user_name as string | undefined) ??
        (u.user_metadata?.preferred_username as string | undefined);
      if (gh) saveHandle(gh);
      const n = await pullAndMerge(u.id);
      if (n !== null) {
        stampSynced();
        if (announce) fireToast("🗃", `✓ ${n} card${n === 1 ? "" : "s"} now under management.`, "");
      }
    };
    supa.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) void arrive(u, false);
    });
    const { data: sub } = supa.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (event === "SIGNED_IN" && u) {
        setSheet(false);
        void arrive(u, true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [mounted]);

  // debounced (2s) local→cloud sync on any store change
  useEffect(() => {
    if (!user) return;
    const onChange = () => {
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(async () => {
        if (await pushState(user.id)) {
          stampSynced();
          setSaved(true);
          setTimeout(() => setSaved(false), 1600);
        }
      }, 2000);
    };
    return subscribeStore(onChange);
  }, [user]);

  // other surfaces (the custody prompt, the nudges) open the desk
  useEffect(() => {
    const open = () => {
      setMode("desk");
      setSheet(true);
      markPrompted();
    };
    window.addEventListener(OPEN_AUTH_EVENT, open);
    return () => window.removeEventListener(OPEN_AUTH_EVENT, open);
  }, []);

  // resend cooldown tick
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  if (!mounted || !isAuthEnabled()) return null;

  const github = () =>
    getSupabase()?.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: window.location.origin },
    });

  const sendCode = async () => {
    const to = email.trim();
    if (!to || sending) return;
    setSending(true);
    setOtpError(null);
    try {
      // 6-digit code, no redirect URL: this is an OTP, never a magic link
      await getSupabase()?.auth.signInWithOtp({
        email: to,
        options: { shouldCreateUser: true },
      });
      setCode(Array(6).fill(""));
      setMode("otp");
      setResendIn(30);
      setTimeout(() => boxRefs.current[0]?.focus(), 50);
    } finally {
      setSending(false);
    }
  };

  const verify = async (digits: string) => {
    if (verifying) return;
    setVerifying(true);
    setOtpError(null);
    const { error } =
      (await getSupabase()?.auth.verifyOtp({
        email: email.trim(),
        token: digits,
        type: "email",
      })) ?? {};
    setVerifying(false);
    if (error) {
      setOtpError("That code didn't clear. Check the digits and try again.");
      setCode(Array(6).fill(""));
      boxRefs.current[0]?.focus();
    }
    // success closes via onAuthStateChange
  };

  const setDigit = (i: number, v: string) => {
    const digits = v.replace(/\D/g, "");
    if (!digits) {
      setCode((c) => c.map((d, j) => (j === i ? "" : d)));
      return;
    }
    // paste support: distribute a full code from any box
    setCode((c) => {
      const next = [...c];
      for (let k = 0; k < digits.length && i + k < 6; k++) next[i + k] = digits[k];
      const filled = next.every((d) => d !== "");
      const target = Math.min(i + digits.length, 5);
      setTimeout(() => boxRefs.current[filled ? 5 : target]?.focus(), 0);
      if (filled) setTimeout(() => void verify(next.join("")), 0);
      return next;
    });
  };

  const signOut = async () => {
    await getSupabase()?.auth.signOut();
    setConfirmOut(false);
    setMenu(false); // local state stays — sign-out never deletes anything
  };

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const syncedAt = syncedRaw ? parseInt(syncedRaw, 10) || 0 : 0;

  return (
    <>
      {user ? (
        <div className="relative">
          <button
            onClick={() => setMenu((m) => !m)}
            className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full ring-2 ring-pink"
            title={user.email ?? "In custody"}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-surface2 font-mono text-xs font-bold text-ink">
                {(user.email ?? "?").slice(0, 1).toUpperCase()}
              </span>
            )}
          </button>
          {saved && (
            <span className="absolute -bottom-1 -right-1 rounded-full bg-up px-1 font-mono text-[8px] text-on-accent">
              ✓
            </span>
          )}
          {menu && (
            <div className="absolute right-0 top-full z-40 mt-1 w-56 rounded-xl border border-line2 bg-surface p-2.5 shadow-card">
              <p className="truncate font-mono text-[10px] text-ink2">
                {(user.user_metadata?.user_name as string | undefined)
                  ? `@${user.user_metadata.user_name}`
                  : user.email}
              </p>
              <p className="mt-1.5 micro text-[9px] tracking-[0.15em] text-ink3">
                Assets under management
                {syncedAt > 0 && ` · synced ${relativeTime(syncedAt)}`}
              </p>
              <button
                onClick={() => setConfirmOut(true)}
                className="mt-2.5 w-full rounded-lg border border-line px-2 py-1.5 micro text-[11px] text-ink hover:bg-surface2"
              >
                Withdraw to self-custody
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => {
            setMode("desk");
            setSheet(true);
            markPrompted();
          }}
          className="shrink-0 px-2 micro text-[11px] text-ink2 hover:text-ink"
        >
          Save progress
        </button>
      )}

      {/* THE CUSTODY DESK — bottom sheet, two ways in, one polite way out.
          PORTALED: the sticky nav's backdrop-blur makes it a containing
          block, which would trap a fixed sheet inside the header. */}
      {sheet && !user && createPortal(
        <div className="fixed inset-0 z-50" onClick={() => setSheet(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-line bg-bg p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
          >
            <div className="mx-auto max-w-md">
              {mode === "desk" && (
                <>
                  <p className="font-display text-[22px] font-extrabold text-ink">
                    Don&apos;t lose the bag.
                  </p>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-ink2">
                    Your cards, Ticks, and packs live in this browser. Browsers
                    are where data goes to die. Move your collection into
                    custody — free, no passwords, mildly institutional.
                  </p>
                  <button
                    data-testid="custody-github"
                    onClick={github}
                    className="mt-4 w-full rounded-full bg-pink px-6 py-3 text-[16px] font-semibold text-on-accent transition-transform active:scale-[.97]"
                  >
                    Continue with GitHub
                  </button>
                  <p className="mt-1 text-center micro text-[10px] text-ink3">
                    We&apos;ve seen the commits. We&apos;re still here.
                  </p>
                  <button
                    data-testid="custody-email"
                    onClick={() => setMode("email")}
                    className="mt-3 w-full rounded-full bg-surface2 px-6 py-3 text-[16px] font-semibold text-ink transition-transform active:scale-[.97]"
                  >
                    Use email instead
                  </button>
                  <button
                    data-testid="custody-dismiss"
                    onClick={() => setSheet(false)}
                    className="mt-3 w-full px-4 py-2 micro text-[11px] text-ink3 hover:text-ink"
                  >
                    I&apos;ll self-custody
                  </button>
                </>
              )}

              {mode === "email" && (
                <>
                  <p className="font-display text-[22px] font-extrabold text-ink">
                    Where do we send the code?
                  </p>
                  <input
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendCode()}
                    placeholder="you@example.com"
                    type="email"
                    className="mt-3 w-full rounded-full bg-surface2 px-4 py-3 text-[16px] text-ink outline-none ring-inset placeholder:text-ink3 focus:ring-2 focus:ring-pink"
                  />
                  <button
                    data-testid="custody-send-code"
                    onClick={sendCode}
                    disabled={sending || !email.trim()}
                    className="mt-3 w-full rounded-full bg-pink px-6 py-3 text-[16px] font-semibold text-on-accent transition-transform active:scale-[.97] disabled:pointer-events-none disabled:opacity-40"
                  >
                    {sending ? "Sending…" : "Send the code"}
                  </button>
                  <button
                    onClick={() => setMode("desk")}
                    className="mt-3 w-full px-4 py-2 micro text-[11px] text-ink3 hover:text-ink"
                  >
                    ← Back
                  </button>
                </>
              )}

              {mode === "otp" && (
                <>
                  <p className="font-display text-[22px] font-extrabold text-ink">
                    Enter the wire confirmation code.
                  </p>
                  <p className="mt-1 text-[13px] text-ink2">
                    Six digits. Sent to {email.trim()}. Not a real wire.
                  </p>
                  <div className="mt-4 flex justify-between gap-2">
                    {code.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          boxRefs.current[i] = el;
                        }}
                        value={d}
                        onChange={(e) => setDigit(i, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !code[i] && i > 0)
                            boxRefs.current[i - 1]?.focus();
                        }}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        aria-label={`Digit ${i + 1}`}
                        className="tnum h-12 w-full min-w-0 rounded-xl bg-surface2 py-3 text-center font-mono text-[20px] text-ink outline-none ring-inset focus:ring-2 focus:ring-pink"
                      />
                    ))}
                  </div>
                  {verifying && (
                    <p className="mt-2 text-center micro text-[10px] text-ink3">
                      Clearing the wire…
                    </p>
                  )}
                  {otpError && (
                    <p className="mt-2 text-center text-[13px] text-pink">{otpError}</p>
                  )}
                  <button
                    onClick={() => resendIn <= 0 && sendCode()}
                    disabled={resendIn > 0}
                    className="mt-3 w-full px-4 py-2 micro text-[11px] text-ink2 hover:text-ink disabled:text-ink3"
                  >
                    {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                  </button>
                </>
              )}

              <p className="mt-3 text-center micro text-[10px] tracking-[0.15em] text-ink3">
                We store your collection and nothing else.
              </p>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* withdraw confirm — leaving custody is fine, and nothing is lost.
          Portaled for the same containing-block reason as the desk. */}
      {confirmOut && createPortal(
        <div className="fixed inset-0 z-50" onClick={() => setConfirmOut(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-line bg-bg p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
          >
            <div className="mx-auto max-w-md text-center">
              <p className="font-display text-[20px] font-extrabold text-ink">
                Withdraw to self-custody?
              </p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink2">
                Your collection stays saved with us AND keeps living in this
                browser. Self-custody is a lifestyle, not an exit.
              </p>
              <button
                data-testid="confirm-withdraw"
                onClick={signOut}
                className="mt-4 w-full rounded-full bg-surface2 px-6 py-3 text-[16px] font-semibold text-ink transition-transform active:scale-[.97]"
              >
                Withdraw
              </button>
              <button
                onClick={() => setConfirmOut(false)}
                className="mt-2 w-full px-4 py-2 micro text-[11px] text-ink3 hover:text-ink"
              >
                Stay in custody
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
