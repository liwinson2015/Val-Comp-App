// pages/account/history.js
import React from "react";
import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";
import TournamentState from "../../models/TournamentState";
import styles from "../../styles/History.module.css";
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

  if (!playerId) {
    const next = "/account/history";
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
    const next = "/account/history";
    return {
      redirect: {
        destination: `/api/auth/discord?next=${encodeURIComponent(next)}`,
        permanent: false,
      },
    };
  }

  const rawHistory = Array.isArray(player.tournamentHistory)
    ? player.tournamentHistory
    : [];

  // --- load TournamentState for all tournaments in this player's history ---
  const idsSet = new Set(
    rawHistory
      .map((h) => h.tournamentId || h.id || null)
      .filter(Boolean)
  );
  const ids = Array.from(idsSet);

  let stateById = {};
  if (ids.length > 0) {
    const states = await TournamentState.find({
      tournamentId: { $in: ids },
    }).lean();

    stateById = states.reduce((acc, s) => {
      acc[s.tournamentId] = s;
      return acc;
    }, {});
  }

  const history = rawHistory
    .map((h) => {
      const id = h.tournamentId || h.id || "";
      if (!id) return null;

      const state = stateById[id] || null;
      const meta = catalog[id] || {};

      // Prefer TournamentState for display info
      const name =
        state?.displayName || meta.name || h.name || "Tournament";
      const game =
        state?.displayGameLabel || meta.game || h.game || "Valorant";
      const mode =
        state?.displayModeLabel || meta.mode || h.mode || "—";

      // What we *show* in the Date column
      const displayDate =
        state?.displayTime ||
        (h.endedAt
          ? new Date(h.endedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : meta.start
          ? new Date(meta.start).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : h.date
          ? new Date(h.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "—");

      // What we use for sorting (real time value)
      const sortTimeSource =
        h.endedAt || state?.endedAt || meta.start || h.date || null;
      const sortTime = sortTimeSource
        ? new Date(sortTimeSource).getTime()
        : 0;

      // Where "View Results" goes.
      // For now: prefer lib/tournaments.bracketUrl, otherwise
      // fall back to a convention route like /brackets/:id
      const bracketUrl =
        meta.bracketUrl || `/brackets/${encodeURIComponent(id)}`;

      return {
        id,
        name,
        game,
        mode,
        placement: h.placement || "",
        ign: h.ign || "",
        displayDate,
        sortTime,
        bracketUrl,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.sortTime - a.sortTime);

  return {
    props: {
      history,
    },
  };
}

export default function TournamentHistoryPage({ history }) {
  const count = history.length;

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroBadge}>// TOURNAMENT_HISTORY</div>
          <h1 className={styles.heroTitle}>Match Records</h1>
          <p className={styles.heroSubtitle}>
            View your past events, placements, and jump back into the results.
          </p>
        </section>

        {/* Header with count */}
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            Completed Tournaments
            <span className={styles.countBadge}>{count}</span>
          </div>
        </div>

        {/* History table */}
        {count === 0 ? (
          <div className={styles.emptyState}>
            <h2>No completed tournaments yet</h2>
            <p>
              Once brackets are ended, they will appear here with your
              placement.
            </p>
          </div>
        ) : (
          <div className={styles.tableCard}>
            {/* Header row */}
            <div className={styles.tableHeadRow}>
              <div>Name</div>
              <div>Game</div>
              <div>ID</div>
              <div>IGN</div>
              <div>Placement</div>
              <div>Date</div>
              <div className={styles.headResults}>Results</div>
            </div>

            {/* Rows */}
            {history.map((h) => {
              const hasBracket = h.bracketUrl && h.bracketUrl !== "#";

              return (
                <div
                  key={h.id + h.displayDate}
                  className={styles.tableRow}
                >
                  <div className={styles.cellName}>{h.name}</div>
                  <div className={styles.cellGame}>{h.game}</div>
                  <div className={styles.cellId}>{h.id || "—"}</div>
                  <div className={styles.cellIgn}>{h.ign || "—"}</div>
                  <div className={styles.cellPlacement}>
                    {h.placement || "—"}
                  </div>
                  <div className={styles.cellDate}>
                    {h.displayDate || "—"}
                  </div>
                  <div className={styles.cellResults}>
                    {hasBracket ? (
                      <a
                        href={h.bracketUrl}
                        className={styles.btnPrimary}
                      >
                        View Results
                      </a>
                    ) : (
                      <span className={styles.btnSecondary}>
                        No Bracket
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <footer className={styles.footer}>
          <div>VALCOMP // TOURNAMENT HISTORY</div>
          <div style={{ opacity: 0.5, marginTop: 5 }}>
            Brackets are archived when tournaments end.
          </div>
        </footer>
      </div>
    </div>
  );
}
