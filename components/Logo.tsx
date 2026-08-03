/**
 * THE RISING FAN — three cards standing at ascending heights like a bar
 * chart, the tallest in brick carrying the up-arrow. Plus the "AIticker"
 * wordmark. EXACT spec geometry; stroke widths scale inversely with
 * render size. Do not restyle the mark.
 */

const INK = "#17301F";
const BRICK = "#B23A2E";
const PAPER = "#F4F7F0";

/** Size-threshold stroke/geometry sets (16px favicon survival). */
function iconSpec(size: number) {
  if (size >= 48) return { stroke: 2.5, rx: 5, arrow: "M81 20 L88 30 L74 30 Z" };
  if (size >= 28) return { stroke: 4, rx: 5, arrow: "M81 20 L88 30 L74 30 Z" };
  return { stroke: 6, rx: 7, arrow: "M81 17 L90 31 L72 31 Z" };
}

function FanIcon({
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
  const stroke = onDark ? PAPER : INK;
  const fills = onDark ? [PAPER, "#9CB09E", BRICK] : ["#FDFEFC", "#EAF0E4", BRICK];
  const anim = animate === "loop" ? "loop" : animate ? "once" : "";
  // fallen (error pages): the chart went down — card 3 shorter than card 1
  const card3 = fallen ? { y: 60, h: 28 } : { y: 12, h: 76 };
  const arrowPath = fallen ? "M81 66 L88 74 L74 74 Z" : s.arrow;

  return (
    <svg
      viewBox="0 0 100 90"
      width={size}
      height={size * 0.9}
      className="overflow-visible"
      aria-hidden
    >
      {/* all cards bottom-aligned at y=88; grow-in uses scaleY from there */}
      <g className={anim ? `fan-card-${anim}` : ""} style={{ transformOrigin: "19px 88px" }}>
        <rect x="6" y="46" width="26" height="42" rx={s.rx} fill={fills[0]} stroke={stroke} strokeWidth={s.stroke} />
      </g>
      <g
        className={anim ? `fan-card-${anim}` : ""}
        style={{ transformOrigin: "50px 88px", animationDelay: anim ? "0.2s" : undefined }}
      >
        <rect x="37" y="30" width="26" height="58" rx={s.rx} fill={fills[1]} stroke={stroke} strokeWidth={s.stroke} />
      </g>
      <g
        className={anim ? `fan-card-${anim}` : ""}
        style={{ transformOrigin: "81px 88px", animationDelay: anim ? "0.4s" : undefined }}
      >
        <rect x="68" y={card3.y} width="26" height={card3.h} rx={s.rx} fill={fills[2]} stroke={stroke} strokeWidth={s.stroke} />
      </g>
      <g className={anim ? `fan-arrow-${anim}` : ""} style={{ transformOrigin: "81px 25px" }}>
        <path d={arrowPath} fill={onDark ? PAPER : PAPER} />
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
  /** true = grow-in once (first paint); "loop" = pack-rip loading only. */
  animate?: boolean | "loop";
  /** Error pages: the chart went down. */
  fallen?: boolean;
}) {
  if (variant === "icon") {
    return <FanIcon size={size} onDark={onDark} animate={animate} fallen={fallen} />;
  }
  if (variant === "chip") {
    return (
      <span className="inline-flex items-center gap-1.5 border-2 border-[#17301F] bg-[#FDFEFC] px-2 py-1 shadow-[3px_3px_0_#17301F]">
        <FanIcon size={24} animate={animate} />
        <Wordmark size={17} />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center" style={{ gap: size * 0.35 }}>
      <FanIcon size={size} onDark={onDark} animate={animate} fallen={fallen} />
      <Wordmark size={size * 0.52} onDark={onDark} />
    </span>
  );
}
