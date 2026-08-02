/**
 * Mobile-first sharing. One entry point: give it a PNG blob and short text;
 * it uses the Web Share API with files (native sheet → straight into
 * WhatsApp/X) when the browser supports it, and silently falls back to
 * download + clipboard text everywhere else (many in-app webviews).
 */

export type ShareOutcome = "shared" | "downloaded" | "cancelled";

export function canShareFiles(): boolean {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  try {
    const probe = new File([new Blob(["x"])], "probe.png", { type: "image/png" });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export async function sharePng(
  blob: Blob,
  opts: { filename: string; text: string; url?: string },
): Promise<ShareOutcome> {
  const file = new File([blob], opts.filename, { type: "image/png" });
  if (canShareFiles()) {
    try {
      await navigator.share({
        files: [file],
        text: opts.text,
        ...(opts.url ? { url: opts.url } : {}),
      });
      return "shared";
    } catch (err) {
      // user closed the sheet — not a failure, don't double-deliver
      if ((err as Error).name === "AbortError") return "cancelled";
      // fall through to download on real failures
    }
  }
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = opts.filename;
  link.click();
  URL.revokeObjectURL(link.href);
  try {
    await navigator.clipboard.writeText(
      opts.url ? `${opts.text}\n${opts.url}` : opts.text,
    );
  } catch {
    // clipboard blocked — the download alone still delivers
  }
  return "downloaded";
}

/** Await a canvas as a PNG blob. */
export function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

/**
 * The brand font families (next/font hashed names, read from the CSS vars)
 * for canvas exports, awaited so nothing draws with a fallback face.
 * display = Archivo Black · mono = Oswald · body = Lora.
 */
export async function brandFonts(): Promise<{
  display: string;
  mono: string;
  body: string;
}> {
  const css = getComputedStyle(document.documentElement);
  const pick = (name: string, fallback: string) =>
    css.getPropertyValue(name).trim() || fallback;
  const fonts = {
    display: pick("--font-display", "system-ui"),
    mono: pick("--font-geist-mono", "ui-monospace"),
    body: pick("--font-geist-sans", "system-ui"),
  };
  try {
    await document.fonts.ready;
  } catch {
    // no Font Loading API (old webview) — fallback faces still render
  }
  return fonts;
}
