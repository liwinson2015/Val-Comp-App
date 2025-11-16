// pages/admin/brackets/[tournamentId].js
import React, { useEffect, useState } from "react";
import { getCurrentPlayerFromReq } from "../../../lib/getCurrentPlayer";
import { connectToDatabase } from "../../../lib/mongodb";
import Player from "../../../models/Player";

// ---------- SERVER SIDE ----------
export async function getServerSideProps({ req, params }) {
  const player = await getCurrentPlayerFromReq(req);

  // Not logged in → go login, then back here
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

  // Not admin → back to home
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

  // Find all players who have a registration for this tournamentId
  const players = await Player.find({
    "registeredFor.tournamentId": tournamentId,
  }).lean();

  const playerRows = players.map((p) => {
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

  return {
    props: {
      tournamentId,
      players: playerRows,
    },
  };
}

// ---------- CLIENT SIDE BRACKET (EDITABLE) ----------
function BracketEditor({ tournamentId, players }) {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]); // local editable round 1
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [randomizing, setRandomizing] = useState(false);

  // lookup: playerId -> "IGN (username)"
  const idToLabel = {};
  for (const p of players || []) {
    const base = p.ign || p.username || "Unknown";
    const extra = p.username && p.ign ? ` (${p.username})` : "";
    idToLabel[p._id] = `${base}${extra}`;
  }

  const allOptions = players.map((p) => ({
    value: p._id,
    label: idToLabel[p._id],
  }));

  // Load current saved bracket (round 1) from API
  useEffect(() => {
    async function loadBracket() {
      try {
        const res = await fetch(
          `/api/admin/brackets/${encodeURIComponent(tournamentId)}/get`
        );
        const data = await res.json();
        const bracket = data.bracket || null;

        if (!bracket || !Array.isArray(bracket.rounds) || bracket.rounds.length === 0) {
          setMatches([]);
        } else {
          const round1 =
            bracket.rounds.find((r) => r.roundNumber === 1) ||
            bracket.rounds[0];
          setMatches(round1.matches || []);
        }
      } catch (err) {
        console.error("Failed to load bracket", err);
        setMatches([]);
      } finally {
        setLoading(false);
      }
    }

    loadBracket();
  }, [tournamentId]);

  function handleChangeMatch(index, field, value) {
    setMatches((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value || null };
      return copy;
    });
  }

  async function handleRandomize() {
    setRandomizing(true);
    setSaveMessage("");
    try {
      const res = await fetch(
        `/api/admin/brackets/${encodeURIComponent(tournamentId)}/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setSaveMessage(data.error || "Failed to randomize bracket.");
      } else {
        // 🔥 IMPORTANT: only update local state, do NOT save to DB
        setMatches(data.matches || []);
        setSaveMessage("Random layout generated (not saved yet).");
      }
    } catch (err) {
      console.error("Randomize error", err);
      setSaveMessage("Error generating random layout.");
    } finally {
      setRandomizing(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveMessage("");
    try {
      const res = await fetch(
        `/api/admin/brackets/${encodeURIComponent(tournamentId)}/save`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matches }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSaveMessage(err.error || "Failed to save bracket.");
      } else {
        setSaveMessage("Bracket layout saved.");
      }
    } catch (err) {
      console.error("Save error", err);
      setSaveMessage("Error saving bracket.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading bracket...</p>;

  // Set of player IDs currently used in any slot
  const usedIds = new Set();
  matches.forEach((m) => {
    if (m.player1Id) usedIds.add(m.player1Id);
    if (m.player2Id) usedIds.add(m.player2Id);
  });

  return (
    <div style={{ marginTop: 20 }}>
      <p style={{ color: "#bbb", marginBottom: 12 }}>
        This is your editable Round 1 bracket. You can randomize once as a
        starting point, then manually adjust any slot. Nothing is saved until
        you click &quot;Save bracket layout&quot;.
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <button
          type="button"
          onClick={handleRandomize}
          disabled={randomizing || players.length < 2}
          style={{
            background: randomizing ? "#1d4ed8" : "#2563eb",
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            color: "white",
            cursor:
              randomizing || players.length < 2 ? "not-allowed" : "pointer",
            fontSize: "0.9rem",
            fontWeight: 600,
          }}
        >
          {randomizing ? "Randomizing..." : "🔀 Randomize from registrations"}
        </button>

        <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
          Used in bracket: {usedIds.size} / {players.length} players
        </span>
      </div>

      {(!matches || matches.length === 0) && (
        <p style={{ color: "#9ca3af", marginBottom: 16 }}>
          No Round 1 bracket yet. Click &quot;Randomize from registrations&quot; to
          create a layout, then adjust it as needed and save.
        </p>
      )}

      {matches && matches.length > 0 && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {matches.map((m, i) => (
              <div
                key={i}
                style={{
                  border: "1px solid #333",
                  borderRadius: 8,
                  padding: "10px 12px",
                  background: "#111827",
                }}
              >
                <div
                  style={{
                    marginBottom: 6,
                    fontSize: "0.9rem",
                    color: "#9ca3af",
                  }}
                >
                  Match {i + 1}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <select
                    value={m.player1Id || ""}
                    onChange={(e) =>
                      handleChangeMatch(i, "player1Id", e.target.value || null)
                    }
                    style={{
                      flex: "1 1 200px",
                      background: "#020617",
                      color: "white",
                      borderRadius: 6,
                      border: "1px solid #374151",
                      padding: "6px 8px",
                      fontSize: "0.9rem",
                    }}
                  >
                    <option value="">(empty slot)</option>
                    {allOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
                    vs
                  </span>

                  <select
                    value={m.player2Id || ""}
                    onChange={(e) =>
                      handleChangeMatch(i, "player2Id", e.target.value || null)
                    }
                    style={{
                      flex: "1 1 200px",
                      background: "#020617",
                      color: "white",
                      borderRadius: 6,
                      border: "1px solid #374151",
                      padding: "6px 8px",
                      fontSize: "0.9rem",
                    }}
                  >
                    <option value="">(BYE / empty)</option>
                    {allOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              marginTop: 20,
              background: saving ? "#1d4ed8" : "#2563eb",
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              color: "white",
              cursor: saving ? "default" : "pointer",
              fontSize: "0.95rem",
              fontWeight: 600,
            }}
          >
            {saving ? "Saving..." : "💾 Save bracket layout"}
          </button>
        </>
      )}

      {saveMessage && (
        <p style={{ marginTop: 8, fontSize: "0.9rem", color: "#a5b4fc" }}>
          {saveMessage}
        </p>
      )}
    </div>
  );
}

// ---------- MAIN PAGE ----------
export default function TournamentPlayersPage({ tournamentId, players }) {
  return (
    <div style={{ padding: "40px 20px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.6rem", marginBottom: 8 }}>
        Players in {tournamentId}
      </h1>
      <p style={{ marginBottom: 16, color: "#ccc" }}>
        This is the full list of players registered for this tournament.
      </p>

      <a
        href="/admin/brackets"
        style={{
          display: "inline-block",
          marginBottom: 20,
          fontSize: "0.9rem",
          color: "#93c5fd",
          textDecoration: "none",
        }}
      >
        ← Back to all tournaments
      </a>

      {players.length === 0 ? (
        <p>No players registered for this tournament.</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: 8,
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  padding: "8px 6px",
                  borderBottom: "1px solid #333",
                }}
              >
                Username
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "8px 6px",
                  borderBottom: "1px solid #333",
                }}
              >
                IGN
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "8px 6px",
                  borderBottom: "1px solid #333",
                }}
              >
                Rank
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "8px 6px",
                  borderBottom: "1px solid #333",
                }}
              >
                Discord ID
              </th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p._id}>
                <td
                  style={{
                    padding: "8px 6px",
                    borderBottom: "1px solid #222",
                  }}
                >
                  {p.username}
                </td>
                <td
                  style={{
                    padding: "8px 6px",
                    borderBottom: "1px solid #222",
                  }}
                >
                  {p.ign}
                </td>
                <td
                  style={{
                    padding: "8px 6px",
                    borderBottom: "1px solid #222",
                  }}
                >
                  {p.rank}
                </td>
                <td
                  style={{
                    padding: "8px 6px",
                    borderBottom: "1px solid #222",
                    fontSize: "0.8rem",
                    color: "#9ca3af",
                  }}
                >
                  {p.discordId}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Editable bracket section */}
      <hr style={{ margin: "40px 0", borderColor: "#333" }} />
      <h2 style={{ fontSize: "1.4rem", marginBottom: 12 }}>
        Round 1 – Editable Bracket
      </h2>
      <BracketEditor tournamentId={tournamentId} players={players} />
    </div>
  );
}
