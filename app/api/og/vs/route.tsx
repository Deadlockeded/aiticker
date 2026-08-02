import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const a = (url.searchParams.get("a") ?? "You").slice(0, 24);
  const b = (url.searchParams.get("b") ?? "The Index").slice(0, 24);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(120deg, #7f1d1d 0%, #0a0a0b 45%, #0a0a0b 55%, #0c4a6e 100%)",
          color: "#fff",
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
          <div style={{ display: "flex", fontSize: 110 }}>⚡</div>
          <div style={{ display: "flex", fontSize: 54, fontWeight: 900, color: "#fbbf24", letterSpacing: 8 }}>
            VS
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: 460 }}>
          <div style={{ display: "flex", fontSize: 62, fontWeight: 800 }}>{b}</div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 40,
            display: "flex",
            fontSize: 26,
            letterSpacing: 6,
            color: "#67e8f9",
          }}
        >
          aiticker.xyz/vs · card game math on public data
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
