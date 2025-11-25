// components/EndTournamentSection.jsx
import { useState } from "react";

export default function EndTournamentSection({ tournamentId, tournamentName, winnerTeamId }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  // Phrase the admin must type to confirm (your "password or something")
  const REQUIRED_PHRASE = `END ${tournamentId}`;

  function openConfirm() {
    setErr("");
    setConfirmInput("");
    setShowConfirm(true);
  }

  function closeConfirm() {
    if (loading) return;
    setShowConfirm(false);
  }

  async function handleConfirmEnd() {
    if (confirmInput.trim() !== REQUIRED_PHRASE) {
      setErr("Confirmation phrase does not match.");
      return;
    }

    setLoading(true);
    setErr("");

    try {
      const res = await fetch("/api/tournaments/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId,
          winnerTeamId: winnerTeamId || null,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        setErr(data.error || "Failed to end tournament.");
      } else {
        setDone(true);
        setShowConfirm(false);
      }
    } catch (e) {
      console.error(e);
      setErr("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: "16px" }}>
      {/* Main button (shows confirmation modal) */}
      <button
        type="button"
        onClick={openConfirm}
        disabled={done}
        style={{
          padding: "8px 14px",
          borderRadius: "6px",
          border: "none",
          cursor: done ? "default" : "pointer",
          background: done ? "#4ade80" : "#ef4444",
          color: "#fff",
          fontWeight: 600,
        }}
      >
        {done ? "Tournament Ended" : "End Tournament"}
      </button>

      {/* Confirmation modal */}
      {showConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={closeConfirm}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0f172a",
              borderRadius: "10px",
              padding: "20px 24px",
              width: "100%",
              maxWidth: "420px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
              color: "#e5e7eb",
              fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            <h2 style={{ margin: "0 0 8px", fontSize: "1.1rem", color: "#f97316" }}>
              End Tournament?
            </h2>
            <p style={{ margin: "0 0 8px", fontSize: "0.9rem", lineHeight: 1.4 }}>
              You are about to <strong>permanently end</strong> the tournament:
              <br />
              <span style={{ color: "#38bdf8" }}>{tournamentName}</span>
            </p>
            <ul style={{ margin: "0 0 8px 18px", fontSize: "0.8rem", color: "#9ca3af" }}>
              <li>It will be removed from the current tournaments hub.</li>
              <li>Players will see it in their tournament history.</li>
              <li>Profile stats and announcements may update based on this.</li>
            </ul>
            <p style={{ margin: "0 0 4px", fontSize: "0.8rem" }}>
              To confirm, type this exactly:
            </p>
            <code
              style={{
                display: "inline-block",
                padding: "4px 6px",
                borderRadius: "4px",
                background: "#020617",
                fontSize: "0.75rem",
                marginBottom: "6px",
                color: "#facc15",
              }}
            >
              {REQUIRED_PHRASE}
            </code>

            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="Type confirmation phrase here"
              style={{
                width: "100%",
                marginTop: "4px",
                padding: "6px 8px",
                borderRadius: "4px",
                border: "1px solid #475569",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: "0.85rem",
              }}
            />

            {err && (
              <div style={{ marginTop: "6px", fontSize: "0.8rem", color: "#f97316" }}>
                {err}
              </div>
            )}

            <div
              style={{
                marginTop: "12px",
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
              }}
            >
              <button
                type="button"
                onClick={closeConfirm}
                disabled={loading}
                style={{
                  padding: "6px 10px",
                  borderRadius: "4px",
                  border: "none",
                  background: "#334155",
                  color: "#e5e7eb",
                  fontSize: "0.8rem",
                  cursor: loading ? "default" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEnd}
                disabled={loading || confirmInput.trim() !== REQUIRED_PHRASE}
                style={{
                  padding: "6px 10px",
                  borderRadius: "4px",
                  border: "none",
                  background:
                    loading || confirmInput.trim() !== REQUIRED_PHRASE
                      ? "#7f1d1d"
                      : "#dc2626",
                  color: "#fee2e2",
                  fontSize: "0.8rem",
                  cursor:
                    loading || confirmInput.trim() !== REQUIRED_PHRASE
                      ? "default"
                      : "pointer",
                }}
              >
                {loading ? "Ending..." : "Confirm End"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
