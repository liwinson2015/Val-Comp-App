// pages/tournaments-hub/hok-types/5v5/index.js
import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../../../../styles/Hok5v5.module.css";

import { connectToDatabase } from "../../../../lib/mongodb";
import Tournament from "../../../../models/Tournament";
import Player from "../../../../models/Player";

// Load Honor of Kings 5v5 tournaments
export async function getServerSideProps() {
  await connectToDatabase();

  const docs = await Tournament.find({
    status: { $ne: "completed" },
    game: "hok",
    mode: "5v5",
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!docs || docs.length === 0) {
    return { props: { tournaments: [] } };
  }

  const tournaments = [];

  for (const doc of docs) {
    const tid = doc.tournamentId;

    const registered = await Player.countDocuments({
      "registeredFor.tournamentId": tid,
    });

    const capacity = doc.capacity || 8; // 8 team slots by default
    const status = doc.status || "ongoing";
    const meta = doc.meta || {};

    const displayName =
      doc.name ||
      meta.displayName ||
      "Honor of Kings 5v5 Tournament #1";

    const displayDescription =
      meta.displayDescription ||
      "Full 5v5 team bracket hosted by 5TQ. Draft your comp, rotate as a squad, and push for the crystal.";

    const displayTime = meta.displayTime || "TBD";

    const displayFormat =
      meta.displayFormat ||
      meta.displayModeLabel ||
      "5v5 • Single Elimination";

    const displayCheckIn =
      meta.displayCheckIn ||
      "30 min before start";

    const displayPrize =
      meta.displayPrize ||
      "Skins / in-game packs / gift cards";

    const displayEntry =
      meta.displayEntry ||
      "Free";

    const displayHost = meta.displayHost || "5TQ";

    const displayServer = meta.displayServer || "NA";

    const displayMap =
      meta.displayMap ||
      "Standard 5v5 map";

    const displayRules =
      meta.displayRules ||
      "No cheats • No account sharing • Captains report results.";

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
      displayMap,
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

export default function Hok5v5ListPage({ tournaments }) {
  const router = useRouter();
  const hasAny = tournaments && tournaments.length > 0;

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* HERO */}
        <section className={styles.hero}>
          <div className={styles.heroBadge}>HONOR OF KINGS • 5v5</div>
          <h1 className={styles.heroTitle}>Upcoming 5v5 Tournaments</h1>
          <p className={styles.heroSubtitle}>
            Full-team brackets for coordinated squads. Matches are run in custom
            lobbies and coordinated through the 5TQ Discord.
          </p>
        </section>

        {/* LIST PANEL */}
        <section className={styles.panel}>
          {!hasAny ? (
            <div style={{ padding: "2rem 0", color: "#9ca3af" }}>
              <p>No Honor of Kings 5v5 tournaments are scheduled yet.</p>
              <p>Keep an eye on Discord announcements for roster signup dates.</p>
            </div>
          ) : (
            <div className={styles.cardGrid}>
              {tournaments.map((t) => {
                const capacity = t.capacity ?? 8;
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
                        Team bracket hosted by{" "}
                        <span style={{ color: "#e5f0ff" }}>{t.displayHost}</span>
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
                              color: isFull ? "#f97373" : "#60a5fa",
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
                      <div className={styles.pill}>{t.displayMap}</div>
                      <div className={styles.pill}>{t.displayRules}</div>
                    </div>

                    {/* Actions */}
                    <div className={styles.tActions}>
                      {isCompleted ? (
                        <span
                          className={styles.primaryBtn}
                          style={{
                            background: "#1f2933",
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
                            background: "#1f2933",
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
