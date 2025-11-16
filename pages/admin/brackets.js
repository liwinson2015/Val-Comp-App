// pages/admin/brackets.js
import React from "react";
import { getCurrentPlayerFromReq } from "../../lib/getCurrentPlayer";
import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";

export async function getServerSideProps({ req }) {
  const player = await getCurrentPlayerFromReq(req);

  // Not logged in → go login, then back to /admin/brackets
  if (!player) {
    return {
      redirect: {
        destination: "/api/auth/discord?next=/admin/brackets",
        permanent: false,
      },
    };
  }

  // Logged in but not admin → kick to home
  if (!player.isAdmin) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  await connectToDatabase();

  // Get all players that have at least one registration
  const players = await Player.find({
    "registeredFor.0": { $exists: true },
  }).lean();

  // Group by tournamentId
  const tournamentsMap = {};

  for (const p of players) {
    if (!Array.isArray(p.registeredFor)) continue;

    for (const reg of p.registeredFor) {
      const tid = reg?.tournamentId;
      if (!tid) continue;

      if (!tournamentsMap[tid]) {
        tournamentsMap[tid] = {
          tournamentId: tid,
          count: 0,
        };
      }
      tournamentsMap[tid].count += 1;
    }
  }

  const tournaments = Object.values(tournamentsMap).sort((a, b) =>
    a.tournamentId.localeCompare(b.tournamentId)
  );

  return {
    props: {
      tournaments,
    },
  };
}

export default function AdminBracketsPage({ tournaments }) {
  return (
    <div style={{ padding: "40px 20px", maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.8rem", marginBottom: 8 }}>Admin – Brackets</h1>
      <p style={{ marginBottom: 24, color: "#ccc" }}>
        Click a tournament to view all players registered for it. Next, we&apos;ll
        add tools to place them into brackets.
      </p>

      {tournaments.length === 0 ? (
        <p>No registrations found yet.</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: 16,
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
                Tournament ID
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "8px 6px",
                  borderBottom: "1px solid #333",
                }}
              >
                # of Players
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "8px 6px",
                  borderBottom: "1px solid #333",
                }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {tournaments.map((t) => {
              const encodedId = encodeURIComponent(t.tournamentId);
              return (
                <tr key={t.tournamentId}>
                  <td
                    style={{
                      padding: "8px 6px",
                      borderBottom: "1px solid #222",
                    }}
                  >
                    {t.tournamentId}
                  </td>
                  <td
                    style={{
                      padding: "8px 6px",
                      textAlign: "right",
                      borderBottom: "1px solid #222",
                    }}
                  >
                    {t.count}
                  </td>
                  <td
                    style={{
                      padding: "8px 6px",
                      textAlign: "right",
                      borderBottom: "1px solid #222",
                    }}
                  >
                    <a
                      href={`/admin/brackets/${encodedId}`}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        background: "#1f2933",
                        border: "1px solid #374151",
                        color: "white",
                        textDecoration: "none",
                        fontSize: "0.85rem",
                      }}
                    >
                      View players
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
