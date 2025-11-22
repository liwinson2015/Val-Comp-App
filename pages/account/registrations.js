import React from "react";
import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";
// Ensure this points to the new CSS module we just made
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

  const rawRegs = Array.isArray(player.registeredFor) ? player.registeredFor : [];

  const registrations = rawRegs.map((r) => {
    const id = r.tournamentId || r.id || "";
    const meta = catalog[id] || {};
    return {
      id,
      name: meta.name || r.name || "Tournament",
      game: meta.game || r.game || "Valorant",
      mode: meta.mode || r.mode || "5v5",
      status: meta.status || r.status || "Active",
      start: meta.start || r.start || null,
      detailsUrl: meta.detailsUrl || r.detailsUrl || "#",
      bracketUrl: meta.bracketUrl || r.bracketUrl || "#",
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
          <div style={{ opacity: 0.5, marginTop: 5 }}>© 2025 ALL RIGHTS RESERVED</div>
        </footer>
      </div>
    </div>
  );
}