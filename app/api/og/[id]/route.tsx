import { ImageResponse } from "next/og";
import { getCard, getRank } from "@/lib/cards";
import { formatMove, getCurrentPrice, getDailyMove } from "@/lib/market";
import type { Rarity } from "@/lib/types";

export const runtime = "edge";

const RARITY_BG: Record<Rarity, string> = {
  common: "linear-gradient(135deg, #3f3f46 0%, #18181b 60%)",
  rare: "linear-gradient(135deg, #0369a1 0%, #0f172a 60%)",
  epic: "linear-gradient(135deg, #a21caf 0%, #1e1b4b 60%)",
  legendary: "linear-gradient(135deg, #b45309 0%, #1c1917 60%)",
  mythic:
    "linear-gradient(135deg, #0891b2 0%, #7c3aed 35%, #db2777 70%, #0f172a 100%)",
};

const RARITY_ACCENT: Record<Rarity, string> = {
  common: "#d4d4d8",
  rare: "#7dd3fc",
  epic: "#f0abfc",
  legendary: "#fcd34d",
  mythic: "#67e8f9",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const card = getCard((await params).id);
  if (!card) return new Response("Not found", { status: 404 });

  const move = getDailyMove(card);
  const accent = RARITY_ACCENT[card.rarity];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: 64,
          background: RARITY_BG[card.rarity],
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        {/* avatar / logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 280,
            height: 280,
            borderRadius: 999,
            border: `8px solid ${accent}`,
            background: card.type === "company" ? "#ffffff" : "#0f172a",
            overflow: "hidden",
          }}
        >
          {card.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.image}
              alt=""
              width={card.type === "company" ? 190 : 280}
              height={card.type === "company" ? 190 : 280}
              style={{
                objectFit: card.type === "company" ? "contain" : "cover",
                width: card.type === "company" ? 190 : 280,
                height: card.type === "company" ? 190 : 280,
              }}
            />
          ) : (
            <div style={{ display: "flex", fontSize: 110, fontWeight: 800 }}>
              {card.avatar}
            </div>
          )}
        </div>

        {/* text block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: 56,
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 26,
              letterSpacing: 6,
              color: accent,
              textTransform: "uppercase",
            }}
          >
            {card.rarity} · Rank #{getRank(card.id)} · Series {card.series}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 800,
              marginTop: 8,
              textTransform: "uppercase",
              letterSpacing: -1,
            }}
          >
            {card.name}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", marginTop: 24 }}>
            <div style={{ display: "flex", fontSize: 130, fontWeight: 800 }}>
              {card.rating}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 30,
                marginLeft: 16,
                color: "rgba(255,255,255,0.6)",
              }}
            >
              OVR
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginLeft: "auto",
                alignItems: "flex-end",
              }}
            >
              {/* satori's default font lacks the ₮ glyph — spell it out */}
              <div style={{ display: "flex", fontSize: 54, fontWeight: 700 }}>
                {Math.round(getCurrentPrice(card)).toLocaleString("en-US")}{" "}
                <span style={{ fontSize: 30, marginLeft: 8, color: "rgba(255,255,255,0.6)" }}>
                  TICKS
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 34,
                  fontWeight: 700,
                  color: move >= 0 ? "#34d399" : "#f87171",
                }}
              >
                {formatMove(move)} 24h
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 24,
              letterSpacing: 4,
              color: "rgba(255,255,255,0.5)",
            }}
          >
            AI TICKER · #{card.serial}/{card.editionSize} · prices simulated
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
