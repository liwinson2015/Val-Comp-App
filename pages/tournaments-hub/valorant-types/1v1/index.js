// pages/tournaments-hub/valorant-types/1v1/index.js
import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../../../../styles/Valorant1v1.module.css";

import { connectToDatabase } from "../../../../lib/mongodb";
import Player from "../../../../models/Player";
import TournamentState from "../../../../models/TournamentState";

const TID = "VALO-SOLO-SKIRMISH-1";
const DEFAULT_CAPACITY = 16;

// ---------- SERVER SIDE ----------
export async function getServerSideProps() {
  await connectToDatabase();

  // Read tournament "state" (status, etc.)
  const state = await TournamentState.findOne({ tournamentId: TID }).lean();

  // Count player registrations for this tournament
  const registered = await Player.countDocuments({
    "registeredFor.tournamentId": TID,
  });

  const capacity = DEFAULT_CAPACITY;
  const isFull = registered >= capacity;

  const info = {
    tournamentId: TID,
    status: state?.status || "ongoing", // "upcoming" | "ongoing" | "completed"
    registered: Number(registered) || 0,
    capacity,
    isFull,
  };

  return { props: { info } };
}

// ---------- PAGE COMPONENT ----------
export default function Valorant1v1ListPage({ info }) {
  const router = useRouter();

  const capacity = info?.capacity ?? DEFAULT_CAPACITY;
  const registered = info?.registered ?? 0;
  const isFull = info?.isFull || registered >= capacity;
  const status = info?.status || "ongoing";

  // Badge text in top-left of card
  let statusLabel = "Checking...";
  if (info) {
    if (status === "completed") {
      statusLabel = "Completed";
    } else if (status === "upcoming") {
      statusLabel = "Upcoming";
    } else {
      statusLabel = isFull ? "Closed" : "Open For Registration";
    }
  }

  const canRegister = status === "ongoing" && !isFull;

  const tournaments = [
    {
      id: TID,
      title: "Valorant Skirmish Tournament #1",
      host: "5TQ",
      start: "Nov 2, 2025",
      format: "1v1 • Double Elimination",
      checkIn: "15 min before start",
      prize: "$20 Valorant Gift Card",
      server: "NA (Custom)",
      maps: "Skirmish A / B / C (random)",
      rules: "No Cheats",
      detailsUrl: "/valorant",
    },
  ];

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroBadge}>VALORANT 1v1</div>
          <h1 className={styles.heroTitle}>Upcoming Tournaments</h1>
          <p className={styles.heroSubtitle}>
            Solo skirmish duels hosted by 5TQ. Claim your slot and climb the bracket.
          </p>
        </section>

        {/* List Panel */}
        <section className={styles.panel}>
          <div className={styles.cardGrid}>
            {tournaments.map((t) => (
              <article key={t.id} className={styles.tCard}>
                <header className={styles.tHead}>
                  <span className={styles.tag}>{statusLabel}</span>
                  <h3 className={styles.tTitle}>{t.title}</h3>

                  <div className={styles.tID}>
                    ID: <span>{t.id}</span>
                  </div>

                  <p className={styles.tMeta}>
                    Hosted by <span style={{ color: "#fff" }}>{t.host}</span> • Starts {t.start}
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
                      <span style={{ color: isFull ? "#ef4444" : "#00c6ff" }}>
                        {registered} / {capacity} {isFull ? "(FULL)" : ""}
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
                  {canRegister ? (
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
                      {status === "completed"
                        ? "Tournament Completed"
                        : isFull
                        ? "Tournament Full"
                        : "Registration Closed"}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
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
