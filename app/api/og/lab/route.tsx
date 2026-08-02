import { ImageResponse } from "next/og";
import { getAllCards } from "@/lib/cards";
import { LAB_SIZE, scoreLab } from "@/lib/lab";

export const runtime = "edge";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ids = (url.searchParams.get("ids") ?? "").split(",").slice(0, LAB_SIZE);
  const name = url.searchParams.get("name") ?? "My Lab";

  const cards = getAllCards();
  const members = ids
    .map((id) => cards.find((c) => c.id === id))
    .filter(Boolean) as ReturnType<typeof getAllCards>;
  if (members.length === 0) return new Response("Not found", { status: 404 });
  const { teamRating } = scoreLab(members);

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
          background: "linear-gradient(135deg, #0e7490 0%, #0a0a0b 55%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 8, color: "#67e8f9", textTransform: "uppercase" }}>
          AI Ticker · Drafted Lab
        </div>
        <div style={{ display: "flex", fontSize: 68, fontWeight: 800, marginTop: 10 }}>
          {name}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", marginTop: 4 }}>
          <div style={{ display: "flex", fontSize: 100, fontWeight: 800 }}>{teamRating}</div>
          <div style={{ display: "flex", fontSize: 28, marginLeft: 12, color: "rgba(255,255,255,0.6)" }}>
            TEAM RATING
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 36 }}>
          {members.map((m, i) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: 190,
                margin: "0 8px",
                padding: "20px 10px",
                borderRadius: 18,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.14)",
                transform: `rotate(${(i - 2) * 3}deg) translateY(${Math.abs(i - 2) * 10}px)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 84,
                  height: 84,
                  borderRadius: 999,
                  background: m.type === "company" ? "#fff" : "#18181b",
                  overflow: "hidden",
                  border: "3px solid rgba(255,255,255,0.35)",
                }}
              >
                {m.image && m.type !== "moment" && m.type !== "rivalry" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.image}
                    alt=""
                    width={m.type === "company" ? 56 : 84}
                    height={m.type === "company" ? 56 : 84}
                    style={{
                      objectFit: m.type === "company" ? "contain" : "cover",
                      width: m.type === "company" ? 56 : 84,
                      height: m.type === "company" ? 56 : 84,
                    }}
                  />
                ) : (
                  <div style={{ display: "flex", fontSize: 30, fontWeight: 800 }}>
                    {m.avatar}
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  fontWeight: 700,
                  marginTop: 14,
                  textAlign: "center",
                }}
              >
                {m.name}
              </div>
              <div style={{ display: "flex", fontSize: 22, fontWeight: 800, marginTop: 6, color: "#67e8f9" }}>
                {m.rating}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", marginTop: 34, fontSize: 22, letterSpacing: 4, color: "rgba(255,255,255,0.45)" }}>
          aiticker.xyz/lab · simulated, no real money
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
