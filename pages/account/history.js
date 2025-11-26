// pages/account/history.js
import React from "react";
import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";
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

  const history = rawHistory
    .map((h) => {
      const id = h.tournamentId || h.id || "";
      const meta = catalog[id] || {};

      const start = meta.start || h.endedAt || h.date || null;

      return {
        id,
        name: meta.name || h.name || "Tournament",
        game: meta.game || h.game || "Valorant",
        mode: meta.mode || h.mode || "—",
        start,
        placement: h.placement || "",
        ign: h.ign || "",
        bracketUrl: meta.bracketUrl || h.bracketUrl || "#",
      };
    })
    .sort((a, b) => {
      const da = a.start ? new Date(a.start).getTime() : 0;
      const db = b.start ? new Date(b.start).getTime() : 0;
      return db - da;
    });

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
          <div className={styles.heroBadge}>// PLAYER_HISTORY</div>
          <h1 className={styles.heroTitle}>Tournament History</h1>
          <p className={styles.heroSubtitle}>
            View your past events, placements, and results.
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
              Once brackets are ended, they will appear here with your placement.
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
              const dateStr = h.start
                ? new Date(h.start).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—";

              const hasBracket = h.bracketUrl && h.bracketUrl !== "#";

              return (
                <div key={h.id + dateStr} className={styles.tableRow}>
                  <div className={styles.cellName}>{h.name}</div>
                  <div className={styles.cellGame}>{h.game}</div>
                  <div className={styles.cellId}>{h.id || "—"}</div>
                  <div className={styles.cellIgn}>{h.ign || "—"}</div>
                  <div className={styles.cellPlacement}>
                    {h.placement || "—"}
                  </div>
                  <div className={styles.cellDate}>{dateStr}</div>
                  <div className={styles.cellResults}>
                    {hasBracket ? (
                      <a
                        href={h.bracketUrl}
                        className={styles.btnPrimary}
                      >
                        View Results
                      </a>
                    ) : (
                      <span className={styles.btnSecondary}>No Bracket</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <footer className={styles.footer}>
          <div>VALCOMP // COMPETITIVE PLATFORM</div>
          <div style={{ opacity: 0.5, marginTop: 5 }}>
            Past results are locked once brackets are ended.
          </div>
        </footer>
      </div>
    </div>
  );
}
