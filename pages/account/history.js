// pages/account/history.js
import React from "react";
import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";
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

  // Enrich from catalog + sort newest → oldest
  const history = rawHistory
    .map((h) => {
      const id = h.tournamentId || h.id || "";
      const meta = catalog[id] || {};

      const start =
        meta.start ||
        h.endedAt ||
        h.date ||
        null;

      return {
        id,
        name: meta.name || h.name || "Tournament",
        game: meta.game || h.game || "Valorant",
        mode: meta.mode || h.mode || "—",
        start,
        placement: h.placement || "",       // "1st", "5th-6th", etc.
        ign: h.ign || "",
      };
    })
    .sort((a, b) => {
      const da = a.start ? new Date(a.start).getTime() : 0;
      const db = b.start ? new Date(b.start).getTime() : 0;
      return db - da;
    });

  // Simple stats for header
  const played = history.length;
  const wins = history.filter((h) => h.placement && h.placement.startsWith("1")).length;
  const top4 = history.filter((h) => {
    if (!h.placement) return false;
    // crude: treat anything starting with "1st", "2nd", "3rd", "4th" or "1st-4th" as top4
    return /^([1-4]th|[1-4]st|[1-4]nd|[1-4]rd)/.test(h.placement) || h.placement.includes("1st-4th");
  }).length;

  let bestPlacement = null;
  history.forEach((h) => {
    if (!h.placement) return;
    const match = h.placement.match(/^(\d+)/);
    if (!match) return;
    const num = Number(match[1]);
    if (!Number.isFinite(num)) return;
    if (bestPlacement === null || num < bestPlacement) {
      bestPlacement = num;
    }
  });

  return {
    props: {
      history,
      stats: {
        played,
        wins,
        top4,
        bestPlacement: bestPlacement,
      },
    },
  };
}

export default function TournamentHistoryPage({ history, stats }) {
  const count = history.length;

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroBadge}>// PLAYER_HISTORY</div>
          <h1 className={styles.heroTitle}>Tournament History</h1>
          <p className={styles.heroSubtitle}>
            View your past events, placements, and results.
          </p>
        </section>

        {/* Header stats row */}
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            Completed Tournaments
            <span className={styles.countBadge}>{count}</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
            marginBottom: "1rem",
          }}
        >
          <StatPill label="Tournaments" value={stats.played} />
          <StatPill label="Wins" value={stats.wins} />
          <StatPill label="Top 4 Finishes" value={stats.top4} />
          <StatPill
            label="Best Placement"
            value={stats.bestPlacement ? `#${stats.bestPlacement}` : "—"}
          />
        </div>

        {/* History Grid */}
        {count === 0 ? (
          <div className={styles.emptyState}>
            <h2>No completed tournaments yet</h2>
            <p>Once brackets are ended, they will appear here with your placement.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {history.map((h) => {
              const dateStr = h.start
                ? new Date(h.start).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—";

              return (
                <div key={h.id + dateStr} className={styles.card}>
                  {/* Top row: game + placement */}
                  <div className={styles.cardStatusRow}>
                    <div className={styles.statusIndicator}>
                      <span className={styles.statusDot}></span>
                      Completed
                    </div>
                    <div className={styles.gameIcon}>{h.game}</div>
                  </div>

                  {/* Body */}
                  <div className={styles.cardBody}>
                    <h2 className={styles.cardTitle}>{h.name}</h2>
                    <span className={styles.cardId}>ID: {h.id}</span>

                    <div className={styles.cardStats}>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Format</span>
                        <span className={styles.statValue}>{h.mode}</span>
                      </div>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Date</span>
                        <span className={styles.statValue}>{dateStr}</span>
                      </div>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Placement</span>
                        <span className={styles.statValue}>
                          {h.placement || "—"}
                        </span>
                      </div>
                    </div>

                    {h.ign && (
                      <div
                        style={{
                          marginTop: "0.4rem",
                          fontSize: "0.75rem",
                          color: "var(--text-muted, #9ca3af)",
                        }}
                      >
                        Played as <span style={{ fontFamily: "monospace" }}>{h.ign}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className={styles.cardActions}>
                    {/* Later we can add links to VODs / stats / etc */}
                    <span
                      className={styles.btnSecondary}
                      style={{ cursor: "default", opacity: 0.7 }}
                    >
                      History entry
                    </span>
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

function StatPill({ label, value }) {
  return (
    <div
      style={{
        padding: "0.4rem 0.75rem",
        borderRadius: "999px",
        border: "1px solid rgba(148,163,184,0.6)",
        fontSize: "0.8rem",
        display: "flex",
        alignItems: "center",
        gap: "0.35rem",
      }}
    >
      <span style={{ color: "#9ca3af" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
