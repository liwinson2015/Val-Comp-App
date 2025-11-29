// pages/tournaments-hub/hok-types/5v5/index.js
import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../../../../styles/Hok5v5.module.css";

import { connectToDatabase } from "../../../../lib/mongodb";
import Tournament from "../../../../models/Tournament";
import TeamTournamentRegistration from "../../../../models/TeamTournamentRegistration"; // 🔹 NEW

// ----- SERVER SIDE: load HOK 5v5 tournaments from Tournament collection -----
export async function getServerSideProps() {
  await connectToDatabase();

  const docs = await Tournament.find({
    status: { $ne: "completed" },
    game: "hok", // 🔹 Honor of Kings only
    mode: "5v5", // 🔹 full team format
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!docs || docs.length === 0) {
    return {
      props: {
        tournaments: [],
      },
    };
  }

  const tournaments = [];

  for (const doc of docs) {
    const tid = doc.tournamentId;

    // 🔹 Count how many teams are registered for this tournament
    const registered = await TeamTournamentRegistration.countDocuments({
      tournamentId: tid,
      status: { $ne: "cancelled" }, // pending + active = taking a slot
    });

    const capacity = doc.capacity || 8; // number of teams
    const status = doc.status || "upcoming";
    const meta = doc.meta || {};

    const displayName =
      doc.name || meta.displayName || "Honor of Kings Team Tournament #1";

    const displayDescription =
      meta.displayDescription ||
      "Bring your full squad and push lanes through organised 5v5 tournaments hosted by 5TQ.";

    const displayTime = meta.displayTime || "TBD";

    const displayFormat =
      meta.displayFormat ||
      meta.displayModeLabel ||
      "5v5 • Standard Team Format";

    const displayCheckIn = meta.displayCheckIn || "30 min before start";

    const displayPrize =
      meta.displayPrize || "Skins / gift cards (per team)";

    const displayEntry = meta.displayEntry || "Free";

    const displayHost = meta.displayHost || "5TQ";

    const displayServer =
      meta.displayServer || "NA (Custom Lobbies)";

    const displayMaps =
      meta.displayMaps || "Classic 5v5 Lane Map";

    const displayRules = meta.displayRules || "No Cheating";

    const detailsUrl = meta.detailsUrl || `/tournaments/${tid}`;

    tournaments.push({
      tournamentId: tid,
      status,
      capacity,
      registered, // 🔹 number of TEAMS
      displayName,
      displayDescription,
      displayTime,
      displayFormat,
      displayCheckIn,
      displayPrize,
      displayEntry,
      displayHost,
      displayServer,
      displayMaps,
      displayRules,
      detailsUrl,
    });
  }

  return {
    props: {
      tournaments: JSON.parse(JSON.stringify(tournaments)),
    },
  };
}

// ----- PAGE COMPONENT -----
export default function Hok5v5ListPage({ tournaments }) {
  const router = useRouter();
  const hasAny = tournaments && tournaments.length > 0;

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroBadge}>HONOR OF KINGS 5v5</div>
          <h1 className={styles.heroTitle}>UPCOMING TEAM TOURNAMENTS</h1>
          <p className={styles.heroSubtitle}>
            Organised 5v5 team brackets for coordinated squads. Matches are run
            in custom lobbies and organised through the 5TQ Discord server.
          </p>
        </section>

        {/* List Panel */}
        <section className={styles.panel}>
          {!hasAny ? (
            <div style={{ padding: "2rem 0", color: "#9ca3af" }}>
              <p>No Honor of Kings 5v5 tournaments are scheduled yet.</p>
              <p>Watch Discord announcements for future roster signups.</p>
            </div>
          ) : (
            <div className={styles.cardGrid}>
              {tournaments.map((t) => {
                const capacity = t.capacity ?? 8;
                const registered = t.registered ?? 0; // 🔹 # of teams
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
                        Team bracket hosted by{" "}
                        <span style={{ color: "#e0f2fe" }}>
                          {t.displayHost}
                        </span>
                        {" • "}
                        Starts {t.displayTime}
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
                        <div className={styles.factLabel}>Entry</div>
                        <div className={styles.factValue}>
                          {t.displayEntry}
                        </div>
                      </div>
                      <div className={styles.factRow}>
                        <div className={styles.factLabel}>Prize</div>
                        <div className={styles.factValue}>
                          {t.displayPrize}
                        </div>
                      </div>
                      <div className={styles.factRow}>
                        <div className={styles.factLabel}>Team Slots</div>
                        <div className={styles.factValue}>
                          <span
                            style={{
                              color: isFull ? "#fb7185" : "#38bdf8",
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
                            background: "#1f2937",
                            color: "#6b7280",
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
                            background: "#1f2937",
                            color: "#6b7280",
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
