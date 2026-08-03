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
 * THE RIFFLE mark for canvas share exports: two cards mid-shuffle + the
 * rising arrow, followed by the "AIticker" wordmark. `h` is icon height;
 * returns the total width drawn (for right-aligned placement, measure via
 * measureLogoMark first). Colors are the fixed brand tokens.
 */
export function drawLogoMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  displayFont: string,
  opts: { onDark?: boolean } = {},
): number {
  const INK = "#17301F";
  const PAPER = "#F4F7F0";
  const s = h / 90;
  const stroke = opts.onDark ? PAPER : INK;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineJoin = "round";
  // left card
  ctx.save();
  ctx.translate(35, 70);
  ctx.rotate((-14 * Math.PI) / 180);
  ctx.translate(-35, -70);
  ctx.beginPath();
  ctx.roundRect(14, 16, 42, 60, 7);
  ctx.fillStyle = opts.onDark ? PAPER : "#FDFEFC";
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();
  // right card
  ctx.save();
  ctx.translate(65, 70);
  ctx.rotate((14 * Math.PI) / 180);
  ctx.translate(-65, -70);
  ctx.beginPath();
  ctx.roundRect(44, 16, 42, 60, 7);
  ctx.fillStyle = opts.onDark ? "#9CB09E" : "#EAF0E4";
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();
  // arrow
  const p = new Path2D("M50 2 L62 20 L54 20 L54 32 L46 32 L46 20 L38 20 Z");
  ctx.fillStyle = "#B23A2E";
  ctx.fill(p);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 3;
  ctx.stroke(p);
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
  ctx.fillStyle = opts.onDark ? "#F0BFB6" : "#B23A2E";
  ctx.fillText("ticker", tx, ty);
  const total = tx + ctx.measureText("ticker").width - x;
  ctx.restore();
  return total;
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
