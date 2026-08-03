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
 * THE RISING FAN mark for canvas share exports: three ascending cards +
 * the arrow, followed by the "AIticker" wordmark. `h` is icon height;
 * returns the total width drawn. Colors are the fixed brand tokens.
 */
export function drawLogoMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  displayFont: string,
  opts: { onDark?: boolean } = {},
): number {
  const INK = "#0E0E13";
  const PAPER = "#F4F3F7";
  const s = h / 90;
  const stroke = opts.onDark ? PAPER : INK;
  const fills = opts.onDark ? [PAPER, "#8A8899", "#FF1F8F"] : ["#F4F3F7", "#20202B", "#FF1F8F"];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = stroke;
  const bar = (bx: number, by: number, bh: number, fill: string) => {
    ctx.beginPath();
    ctx.roundRect(bx, by, 26, bh, 5);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
  };
  bar(6, 46, 42, fills[0]);
  bar(37, 30, 58, fills[1]);
  bar(68, 12, 76, fills[2]);
  ctx.beginPath();
  ctx.moveTo(81, 20);
  ctx.lineTo(88, 30);
  ctx.lineTo(74, 30);
  ctx.closePath();
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.restore();
  // wordmark
  const fontSize = h * 0.62;
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `400 ${fontSize}px ${displayFont}`;
  const ty = y + h * 0.78;
  let tx = x + h * 1.2;
  ctx.fillStyle = opts.onDark ? PAPER : INK;
  ctx.fillText("AI", tx, ty);
  tx += ctx.measureText("AI").width;
  ctx.fillStyle = opts.onDark ? "#43102B" : "#FF1F8F";
  ctx.fillText("ticker", tx, ty);
  const total = tx + ctx.measureText("ticker").width - x;
  ctx.restore();
  return total;
}

/**
 * The brand font families (next/font hashed names, read from the CSS vars)
 * for canvas exports, awaited so nothing draws with a fallback face.
 * display = Sora · mono = Martian Mono · body = Instrument Sans.
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
    display: pick("--font-sora", "system-ui"),
    mono: pick("--font-martian", "ui-monospace"),
    body: pick("--font-instrument", "system-ui"),
  };
  try {
    await document.fonts.ready;
  } catch {
    // no Font Loading API (old webview) — fallback faces still render
  }
  return fonts;
}
