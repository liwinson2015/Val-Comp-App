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

  // Convert to array + sort: most players first
  const tournaments = Object.values(tournamentsMap).sort(
    (a, b) => b.count - a.count
  );

  return {
    props: {
      tournaments,
    },
  };
}

export default function AdminBracketsPage({ tournaments }) {
  return (
    <main className="admin-shell">
      <section className="admin-header">
        <div className="admin-breadcrumb">Admin / Brackets</div>
        <h1 className="admin-title">Manage Brackets</h1>
        <p className="admin-subtitle">
          Choose a tournament to see everyone registered and build or edit the
          bracket.
        </p>
      </section>

      <section className="admin-section">
        <div className="admin-section-header">
          <h2 className="admin-section-title">Tournaments</h2>
          <span className="admin-section-meta">
            {tournaments.length} event
            {tournaments.length === 1 ? "" : "s"} with registrations
          </span>
        </div>

        {tournaments.length === 0 ? (
          <div className="admin-empty">
            <p>No registrations found yet.</p>
            <p className="admin-empty-sub">
              Once players register for a tournament, it will appear here for
              bracket management.
            </p>
          </div>
        ) : (
          <div className="admin-tournament-list">
            {tournaments.map((t) => {
              const encodedId = encodeURIComponent(t.tournamentId);
              return (
                <article
                  key={t.tournamentId}
                  className="admin-tournament-card"
                >
                  <div className="admin-tournament-main">
                    <div className="admin-tournament-chip">Tournament</div>
                    <h3 className="admin-tournament-name">
                      {t.tournamentId}
                    </h3>
                    {/* If you later add a nicer display name, you can put it here */}
                    {/* <p className="admin-tournament-id">{t.displayName}</p> */}
                  </div>

                  <div className="admin-tournament-meta">
                    <div className="admin-tournament-stat">
                      <span className="stat-label">Registered</span>
                      <span className="stat-value">
                        {t.count}
                        <span className="stat-unit">
                          {" "}
                          player{t.count === 1 ? "" : "s"}
                        </span>
                      </span>
                    </div>
                    <a
                      href={`/admin/brackets/${encodedId}`}
                      className="admin-tournament-btn"
                    >
                      View players &amp; bracket
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
