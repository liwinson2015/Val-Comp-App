// pages/admin/brackets/[tournamentId].js
import React, { useEffect, useState } from "react";
import styles from "../../../styles/BracketsAdmin.module.css";

import { getCurrentPlayerFromReq } from "../../../lib/getCurrentPlayer";
import { connectToDatabase } from "../../../lib/mongodb";
import Player from "../../../models/Player";
import Tournament from "../../../models/Tournament";
import TournamentState from "../../../models/TournamentState";
import Team from "../../../models/Team"; // ⭐ NEW: for team tournaments

// ---------- SERVER SIDE ----------
export async function getServerSideProps({ req, params }) {
  const player = await getCurrentPlayerFromReq(req);

  if (!player) {
    const encoded = encodeURIComponent(
      `/admin/brackets/${params.tournamentId}`
    );
    return {
      redirect: {
        destination: `/api/auth/discord?next=${encoded}`,
        permanent: false,
      },
    };
  }

  if (!player.isAdmin) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  await connectToDatabase();

  const rawId = params.tournamentId;
  const tournamentId = decodeURIComponent(rawId);

  // Load tournament first so we can see game/mode info
  const t = await Tournament.findOne({ tournamentId }).lean();
  if (!t) {
    return { notFound: true };
  }

  // Heuristic: treat as "team tournament" when it's 5v5
  const isTeamTournament =
    /-5V5-/i.test(tournamentId) ||
    t.mode === "5v5" ||
    t.modeKey === "5v5" ||
    t.meta?.isTeamTournament === true;

  let playerRows = [];

  if (isTeamTournament) {
    // 🔹 TEAM-BASED ENTRY (one entry per team)
    const teams = await Team.find({
      "registeredFor.tournamentId": tournamentId,
    }).lean();

    playerRows = teams.map((team) => {
      const reg = (team.registeredFor || []).find(
        (r) => r.tournamentId === tournamentId
      );

      return {
        // still called "_id" so existing editor code works,
        // but it represents a TEAM id
        _id: team._id.toString(),
        username: "",
        discordId: "",
        ign:
          reg?.teamName ||
          reg?.name ||
          team.teamName ||
          team.name ||
          "Unnamed Team",
        rank: reg?.rank || "",
        registeredAt: reg?.createdAt
          ? new Date(reg.createdAt).toISOString()
          : null,
      };
    });
  } else {
    // 🔹 SOLO ENTRY (old behavior)
    const players = await Player.find({
      "registeredFor.tournamentId": tournamentId,
    }).lean();

    playerRows = players.map((p) => {
      const reg = (p.registeredFor || []).find(
        (r) => r.tournamentId === tournamentId
      );

      return {
        _id: p._id.toString(),
        username: p.username || "",
        discordId: p.discordId || "",
        ign: reg?.ign || "",
        rank: reg?.rank || "",
        registeredAt: reg?.createdAt
          ? new Date(reg.createdAt).toISOString()
          : null,
      };
    });
  }

  const isPublished = !!t?.bracket?.isPublished;

  // --- DETAILS / HUB META (from Tournament.meta) ---
  const meta = t?.meta || {};
  const detailsMeta = {
    displayDescription: meta.displayDescription || "",
    displayPrize: meta.displayPrize || "",
    displayEntry: meta.displayEntry || "",
    displayHost: meta.displayHost || "",
  };

  // State + Featured + Homepage metadata (from TournamentState)
  let tournamentStatus = "ongoing";
  let isFeatured = false;
  let featuredMeta = {
    displayName: "",
    displayDescription: "",
    displayTime: "",
    displayGameLabel: "",
    displayModeLabel: "",
    ctaPath: "",
  };

  try {
    const state = await TournamentState.findOne({ tournamentId }).lean();
    if (state?.status) {
      tournamentStatus = state.status;
    }
    if (typeof state?.isFeatured === "boolean") {
      isFeatured = state.isFeatured;
    }
    featuredMeta = {
      displayName: state?.displayName || "",
      displayDescription: state?.displayDescription || "",
      displayTime: state?.displayTime || "",
      displayGameLabel: state?.displayGameLabel || "",
      displayModeLabel: state?.displayModeLabel || "",
      ctaPath: state?.ctaPath || "",
    };
  } catch (e) {
    console.error("Error reading TournamentState:", e);
  }

  return {
    props: {
      tournamentId,
      players: playerRows, // can be teams or players
      isPublished,
      tournamentStatus,
      isFeatured,
      featuredMeta,
      detailsMeta, // ⭐ for details + hub cards
    },
  };
}

