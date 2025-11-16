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

// ---------- CLIENT SIDE BRACKET DISPLAY ----------
function BracketDisplay({ tournamentId }) {
  const [loading, setLoading] = useState(true);
  const [bracket, setBracket] = useState(null);

  useEffect(() => {
    async function loadBracket() {
      try {
        const res = await fetch(
          `/api/admin/brackets/${encodeURIComponent(tournamentId)}/get`
        );
        const data = await res.json();
        setBracket(data.bracket || null);
      } catch (err) {
        console.error("Failed to load bracket", err);
        setBracket(null);
      } finally {
        setLoading(false);
      }
    }

    loadBracket();
  }, [tournamentId]);

  if (loading) return <p>Loading bracket...</p>;
  if (!bracket) return <p>No bracket generated yet.</p>;

  return (
    <div style={{ marginTop: 20 }}>
      {bracket.rounds.map((round) => (
        <div key={round.roundNumber} style={{ marginBottom: 30 }}>
          <h3 style={{ marginBottom: 8 }}>Round {round.roundNumber}</h3>
          <ul style={{ listStyle: "none", paddingLeft: 0 }}>
            {round.matches.map((m, i) => (
              <li key={i} style={{ marginBottom: 8 }}>
                <span>
                  {m.player1Id || "TBD"} vs{" "}
                  {m.player2Id ? m.player2Id : "BYE"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
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

      {/* Generate Bracket button */}
      <form
        method="POST"
        action={`/api/admin/brackets/${encodeURIComponent(
          tournamentId
        )}/generate`}
        style={{ marginBottom: "20px" }}
      >
        <button
          type="submit"
          style={{
            background: "#2563eb",
            padding: "10px 16px",
            borderRadius: "8px",
            border: "none",
            color: "white",
            cursor: "pointer",
            fontSize: "0.95rem",
            fontWeight: 600,
          }}
        >
          🔀 Generate Round 1 Bracket
        </button>
      </form>

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

      {/* Bracket display section */}
      <hr style={{ margin: "40px 0", borderColor: "#333" }} />
      <h2 style={{ fontSize: "1.4rem", marginBottom: 12 }}>
        Generated Bracket
      </h2>
      <BracketDisplay tournamentId={tournamentId} />
    </div>
  );
}
