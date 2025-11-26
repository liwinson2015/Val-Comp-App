// pages/account/history.js
import React from "react";
import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";
import TournamentState from "../../models/TournamentState";
import Tournament from "../../models/Tournament";
import styles from "../../styles/TournamentHistory.module.css";

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

  const history = Array.isArray(player.tournamentHistory)
    ? player.tournamentHistory
    : [];

  if (history.length === 0) {
    return {
      props: {
        rows: [],
      },
    };
  }

  // Unique tournamentIds from history
  const tournamentIds = Array.from(
    new Set(
      history
        .map((h) => h.tournamentId)
        .filter((id) => typeof id === "string" && id.trim())
    )
  );

  // Read TournamentState for label info
  const states = await TournamentState.find({
    tournamentId: { $in: tournamentIds },
  }).lean();

  const stateById = {};
  for (const s of states) {
    stateById[s.tournamentId] = s;
  }

  // Also read Tournament for fallback name/game/mode if you want
  const tournaments = await Tournament.find({
    tournamentId: { $in: tournamentIds },
  }).lean();

  const tourneyById = {};
  for (const t of tournaments) {
    tourneyById[t.tournamentId] = t;
  }

  const rows = history
    .map((entry) => {
      const tId = entry.tournamentId || "";
      const state = stateById[tId] || null;
      const tourney = tourneyById[tId] || null;

      const name =
        (state && state.displayName) ||
        (tourney && tourney.name) ||
        tId ||
        "Tournament";

      const game =
        (state && state.displayGameLabel) ||
        (tourney && tourney.game) ||
        "Game";

      const mode =
        (state && state.displayModeLabel) ||
        (tourney && tourney.meta && tourney.meta.mode) ||
        "";

      const endedAt =
        entry.endedAt ||
        (state && state.endedAt) ||
        (tourney && tourney.updatedAt) ||
        null;

      const dateStr = endedAt
        ? new Date(endedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "—";

      const placement = entry.placement || "";

      // IGN – keep your fullIgn if present
      const ign = entry.fullIgn || entry.ign || "";

      // View results URL:
      // Prefer TournamentState.ctaPath, otherwise fallback.
      // For now, if nothing is set but this is your 1v1 skirmish,
      // we default to /valorant/bracket.
      let viewUrl = "#";
      if (state && state.ctaPath && state.ctaPath.trim()) {
        viewUrl = state.ctaPath.trim();
      } else if (tId === "VALO-SOLO-SKIRMISH-1") {
        viewUrl = "/valorant/bracket";
      }

      return {
        tournamentId: tId,
        name,
        game,
        mode,
        ign,
        placement,
        dateStr,
        viewUrl,
        rawEndedAt: endedAt ? new Date(endedAt).getTime() : 0,
      };
    })
    // sort newest first
    .sort((a, b) => b.rawEndedAt - a.rawEndedAt);

  return {
    props: {
      rows,
    },
  };
}

export default function TournamentHistoryPage({ rows }) {
  const count = rows.length;

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* Hero header */}
        <section className={styles.hero}>
          <div className={styles.heroBadge}>// TOURNAMENT_HISTORY</div>
          <h1 className={styles.heroTitle}>Match Records</h1>
          <p className={styles.heroSubtitle}>
            View your past events, placements, and jump back into the results.
          </p>
        </section>

        {/* Header row with count */}
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            Completed Tournaments
            <span className={styles.countBadge}>{count}</span>
          </div>
        </div>

        {count === 0 ? (
          <div className={styles.emptyState}>
            <h2>No finished tournaments yet</h2>
            <p>
              Once a bracket is completed, you&apos;ll see your history and
              placements here.
            </p>
          </div>
        ) : (
          <div className={styles.table}>
            {/* Table header */}
            <div className={`${styles.row} ${styles.headerRow}`}>
              <div className={styles.colName}>Name</div>
              <div className={styles.colGame}>Game</div>
              <div className={styles.colId}>ID</div>
              <div className={styles.colIgn}>IGN</div>
              <div className={styles.colPlacement}>Placement</div>
              <div className={styles.colDate}>Date</div>
              <div className={styles.colActions}></div>
            </div>

            {/* Table body */}
            {rows.map((r) => {
              const shortId = r.tournamentId
                ? r.tournamentId.slice(0, 10)
                : "—";

              // simple highlight for top placements
              let placementClass = styles.placementTag;
              if (r.placement.startsWith("1st")) {
                placementClass = `${styles.placementTag} ${styles.gold}`;
              } else if (r.placement.startsWith("2nd")) {
                placementClass = `${styles.placementTag} ${styles.silver}`;
              } else if (r.placement.startsWith("3rd")) {
                placementClass = `${styles.placementTag} ${styles.bronze}`;
              }

              return (
                <div key={`${r.tournamentId}-${r.dateStr}`} className={styles.row}>
                  <div className={styles.colName}>
                    <div className={styles.mainName}>{r.name}</div>
                    {r.mode && (
                      <div className={styles.subInfo}>{r.mode}</div>
                    )}
                  </div>
                  <div className={styles.colGame}>{r.game}</div>
                  <div className={styles.colId}>
                    <span className={styles.idChip}>{shortId}</span>
                  </div>
                  <div className={styles.colIgn}>{r.ign || "—"}</div>
                  <div className={styles.colPlacement}>
                    {r.placement ? (
                      <span className={placementClass}>{r.placement}</span>
                    ) : (
                      "—"
                    )}
                  </div>
                  <div className={styles.colDate}>{r.dateStr}</div>
                  <div className={styles.colActions}>
                    {r.viewUrl && r.viewUrl !== "#" && (
                      <a
                        href={r.viewUrl}
                        className={styles.viewBtn}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View Results
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
