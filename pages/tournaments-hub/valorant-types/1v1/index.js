import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../../../../styles/Valorant1v1.module.css"; // adjust case to match your file

export default function Valorant1v1ListPage() {
  const router = useRouter();

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
      detailsUrl: "/valorant",
    },
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

        {/* Panel with cards */}
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

                {/* Table section */}
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
                </div>

                {/* Primary action */}
                <div className={styles.tActions}>
                  <Link href={t.detailsUrl} className={styles.primaryBtn}>
                    View details
                  </Link>
                </div>

                {/* Horizontal glow pills BELOW the button (inside the card) */}
                <div className={styles.pillRow}>
                  <div className={styles.pill}>
                    <span className={styles.pillLabel}>Server</span>
                    <span className={styles.pillValue}>{t.server}</span>
                  </div>
                  <div className={styles.pill}>
                    <span className={styles.pillLabel}>Maps</span>
                    <span className={styles.pillValue}>{t.maps}</span>
                  </div>
                  <div className={styles.pill}>
                    <span className={styles.pillLabel}>Rules</span>
                    <span className={styles.pillValue}>{t.rules}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Back outside panel */}
        <div className={styles.backBar}>
          <button className={styles.ghostBtn} onClick={() => router.back()}>
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}
