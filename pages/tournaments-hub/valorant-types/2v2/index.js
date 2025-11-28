// pages/tournaments-hub/valorant-types/2v2/index.js
import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../../../../styles/Valorant2v2.module.css";

import { connectToDatabase } from "../../../../lib/mongodb";
import Tournament from "../../../../models/Tournament";
import Player from "../../../../models/Player";

// ----- SERVER SIDE: load Valorant 2v2 tournaments from Tournament collection -----
export async function getServerSideProps() {
  await connectToDatabase();

  const docs = await Tournament.find({
    status: { $ne: "completed" },
    game: "valorant", // 🔹 must match what you store in admin
    mode: "2v2",      // 🔹 Valorant 2v2 format
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

    // Count how many teams/entries are registered for this tournament
    const registered = await Player.countDocuments({
      "registeredFor.tournamentId": tid,
    });

    const capacity = doc.capacity || 16;

    // Read status directly (default to "upcoming" if missing)
    const status = doc.status || "upcoming";

    const meta = doc.meta || {};

    const displayName =
      doc.name ||
      meta.displayName ||
      "Valorant Duo Tournament #1";

    const displayDescription =
      meta.displayDescription ||
      "Grab your duo and run the gauntlet. Small team skirmishes hosted by 5TQ.";

    const displayTime = meta.displayTime || "Jan 2025";

    const displayFormat =
      meta.displayFormat ||
      meta.displayModeLabel ||
      "2v2 • Double Elimination";

    const displayCheckIn =
      meta.displayCheckIn ||
      "15 min before start";

    const displayPrize =
      meta.displayPrize ||
      "$20 Valorant Gift Card (per team)";

    const displayEntry = meta.displayEntry || "Free";

    const displayHost = meta.displayHost || "5TQ";

    const displayServer = meta.displayServer || "NA (Custom)";

    const displayMaps = meta.displayMaps || "Skirmish A/B/C(Random)";

    const displayRules =
      meta.displayRules ||
      "No Cheats";

    const detailsUrl = meta.detailsUrl || `/tournaments/${tid}`;

    tournaments.push({
      tournamentId: tid,
      status,
      capacity,
      registered,
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
export default function Valorant2v2ListPage({ tournaments }) {
  const router = useRouter();
  const hasAny = tournaments && tournaments.length > 0;

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroBadge}>VALORANT 2v2</div>
          <h1 className={styles.heroTitle}>UPCOMING DUO TOURNAMENTS</h1>
          <p className={styles.heroSubtitle}>
            Grab your duo and queue into organized skirmishes. All matches
            are hosted through custom lobbies and coordinated in the 5TQ Discord.
          </p>
        </section>

        {/* List Panel */}
        <section className={styles.panel}>
          {!hasAny ? (
            <div style={{ padding: "2rem 0", color: "#9ca3af" }}>
              <p>No Valorant 2v2 tournaments are scheduled yet.</p>
              <p>Watch the Discord announcements channel for the next event.</p>
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
                        Duo bracket hosted by{" "}
                        <span style={{ color: "#fff" }}>{t.displayHost}</span>
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
