import { ImageResponse } from "next/og";
import OgMark from "@/components/OgMark";

export const runtime = "edge";

/**
 * Receipt-style OG for /roast and burn links. Real roast lines need a
 * live GitHub fetch, so the unfurl shows the curated sample receipt
 * (fictional @sample_dev) or, for burn links, the handle + a tease —
 * the page itself renders the real thing.
 */
const SAMPLE_LINES = [
  "14 repos named some variant of “test”. Bold archival strategy.",
  "One repo carries the entire account. It knows. It's tired.",
  "Bio says “building”. Building what? When? The people deserve answers.",
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const handle = (url.searchParams.get("handle") ?? "sample_dev").slice(0, 30);
  const heat = url.searchParams.get("heat") ?? "medium";
  const burn = url.searchParams.get("burn") === "1";
  const heatLabel = heat === "crispy" ? "EXTRA CRISPY" : heat.toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F4F7F0",
          color: "#17301F",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 900,
            border: "4px dashed #17301F",
            padding: "36px 48px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: "#B23A2E" }}>
              ROAST RECEIPT
            </div>
            <div
              style={{
                display: "flex",
                transform: "rotate(-4deg)",
                border: "4px solid #B23A2E",
                color: "#B23A2E",
                fontSize: 24,
                fontWeight: 800,
                padding: "4px 14px",
              }}
            >
              PREPARED: {heatLabel}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, marginTop: 12 }}>
            @{handle}
          </div>
          {burn ? (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 24 }}>
              <div style={{ display: "flex", fontSize: 44, fontWeight: 800, color: "#B23A2E" }}>
                You&apos;ve been roasted.
              </div>
              <div style={{ display: "flex", fontSize: 26, marginTop: 12, color: "#5A6E5E" }}>
                Three lines, prepared fresh. Open to read them.
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 20 }}>
              {SAMPLE_LINES.map((line) => (
                <div
                  key={line}
                  style={{ display: "flex", fontSize: 25, marginTop: 12, color: "#17301F" }}
                >
                  — {line}
                </div>
              ))}
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 28,
            }}
          >
            <OgMark size={30} />
            <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: "#5A6E5E" }}>
              aiticker.xyz/roast
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
