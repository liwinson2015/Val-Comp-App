// pages/tournaments-hub/valorant-types/1v1/index.js
import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../../../../styles/Valorant1v1.module.css";

import { connectToDatabase } from "../../../../lib/mongodb";
import TournamentState from "../../../../models/TournamentState";
import Player from "../../../../models/Player";

// ----- SERVER SIDE: load all non-completed Valorant 1v1 tournaments -----
export async function getServerSideProps() {
  await connectToDatabase();

  // Right now we only care about tournaments that are not completed.
  // Later you can tighten this with game/mode fields if you add them.
  const states = await TournamentState.find({
    status: { $ne: "completed" }, // "ongoing" or anything else that's not completed
  }).lean();

  if (!states || states.length === 0) {
    return {
      props: {
        tournaments: [],
      },
    };
  }

  const tournaments = [];

  for (const s of states) {
    const tid = s.tournamentId;

    // Count how many players are registered for this tournament
    const registered = await Player.countDocuments({
      "registeredFor.tournamentId": tid,
    });

    // You can later store capacity in Tournament or TournamentState.
    // For now we default to 16.
    const capacity = s.capacity || 16;

    tournaments.push({
      tournamentId: tid,
      status: s.status || "ongoing",
      capacity,
      registered,

      // Display fields with fallbacks to your old hard-coded copy
      displayName: s.displayName || "Valorant Skirmish Tournament #1",
      displayDescription:
        s.displayDescription ||
        "Solo skirmish duels hosted by 5TQ. Claim your slot and climb the bracket.",
      displayTime: s.displayTime || "Nov 2, 2025",
      displayFormat: s.displayFormat || "1v1 • Double Elimination",
      displayCheckIn: s.displayCheckIn || "15 min before start",
      displayPrize: s.displayPrize || "$20 Valorant Gift Card",
      displayServer: s.displayServer || "NA (Custom)",
      displayMaps: s.displayMaps || "Skirmish A / B / C (random)",
      displayRules: s.displayRules || "No Cheats",
      detailsUrl: s.detailsUrl || "/valorant",
    });
  }

  return {
    props: {
      tournaments: JSON.parse(JSON.stringify(tournaments)),
    },
  };
}

// ----- PAGE COMPONENT -----
export default function Valorant1v1ListPage({ tournaments }) {
  const router = useRouter();
  const hasAny = tournaments && tournaments.length > 0;

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroBadge}>VALORANT 1v1</div>
          <h1 className={styles.heroTitle}>UPCOMING TOURNAMENTS</h1>
          <p className={styles.heroSubtitle}>
            Solo skirmish duels hosted by 5TQ. Claim your slot and climb the
            bracket.
          </p>
        </section>

        {/* List Panel */}
        <section className={styles.panel}>
          {!hasAny ? (
            <div style={{ padding: "2rem 0", color: "#9ca3af" }}>
              <p>No Valorant 1v1 tournaments are scheduled yet.</p>
              <p>Check back soon in Discord for the next announcement.</p>
            </div>
          ) : (
            <div className={styles.cardGrid}>
              {tournaments.map((t) => {
                const capacity = t.capacity ?? 16;
                const registered = t.registered ?? 0;
                const isFull = registered >= capacity;
                const isCompleted = t.status === "completed";

                let statusLabel = "Open For Registration";
                if (isCompleted) statusLabel = "Completed";
                else if (isFull) statusLabel = "Full";

                return (
                  <article key={t.tournamentId} className={styles.tCard}>
                    <header className={styles.tHead}>
                      <span className={styles.tag}>{statusLabel}</span>
                      <h3 className={styles.tTitle}>{t.displayName}</h3>

                      <div className={styles.tID}>
                        ID: <span>{t.tournamentId}</span>
                      </div>

                      <p className={styles.tMeta}>
                        Hosted by <span style={{ color: "#fff" }}>5TQ</span> •
                        &nbsp;Starts {t.displayTime}
                      </p>
                    </header>

                    {/* Info Grid */}
                    <div className={styles.tBody}>
                      <div className={styles.factRow}>
                        <div className={styles.factLabel}>Format</div>
                        <div className={styles.factValue}>
                          {t.displayFormat}
                        </div>
                      </div>
                      <div className={styles.factRow}>
                        <div className={styles.factLabel}>Check-in</div>
                        <div className={styles.factValue}>
                          {t.displayCheckIn}
                        </div>
                      </div>
                      <div className={styles.factRow}>
                        <div className={styles.factLabel}>Prize</div>
                        <div className={styles.factValue}>
                          {t.displayPrize}
                        </div>
                      </div>
                      <div className={styles.factRow}>
                        <div className={styles.factLabel}>Slots</div>
                        <div className={styles.factValue}>
                          <span
                            style={{
                              color: isFull ? "#ef4444" : "#00c6ff",
                            }}
                          >
                            {registered} / {capacity}{" "}
                            {isFull ? "(FULL)" : ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pills */}
                    <div className={styles.pillRow}>
                      <div className={styles.pill}>{t.displayServer}</div>
                      <div className={styles.pill}>{t.displayMaps}</div>
                      <div className={styles.pill}>{t.displayRules}</div>
                    </div>

                    {/* Actions */}
                    <div className={styles.tActions}>
                      {isCompleted ? (
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
                          Tournament Completed
                        </span>
                      ) : isFull ? (
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
                          Tournament Full
                        </span>
                      ) : (
                        <Link
                          href={t.detailsUrl}
                          className={styles.primaryBtn}
                        >
                          View Details
                        </Link>
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
