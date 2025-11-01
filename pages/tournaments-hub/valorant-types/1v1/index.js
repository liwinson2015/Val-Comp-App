// pages/tournaments-hub/valorant-types/1v1/index.js
import React, { useEffect, useState } from "react";
import Link from "next/link";
// If you have a CSS module for this page, keep this import + class names.
// Otherwise you can remove it and rely on the inline styles below.
import styles from "../../../../styles/Valorant1v1.module.css"; // ← adjust if your file name/case differs

const TID = "VALO-SOLO-SKIRMISH-1";

export default function Valorant1v1ListPage() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Static card copy (what you already had)
  const tournamentCard = {
    id: "skirmish-1",
    status: "Open",
    title: "Valorant Skirmish Tournament #1",
    host: "5TQ",
    start: "Starts November 2nd, 2025",
    format: "1v1 • Single Elimination",
    checkIn: "15 min before start (Discord)",
    prize: "Skin (TBD) + bragging rights",
    server: "NA (custom lobby)",
    maps: "Skirmish A / B / C (random)",
    rules: "No smurfing • No cheats",
    detailsUrl: "/valorant",
  };

  // Fetch live registrations for the tournament
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch(`/api/tournaments/${TID}/registrations`, { cache: "no-store" });
        const data = await res.json();
        if (!ignore) setInfo(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  const capacity = info?.capacity ?? 16;
  const registered = info?.registered ?? 0;
  const isFull = info?.isFull || registered >= capacity;
  const statusLabel = loading ? "CHECKING…" : isFull ? "CLOSED" : "OPEN";
  const slotsText = loading ? "…" : `${registered} / ${capacity}${isFull ? " • FULL" : ` • ${capacity - registered} left`}`;

  return (
    <div className={styles?.shell || ""} style={!styles?.shell ? { maxWidth: 980, margin: "0 auto", padding: "48px 20px" } : undefined}>
      {/* Header */}
      <div style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 999,
        fontWeight: 700,
        letterSpacing: 1,
        background: "#2a323e",
        color: "#d9e0ea",
        marginBottom: 14
      }}>
        VALORANT 1V1
      </div>

      <h1 style={{ fontSize: 36, color: "#fff", margin: "8px 0 28px" }}>
        Upcoming 1v1 Tournaments
      </h1>

      {/* Tournament card */}
      <div style={{
        background: "linear-gradient(180deg, rgba(255,0,65,0.14), rgba(255,0,65,0.08))",
        border: "1px solid rgba(255,0,65,0.35)",
        borderRadius: 18,
        padding: 22,
        boxShadow: "0 0 40px rgba(255,0,65,0.15)"
      }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>
              {tournamentCard.title}
            </div>
            <div style={{ color: "#9fb0c5", marginTop: 4 }}>
              Hosted by {tournamentCard.host} • {tournamentCard.start}
            </div>
          </div>

          {/* Status badge */}
          <div style={{
            padding: "6px 12px",
            borderRadius: 999,
            fontWeight: 800,
            color: isFull ? "#ff7b7b" : "#5CFFA9",
            border: `1px solid ${isFull ? "rgba(255,123,123,0.35)" : "rgba(92,255,169,0.35)"}`,
            background: isFull ? "rgba(255,123,123,0.12)" : "rgba(92,255,169,0.12)"
          }}>
            {statusLabel}
          </div>
        </div>

        {/* Info block */}
        <div style={{
          marginTop: 18,
          background: "rgba(10, 12, 16, 0.6)",
          border: "1px solid #2a3346",
          borderRadius: 14,
          padding: 16
        }}>
          <Row label="Format" value={tournamentCard.format} />
          <Row label="Check-in" value={tournamentCard.checkIn} />
          <Row label="Prize" value={tournamentCard.prize} />
          <Row label="Slots" value={slotsText} />
          <Row label="Region" value={tournamentCard.server} />
          <Row label="Maps" value={tournamentCard.maps} />
          <Row label="Rules" value={tournamentCard.rules} />
        </div>

        {/* CTA */}
        <div style={{ marginTop: 18, display: "flex", gap: 12 }}>
          {isFull ? (
            // FULL (disabled)
            <span
              aria-disabled="true"
              style={{
                pointerEvents: "none",
                userSelect: "none",
                opacity: 0.7,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#c7d0dd",
                padding: "12px 16px",
                borderRadius: 12,
                fontWeight: 800
              }}
              title="Tournament is full"
            >
              FULL
            </span>
          ) : (
            // View details (enabled)
            <Link href={tournamentCard.detailsUrl} legacyBehavior>
              <a
                style={{
                  background: "linear-gradient(180deg, #ff2a4f, #b3002f)",
                  color: "#fff",
                  textDecoration: "none",
                  padding: "12px 16px",
                  borderRadius: 12,
                  fontWeight: 800,
                  border: "1px solid rgba(255,0,65,0.45)"
                }}
              >
                View details
              </a>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "160px 1fr",
      gap: 12,
      padding: "8px 0",
      borderBottom: "1px dashed rgba(255,255,255,0.08)"
    }}>
      <div style={{ color: "#9fb0c5" }}>{label}</div>
      <div style={{ color: "#e8eef7", fontWeight: 600 }}>{value}</div>
    </div>
  );
}
