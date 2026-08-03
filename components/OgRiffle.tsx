/**
 * THE RIFFLE for satori/OG routes — inline SVG (satori renders rect/path)
 * plus the AIticker wordmark. Small corner mark for share images.
 */
export default function OgRiffle({ size = 34 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.3 }}>
      <svg viewBox="-6 -6 112 102" width={size} height={size}>
        <g transform="rotate(-14 35 70)">
          <rect x="14" y="16" width="42" height="60" rx="7" fill="#FDFEFC" stroke="#17301F" strokeWidth="5" />
        </g>
        <g transform="rotate(14 65 70)">
          <rect x="44" y="16" width="42" height="60" rx="7" fill="#EAF0E4" stroke="#17301F" strokeWidth="5" />
        </g>
        <path
          d="M50 2 L62 20 L54 20 L54 32 L46 32 L46 20 L38 20 Z"
          fill="#B23A2E"
          stroke="#17301F"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>
      <div style={{ display: "flex", fontSize: size * 0.55, fontWeight: 800 }}>
        <span style={{ color: "#17301F" }}>AI</span>
        <span style={{ color: "#B23A2E" }}>ticker</span>
      </div>
    </div>
  );
}
