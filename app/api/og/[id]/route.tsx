import { ImageResponse } from "next/og";
import OgRiffle from "@/components/OgRiffle";
import { getCard, getRank } from "@/lib/cards";
import { formatMove, getCurrentPrice, getDailyMove } from "@/lib/market";
import type { Rarity } from "@/lib/types";

export const runtime = "edge";

const RARITY_BG: Record<Rarity, string> = {
  common: "linear-gradient(135deg, #e0e8d8 0%, #F4F7F0 60%)",
  rare: "linear-gradient(135deg, #cfd9e4 0%, #F4F7F0 60%)",
  epic: "linear-gradient(135deg, #dccbe0 0%, #F4F7F0 60%)",
  legendary: "linear-gradient(135deg, #e8cf9a 0%, #F4F7F0 60%)",
  mythic: "linear-gradient(135deg, #d8d3e6 0%, #F4F7F0 60%)",
};

const RARITY_ACCENT: Record<Rarity, string> = {
  common: "#5A6E5E",
  rare: "#2E5E8E",
  epic: "#6B4FA0",
  legendary: "#8C6D1F",
  mythic: "#B23A2E",
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
          color: "#17301F",
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
            background: card.type === "company" ? "#ffffff" : card.image ? "#0f172a" : "#F4F7F0",
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
            // satori's default font has no emoji/dingbats — monogram from the name
            <div style={{ display: "flex", fontSize: 110, fontWeight: 800, color: "#17301F" }}>
              {(card.name.replace(/[^a-zA-Z ]/g, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("") || "AT").toUpperCase()}
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
              // long names ("Ignore Previous Instructions") must not clip
              fontSize: card.name.length > 18 ? 54 : 76,
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
                color: "rgba(23, 48, 31,0.55)",
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
                <span style={{ fontSize: 30, marginLeft: 8, color: "rgba(23, 48, 31,0.55)" }}>
                  TICKS
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 34,
                  fontWeight: 700,
                  color: move >= 0 ? "#1F6E3D" : "#B23A2E",
                }}
              >
                {formatMove(move)} 24h
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginTop: 28,
            }}
          >
            <OgRiffle size={34} />
            <div style={{ display: "flex", fontSize: 24, letterSpacing: 4, color: "rgba(23, 48, 31,0.5)" }}>
              #{card.serial}/{card.editionSize} · powered by public data
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
