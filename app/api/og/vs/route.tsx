import { ImageResponse } from "next/og";
import OgRiffle from "@/components/OgRiffle";

export const runtime = "edge";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const a = (url.searchParams.get("a") ?? "You").slice(0, 30);
  const b = (url.searchParams.get("b") ?? "The Index").slice(0, 30);
  const ship = url.searchParams.get("mode") === "ship";
  const glyph = ship ? "❤️‍🔥" : "⚡";
  const word = ship ? "×" : "VS";
  const path = ship ? "aiticker.xyz/shipmeter" : "aiticker.xyz/vs · card game math on public data";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F4F7F0",
          color: "#17301F",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", width: 460 }}>
          <div style={{ display: "flex", fontSize: 62, fontWeight: 800, textAlign: "right" }}>{a}</div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            margin: "0 48px",
          }}
        >
          <div style={{ display: "flex", fontSize: 110 }}>{glyph}</div>
          <div style={{ display: "flex", fontSize: 54, fontWeight: 900, color: "#B23A2E", letterSpacing: 8 }}>
            {word}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: 460 }}>
          <div style={{ display: "flex", fontSize: 62, fontWeight: 800 }}>{b}</div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 36,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <OgRiffle size={30} />
          <div style={{ display: "flex", fontSize: 24, letterSpacing: 5, color: "#B23A2E" }}>{path}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
