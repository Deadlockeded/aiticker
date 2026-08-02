import type { PricePoint } from "@/lib/types";

/** Tiny inline-SVG price sparkline, colored by trend. */
export default function Sparkline({
  history,
  days = 7,
  width = 96,
  height = 28,
}: {
  history: PricePoint[];
  days?: number;
  width?: number;
  height?: number;
}) {
  const points = history.slice(-days - 1).map((p) => p.price);
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const pad = 2;

  const coords = points
    .map((p, i) => {
      const x = pad + (i / (points.length - 1)) * (width - pad * 2);
      const y = pad + (1 - (p - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const up = points[points.length - 1] >= points[0];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
      aria-hidden
    >
      <polyline
        points={coords}
        fill="none"
        stroke={up ? "#1F7A3D" : "#C23B2E"}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
