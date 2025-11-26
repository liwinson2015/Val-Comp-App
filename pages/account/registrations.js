// pages/account/registrations.js
import React from "react";
import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";
import TournamentState from "../../models/TournamentState"; // NEW
import styles from "../../styles/Registrations.module.css";
import { tournamentsById as catalog } from "../../lib/tournaments";

function parseCookies(cookieHeader = "") {
  return Object.fromEntries(
    (cookieHeader || "")
      .split(";")
      .filter(Boolean)
      .map((c) => {
        const [k, ...rest] = c.trim().split("=");
        return [k, decodeURIComponent(rest.join("=") || "")];
      })
  );
}

export async function getServerSideProps({ req }) {
  const cookies = parseCookies(req.headers.cookie || "");
  const playerId = cookies.playerId || null;

  // Require login
  if (!playerId) {
    const next = "/account/registrations";
    return {
      redirect: {
        destination: `/api/auth/discord?next=${encodeURIComponent(next)}`,
        permanent: false,
      },
    };
  }

  await connectToDatabase();
  const player = await Player.findById(playerId).lean();

  if (!player) {
    const next = "/account/registrations";
    return {
      redirect: {
        destination: `/api/auth/discord?next=${encodeURIComponent(next)}`,
        permanent: false,
      },
    };
  }

  const rawRegs = Array.isArray(player.registeredFor)
    ? player.registeredFor
    : [];

  // --- NEW: pull TournamentState for these tournamentIds ---
  const tournamentIds = [
    ...new Set(
      rawRegs
        .map((r) => r.tournamentId || r.id || "")
        .filter((id) => !!id)
    ),
  ];

  let statesById = {};
  if (tournamentIds.length > 0) {
    const states = await TournamentState.find({
      tournamentId: { $in: tournamentIds },
    }).lean();

    statesById = states.reduce((acc, s) => {
      if (s.tournamentId) {
        acc[s.tournamentId] = s;
      }
      return acc;
    }, {});
  }

  const registrations = rawRegs.map((r) => {
    const id = r.tournamentId || r.id || "";
    const meta = catalog[id] || {};
    const state = statesById[id] || {};

    // ---- STATUS from TournamentState.status ----
    const rawStatus =
      state.status || r.status || meta.status || "ongoing";

    let statusLabel = "Active";
    if (rawStatus === "completed") statusLabel = "Completed";
    else if (rawStatus === "upcoming") statusLabel = "Upcoming";
    else statusLabel = "Active";

    // ---- NAME from TournamentState.displayName (fallback to old behavior) ----
    const name =
      state.displayName ||
      meta.name ||
      r.name ||
      "Tournament";

    // ---- GAME (for now still from catalog/player) ----
    const game = meta.game || r.game || "Valorant";

    // ---- FORMAT / MODE from TournamentState.displayModeLabel ----
    const mode =
      state.displayModeLabel ||
      meta.mode ||
      r.mode ||
      "5v5";

    // ---- START TIME: use state.startTime if you add it later, otherwise fall back ----
    const start =
      state.startTime || meta.start || r.start || null;

    // ---- URLs (unchanged, still from catalog or registration) ----
    const detailsUrl = meta.detailsUrl || r.detailsUrl || "#";
    const bracketUrl = meta.bracketUrl || r.bracketUrl || "#";

    return {
      id,
      name,
      game,
      mode,
      status: statusLabel,
      start,
      detailsUrl,
      bracketUrl,
    };
  });

  return { props: { registrations } };
}

export default function MyRegistrations({ registrations }) {
  const count = registrations.length;

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroBadge}>// PLAYER_DASHBOARD</div>
          <h1 className={styles.heroTitle}>My Events</h1>
          <p className={styles.heroSubtitle}>
            Manage your active tournament registrations and view brackets.
          </p>
        </section>

        {/* Dashboard Header */}
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            Active Tournaments
            <span className={styles.countBadge}>{count}</span>
          </div>
          {/* Optional: Add filters here later */}
        </div>

        {/* Tournament Grid */}
        {count === 0 ? (
          <div className={styles.emptyState}>
            <h2>No active registrations</h2>
            <p>Join a tournament to see it appear here.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {registrations.map((r) => (
              <div key={r.id} className={styles.card}>
                {/* Card Top: Status & Metadata */}
                <div className={styles.cardStatusRow}>
                  <div className={styles.statusIndicator}>
                    <span className={styles.statusDot}></span>
                    {r.status}
                  </div>
                  <div className={styles.gameIcon}>{r.game}</div>
                </div>

                {/* Card Body: Title & Stats */}
                <div className={styles.cardBody}>
                  <h2 className={styles.cardTitle}>{r.name}</h2>
                  <span className={styles.cardId}>ID: {r.id}</span>

                  <div className={styles.cardStats}>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Format</span>
                      <span className={styles.statValue}>{r.mode}</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Start Time</span>
                      <span className={styles.statValue}>
                        {r.start
                          ? new Date(r.start).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : "TBD"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Actions */}
                <div className={styles.cardActions}>
                  <a href={r.bracketUrl} className={styles.btnPrimary}>
                    Bracket
                  </a>
                  <a href={r.detailsUrl} className={styles.btnSecondary}>
                    Details
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <footer className={styles.footer}>
          <div>VALCOMP // COMPETITIVE PLATFORM</div>
          <div style={{ opacity: 0.5, marginTop: 5 }}>
            © 2025 ALL RIGHTS RESERVED
          </div>
        </footer>
      </div>
    </div>
  );
}