// ---------- END TOURNAMENT UI ----------
function EndTournamentSection({ tournamentId }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

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
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        setErr(data.error || "Failed to end tournament.");
      } else {
        setDone(true);
        setShowConfirm(false);
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
      setErr("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginLeft: "0.5rem" }}>
      <button
        type="button"
        onClick={openConfirm}
        disabled={done}
        className={`${styles["btn"]} ${styles["btn-danger"]}`}
      >
        {done ? "Tournament Ended" : "⛔ End Tournament"}
      </button>

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
              background: "#020617",
              borderRadius: "10px",
              padding: "20px 24px",
              width: "100%",
              maxWidth: "420px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
              color: "#e5e7eb",
              fontFamily:
                'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            <h2
              style={{
                margin: "0 0 8px",
                fontSize: "1.1rem",
                color: "#f97316",
              }}
            >
              End Tournament?
            </h2>
            <p
              style={{
                margin: "0 0 8px",
                fontSize: "0.9rem",
                lineHeight: 1.4,
              }}
            >
              You are about to{" "}
              <strong style={{ color: "#fca5a5" }}>
                permanently mark this tournament as ended
              </strong>
              .
            </p>
            <ul
              style={{
                margin: "0 0 8px 18px",
                fontSize: "0.8rem",
                color: "#9ca3af",
              }}
            >
              <li>It will no longer appear in current tournaments.</li>
              <li>Players will see it in their tournament history.</li>
              <li>Announcements can fall back to “Coming soon”.</li>
            </ul>
            <p style={{ margin: "0 0 4px", fontSize: "0.8rem" }}>
              To confirm, type this exactly:
            </p>
            <code
              style={{
                display: "inline-block",
                padding: "4px 6px",
                borderRadius: "4px",
                background: "#0f172a",
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
              <div
                style={{
                  marginTop: "6px",
                  fontSize: "0.8rem",
                  color: "#f97316",
                }}
              >
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
                disabled={
                  loading || confirmInput.trim() !== REQUIRED_PHRASE
                }
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

// ---------- REOPEN TOURNAMENT UI ----------
function ReopenTournamentSection({ tournamentId }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const REQUIRED_PHRASE = `REOPEN ${tournamentId}`;

  function openConfirm() {
    setErr("");
    setConfirmInput("");
    setShowConfirm(true);
  }

  function closeConfirm() {
    if (loading) return;
    setShowConfirm(false);
  }

  async function handleConfirmReopen() {
    if (confirmInput.trim() !== REQUIRED_PHRASE) {
      setErr("Confirmation phrase does not match.");
      return;
    }

    setLoading(true);
    setErr("");

    try {
      const res = await fetch("/api/tournaments/reopen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId }),
      });

      const data = await res.json();
      if (!data.ok) {
        setErr(data.error || "Failed to reopen tournament.");
      } else {
        setDone(true);
        setShowConfirm(false);
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
      setErr("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginLeft: "0.5rem" }}>
      <button
        type="button"
        onClick={openConfirm}
        disabled={done}
        className={`${styles["btn"]} ${styles["btn-primary"]}`}
        style={{
          backgroundColor: "#16a34a",
          borderColor: "#16a34a",
        }}
      >
        {done ? "Tournament Reopened" : "♻ Reopen Tournament"}
      </button>

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
              background: "#020617",
              borderRadius: "10px",
              padding: "20px 24px",
              width: "100%",
              maxWidth: "420px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
              color: "#e5e7eb",
              fontFamily:
                'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            <h2
              style={{
                margin: "0 0 8px",
                fontSize: "1.1rem",
                color: "#22c55e",
              }}
            >
              Reopen Tournament?
            </h2>
            <p
              style={{
                margin: "0 0 8px",
                fontSize: "0.9rem",
                lineHeight: 1.4,
              }}
            >
              This will set the tournament back to{" "}
              <strong>ongoing</strong> and mark registrations as{" "}
              <strong>active</strong> again.
            </p>
            <p style={{ margin: "0 0 4px", fontSize: "0.8rem" }}>
              To confirm, type this exactly:
            </p>
            <code
              style={{
                display: "inline-block",
                padding: "4px 6px",
                borderRadius: "4px",
                background: "#0f172a",
                fontSize: "0.75rem",
                marginBottom: "6px",
                color: "#bbf7d0",
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
              <div
                style={{
                  marginTop: "6px",
                  fontSize: "0.8rem",
                  color: "#f97316",
                }}
              >
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
                onClick={handleConfirmReopen}
                disabled={
                  loading || confirmInput.trim() !== REQUIRED_PHRASE
                }
                style={{
                  padding: "6px 10px",
                  borderRadius: "4px",
                  border: "none",
                  background:
                    loading || confirmInput.trim() !== REQUIRED_PHRASE
                      ? "#065f46"
                      : "#16a34a",
                  color: "#dcfce7",
                  fontSize: "0.8rem",
                  cursor:
                    loading || confirmInput.trim() !== REQUIRED_PHRASE
                      ? "default"
                      : "pointer",
                }}
              >
                {loading ? "Reopening..." : "Confirm Reopen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- FEATURE TOURNAMENT UI ----------
function FeatureTournamentSection({ tournamentId, initialIsFeatured }) {
  const [isFeatured, setIsFeatured] = useState(!!initialIsFeatured);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleToggle() {
    if (loading) return;
    setLoading(true);
    setErr("");

    try {
      const res = await fetch("/api/tournaments/feature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId,
          isFeatured: !isFeatured,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        setErr(data.error || "Failed to update featured state.");
      } else {
        setIsFeatured(!!data.isFeatured);
      }
    } catch (e) {
      console.error(e);
      setErr("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginLeft: "0.5rem" }}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className={`${styles["btn"]} ${styles["btn-primary"]}`}
        style={{
          backgroundColor: isFeatured ? "#0f172a" : "#eab308",
          borderColor: isFeatured ? "#0f172a" : "#eab308",
          color: isFeatured ? "#facc15" : "#0f172a",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading
          ? isFeatured
            ? "Unfeaturing..."
            : "Featuring..."
          : isFeatured
          ? "⭐ Unfeature"
          : "⭐ Feature Tournament"}
      </button>

      {err && (
        <div
          style={{
            marginTop: "4px",
            fontSize: "0.8rem",
            color: "#f97316",
          }}
        >
          {err}
        </div>
      )}
    </div>
  );
}

// ---------- DETAILS & HUB FORM (Tournament.meta) ----------
function DetailsHubForm({ tournamentId, initialMeta }) {
  const [displayDescription, setDisplayDescription] = useState(
    initialMeta?.displayDescription || ""
  );
  const [displayPrize, setDisplayPrize] = useState(
    initialMeta?.displayPrize || ""
  );
  const [displayEntry, setDisplayEntry] = useState(
    initialMeta?.displayEntry || ""
  );
  const [displayHost, setDisplayHost] = useState(
    initialMeta?.displayHost || ""
  );

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");

    try {
      const res = await fetch("/api/admin/tournaments/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId,
          displayDescription: displayDescription.trim(),
          displayPrize: displayPrize.trim(),
          displayEntry: displayEntry.trim(),
          displayHost: displayHost.trim(),
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        setMsg(data.error || "Failed to save details.");
      } else {
        setMsg("Details + hub info saved.");
      }
    } catch (err) {
      console.error(err);
      setMsg("Error saving details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      style={{
        marginBottom: "1rem",
        padding: "1rem 1.25rem",
        borderRadius: "0.5rem",
        background: "#020617",
        border: "1px solid #1e293b",
      }}
    >
      <h2
        style={{
          margin: 0,
          marginBottom: "0.4rem",
          fontSize: "1rem",
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: "#e5e7eb",
        }}
      >
        Details &amp; Hub Cards
      </h2>
      <p
        style={{
          margin: 0,
          marginBottom: "0.6rem",
          fontSize: "0.8rem",
          color: "#9ca3af",
        }}
      >
        Controls the <strong>tournament detail page</strong> and the{" "}
        <strong>1v1 hub cards</strong> (description, entry fee, prize, host).
      </p>

      <form onSubmit={handleSave}>
        {/* Description */}
        <div style={{ marginBottom: "0.5rem" }}>
          <label
            style={{ display: "block", fontSize: "0.75rem", color: "#9ca3af" }}
          >
            Description
          </label>
          <textarea
            value={displayDescription}
            onChange={(e) => setDisplayDescription(e.target.value)}
            rows={2}
            placeholder="Short description shown under the title on the detail page and hub card."
            style={{
              width: "100%",
              marginTop: "0.15rem",
              padding: "6px 8px",
              borderRadius: "4px",
              border: "1px solid #334155",
              background: "#020617",
              color: "#e5e7eb",
              fontSize: "0.85rem",
              resize: "vertical",
            }}
          />
        </div>

        {/* Entry + Prize + Host */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          <div style={{ flex: "1 1 140px" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                color: "#9ca3af",
              }}
            >
              Entry (Fee)
            </label>
            <input
              type="text"
              value={displayEntry}
              onChange={(e) => setDisplayEntry(e.target.value)}
              placeholder="Free / $5 per player / Invite only"
              style={{
                width: "100%",
                marginTop: "0.15rem",
                padding: "6px 8px",
                borderRadius: "4px",
                border: "1px solid #334155",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: "0.85rem",
              }}
            />
          </div>

          <div style={{ flex: "1 1 160px" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                color: "#9ca3af",
              }}
            >
              Prize
            </label>
            <input
              type="text"
              value={displayPrize}
              onChange={(e) => setDisplayPrize(e.target.value)}
              placeholder="$20 Valorant Gift Card / Skins / Cash prize"
              style={{
                width: "100%",
                marginTop: "0.15rem",
                padding: "6px 8px",
                borderRadius: "4px",
                border: "1px solid #334155",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: "0.85rem",
              }}
            />
          </div>

          <div style={{ flex: "1 1 160px" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                color: "#9ca3af",
              }}
            >
              Hosted By
            </label>
            <input
              type="text"
              value={displayHost}
              onChange={(e) => setDisplayHost(e.target.value)}
              placeholder="5TQ / Winson / Friend's org"
              style={{
                width: "100%",
                marginTop: "0.15rem",
                padding: "6px 8px",
                borderRadius: "4px",
                border: "1px solid #334155",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: "0.85rem",
              }}
            />
          </div>
        </div>

        <div
          style={{
            marginTop: "0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <button
            type="submit"
            disabled={saving}
            className={styles["btn"]}
            style={{
              backgroundColor: "#22c55e",
              borderColor: "#22c55e",
              color: "#022c22",
              fontSize: "0.8rem",
              padding: "6px 12px",
            }}
          >
            {saving ? "Saving..." : "Save Details + Hub"}
          </button>
          {msg && (
            <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>{msg}</span>
          )}
        </div>
      </form>
    </section>
  );
}

// ---------- HOMEPAGE FEATURED INFO FORM ----------
function HomepageFeaturedForm({ tournamentId, initialMeta }) {
  const [displayName, setDisplayName] = useState(
    initialMeta?.displayName || ""
  );
  const [displayDescription, setDisplayDescription] = useState(
    initialMeta?.displayDescription || ""
  );
  const [displayTime, setDisplayTime] = useState(
    initialMeta?.displayTime || ""
  );
  const [displayGameLabel, setDisplayGameLabel] = useState(
    initialMeta?.displayGameLabel || ""
  );
  const [displayModeLabel, setDisplayModeLabel] = useState(
    initialMeta?.displayModeLabel || ""
  );
  const [ctaPath, setCtaPath] = useState(initialMeta?.ctaPath || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSaveMeta(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");

    try {
      const res = await fetch("/api/tournaments/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId,
          displayName,
          displayDescription,
          displayTime,
          displayGameLabel,
          displayModeLabel,
          ctaPath,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        setMsg(data.error || "Failed to save metadata.");
      } else {
        setMsg("Homepage info saved.");
      }
    } catch (err) {
      console.error(err);
      setMsg("Error saving metadata.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      style={{
        marginBottom: "1.5rem",
        padding: "1rem 1.25rem",
        borderRadius: "0.5rem",
        background: "#020617",
        border: "1px solid #1e293b",
      }}
    >
      <h2
        style={{
          margin: 0,
          marginBottom: "0.5rem",
          fontSize: "1rem",
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: "#e5e7eb",
        }}
      >
        Homepage Featured Info
      </h2>
      <p
        style={{
          margin: 0,
          marginBottom: "0.75rem",
          fontSize: "0.8rem",
          color: "#9ca3af",
        }}
      >
        These fields control what shows on the{" "}
        <strong>FEATURED EVENT</strong> card on the homepage when this
        tournament is featured.
      </p>

      <form onSubmit={handleSaveMeta}>
        <div style={{ marginBottom: "0.5rem" }}>
          <label
            style={{ display: "block", fontSize: "0.75rem", color: "#9ca3af" }}
          >
            Title
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. SOLO SKIRMISH #1"
            style={{
              width: "100%",
              marginTop: "0.15rem",
              padding: "6px 8px",
              borderRadius: "4px",
              border: "1px solid #334155",
              background: "#020617",
              color: "#e5e7eb",
              fontSize: "0.85rem",
            }}
          />
        </div>

        <div style={{ marginBottom: "0.5rem" }}>
          <label
            style={{ display: "block", fontSize: "0.75rem", color: "#9ca3af" }}
          >
            Description
          </label>
          <textarea
            value={displayDescription}
            onChange={(e) => setDisplayDescription(e.target.value)}
            rows={2}
            placeholder="Short description shown under the title"
            style={{
              width: "100%",
              marginTop: "0.15rem",
              padding: "6px 8px",
              borderRadius: "4px",
              border: "1px solid #334155",
              background: "#020617",
              color: "#e5e7eb",
              fontSize: "0.85rem",
              resize: "vertical",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 140px" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                color: "#9ca3af",
              }}
            >
              Time Text
            </label>
            <input
              type="text"
              value={displayTime}
              onChange={(e) => setDisplayTime(e.target.value)}
              placeholder="e.g. NOV 2nd at 7:00PM"
              style={{
                width: "100%",
                marginTop: "0.15rem",
                padding: "6px 8px",
                borderRadius: "4px",
                border: "1px solid #334155",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: "0.85rem",
              }}
            />
          </div>

          <div style={{ flex: "1 1 120px" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                color: "#9ca3af",
              }}
            >
              Game Label
            </label>
            <input
              type="text"
              value={displayGameLabel}
              onChange={(e) => setDisplayGameLabel(e.target.value)}
              placeholder="e.g. VALORANT"
              style={{
                width: "100%",
                marginTop: "0.15rem",
                padding: "6px 8px",
                borderRadius: "4px",
                border: "1px solid #334155",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: "0.85rem",
              }}
            />
          </div>

          <div style={{ flex: "1 1 100px" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                color: "#9ca3af",
              }}
            >
              Mode Label
            </label>
            <input
              type="text"
              value={displayModeLabel}
              onChange={(e) => setDisplayModeLabel(e.target.value)}
              placeholder="e.g. 1v1"
              style={{
                width: "100%",
                marginTop: "0.15rem",
                padding: "6px 8px",
                borderRadius: "4px",
                border: "1px solid #334155",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: "0.85rem",
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: "0.5rem" }}>
          <label
            style={{ display: "block", fontSize: "0.75rem", color: "#9ca3af" }}
          >
            CTA Link Path
          </label>
          <input
            type="text"
            value={ctaPath}
            onChange={(e) => setCtaPath(e.target.value)}
            placeholder="/tournaments-hub/valorant-types/1v1"
            style={{
              width: "100%",
              marginTop: "0.15rem",
              padding: "6px 8px",
              borderRadius: "4px",
              border: "1px solid #334155",
              background: "#020617",
              color: "#e5e7eb",
              fontSize: "0.85rem",
            }}
          />
        </div>

        <div
          style={{
            marginTop: "0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <button
            type="submit"
            disabled={saving}
            className={styles["btn"]}
            style={{
              backgroundColor: "#0ea5e9",
              borderColor: "#0ea5e9",
              color: "#0b1120",
              fontSize: "0.8rem",
              padding: "6px 12px",
            }}
          >
            {saving ? "Saving..." : "Save Homepage Info"}
          </button>
          {msg && (
            <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>{msg}</span>
          )}
        </div>
      </form>
    </section>
  );
}

// ---------- MAIN PAGE COMPONENT ----------
export default function BracketAdminPage({
  tournamentId,
  players,
  isPublished,
  tournamentStatus,
  isFeatured,
  featuredMeta,
  detailsMeta,
}) {
  return (
    <div className={styles["admin-container"]}>
      {/* Header & Publish Actions */}
      <header className={styles["header-section"]}>
        <div className={styles["header-content"]}>
          <h1>Bracket Editor</h1>
          <div className={styles["header-description"]}>
            Tournament ID: <strong>{tournamentId}</strong>
            <br />
            <span
              className={`${styles["status-badge"]} ${
                isPublished
                  ? styles["status-published"]
                  : styles["status-draft"]
              }`}
            >
              {isPublished ? "● Live (Published)" : "○ Draft (Hidden)"}
            </span>
            <br />
            <span
              className={styles["status-badge"]}
              style={{ marginTop: "0.25rem" }}
            >
              STATE:{" "}
              {tournamentStatus === "completed"
                ? "🏁 Completed"
                : "▶ Ongoing"}
            </span>
            <br />
            <span
              className={styles["status-badge"]}
              style={{
                marginTop: "0.25rem",
                backgroundColor: isFeatured ? "#eab30822" : "#020617",
                borderColor: isFeatured ? "#eab308" : "#4b5563",
                color: isFeatured ? "#facc15" : "#9ca3af",
              }}
            >
              {isFeatured ? "⭐ FEATURED" : "Not featured"}
            </span>
          </div>
        </div>

        <div className={styles["action-bar"]}>
          <form
            method="POST"
            action={`/api/admin/brackets/${encodeURIComponent(
              tournamentId
            )}/publish?state=unpublish`}
          >
            <button
              type="submit"
              className={`${styles["btn"]} ${styles["btn-danger"]}`}
            >
              Unpublish
            </button>
          </form>

          <form
            method="POST"
            action={`/api/admin/brackets/${encodeURIComponent(
              tournamentId
            )}/publish?state=publish`}
          >
            <button
              type="submit"
              className={`${styles["btn"]} ${styles["btn-success"]}`}
            >
              📢 Publish Bracket
            </button>
          </form>

          {/* Feature toggle */}
          <FeatureTournamentSection
            tournamentId={tournamentId}
            initialIsFeatured={isFeatured}
          />

          {/* Show End or Reopen depending on status */}
          {tournamentStatus !== "completed" && (
            <EndTournamentSection tournamentId={tournamentId} />
          )}
          {tournamentStatus === "completed" && (
            <ReopenTournamentSection tournamentId={tournamentId} />
          )}
        </div>
      </header>

      <BracketEditor
        tournamentId={tournamentId}
        players={players}
        featuredMeta={featuredMeta}
        detailsMeta={detailsMeta}
      />
    </div>
  );
}

// ---------- HELPER FUNCTIONS ----------
function computeLosersFromMatches(matches) {
  const losers = [];
  (matches || []).forEach((m) => {
    if (!m.winnerId) return;
    if (!m.player1Id || !m.player2Id) return;
    const loser = m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
    losers.push(loser);
  });
  return losers;
}

function computeWinnersFromMatches(matches) {
  const winners = [];
  (matches || []).forEach((m) => {
    if (m.winnerId) winners.push(m.winnerId);
  });
  return winners;
}

function buildPairsFromIds(ids) {
  const pairs = [];
  for (let i = 0; i < ids.length; i += 2) {
    const p1 = ids[i] || null;
    const p2 = ids[i + 1] || null;
    if (!p1 && !p2) continue;
    pairs.push({ player1Id: p1, player2Id: p2, winnerId: null });
  }
  return pairs;
}

// ---------- BRACKET EDITOR ----------
function BracketEditor({ tournamentId, players, featuredMeta, detailsMeta }) {
  const emptyFinalMatch = { player1Id: null, player2Id: null, winnerId: null };
  const [loading, setLoading] = useState(true);

  // Winners
  const [matches, setMatches] = useState([]); // R1
  const [qfMatches, setQfMatches] = useState([]); // R2 (QF)
  const [sfMatches, setSfMatches] = useState([]); // R3 (SF)

  // Losers
  const [lbMatches1, setLbMatches1] = useState([]); // LB R1
  const [lbMatches2, setLbMatches2] = useState([]); // LB R2
  const [lbMatches3a, setLbMatches3a] = useState([]); // LB R3A
  const [lbMatches3b, setLbMatches3b] = useState([]); // LB R3B
  const [lbMatches4, setLbMatches4] = useState([]); // LB R4

  // Finals
  const [wbFinalMatches, setWbFinalMatches] = useState([emptyFinalMatch]);
  const [lbFinalMatches, setLbFinalMatches] = useState([emptyFinalMatch]);
  const [grandFinalMatches, setGrandFinalMatches] =
    useState([emptyFinalMatch]);

  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [randomizing, setRandomizing] = useState(false);

  const idToLabel = {};
  for (const p of players || []) {
    // For teams, "ign" is the team name; for solos, it's the IGN
    const base = p.ign || p.username || "Unknown";
    const extra = p.username && p.ign ? ` (${p.username})` : "";
    idToLabel[p._id] = `${base}${extra}`;
  }
  const allOptions = players.map((p) => ({
    value: p._id,
    label: idToLabel[p._id],
  }));

  useEffect(() => {
    async function loadBracket() {
      try {
        const res = await fetch(
          `/api/admin/brackets/${encodeURIComponent(tournamentId)}/get`
        );
        const data = await res.json();
        const bracket = data.bracket || null;

        // Winners
        if (!bracket || !Array.isArray(bracket.rounds)) {
          setMatches([]);
          setQfMatches([]);
          setSfMatches([]);
        } else {
          const rounds = bracket.rounds || [];
          const r1 =
            rounds.find(
              (r) => r.roundNumber === 1 && r.type === "winners"
            ) || rounds[0];
          setMatches(
            (r1?.matches || []).map((m) => ({
              player1Id: m.player1Id || null,
              player2Id: m.player2Id || null,
              winnerId: m.winnerId || null,
            }))
          );
          const r2 = rounds.find(
            (r) => r.roundNumber === 2 && r.type === "winners"
          );
          setQfMatches(
            (r2?.matches || []).map((m) => ({
              player1Id: m.player1Id || null,
              player2Id: m.player2Id || null,
              winnerId: m.winnerId || null,
            }))
          );
          const r3 = rounds.find(
            (r) => r.roundNumber === 3 && r.type === "winners"
          );
          setSfMatches(
            (r3?.matches || []).map((m) => ({
              player1Id: m.player1Id || null,
              player2Id: m.player2Id || null,
              winnerId: m.winnerId || null,
            }))
          );
        }

        // Losers
        if (bracket && Array.isArray(bracket.losersRounds)) {
          const lrs = bracket.losersRounds || [];
          const lb1 =
            lrs.find((r) => r.roundNumber === 1 && r.type === "losers") ||
            lrs[0];
          setLbMatches1(
            (lb1?.matches || []).map((m) => ({
              player1Id: m.player1Id || null,
              player2Id: m.player2Id || null,
              winnerId: m.winnerId || null,
            }))
          );
          const lb2 = lrs.find(
            (r) => r.roundNumber === 2 && r.type === "losers"
          );
          setLbMatches2(
            (lb2?.matches || []).map((m) => ({
              player1Id: m.player1Id || null,
              player2Id: m.player2Id || null,
              winnerId: m.winnerId || null,
            }))
          );
          const lb3 = lrs.find(
            (r) => r.roundNumber === 3 && r.type === "losers"
          );
          setLbMatches3a(
            (lb3?.matches || []).map((m) => ({
              player1Id: m.player1Id || null,
              player2Id: m.player2Id || null,
              winnerId: m.winnerId || null,
            }))
          );
          const lb4 = lrs.find(
            (r) => r.roundNumber === 4 && r.type === "losers"
          );
          setLbMatches3b(
            (lb4?.matches || []).map((m) => ({
              player1Id: m.player1Id || null,
              player2Id: m.player2Id || null,
              winnerId: m.winnerId || null,
            }))
          );
          const lb5 = lrs.find(
            (r) => r.roundNumber === 5 && r.type === "losers"
          );
          setLbMatches4(
            (lb5?.matches || []).map((m) => ({
              player1Id: m.player1Id || null,
              player2Id: m.player2Id || null,
              winnerId: m.winnerId || null,
            }))
          );
        } else {
          setLbMatches1([]);
          setLbMatches2([]);
          setLbMatches3a([]);
          setLbMatches3b([]);
          setLbMatches4([]);
        }

        const wf = bracket?.winnersFinal || emptyFinalMatch;
        setWbFinalMatches([
          {
            player1Id: wf.player1Id || null,
            player2Id: wf.player2Id || null,
            winnerId: wf.winnerId || null,
          },
        ]);
        const lf = bracket?.losersFinal || emptyFinalMatch;
        setLbFinalMatches([
          {
            player1Id: lf.player1Id || null,
            player2Id: lf.player2Id || null,
            winnerId: lf.winnerId || null,
          },
        ]);
        const gf = bracket?.grandFinal || emptyFinalMatch;
        setGrandFinalMatches([
          {
            player1Id: gf.player1Id || null,
            player2Id: gf.player2Id || null,
            winnerId: gf.winnerId || null,
          },
        ]);
      } catch (err) {
        console.error("Failed to load bracket", err);
      } finally {
        setLoading(false);
      }
    }
    loadBracket();
  }, [tournamentId]);

  useEffect(() => {
    const winnersSF = computeWinnersFromMatches(sfMatches);
    if (winnersSF.length < 2) return;
    setWbFinalMatches((prev) => {
      const current = (prev && prev[0]) || emptyFinalMatch;
      if (current.player1Id || current.player2Id) return prev;
      return [
        {
          player1Id: winnersSF[0],
          player2Id: winnersSF[1],
          winnerId:
            current.winnerId &&
            (current.winnerId === winnersSF[0] ||
              current.winnerId === winnersSF[1])
              ? current.winnerId
              : null,
        },
      ];
    });
  }, [sfMatches]);

  function labelFromId(id) {
    if (!id) return "TBD";
    return idToLabel[id] || "TBD";
  }

  function handleChangeMatch(index, field, value) {
    setMatches((prev) => {
      const copy = prev.map((m) => ({ ...m }));
      copy[index] = { ...copy[index], [field]: value || null };
      const m = copy[index];
      if (
        (field === "player1Id" || field === "player2Id") &&
        m.winnerId &&
        m.winnerId !== m.player1Id &&
        m.winnerId !== m.player2Id
      ) {
        m.winnerId = null;
      }
      return copy;
    });
  }
  function handleSetWinnerR1(index, which) {
    setMatches((prev) => {
      const copy = prev.map((m) => ({ ...m }));
      const m = copy[index];
      if (which === "p1") {
        if (!m.player1Id) return prev;
        m.winnerId = m.player1Id;
      } else if (which === "p2") {
        if (!m.player2Id) return prev;
        m.winnerId = m.player2Id;
      }
      return copy;
    });
  }
  async function handleRandomizeR1() {
    setRandomizing(true);
    setSaveMessage("");
    try {
      const res = await fetch(
        `/api/admin/brackets/${encodeURIComponent(
          tournamentId
        )}/generate`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSaveMessage(data.error || "Failed to randomize.");
      } else {
        const fresh = (data.matches || []).map((m) => ({
          ...m,
          winnerId: null,
        }));
        setMatches(fresh);
        setQfMatches([]);
        setSfMatches([]);
        setLbMatches1([]);
        setLbMatches2([]);
        setLbMatches3a([]);
        setLbMatches3b([]);
        setLbMatches4([]);
        setWbFinalMatches([emptyFinalMatch]);
        setLbFinalMatches([emptyFinalMatch]);
        setGrandFinalMatches([emptyFinalMatch]);
        setSaveMessage("Random Round 1 generated.");
      }
    } catch (err) {
      console.error(err);
      setSaveMessage("Error generating.");
    } finally {
      setRandomizing(false);
    }
  }
  function handleAddPlayerToBracket(playerId) {
    setMatches((prev) => {
      const copy = prev.map((m) => ({ ...m }));
      const alreadyPlaced = copy.some(
        (m) => m.player1Id === playerId || m.player2Id === playerId
      );
      if (alreadyPlaced) {
        setSaveMessage("Player already placed.");
        return copy;
      }
      for (let m of copy) {
        if (!m.player1Id) {
          m.player1Id = playerId;
          setSaveMessage("Added to empty slot.");
          return copy;
        }
        if (!m.player2Id) {
          m.player2Id = playerId;
          setSaveMessage("Added to empty slot.");
          return copy;
        }
      }
      setSaveMessage("No empty slots left.");
      return copy;
    });
  }

  const usedIds = new Set();
  const placedCount = {};
  matches.forEach((m) => {
    if (m.player1Id) {
      usedIds.add(m.player1Id);
      placedCount[m.player1Id] = (placedCount[m.player1Id] || 0) + 1;
    }
    if (m.player2Id) {
      usedIds.add(m.player2Id);
      placedCount[m.player2Id] = (placedCount[m.player2Id] || 0) + 1;
    }
  });
  const duplicatedIds = new Set(
    Object.keys(placedCount).filter((id) => placedCount[id] > 1)
  );
  const unusedPlayers = players.filter((p) => !usedIds.has(p._id));
  const duplicatePlayers = players.filter((p) =>
    duplicatedIds.has(p._id)
  );
  const usedCount = usedIds.size;
  const totalCount = players.length;
  const losersR1 = computeLosersFromMatches(matches);
  const winnersChosenR1 = losersR1.length;

  function handleRandomizeLB1() {
    if (winnersChosenR1 === 0) {
      setSaveMessage("Set R1 winners first.");
      return;
    }
    const shuffled = [...losersR1];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setLbMatches1(buildPairsFromIds(shuffled));
    setSaveMessage("LB Round 1 built.");
  }
  function handleChangeLbMatch1(index, slot, value) {
    setLbMatches1((prev) => updateMatch(prev, index, slot, value));
  }
  function handleSetWinnerLB1(index, which) {
    setLbMatches1((prev) => setWinner(prev, index, which));
  }

  function updateMatch(prev, index, field, value) {
    const copy = prev.map((m) => ({ ...m }));
    if (!copy[index]) return copy;
    copy[index][field] = value || null;
    const m = copy[index];
    if (
      m.winnerId &&
      m.winnerId !== m.player1Id &&
      m.winnerId !== m.player2Id
    )
      m.winnerId = null;
    return copy;
  }
  function setWinner(prev, index, which) {
    const copy = prev.map((m) => ({ ...m }));
    const m = copy[index];
    if (which === "p1") {
      if (!m.player1Id) return prev;
      m.winnerId = m.player1Id;
    }
    if (which === "p2") {
      if (!m.player2Id) return prev;
      m.winnerId = m.player2Id;
    }
    return copy;
  }

  function handleBuildQF() {
    if (!matches.length) {
      setSaveMessage("Need R1 matches.");
      return;
    }
    const nextQF = buildNextRound(matches);
    setQfMatches(nextQF);
    setSfMatches([]);
    setLbMatches2([]);
    setLbMatches3a([]);
    setLbMatches3b([]);
    setLbMatches4([]);
    setWbFinalMatches([emptyFinalMatch]);
    setLbFinalMatches([emptyFinalMatch]);
    setGrandFinalMatches([emptyFinalMatch]);
    setSaveMessage("Quarterfinals built.");
  }
  function buildNextRound(prevRoundMatches) {
    const numNext = Math.ceil(prevRoundMatches.length / 2);
    const next = [];
    for (let i = 0; i < numNext; i++) {
      const mA = prevRoundMatches[i * 2] || {};
      const mB = prevRoundMatches[i * 2 + 1] || {};
      next.push({
        player1Id: mA.winnerId || null,
        player2Id: mB.winnerId || null,
        winnerId: null,
      });
    }
    return next;
  }
  function handleChangeQFMatch(index, f, v) {
    setQfMatches((prev) => updateMatch(prev, index, f, v));
  }
  function handleSetWinnerQF(index, w) {
    setQfMatches((prev) => setWinner(prev, index, w));
  }

  function handleBuildLB2() {
    const num = Math.max(lbMatches1.length, qfMatches.length);
    if (!num) {
      setSaveMessage("Need LB1 & QF.");
      return;
    }
    const next = [];
    for (let i = 0; i < num; i++) {
      const lb1 = lbMatches1[i] || {};
      const qf = qfMatches[i] || {};
      const qfLoser =
        qf.winnerId && qf.player1Id && qf.player2Id
          ? qf.winnerId === qf.player1Id
            ? qf.player2Id
            : qf.player1Id
          : null;
      next.push({
        player1Id: lb1.winnerId || null,
        player2Id: qfLoser || null,
        winnerId: null,
      });
    }
    setLbMatches2(next);
    setLbMatches3a([]);
    setLbMatches3b([]);
    setLbMatches4([]);
    setLbFinalMatches([emptyFinalMatch]);
    setGrandFinalMatches([emptyFinalMatch]);
    setSaveMessage("LB Round 2 built.");
  }
  function handleChangeLbMatch2(i, s, v) {
    setLbMatches2((p) => updateMatch(p, i, s, v));
  }
  function handleSetWinnerLB2(i, w) {
    setLbMatches2((p) => setWinner(p, i, w));
  }

  function handleBuildSF() {
    if (!qfMatches.length) {
      setSaveMessage("Need QF matches.");
      return;
    }
    setSfMatches(buildNextRound(qfMatches));
    setLbMatches3a([]);
    setLbMatches3b([]);
    setLbMatches4([]);
    setWbFinalMatches([emptyFinalMatch]);
    setLbFinalMatches([emptyFinalMatch]);
    setGrandFinalMatches([emptyFinalMatch]);
    setSaveMessage("Semifinals built.");
  }
  function handleChangeSFMatch(i, f, v) {
    setSfMatches((p) => updateMatch(p, i, f, v));
  }
  function handleSetWinnerSF(i, w) {
    setSfMatches((p) => setWinner(p, i, w));
  }

  function handleBuildLB3A() {
    if (!lbMatches2.length) {
      setSaveMessage("Need LB2.");
      return;
    }
    setLbMatches3a(buildNextRound(lbMatches2));
    setLbMatches3b([]);
    setLbMatches4([]);
    setLbFinalMatches([emptyFinalMatch]);
    setGrandFinalMatches([emptyFinalMatch]);
    setSaveMessage("LB Round 3A built.");
  }
  function handleChangeLbMatch3A(i, s, v) {
    setLbMatches3a((p) => updateMatch(p, i, s, v));
  }
  function handleSetWinnerLB3A(i, w) {
    setLbMatches3a((p) => setWinner(p, i, w));
  }

  function handleBuildLB3B() {
    const num = Math.max(lbMatches3a.length, sfMatches.length);
    const next = [];
    for (let i = 0; i < num; i++) {
      const lb3a = lbMatches3a[i] || {};
      const sf = sfMatches[i] || {};
      const sfLoser =
        sf.winnerId && sf.player1Id && sf.player2Id
          ? sf.winnerId === sf.player1Id
            ? sf.player2Id
            : sf.player1Id
          : null;
      next.push({
        player1Id: lb3a.winnerId || null,
        player2Id: sfLoser || null,
        winnerId: null,
      });
    }
    setLbMatches3b(next);
    setLbMatches4([]);
    setLbFinalMatches([emptyFinalMatch]);
    setGrandFinalMatches([emptyFinalMatch]);
    setSaveMessage("LB Round 3B built.");
  }
  function handleChangeLbMatch3B(i, s, v) {
    setLbMatches3b((p) => updateMatch(p, i, s, v));
  }
  function handleSetWinnerLB3B(i, w) {
    setLbMatches3b((p) => setWinner(p, i, w));
  }

  function handleBuildLB4() {
    if (!lbMatches3b.length) {
      setSaveMessage("Need LB3B.");
      return;
    }
    setLbMatches4(buildNextRound(lbMatches3b));
    setLbFinalMatches([emptyFinalMatch]);
    setGrandFinalMatches([emptyFinalMatch]);
    setSaveMessage("LB Round 4 built.");
  }
  function handleChangeLbMatch4(i, s, v) {
    setLbMatches4((p) => updateMatch(p, i, s, v));
  }
  function handleSetWinnerLB4(i, w) {
    setLbMatches4((p) => setWinner(p, i, w));
  }

  function handleChangeWbFinal(i, f, v) {
    setWbFinalMatches((p) => updateMatch(p, i, f, v));
  }
  function handleSetWinnerWbFinal(i, w) {
    setWbFinalMatches((prev) => {
      const copy = setWinner(prev, i, w);
      const m = copy[i];
      const winner = m.winnerId;
      const loser =
        m.player1Id && m.player2Id && winner
          ? winner === m.player1Id
            ? m.player2Id
            : m.player1Id
          : null;

      if (winner || loser) {
        const lb4Winner = (computeWinnersFromMatches(lbMatches4) || [])[0];
        if (lb4Winner || loser) {
          setLbFinalMatches((lbPrev) => {
            const next = lbPrev.map((x) => ({ ...x }));
            if (!next[0]) next[0] = {};
            if (!next[0].player1Id && lb4Winner)
              next[0].player1Id = lb4Winner;
            if (!next[0].player2Id && loser) next[0].player2Id = loser;
            return next;
          });
        }
        if (winner) {
          setGrandFinalMatches((gfPrev) => {
            const next = gfPrev.map((x) => ({ ...x }));
            if (!next[0]) next[0] = {};
            if (!next[0].player1Id) next[0].player1Id = winner;
            return next;
          });
        }
      }
      return copy;
    });
  }
  function handleChangeLbFinal(i, f, v) {
    setLbFinalMatches((p) => updateMatch(p, i, f, v));
  }
  function handleSetWinnerLbFinal(i, w) {
    setLbFinalMatches((prev) => {
      const copy = setWinner(prev, i, w);
      const winner = copy[i].winnerId;
      if (winner) {
        setGrandFinalMatches((gfPrev) => {
          const next = gfPrev.map((x) => ({ ...x }));
          if (!next[0]) next[0] = {};
          if (!next[0].player2Id) next[0].player2Id = winner;
          return next;
        });
      }
      return copy;
    });
  }
  function handleChangeGrandFinal(i, f, v) {
    setGrandFinalMatches((p) => updateMatch(p, i, f, v));
  }
  function handleSetWinnerGrandFinal(i, w) {
    setGrandFinalMatches((p) => setWinner(p, i, w));
  }

  async function handleSave() {
    setSaving(true);
    setSaveMessage("");
    try {
      const uniq = (arr) =>
        Array.from(new Set((arr || []).filter(Boolean)));
      const ranking = {
        first: grandFinalMatches[0]?.winnerId || null,
        second: grandFinalMatches[0]?.winnerId
          ? grandFinalMatches[0].winnerId ===
            grandFinalMatches[0].player1Id
            ? grandFinalMatches[0].player2Id
            : grandFinalMatches[0].player1Id
          : null,
        third: lbFinalMatches[0]?.winnerId
          ? lbFinalMatches[0].winnerId === lbFinalMatches[0].player1Id
            ? lbFinalMatches[0].player2Id
            : lbFinalMatches[0].player1Id
          : null,
        fourth: lbMatches4[0]?.winnerId
          ? lbMatches4[0].winnerId === lbMatches4[0].player1Id
            ? lbMatches4[0].player2Id
            : lbMatches4[0].player1Id
          : null,
        fiveToSix: uniq(computeLosersFromMatches(lbMatches3b)),
        sevenToEight: uniq(computeLosersFromMatches(lbMatches3a)),
        nineToTwelve: uniq(computeLosersFromMatches(lbMatches2)),
        thirteenToSixteen: uniq(computeLosersFromMatches(lbMatches1)),
      };

      const res = await fetch(
        `/api/admin/brackets/${encodeURIComponent(
          tournamentId
        )}/save`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matches,
            matches2: qfMatches,
            matches3: sfMatches,
            lbMatches: lbMatches1,
            lbMatches2: lbMatches2,
            lbMatches3: lbMatches3a,
            lbMatches4: lbMatches3b,
            lbMatches5: lbMatches4,
            winnersFinal: wbFinalMatches,
            lbFinal: lbFinalMatches,
            grandFinal: grandFinalMatches,
            ranking,
          }),
        }
      );
      if (!res.ok) setSaveMessage("Failed to save.");
      else setSaveMessage("Saved.");
    } catch (err) {
      console.error(err);
      setSaveMessage("Error saving.");
    } finally {
      setSaving(false);
    }
  }
  async function handleReset() {
    if (!window.confirm("Reset bracket?")) return;
    setResetting(true);
    try {
      await fetch(
        `/api/admin/brackets/${encodeURIComponent(
          tournamentId
        )}/reset`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );
      window.location.reload();
    } catch (e) {
      console.error(e);
      setSaveMessage("Error resetting");
    } finally {
      setResetting(false);
    }
  }

  if (loading)
    return (
      <div className={styles["admin-container"]}>Loading bracket…</div>
    );

  return (
    <div className={styles["bracket-editor-wrapper"]}>
      {/* NEW: details + hub form */}
      <DetailsHubForm
        tournamentId={tournamentId}
        initialMeta={detailsMeta}
      />

      {/* Homepage metadata form */}
      <HomepageFeaturedForm
        tournamentId={tournamentId}
        initialMeta={featuredMeta}
      />

      <div className={styles["toolbar"]}>
        <button
          type="button"
          onClick={handleRandomizeR1}
          disabled={randomizing || players.length < 2}
          className={`${styles["btn"]} ${styles["btn-primary"]}`}
        >
          {randomizing ? "Randomizing..." : "🔀 Randomize R1"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={resetting}
          className={`${styles["btn"]} ${styles["btn-danger"]}`}
        >
          {resetting ? "Resetting..." : "🧹 Reset Bracket"}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`${styles["btn"]} ${styles["btn-success"]}`}
        >
          {saving ? "Saving..." : "💾 Save Changes"}
        </button>

        <div className={styles["stats-grid"]}>
          <div className={styles["stat-pill"]}>
            Placed: {usedCount}/{totalCount}
          </div>
          <div className={styles["stat-pill"]}>
            R1 Winners: {winnersChosenR1}
          </div>
          <div className={styles["stat-pill"]}>
            LB2 Winners: {computeWinnersFromMatches(lbMatches2).length}
          </div>
        </div>
      </div>

      <div className={styles["player-pool"]}>
        <div className={styles["pool-title"]}>Unplaced Players (Round 1)</div>
        {unusedPlayers.length === 0 ? (
          <span
            style={{
              color: "var(--text-muted)",
              fontSize: "0.85rem",
            }}
          >
            All players placed.
          </span>
        ) : (
          <div className={styles["tag-cloud"]}>
            {unusedPlayers.map((p) => (
              <div key={p._id} className={styles["player-tag"]}>
                <span>{p.ign || p.username || "Unknown"}</span>
                <button
                  type="button"
                  onClick={() => handleAddPlayerToBracket(p._id)}
                  className={styles["add-btn"]}
                >
                  +
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {duplicatePlayers.length > 0 && (
        <div
          className={`${styles["alert-box"]} ${styles["alert-danger"]}`}
        >
          <strong>Warning:</strong> Duplicates:{" "}
          {duplicatePlayers.map(
            (p) =>
              `${p.ign || p.username} (x${placedCount[p._id]}), `
          )}
        </div>
      )}

      <div className={styles["main-grid"]}>
        <div className={styles["bracket-column"]}>
          <div
            className={`${styles["column-header"]} ${styles["header-winners"]}`}
          >
            Winners Bracket
          </div>

          <RoundBlock
            title="Round 1"
            matches={matches}
            onChange={handleChangeMatch}
            onSetWinner={handleSetWinnerR1}
            allOptions={allOptions}
            labelFromId={labelFromId}
            showDupWarning
            placedCount={placedCount}
          />

          <button
            type="button"
            onClick={handleBuildQF}
            className={`${styles["btn"]} ${styles["btn-block"]} ${styles["btn-ghost"]} ${styles["btn-sm"]}`}
          >
            ▼ Build QF
          </button>
          <RoundBlock
            title="Quarterfinals"
            matches={qfMatches}
            onChange={handleChangeQFMatch}
            onSetWinner={handleSetWinnerQF}
            allOptions={allOptions}
            labelFromId={labelFromId}
          />

          <button
            type="button"
            onClick={handleBuildSF}
            className={`${styles["btn"]} ${styles["btn-block"]} ${styles["btn-ghost"]} ${styles["btn-sm"]}`}
          >
            ▼ Build SF
          </button>
          <RoundBlock
            title="Semifinals"
            matches={sfMatches}
            onChange={handleChangeSFMatch}
            onSetWinner={handleSetWinnerSF}
            allOptions={allOptions}
            labelFromId={labelFromId}
          />
        </div>

        <div className={styles["bracket-column"]}>
          <div
            className={`${styles["column-header"]} ${styles["header-losers"]}`}
          >
            Losers Bracket
          </div>

          <button
            type="button"
            onClick={handleRandomizeLB1}
            className={`${styles["btn"]} ${styles["btn-block"]} ${styles["btn-ghost"]} ${styles["btn-sm"]}`}
          >
            ▼ Build LB1 from R1 Losers
          </button>
          <RoundBlock
            title="LB Round 1"
            matches={lbMatches1}
            onChange={handleChangeLbMatch1}
            onSetWinner={handleSetWinnerLB1}
            allOptions={allOptions}
            labelFromId={labelFromId}
          />

          <button
            type="button"
            onClick={handleBuildLB2}
            className={`${styles["btn"]} ${styles["btn-block"]} ${styles["btn-ghost"]} ${styles["btn-sm"]}`}
          >
            ▼ Build LB2
          </button>
          <RoundBlock
            title="LB Round 2"
            matches={lbMatches2}
            onChange={handleChangeLbMatch2}
            onSetWinner={handleSetWinnerLB2}
            allOptions={allOptions}
            labelFromId={labelFromId}
          />

          <button
            type="button"
            onClick={handleBuildLB3A}
            className={`${styles["btn"]} ${styles["btn-block"]} ${styles["btn-ghost"]} ${styles["btn-sm"]}`}
          >
            ▼ Build LB3A
          </button>
          <RoundBlock
            title="LB Round 3A"
            matches={lbMatches3a}
            onChange={handleChangeLbMatch3A}
            onSetWinner={handleSetWinnerLB3A}
            allOptions={allOptions}
            labelFromId={labelFromId}
          />

          <button
            type="button"
            onClick={handleBuildLB3B}
            className={`${styles["btn"]} ${styles["btn-block"]} ${styles["btn-ghost"]} ${styles["btn-sm"]}`}
          >
            ▼ Build LB3B
          </button>
          <RoundBlock
            title="LB Round 3B"
            matches={lbMatches3b}
            onChange={handleChangeLbMatch3B}
            onSetWinner={handleSetWinnerLB3B}
            allOptions={allOptions}
            labelFromId={labelFromId}
          />

          <button
            type="button"
            onClick={handleBuildLB4}
            className={`${styles["btn"]} ${styles["btn-block"]} ${styles["btn-ghost"]} ${styles["btn-sm"]}`}
          >
            ▼ Build LB4
          </button>
          <RoundBlock
            title="LB Round 4"
            matches={lbMatches4}
            onChange={handleChangeLbMatch4}
            onSetWinner={handleSetWinnerLB4}
            allOptions={allOptions}
            labelFromId={labelFromId}
          />
        </div>
      </div>

      <div className={styles["finals-section"]}>
        <div
          className={`${styles["column-header"]} ${styles["header-finals"]}`}
        >
          Championship Finals
        </div>
        <div className={styles["finals-grid"]}>
          <RoundBlock
            title="Winners Final"
            matches={wbFinalMatches}
            onChange={handleChangeWbFinal}
            onSetWinner={handleSetWinnerWbFinal}
            allOptions={allOptions}
            labelFromId={labelFromId}
          />
          <RoundBlock
            title="Losers Final"
            matches={lbFinalMatches}
            onChange={handleChangeLbFinal}
            onSetWinner={handleSetWinnerLbFinal}
            allOptions={allOptions}
            labelFromId={labelFromId}
          />
          <RoundBlock
            title="Grand Final"
            matches={grandFinalMatches}
            onChange={handleChangeGrandFinal}
            onSetWinner={handleSetWinnerGrandFinal}
            allOptions={allOptions}
            labelFromId={labelFromId}
          />
        </div>
      </div>

      {(saveMessage || saving) && (
        <div className={styles["save-bar"]}>
          <span className={styles["save-msg"]}>{saveMessage}</span>
          {saving && <span>Processing...</span>}
        </div>
      )}
    </div>
  );
}

// ---------- ROUND BLOCK ----------
function RoundBlock({
  title,
  matches,
  onChange,
  onSetWinner,
  allOptions,
  labelFromId,
  showDupWarning = false,
  placedCount = {},
}) {
  if (!matches || matches.length === 0) return null;

  return (
    <div className={styles["round-section"]}>
      <h3 className={styles["round-title"]}>{title}</h3>
      <div className={styles["match-list"]}>
        {matches.map((m, i) => {
          const isWinnerP1 = m.winnerId === m.player1Id && !!m.player1Id;
          const isWinnerP2 = m.winnerId === m.player2Id && !!m.player2Id;
          const p1Dup =
            showDupWarning &&
            m.player1Id &&
            placedCount[m.player1Id] > 1;
          const p2Dup =
            showDupWarning &&
            m.player2Id &&
            placedCount[m.player2Id] > 1;

          return (
            <div key={i} className={styles["match-card"]}>
              <div className={styles["match-header"]}>
                <span>Match {i + 1}</span>
                {(p1Dup || p2Dup) && (
                  <span className={styles["dup-warning"]}>
                    ⚠ Duplicate
                  </span>
                )}
              </div>
              <div className={styles["match-row"]}>
                <select
                  value={m.player1Id || ""}
                  onChange={(e) =>
                    onChange(
                      i,
                      "player1Id",
                      e.target.value || null
                    )
                  }
                  className={`${styles["form-select"]} ${
                    p1Dup ? styles["error"] : ""
                  }`}
                >
                  <option value="">-- Empty --</option>
                  {allOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onSetWinner(i, "p1")}
                  disabled={!m.player1Id}
                  className={`${styles["winner-btn"]} ${
                    isWinnerP1 ? styles["active"] : ""
                  }`}
                >
                  Win
                </button>
              </div>
              <div className={styles["match-row"]}>
                <select
                  value={m.player2Id || ""}
                  onChange={(e) =>
                    onChange(
                      i,
                      "player2Id",
                      e.target.value || null
                    )
                  }
                  className={`${styles["form-select"]} ${
                    p2Dup ? styles["error"] : ""
                  }`}
                >
                  <option value="">-- Empty --</option>
                  {allOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onSetWinner(i, "p2")}
                  disabled={!m.player2Id}
                  className={`${styles["winner-btn"]} ${
                    isWinnerP2 ? styles["active"] : ""
                  }`}
                >
                  Win
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
