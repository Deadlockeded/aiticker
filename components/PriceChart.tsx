"use client";

import { useState } from "react";
import type { PricePoint } from "@/lib/types";
import { formatTicks } from "@/lib/market";

const W = 600;
const H = 220;
const PAD = { top: 12, right: 8, bottom: 8, left: 8 };

/** 30-day SVG area chart with hover tooltip. No chart libs. */
export default function PriceChart({ history }: { history: PricePoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const prices = history.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const up = prices[prices.length - 1] >= prices[0];
  const color = up ? "#34d399" : "#f87171";

  const x = (i: number) =>
    PAD.left + (i / (history.length - 1)) * (W - PAD.left - PAD.right);
  const y = (p: number) =>
    PAD.top + (1 - (p - min) / span) * (H - PAD.top - PAD.bottom);

  const line = prices
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${x(prices.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    const i = Math.round(frac * (history.length - 1));
    setHover(Math.max(0, Math.min(history.length - 1, i)));
  };

  const point = hover !== null ? history[hover] : null;

  return (
    <div className="relative">
      {point && (
        <div
          className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/15 bg-slate-950/95 px-2.5 py-1.5 text-center font-mono text-xs"
          style={{
            left: `${((x(hover!) - 0) / W) * 100}%`,
          }}
        >
          <span className="block font-semibold text-white">
            {formatTicks(point.price, 2)}
          </span>
          <span className="block text-[10px] text-white/50">
            {new Date(point.timestamp).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#chart-fill)" />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {point && (
          <>
            <line
              x1={x(hover!)}
              y1={PAD.top}
              x2={x(hover!)}
              y2={H}
              stroke="rgba(255,255,255,0.25)"
              strokeDasharray="3 3"
            />
            <circle
              cx={x(hover!)}
              cy={y(point.price)}
              r="4"
              fill={color}
              stroke="#0b0d16"
              strokeWidth="2"
            />
          </>
        )}
      </svg>
    </div>
  );
}
