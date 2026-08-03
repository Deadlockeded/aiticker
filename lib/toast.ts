/**
 * The toast bus. Lives in its own module so both achievements and XP can fire
 * one without importing each other (achievements already depends on xp).
 */
export const TOAST_EVENT = "ai-index:toast";

export function fireToast(emoji: string, title: string, body: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, { detail: { emoji, title, body } }),
  );
}
