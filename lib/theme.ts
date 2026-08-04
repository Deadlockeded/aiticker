import { KEYS, readRaw, writeRaw } from "./storage";

/**
 * Colour mode. Both modes are first-class, but a first visit lands in LIGHT
 * — the user turns dark on when they want it, and the choice is remembered.
 *
 * The applied mode lives on <html data-theme>, stamped by the inline boot
 * script in the layout before first paint — do not move that to an effect or
 * the page flashes the wrong mode.
 */

export type ThemeChoice = "light" | "dark" | "system";
export type Mode = "light" | "dark";

export const THEME_EVENT = "ai-index:theme";

/** The boot script, inlined in <head>. Kept as a string so it can run pre-paint. */
export const THEME_BOOT_SCRIPT = `(function(){try{
var c=localStorage.getItem('${KEYS.theme}');
var m=c==='light'||c==='dark'?c:'light';
document.documentElement.setAttribute('data-theme',m);
}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export function getChoice(): ThemeChoice {
  const raw = readRaw(KEYS.theme);
  return raw === "light" || raw === "dark" ? raw : "system";
}

/** The mode actually in force right now. First visits land in LIGHT. */
export function resolveMode(choice: ThemeChoice = getChoice()): Mode {
  if (choice !== "system") return choice;
  return "light";
}

export function applyMode(mode: Mode) {
  document.documentElement.setAttribute("data-theme", mode);
}

export function setChoice(choice: ThemeChoice) {
  if (choice === "system") writeRaw(KEYS.theme, "system");
  else writeRaw(KEYS.theme, choice);
  applyMode(resolveMode(choice));
  window.dispatchEvent(new Event(THEME_EVENT));
}

/** Flip between light and dark, pinning the result as a manual choice. */
export function toggleMode(): Mode {
  const next: Mode = resolveMode() === "dark" ? "light" : "dark";
  setChoice(next);
  return next;
}

export function subscribeTheme(cb: () => void): () => void {
  window.addEventListener(THEME_EVENT, cb);
  const mq = window.matchMedia("(prefers-color-scheme: light)");
  mq.addEventListener("change", cb);
  return () => {
    window.removeEventListener(THEME_EVENT, cb);
    mq.removeEventListener("change", cb);
  };
}

export function getModeSnapshot(): Mode {
  return (document.documentElement.getAttribute("data-theme") as Mode) ?? "dark";
}
