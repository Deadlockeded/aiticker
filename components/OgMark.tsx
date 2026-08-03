/**
 * THE RISING FAN for satori/OG routes — inline SVG plus the AIticker
 * wordmark. Small corner mark for share images.
 */
export default function OgMark({ size = 34 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.3 }}>
      <svg viewBox="0 0 100 90" width={size} height={size * 0.9}>
        <rect x="6" y="46" width="26" height="42" rx="5" fill="#F4F3F7" stroke="#0E0E13" strokeWidth="4" />
        <rect x="37" y="30" width="26" height="58" rx="5" fill="#20202B" stroke="#0E0E13" strokeWidth="4" />
        <rect x="68" y="12" width="26" height="76" rx="5" fill="#FF1F8F" stroke="#0E0E13" strokeWidth="4" />
        <path d="M81 20 L88 30 L74 30 Z" fill="#F4F3F7" />
      </svg>
      <div style={{ display: "flex", fontSize: size * 0.55, fontWeight: 800 }}>
        <span style={{ color: "#0E0E13" }}>AI</span>
        <span style={{ color: "#FF1F8F" }}>ticker</span>
      </div>
    </div>
  );
}
