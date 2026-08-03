/**
 * THE RIFFLE — two cards mid-shuffle, a red up-arrow rising from between
 * them — plus the "AIticker" wordmark. EXACT spec geometry; stroke widths
 * scale inversely with render size for small-size legibility. Do not
 * restyle the mark.
 */

const INK = "#17301F";
const BRICK = "#B23A2E";
const PAPER = "#F4F7F0";

/** Size-threshold stroke/geometry sets (legibility at small sizes). */
function iconSpec(size: number) {
  if (size >= 48)
    return { card: 5, arrow: 3, rx: 7, path: "M50 2 L62 20 L54 20 L54 32 L46 32 L46 20 L38 20 Z" };
  if (size >= 28)
    return { card: 6, arrow: 4, rx: 7, path: "M50 2 L62 20 L54 20 L54 32 L46 32 L46 20 L38 20 Z" };
  // tiny: thickest strokes, rounder corners, wider arrow head
  return { card: 8, arrow: 6, rx: 9, path: "M50 -4 L66 20 L55 20 L55 36 L45 36 L45 20 L34 20 Z" };
}

function RiffleIcon({
  size,
  onDark = false,
  animate = false,
  fallen = false,
}: {
  size: number;
  onDark?: boolean;
  animate?: boolean | "loop";
  fallen?: boolean;
}) {
  const s = iconSpec(size);
  const leftFill = onDark ? PAPER : "#FDFEFC";
  const rightFill = onDark ? "#9CB09E" : "#EAF0E4";
  const stroke = onDark ? PAPER : INK;
  const arrowStroke = onDark ? PAPER : INK;
  const anim = animate === "loop" ? "loop" : animate ? "once" : "";

  return (
    <svg
      viewBox="0 0 100 90"
      width={size}
      height={size * 0.9}
      className="overflow-visible"
      aria-hidden
    >
      <g
        className={anim ? `riffle-left-${anim}` : ""}
        style={{ transform: "rotate(-14deg)", transformOrigin: "35px 70px" }}
      >
        <rect x="14" y="16" width="42" height="60" rx={s.rx} fill={leftFill} stroke={stroke} strokeWidth={s.card} />
      </g>
      <g
        className={anim ? `riffle-right-${anim}` : ""}
        style={{ transform: "rotate(14deg)", transformOrigin: "65px 70px" }}
      >
        <rect x="44" y="16" width="42" height="60" rx={s.rx} fill={rightFill} stroke={stroke} strokeWidth={s.card} />
      </g>
      <g
        className={anim ? `riffle-arrow-${anim}` : ""}
        style={fallen ? { transform: "rotate(90deg)", transformOrigin: "50px 20px" } : undefined}
      >
        <path d={s.path} fill={BRICK} stroke={arrowStroke} strokeWidth={s.arrow} strokeLinejoin="round" />
      </g>
    </svg>
  );
}

function Wordmark({ size, onDark = false }: { size: number; onDark?: boolean }) {
  return (
    <span
      className="font-display leading-none"
      style={{ fontSize: size, letterSpacing: "0.005em" }}
    >
      <span style={{ color: onDark ? PAPER : INK }}>AI</span>
      <span className="lowercase" style={{ color: onDark ? "#F0BFB6" : BRICK }}>
        ticker
      </span>
    </span>
  );
}

export default function Logo({
  variant = "lockup",
  size = 40,
  onDark = false,
  animate = false,
  fallen = false,
}: {
  variant?: "lockup" | "icon" | "chip";
  /** Icon render size in px (wordmark scales from it). */
  size?: number;
  onDark?: boolean;
  /** true = riffle once (first paint); "loop" = loading indicator only. */
  animate?: boolean | "loop";
  /** Error pages: the arrow has fallen sideways. */
  fallen?: boolean;
}) {
  if (variant === "icon") {
    return <RiffleIcon size={size} onDark={onDark} animate={animate} fallen={fallen} />;
  }
  if (variant === "chip") {
    return (
      <span className="inline-flex items-center gap-1.5 border-2 border-[#17301F] bg-[#FDFEFC] px-2 py-1 shadow-[3px_3px_0_#17301F]">
        <RiffleIcon size={26} animate={animate} />
        <Wordmark size={17} />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center" style={{ gap: size * 0.35 }}>
      <RiffleIcon size={size} onDark={onDark} animate={animate} fallen={fallen} />
      <Wordmark size={size * 0.52} onDark={onDark} />
    </span>
  );
}
