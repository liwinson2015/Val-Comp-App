// pages/admin/tournaments/new.js
import React, { useState } from "react";
import { useRouter } from "next/router";
import { getCurrentPlayerFromReq } from "../../../lib/getCurrentPlayer";

// ---- SERVER SIDE: admin gate ----
export async function getServerSideProps({ req }) {
  const player = await getCurrentPlayerFromReq(req);

  if (!player) {
    // not logged in → go login, then come back here
    const next = "/admin/tournaments/new";
    return {
      redirect: {
        destination: `/api/auth/discord?next=${encodeURIComponent(next)}`,
        permanent: false,
      },
    };
  }

  if (!player.isAdmin) {
    // logged in but not admin → send away (you can change destination)
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  return {
    props: {}, // no extra props needed yet
  };
}

// ---- CLIENT SIDE PAGE ----
export default function AdminCreateTournamentPage() {
  const router = useRouter();

  const [tournamentId, setTournamentId] = useState("");
  const [name, setName] = useState("");
  const [game, setGame] = useState("valorant");
  const [capacity, setCapacity] = useState(16);

  const [displayName, setDisplayName] = useState("");
  const [displayDescription, setDisplayDescription] = useState(
    "Solo skirmish duels hosted by 5TQ. Claim your slot and climb the bracket."
  );
  const [displayTime, setDisplayTime] = useState("");
  const [displayGameLabel, setDisplayGameLabel] = useState("VALORANT 1v1");
  const [displayModeLabel, setDisplayModeLabel] = useState(
    "1v1 • Double Elimination"
  );

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [createdId, setCreatedId] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setCreatedId("");

    if (!tournamentId.trim()) {
      setErrorMsg("tournamentId is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/tournaments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tournamentId: tournamentId.trim(),
          name,
          game,
          capacity: Number(capacity),
          displayName,
          displayDescription,
          displayTime,
          displayGameLabel,
          displayModeLabel,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setErrorMsg(data.error || "Failed to create tournament.");
      } else {
        const tid = data.tournament?.tournamentId || tournamentId.trim();
        setCreatedId(tid);
        setSuccessMsg(`Tournament "${tid}" created successfully.`);
      }
    } catch (err) {
      console.error("Create tournament error:", err);
      setErrorMsg("Server error while creating tournament.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050816",
        color: "#f9fafb",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: "3rem 1rem",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "720px",
          background:
            "radial-gradient(circle at 0% 0%, rgba(255,0,70,0.2), #0b0f19 55%)",
          borderRadius: "1.25rem",
          border: "1px solid rgba(148,163,184,0.3)",
          padding: "1.75rem 1.75rem 2rem",
          boxShadow:
            "0 30px 120px rgba(15,23,42,0.9), 0 0 0 1px rgba(15,23,42,0.8)",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#a5b4fc",
              marginBottom: "0.4rem",
            }}
          >
            // ADMIN_PANEL
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.6rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            Create New Tournament
          </h1>
          <p
            style={{
              margin: "0.35rem 0 0",
              fontSize: "0.9rem",
              color: "#9ca3af",
            }}
          >
            Fill in the fields and save. The event will show on the 1v1 hub and
            get its own details page automatically.
          </p>
        </div>

        {/* Messages */}
        {errorMsg && (
          <div
            style={{
              marginBottom: "0.8rem",
              padding: "0.6rem 0.75rem",
              borderRadius: "0.5rem",
              backgroundColor: "#450a0a",
              color: "#fecaca",
              fontSize: "0.85rem",
            }}
          >
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              marginBottom: "0.8rem",
              padding: "0.6rem 0.75rem",
              borderRadius: "0.5rem",
              backgroundColor: "#052e16",
              color: "#bbf7d0",
              fontSize: "0.85rem",
            }}
          >
            <div>{successMsg}</div>
            {createdId && (
              <div style={{ marginTop: "0.3rem" }}>
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/tournaments/${encodeURIComponent(createdId)}`)
                  }
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#a5b4fc",
                    textDecoration: "underline",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: "0.85rem",
                  }}
                >
                  View details page →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
          {/* Row: tournamentId + capacity */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2.2fr 0.8fr",
              gap: "0.75rem",
            }}
          >
            <div>
              <label
                style={{ display: "block", fontSize: "0.8rem", marginBottom: 4 }}
              >
                Tournament ID
              </label>
              <input
                type="text"
                value={tournamentId}
                onChange={(e) => setTournamentId(e.target.value)}
                placeholder="VALO-SOLO-SKIRMISH-2"
                style={inputStyle}
              />
            </div>
            <div>
              <label
                style={{ display: "block", fontSize: "0.8rem", marginBottom: 4 }}
              >
                Capacity
              </label>
              <input
                type="number"
                min={2}
                max={128}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Row: name + game */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.8fr 1.2fr",
              gap: "0.75rem",
            }}
          >
            <div>
              <label
                style={{ display: "block", fontSize: "0.8rem", marginBottom: 4 }}
              >
                Internal Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Valorant Skirmish Tournament #2"
                style={inputStyle}
              />
            </div>
            <div>
              <label
                style={{ display: "block", fontSize: "0.8rem", marginBottom: 4 }}
              >
                Game
              </label>
              <select
                value={game}
                onChange={(e) => setGame(e.target.value)}
                style={inputStyle}
              >
                <option value="valorant">Valorant</option>
                <option value="tft">TFT</option>
                <option value="hok">Honor of Kings</option>
              </select>
            </div>
          </div>

          {/* Display name */}
          <div>
            <label
              style={{ display: "block", fontSize: "0.8rem", marginBottom: 4 }}
            >
              Display Name (card title)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Valorant Skirmish Tournament #2"
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label
              style={{ display: "block", fontSize: "0.8rem", marginBottom: 4 }}
            >
              Display Description
            </label>
            <textarea
              value={displayDescription}
              onChange={(e) => setDisplayDescription(e.target.value)}
              rows={3}
              style={{
                ...inputStyle,
                resize: "vertical",
                minHeight: "80px",
              }}
            />
          </div>

          {/* Display time */}
          <div>
            <label
              style={{ display: "block", fontSize: "0.8rem", marginBottom: 4 }}
            >
              Display Time (can be ISO or text)
            </label>
            <input
              type="text"
              value={displayTime}
              onChange={(e) => setDisplayTime(e.target.value)}
              placeholder='e.g. "2025-11-30T19:00:00-05:00" or "Nov 30, 7 PM EST"'
              style={inputStyle}
            />
            <p
              style={{
                margin: "0.35rem 0 0",
                fontSize: "0.75rem",
                color: "#9ca3af",
              }}
            >
              If it looks like a date, the details page will format it nicely.
            </p>
          </div>

          {/* Labels */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.75rem",
            }}
          >
            <div>
              <label
                style={{ display: "block", fontSize: "0.8rem", marginBottom: 4 }}
              >
                Game Label (pill)
              </label>
              <input
                type="text"
                value={displayGameLabel}
                onChange={(e) => setDisplayGameLabel(e.target.value)}
                placeholder="VALORANT 1v1"
                style={inputStyle}
              />
            </div>
            <div>
              <label
                style={{ display: "block", fontSize: "0.8rem", marginBottom: 4 }}
              >
                Mode Label
              </label>
              <input
                type="text"
                value={displayModeLabel}
                onChange={(e) => setDisplayModeLabel(e.target.value)}
                placeholder="1v1 • Double Elimination"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
              marginTop: "0.5rem",
            }}
          >
            <button
              type="button"
              onClick={() => router.back()}
              style={{
                padding: "0.55rem 1rem",
                borderRadius: "0.6rem",
                border: "1px solid #4b5563",
                background: "transparent",
                color: "#e5e7eb",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "0.55rem 1.2rem",
                borderRadius: "0.6rem",
                border: "none",
                backgroundColor: submitting ? "#4b5563" : "#ef4444",
                color: "#f9fafb",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: submitting ? "not-allowed" : "pointer",
                boxShadow: submitting
                  ? "none"
                  : "0 10px 40px rgba(239,68,68,0.5)",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Creating…" : "Create Tournament"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// shared inline style so inputs look consistent
const inputStyle = {
  width: "100%",
  padding: "0.5rem 0.6rem",
  borderRadius: "0.55rem",
  border: "1px solid #4b5563",
  backgroundColor: "#020617",
  color: "#e5e7eb",
  fontSize: "0.85rem",
  outline: "none",
};
