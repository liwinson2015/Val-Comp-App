import React from "react";
import Link from "next/link";
import styles from "../../../styles/TournamentTypes.module.css";

export default function ValorantTypesPage() {
  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* HERO / HEADER */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroBadge}>VALORANT TOURNAMENT</div>
            <h1 className={styles.heroTitle}>Select a Format</h1>
            <p className={styles.heroSubtitle}>
              Choose your preferred game mode below and join the next 5TQ competition.
            </p>
          </div>
        </section>

        {/* RED GLOW PANEL WITH 3 CARDS */}
        <section className={styles.panel}>
          <div className={styles.cardGrid}>
            {/* 1v1 CARD (active) */}
            <Link href="/tournaments-hub/valorant-types/1v1" className={styles.modeCard}>
              <div className={styles.modeInner}>
                <div className={styles.modeBadge}>Open Bracket</div>
                <h2 className={styles.modeTitle}>VALORANT — 1v1</h2>
                <p className={styles.modeDesc}>
                  Solo duel format. Prove your aim and dominate.
                </p>
                <div className={styles.modeCtaRow}>
                  <span className={styles.modeCta}>View tournaments</span>
                </div>
              </div>
              <div className={styles.modeGlow} />
            </Link>

            {/* 2v2 (locked) */}
            <div className={`${styles.modeCard} ${styles.modeDisabled}`}>
              <div className={styles.modeInner}>
                <div className={styles.modeBadgeMuted}>Locked</div>
                <h2 className={styles.modeTitleMuted}>VALORANT — 2v2</h2>
                <p className={styles.modeDescMuted}>Team up with a friend. Coming soon.</p>
                <div className={styles.modeCtaRow}>
                  <span className={styles.modeCtaMuted}>Coming soon</span>
                </div>
              </div>
            </div>

            {/* 5v5 (locked) */}
            <div className={`${styles.modeCard} ${styles.modeDisabled}`}>
              <div className={styles.modeInner}>
                <div className={styles.modeBadgeMuted}>Locked</div>
                <h2 className={styles.modeTitleMuted}>VALORANT — 5v5</h2>
                <p className={styles.modeDescMuted}>Full team competition. Coming soon.</p>
                <div className={styles.modeCtaRow}>
                  <span className={styles.modeCtaMuted}>Coming soon</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* OPTIONAL INFO STRIP */}
        <section className={styles.infoRow}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Host</span>
            <span className={styles.infoValue}>5TQ</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Region</span>
            <span className={styles.infoValue}>NA</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Rules</span>
            <span className={styles.infoValue}>Fair play, no smurfing</span>
          </div>
        </section>
      </div>
    </div>
  );
}
