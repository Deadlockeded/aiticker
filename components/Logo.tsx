/**
 * THE FAN — the aiticker mark. A rounded-square pink tile with three cards
 * fanning from one bottom pivot: two outlined, the front one solid, and at
 * ≥48px the front card carries a knocked-out grade tick.
 *
 * EXACT spec geometry on a 0 0 40 40 viewBox. Stroke widths scale INVERSELY
 * with render size so the mark survives a 16px favicon. Do not restyle it.
 */

const CARD = { x: 13.5, y: 8, w: 14, h: 21 };
const PIVOT = "20 29";

/** Stroke + corner radius by render size; the tick is dropped below 48px. */
function iconSpec(size: number) {
  if (size >= 48) return { stroke: 3, rx: 4, tick: true };
  if (size >= 28) return { stroke: 3.6, rx: 4, tick: false };
  return { stroke: 4.5, rx: 5, tick: false };
}

export function FanGlyph({
  size,
  /** Monochrome: shapes in ink on transparent, no tile. */
  mono = false,
  /** Error pages: the front card has fallen flat out of the fan. */
  fallen = false,
}: {
  size: number;
  mono?: boolean;
  fallen?: boolean;
}) {
  const s = iconSpec(size);
  const stroke = mono ? "var(--ink)" : "#FFFFFF";
  const frontFill = mono ? "var(--ink)" : "#FFFFFF";
  const tickColor = mono ? "var(--bg)" : "var(--pink)";

  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className="shrink-0"
      role="img"
      aria-label="aiticker"
    >
      {!mono && (
        <rect x="0" y="0" width="40" height="40" rx="9.6" fill="var(--pink)" />
      )}
      {/* back-left and back-centre: outlines only */}
      <rect
        x={CARD.x}
        y={CARD.y}
        width={CARD.w}
        height={CARD.h}
        rx={s.rx}
        fill="none"
        stroke={stroke}
        strokeWidth={s.stroke}
        transform={`rotate(-16 ${PIVOT})`}
      />
      <rect
        x={CARD.x}
        y={CARD.y}
        width={CARD.w}
        height={CARD.h}
        rx={s.rx}
        fill="none"
        stroke={stroke}
        strokeWidth={s.stroke}
      />
      {/* front card: solid, and at large sizes it holds the grade tick */}
      <g
        transform={
          fallen
            ? `rotate(74 ${PIVOT}) translate(0 3)`
            : `rotate(16 ${PIVOT})`
        }
      >
        <rect
          x={CARD.x}
          y={CARD.y}
          width={CARD.w}
          height={CARD.h}
          rx={s.rx}
          fill={frontFill}
        />
        {s.tick && (
          <path
            d="M17.5 21.5 L19.8 23.8 L24 17.5"
            fill="none"
            stroke={tickColor}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </g>
    </svg>
  );
}

function Wordmark({ size }: { size: number }) {
  return (
    <span
      className="font-display leading-none text-ink"
      style={{ fontSize: size, fontWeight: 800, letterSpacing: "-0.03em" }}
    >
      aiticker
    </span>
  );
}

export default function Logo({
  variant = "lockup",
  size = 32,
  mono = false,
  fallen = false,
}: {
  variant?: "lockup" | "icon";
  /** Glyph render size in px (the wordmark scales from it). */
  size?: number;
  mono?: boolean;
  fallen?: boolean;
}) {
  if (variant === "icon") return <FanGlyph size={size} mono={mono} fallen={fallen} />;
  return (
    <span className="inline-flex items-center" style={{ gap: size * 0.28 }}>
      <FanGlyph size={size} mono={mono} fallen={fallen} />
      <Wordmark size={size * 0.68} />
    </span>
  );
}
