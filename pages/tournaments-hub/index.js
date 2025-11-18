// /pages/tournaments-hub/index.js
import React from "react";
import Link from "next/link";

export default function TournamentsHubPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050816",
        color: "white",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Inter", Roboto, sans-serif',
        padding: "3rem 1.5rem",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: "960px" }}>
        {/* Header */}
        <header style={{ marginBottom: "2rem" }}>
          <div
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#a3a3a3",
              fontWeight: 600,
              marginBottom: "0.5rem",
            }}
          >
            Tournaments
          </div>
          <h1
            style={{
              fontSize: "1.9rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
            }}
          >
            Choose your game
          </h1>
          <p
            style={{
              fontSize: "0.9rem",
              color: "#9ca3af",
              maxWidth: "540px",
              lineHeight: 1.5,
            }}
          >
            Browse competitive events by title. New games will be added here as
            we expand tournaments.
          </p>
        </header>

        {/* Games grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {/* VALORANT card */}
          <Link
            href="/tournaments-hub/valorant-types"
            style={{
              display: "block",
              borderRadius: "1rem",
              padding: "1.25rem 1.4rem",
              background:
                "radial-gradient(circle at 0% 0%, rgba(239,68,68,0.18), transparent 55%), #111827",
              border: "1px solid #1f2937",
              textDecoration: "none",
              color: "inherit",
              boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#f87171",
                fontWeight: 600,
                marginBottom: "0.4rem",
              }}
            >
              FPS • Competitive
            </div>
            <h2
              style={{
                fontSize: "1.3rem",
                fontWeight: 700,
                marginBottom: "0.35rem",
              }}
            >
              VALORANT
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#d1d5db",
                marginBottom: "0.75rem",
                lineHeight: 1.5,
              }}
            >
              Solo skirmishes, team tournaments, and highlight-driven events.
              View current and upcoming brackets.
            </p>
            <div
              style={{
                fontSize: "0.8rem",
                color: "#f9fafb",
                fontWeight: 500,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              View Valorant tournaments
              <span aria-hidden style={{ fontSize: "0.9rem" }}>
                →
              </span>
            </div>
          </Link>

          {/* Future games placeholder */}
          <div
            style={{
              borderRadius: "1rem",
              padding: "1.25rem 1.4rem",
              background:
                "radial-gradient(circle at 100% 0%, rgba(59,130,246,0.15), transparent 55%), #020617",
              border: "1px dashed #1f2937",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#64748b",
                fontWeight: 600,
                marginBottom: "0.4rem",
              }}
            >
              Coming soon
            </div>
            <h2
              style={{
                fontSize: "1.1rem",
                fontWeight: 600,
                marginBottom: "0.35rem",
              }}
            >
              More titles
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#9ca3af",
                lineHeight: 1.5,
              }}
            >
              Additional games will appear here as we launch new brackets and
              events.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
