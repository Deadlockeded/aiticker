"use client";

/** Root-level boundary (replaces the whole document if the layout dies). */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#F2EDE3",
          color: "#1E2430",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 24,
        }}
      >
        <div>
          <p style={{ fontSize: 28, fontWeight: 800, textTransform: "uppercase" }}>
            Something broke.
          </p>
          <p style={{ color: "#5A6070", marginTop: 8 }}>
            Refresh usually fixes it.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              background: "#C23B2E",
              color: "#FDFBF6",
              padding: "10px 24px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
