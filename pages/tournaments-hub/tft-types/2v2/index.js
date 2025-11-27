// pages/tournaments-hub/tft-types/2v2/index.js
import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../../../../styles/Tft2v2.module.css";

import { connectToDatabase } from "../../../../lib/mongodb";
import Tournament from "../../../../models/Tournament";
import Player from "../../../../models/Player";

// Load TFT Double Up tournaments
export async function getServerSideProps() {
  await connectToDatabase();

  const docs = await Tournament.find({
    status: { $ne: "completed" },
    game: "tft",       // 🔹 must match what you store in admin
    mode: "doubleup",  // 🔹 TFT double up format
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

    const capacity = doc.capacity || 8; // 8 duos / 16 players, up to you
    const status = doc.status || "upcoming";
    const meta = doc.meta || {};

    const displayName =
      doc.name ||
      meta.displayName ||
      "TFT Double Up Tournament #1";

    const displayDescription =
      meta.displayDescription ||
      "Duo-based Double Up lobbies with shared econ and team scoring.";

    const displayTime = meta.displayTime || "TBD";

    const displayFormat =
      meta.displayFormat ||
      "Double Up • Duo Lobbies";

    const displayCheckIn =
      meta.displayCheckIn ||
      "15 min before first lobby";

    const displayPrize =
      meta.displayPrize ||
      "Skins / RP / Gift Cards (per duo)";

    const displayEntry =
      meta.displayEntry ||
      "Free";

    const displayHost = meta.displayHost || "5TQ";

    const displayServer = meta.displayServer || "NA";

    const displaySet = meta.displaySet || "Current Set";

    const displayNotes =
      meta.displayNotes ||
      "Bring a duo, no win-trading, no queue sniping.";

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
      displaySet,
      displayNotes,
      detailsUrl,
    });
  }

  return {
    props: {
      tournaments: JSON.parse(JSON.stringify(tournaments)),
    },
  };
}

export default function TftDuoListPage({ tournaments }) {
  const router = useRouter();
  const hasAny = tournaments && tournaments.length > 0;

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* HERO */}
        <section className={styles.hero}>
          <div className={styles.heroBadge}>TFT • DOUBLE UP</div>
          <h1 className={styles.heroTitle}>Upcoming Double Up Tournaments</h1>
          <p className={styles.heroSubtitle}>
            Queue with a partner, share units and health, and try to be the
            last duo standing across your lobbies.
          </p>
        </section>

        {/* LIST PANEL */}
        <section className={styles.panel}>
          {!hasAny ? (
            <div style={{ padding: "2rem 0", color: "#9ca3af" }}>
              <p>No TFT Double Up tournaments are scheduled yet.</p>
              <p>Check Discord announcements to see when duos open up.</p>
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
                        Duo event hosted by{" "}
                        <span style={{ color: "#e0f2fe" }}>{t.displayHost}</span>
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
                        <div className={styles.factLabel}>Duo Slots</div>
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
                      <div className={styles.pill}>{t.displaySet}</div>
                      <div className={styles.pill}>{t.displayNotes}</div>
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
