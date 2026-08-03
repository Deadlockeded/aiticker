"use client";

/** Root-level boundary (replaces the whole document if the layout dies). */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          background: "var(--surface)",
          color: "var(--ink)",
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
          <p style={{ color: "var(--ink2)", marginTop: 8 }}>
            Refresh usually fixes it.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              background: "var(--pink)",
              color: "var(--surface)",
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
