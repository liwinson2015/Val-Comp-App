// pages/tournaments-hub/valorant-types/1v1/index.js
import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../../../../styles/Valorant1v1.module.css";

import { connectToDatabase } from "../../../../lib/mongodb";
import Tournament from "../../../../models/Tournament";
import TournamentState from "../../../../models/TournamentState";
import Player from "../../../../models/Player";

// --- SERVER SIDE: load Valorant 1v1 tournaments + counts ---
export async function getServerSideProps() {
  await connectToDatabase();

  // 1) Find all Valorant tournaments that are 1v1 (using meta.mode when present)
  const rawTournaments = await Tournament.find({ game: "valorant" }).lean();

  const valorant1v1 = rawTournaments.filter((t) => {
    const mode = t.meta?.mode || t.meta?.format || "";
    // very loose filter: if meta.mode contains "1v1" or there's no mode at all,
    // we treat it as a 1v1 Valorant event for now
    return !mode || String(mode).toLowerCase().includes("1v1");
  });

  if (!valorant1v1.length) {
    return { props: { tournaments: [] } };
  }

  const ids = valorant1v1.map((t) => t.tournamentId);

  // 2) Load tournament state (status, etc.)
  const states = await TournamentState.find({
    tournamentId: { $in: ids },
  }).lean();

  const stateById = {};
  for (const s of states) {
    stateById[s.tournamentId] = s;
  }

  // 3) Count registrations per tournamentId from Player.registeredFor
  const players = await Player.find(
    { "registeredFor.tournamentId": { $in: ids } },
    { registeredFor: 1 }
  ).lean();

  const counts = {}; // { [tournamentId]: number }
  for (const p of players) {
    for (const reg of p.registeredFor || []) {
      if (!ids.includes(reg.tournamentId)) continue;
      counts[reg.tournamentId] = (counts[reg.tournamentId] || 0) + 1;
    }
  }

  // 4) Build clean objects for the React page
  const tournaments = valorant1v1.map((t) => {
    const st = stateById[t.tournamentId] || {};
    const capacity = t.capacity || st.capacity || 16;
    const registered = counts[t.tournamentId] || 0;
    const isFull = registered >= capacity;
    const status = st.status || "ongoing"; // "upcoming" | "ongoing" | "completed"

    return {
      id: t.tournamentId,
      title: t.name || "Valorant Skirmish Tournament",
      host: "5TQ",
      // Prefer a nice text field from state/meta, fallback to generic label
      start: st.displayTime || t.meta?.startLabel || "Date TBD",
      format: t.meta?.format || "1v1 • Double Elimination",
      checkIn: t.meta?.checkIn || "15 min before start",
      prize: t.meta?.prize || "$20 Valorant Gift Card",
      server: t.meta?.server || "NA (Custom)",
      maps: t.meta?.maps || "Skirmish A / B / C (random)",
      rules: t.meta?.rules || "No Cheats",
      detailsUrl: t.meta?.detailsUrl || "/valorant",

      capacity,
      registered,
      isFull,
      status,
    };
  });

  // Optional: sort by createdAt (newest first)
  tournaments.sort((a, b) => {
    const ta = rawTournaments.find((x) => x.tournamentId === a.id);
    const tb = rawTournaments.find((x) => x.tournamentId === b.id);
    return (tb?.createdAt || 0) - (ta?.createdAt || 0);
  });

  return { props: { tournaments } };
}

// --- CLIENT COMPONENT ---
export default function Valorant1v1ListPage({ tournaments }) {
  const router = useRouter();
  const hasTournaments = tournaments && tournaments.length > 0;

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroBadge}>VALORANT 1v1</div>
          <h1 className={styles.heroTitle}>Upcoming Tournaments</h1>
          <p className={styles.heroSubtitle}>
            Solo skirmish duels hosted by 5TQ. Claim your slot and climb the
            bracket.
          </p>
        </section>

        {/* List Panel */}
        <section className={styles.panel}>
          {!hasTournaments ? (
            <div className={styles.emptyState}>
              <p>No Valorant 1v1 tournaments are scheduled yet.</p>
              <p>Check back soon in Discord for the next announcement.</p>
            </div>
          ) : (
            <div className={styles.cardGrid}>
              {tournaments.map((t) => {
                const isFull = t.isFull;
                const statusLabel =
                  t.status === "completed"
                    ? "Completed"
                    : isFull
                    ? "Closed"
                    : "Open For Registration";

                return (
                  <article key={t.id} className={styles.tCard}>
                    {/* Header */}
                    <header className={styles.tHead}>
                      <span className={styles.tag}>{statusLabel}</span>
                      <h3 className={styles.tTitle}>{t.title}</h3>

                      <div className={styles.tID}>
                        ID: <span>{t.id}</span>
                      </div>

                      <p className={styles.tMeta}>
                        Hosted by <span style={{ color: "#fff" }}>{t.host}</span>{" "}
                        • Starts {t.start}
                      </p>
                    </header>

                    {/* Info Grid */}
                    <div className={styles.tBody}>
                      <div className={styles.factRow}>
                        <div className={styles.factLabel}>Format</div>
                        <div className={styles.factValue}>{t.format}</div>
                      </div>
                      <div className={styles.factRow}>
                        <div className={styles.factLabel}>Check-in</div>
                        <div className={styles.factValue}>{t.checkIn}</div>
                      </div>
                      <div className={styles.factRow}>
                        <div className={styles.factLabel}>Prize</div>
                        <div className={styles.factValue}>{t.prize}</div>
                      </div>
                      <div className={styles.factRow}>
                        <div className={styles.factLabel}>Slots</div>
                        <div className={styles.factValue}>
                          <span
                            style={{
                              color: isFull ? "#ef4444" : "#00c6ff",
                            }}
                          >
                            {t.registered} / {t.capacity}{" "}
                            {isFull ? "(FULL)" : ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pills */}
                    <div className={styles.pillRow}>
                      <div className={styles.pill}>{t.server}</div>
                      <div className={styles.pill}>{t.maps}</div>
                      <div className={styles.pill}>{t.rules}</div>
                    </div>

                    {/* Actions */}
                    <div className={styles.tActions}>
                      {t.status === "ongoing" && !isFull ? (
                        <Link href={t.detailsUrl} className={styles.primaryBtn}>
                          View Details
                        </Link>
                      ) : (
                        <span
                          className={styles.primaryBtn}
                          style={{
                            background: "#333",
                            color: "#666",
                            cursor: "default",
                            boxShadow: "none",
                            transform: "none",
                          }}
                        >
                          {t.status === "completed"
                            ? "Tournament Completed"
                            : "Tournament Full"}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Back */}
        <div className={styles.backBar}>
          <button className={styles.ghostBtn} onClick={() => router.back()}>
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}
