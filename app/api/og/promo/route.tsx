import { ImageResponse } from "next/og";

export const runtime = "edge";

const PAGES: Record<string, { title: string; sub: string; emoji: string }> = {
  create: {
    title: "Make your own card",
    sub: "Get rated by The Algorithm. Rarity is luck.",
    emoji: "🪪",
  },
  about: {
    title: "About aiticker",
    sub: "Trading cards for the AI industry. Real data. Fake money.",
    emoji: "📇",
  },
  roast: {
    title: "Roast my repos",
    sub: "Three personalized roasts. Affectionate dunks only.",
    emoji: "🧾",
  },
};

export async function GET(req: Request) {
  const page = new URL(req.url).searchParams.get("page") ?? "create";
  const meta = PAGES[page] ?? PAGES.create;

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
        <div style={{ display: "flex", fontSize: 90 }}>{meta.emoji}</div>
        <div style={{ display: "flex", fontSize: 84, fontWeight: 800, marginTop: 16 }}>
          {meta.title}
        </div>
        <div style={{ display: "flex", fontSize: 36, marginTop: 14, color: "rgba(23, 48, 31,0.55)" }}>
          {meta.sub}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 44,
            fontSize: 28,
            letterSpacing: 6,
            color: "#B23A2E",
          }}
        >
          aiticker.xyz/{page}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
