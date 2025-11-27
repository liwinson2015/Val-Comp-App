// pages/admin/brackets.js
import React from "react";
import { getCurrentPlayerFromReq } from "../../lib/getCurrentPlayer";
import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";
import TournamentState from "../../models/TournamentState";

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

  // ---- 1) Build a map of registration counts per tournamentId ----
  const players = await Player.find({
    "registeredFor.0": { $exists: true },
  }).lean();

  const countMap = {}; // { [tournamentId]: number }

  for (const p of players) {
    if (!Array.isArray(p.registeredFor)) continue;

    for (const reg of p.registeredFor) {
      const tid = reg?.tournamentId;
      if (!tid) continue;
      countMap[tid] = (countMap[tid] || 0) + 1;
    }
  }

  // ---- 2) Read TournamentState for all tournaments you’ve touched ----
  const stateDocs = await TournamentState.find({}).lean();

  const byId = {};
  const tournaments = [];

  // First, create entries from TournamentState (these will include completed ones)
  for (const s of stateDocs) {
    const tid = s.tournamentId;
    if (!tid) continue;

    const item = {
      tournamentId: tid,
      count: countMap[tid] || 0,
      status: s.status || "ongoing", // ongoing / completed
      isFeatured: !!s.isFeatured,
      // you can surface more fields later if you want (displayName, etc.)
    };
    tournaments.push(item);
    byId[tid] = item;
  }

  // Then, add any tournaments that only exist via registrations (no TournamentState yet)
  for (const tid of Object.keys(countMap)) {
    if (!byId[tid]) {
      tournaments.push({
        tournamentId: tid,
        count: countMap[tid] || 0,
        status: "ongoing",
        isFeatured: false,
      });
    }
  }

  // ---- 3) Sort: ongoing → upcoming → completed, then by player count desc ----
  const statusOrder = {
    ongoing: 0,
    upcoming: 1,
    completed: 2,
  };

  tournaments.sort((a, b) => {
    const sa = statusOrder[a.status] ?? 99;
    const sb = statusOrder[b.status] ?? 99;
    if (sa !== sb) return sa - sb;
    return (b.count || 0) - (a.count || 0);
  });

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
        <h1 className="admin-title">Manage Tournaments</h1>
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
            {tournaments.length === 1 ? "" : "s"} with registrations or state
          </span>
        </div>

        {tournaments.length === 0 ? (
          <div className="admin-empty">
            <p>No tournaments found yet.</p>
            <p className="admin-empty-sub">
              Once players register for a tournament or you manage its state,
              it will appear here for bracket management.
            </p>
          </div>
        ) : (
          <div className="admin-tournament-list">
            {tournaments.map((t) => {
              const encodedId = encodeURIComponent(t.tournamentId);

              const statusLabel =
                t.status === "completed"
                  ? "Completed"
                  : t.status === "ongoing"
                  ? "Upcoming"
                  : "Ongoing";

              return (
                <article
                  key={t.tournamentId}
                  className="admin-tournament-card"
                >
                  <div className="admin-tournament-main">
                    <div className="admin-tournament-chip">
                      {statusLabel}
                      {t.isFeatured && (
                        <span
                          style={{
                            marginLeft: "0.5rem",
                            fontSize: "0.75rem",
                            opacity: 0.85,
                          }}
                        >
                          ⭐ Featured
                        </span>
                      )}
                    </div>
                    <h3 className="admin-tournament-name">
                      {t.tournamentId}
                    </h3>
                    {/* later you can show a nicer display name from TournamentState here */}
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
