// pages/tournaments-hub/valorant-types/index.js
import React from "react";
import Link from "next/link";
// UPDATED IMPORT NAME
import styles from "../../../styles/ValTour.module.css";

export default function ValorantTypesPage() {
  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        
        {/* HERO */}
        <section className={styles.hero}>
          <div className={styles.heroBadge}>VALORANT TOURNAMENT</div>
          <h1 className={styles.heroTitle}>Select a Format</h1>
          <p className={styles.heroSubtitle}>
            Choose your preferred game mode below and join the next 5TQ competition.
          </p>
        </section>

        {/* MAIN PANEL */}
        <section className={styles.panel}>
          <div className={styles.cardGrid}>
            
            {/* 1v1 CARD (Active) */}
            <Link href="/tournaments-hub/valorant-types/1v1" className={styles.modeCard}>
              <div className={styles.modeInner}>
                <div className={styles.modeBadge}>● Open Bracket</div>
                <h2 className={styles.modeTitle}>1v1 DUEL</h2>
                <p className={styles.modeDesc}>
                  Solo duel format. Prove your aim and dominate the bracket.
                </p>
                <div className={styles.modeCtaRow}>
                  <span className={styles.modeCta}>View Tournaments →</span>
                </div>
              </div>
            </Link>

            {/* 2v2 (Locked) */}
            <div className={`${styles.modeCard} ${styles.modeDisabled}`}>
              <div className={styles.modeInner}>
                <div className={styles.modeBadgeMuted}>Locked</div>
                <h2 className={styles.modeTitleMuted}>2v2 WINGMAN</h2>
                <p className={styles.modeDescMuted}>
                  Grab a partner and compete. Coming soon.
                </p>
                <div className={styles.modeCtaRow}>
                  <span className={styles.modeCtaMuted}>Coming Soon</span>
                </div>
              </div>
            </div>

            {/* 5v5 (Locked) */}
            <div className={`${styles.modeCard} ${styles.modeDisabled}`}>
              <div className={styles.modeInner}>
                <div className={styles.modeBadgeMuted}>Locked</div>
                <h2 className={styles.modeTitleMuted}>5v5 STANDARD</h2>
                <p className={styles.modeDescMuted}>
                  Full team tactical warfare. Coming soon.
                </p>
                <div className={styles.modeCtaRow}>
                  <span className={styles.modeCtaMuted}>Coming Soon</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* INFO STRIP */}
        <section className={styles.infoRow}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Host</span>
            <span className={styles.infoValue}>5TQ</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Region</span>
            <span className={styles.infoValue}>North America</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Rules</span>
            <span className={styles.infoValue}>Standard Comp</span>
          </div>
        </section>

      </div>
    </div>
  );
}