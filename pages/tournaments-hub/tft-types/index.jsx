// pages/tournaments-hub/tft-types/index.jsx
import React from "react";
import Link from "next/link";
import styles from "../../../styles/TftTour.module.css";

export default function TftTypesPage() {
  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* HERO */}
        <section className={styles.hero}>
          <div className={styles.heroBadge}>TEAMFIGHT TACTICS</div>
          <h1 className={styles.heroTitle}>Select a Format</h1>
          <p className={styles.heroSubtitle}>
            Choose between solo FFA lobbies and Double Up duo brackets.
            Draft comps, manage econ, and out-position your opponents.
          </p>
        </section>

        {/* MAIN PANEL */}
        <section className={styles.panel}>
          <div className={styles.cardGrid}>
            {/* SOLO CARD */}
            <Link
              href="/tournaments-hub/tft-types/1v1"
              className={`${styles.modeCard} ${styles.modeCardSolo}`}
            >
              <div className={styles.modeInner}>
                <div className={styles.modeTag}>● Solo Queue</div>
                <h2 className={styles.modeTitle}>Solo Lobbies</h2>
                <p className={styles.modeDesc}>
                  Classic FFA lobbies with 8 players, round-based points,
                  and cuts after each stage.
                </p>
                <div className={styles.modeCtaRow}>
                  <span className={styles.modeCta}>View Tournaments →</span>
                </div>
              </div>
            </Link>

            {/* DOUBLE UP CARD */}
            <Link
              href="/tournaments-hub/tft-types/2v2"
              className={`${styles.modeCard} ${styles.modeCardDuo}`}
            >
              <div className={styles.modeInner}>
                <div className={styles.modeTag}>● Double Up</div>
                <h2 className={styles.modeTitle}>Double Up Duos</h2>
                <p className={styles.modeDesc}>
                  Queue with a partner, share econ and units, and send boards
                  across the map in duo-based brackets.
                </p>
                <div className={styles.modeCtaRow}>
                  <span className={styles.modeCta}>View Tournaments →</span>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* INFO STRIP (match Valorant layout) */}
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
            <span className={styles.infoValue}>Standard TFT & 5TQ Rules</span>
          </div>
        </section>
      </div>
    </div>
  );
}
