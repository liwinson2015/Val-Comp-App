import React from "react";
import Link from "next/link";
import styles from "../../../../styles/Valorant1v1.module.css";

const tournaments = [
  {
    slug: "valorant-skirmish-1",
    title: "Valorant Skirmish Tournament #1",
    host: "5TQ",
    startText: "Starts November 2nd, 2025",
    format: "1v1 • Single Elimination",
    ctaHref: "/valorant/register?t=valorant-skirmish-1",
  },
  // Add future events here…
];

export default function Valorant1v1ListPage() {
  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* HERO */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroBadge}>VALORANT 1v1</div>
            <h1 className={styles.heroTitle}>Upcoming 1v1 Tournaments</h1>
            <p className={styles.heroSubtitle}>
              Solo skirmish duels hosted by 5TQ. Claim your slot and climb the bracket.
            </p>
          </div>
        </section>

        {/* RED PANEL WITH CARDS */}
        <section className={styles.panel}>
          <div className={styles.cardGrid}>
            {tournaments.map((t) => (
              <article key={t.slug} className={styles.tCard}>
                <div className={styles.tGlow} />

                <header className={styles.tHead}>
                  <div className={styles.tag}>Open</div>
                  <h2 className={styles.tTitle}>{t.title}</h2>
                  <p className={styles.tMeta}>
                    Hosted by {t.host} • {t.startText}
                  </p>
                </header>

                <div className={styles.tBody}>
                  <div className={styles.factRow}>
                    <div className={styles.factLabel}>Format</div>
                    <div className={styles.factValue}>{t.format}</div>
                  </div>
                  <div className={styles.factRow}>
                    <div className={styles.factLabel}>Check-in</div>
                    <div className={styles.factValue}>15 min before start (Discord)</div>
                  </div>
                  <div className={styles.factRow}>
                    <div className={styles.factLabel}>Prize</div>
                    <div className={styles.factValue}>Skin (TBD) + bragging rights</div>
                  </div>
                </div>

                <div className={styles.tActions}>
                  <Link href={t.ctaHref} className={styles.primaryBtn}>
                    Register
                  </Link>
                  <Link
                    href="/tournaments-hub/valorant-types"
                    className={styles.secondaryBtn}
                  >
                    Back
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* INFO STRIP */}
        <section className={styles.infoRow}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Server</span>
            <span className={styles.infoValue}>NA (custom lobby)</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Maps</span>
            <span className={styles.infoValue}>Skirmish A / B / C (random)</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Rules</span>
            <span className={styles.infoValue}>No smurfing • No cheats</span>
          </div>
        </section>
      </div>
    </div>
  );
}
