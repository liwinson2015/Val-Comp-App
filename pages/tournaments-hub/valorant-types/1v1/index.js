import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../../../../styles/Valorant1v1.module.css";

export default function Valorant1v1ListPage() {
  const router = useRouter();

  // Replace with DB fetch later
  const tournaments = [
    {
      id: "skirmish-1",
      status: "Open",
      title: "Valorant Skirmish Tournament #1",
      host: "5TQ",
      start: "Starts November 2nd, 2025",
      format: "1v1 • Single Elimination",
      checkIn: "15 min before start (Discord)",
      prize: "Skin (TBD) + bragging rights",
      server: "NA (custom lobby)",
      maps: "Skirmish A / B / C (random)",
      rules: "No smurfing • No cheats",
      detailsUrl: "/valorant", // point to your full info page
    },
    // More events later
  ];

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroBadge}>VALORANT 1v1</div>
            <h1 className={styles.heroTitle}>Upcoming 1v1 Tournaments</h1>
            <p className={styles.heroSubtitle}>
              Solo skirmish duels hosted by 5TQ. Claim your slot and climb the bracket.
            </p>
          </div>
        </section>

        {/* Red panel with cards */}
        <section className={styles.panel}>
          <div className={styles.cardGrid}>
            {tournaments.map((t) => (
              <article key={t.id} className={styles.tCard}>
                <div className={styles.tGlow} />

                <header className={styles.tHead}>
                  <span className={styles.tag}>{t.status}</span>
                  <h3 className={styles.tTitle}>{t.title}</h3>
                  <p className={styles.tMeta}>Hosted by {t.host} • {t.start}</p>
                </header>

                {/* Body facts (moved Server/Maps/Rules INSIDE card) */}
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
                    <div className={styles.factLabel}>Server</div>
                    <div className={styles.factValue}>{t.server}</div>
                  </div>
                  <div className={styles.factRow}>
                    <div className={styles.factLabel}>Maps</div>
                    <div className={styles.factValue}>{t.maps}</div>
                  </div>
                  <div className={styles.factRow}>
                    <div className={styles.factLabel}>Rules</div>
                    <div className={styles.factValue}>{t.rules}</div>
                  </div>
                </div>

                {/* Actions: Register -> View details */}
                <div className={styles.tActions}>
                  <Link href={t.detailsUrl} className={styles.primaryBtn}>
                    View details
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Back button OUTSIDE the panel, bottom-left */}
        <div className={styles.backBar}>
          {/* Use styles.secondaryBtn if you prefer that look */}
          <button className={styles.ghostBtn} onClick={() => router.back()}>
            ← Back
          </button>
        </div>

        {/* Optional informational row retained if you still want it below */}
        {/* <div className={styles.infoRow}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Example</span>
            <span className={styles.infoValue}>Value</span>
          </div>
        </div> */}
      </div>
    </div>
  );
}
