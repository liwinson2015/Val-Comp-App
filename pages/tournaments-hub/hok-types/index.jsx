// pages/tournaments-hub/hok-types/index.js
import React from "react";
import Link from "next/link";
import styles from "../../../styles/HokTour.module.css";

export default function HokTypesPage() {
  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* HERO */}
        <section className={styles.hero}>
          <div className={styles.heroBadge}>HONOR OF KINGS TOURNAMENTS</div>
          <h1 className={styles.heroTitle}>Select a Format</h1>
          <p className={styles.heroSubtitle}>
            Organised 5v5 team tournaments for coordinated squads. Pick your comp,
            control objectives, and push lanes with your team.
          </p>
        </section>

        {/* MAIN PANEL */}
        <section className={styles.panel}>
          <div className={styles.cardGrid}>
            {/* 5v5 CARD (ACTIVE) */}
            <Link
              href="/tournaments-hub/hok-types/5v5"
              className={styles.modeCard}
            >
              <div className={styles.modeInner}>
                <div className={styles.modeBadge}>● Team Format</div>
                <h2 className={styles.modeTitle}>5v5 STANDARD</h2>
                <p className={styles.modeDesc}>
                  Full team tournaments on the classic map. Draft, rotate,
                  and fight for towers and objectives.
                </p>
                <div className={styles.modeCtaRow}>
                  <span className={styles.modeCta}>View Tournaments →</span>
                </div>
              </div>
            </Link>

            {/* SPECIAL MODES (LOCKED) */}
            <div
              className={`${styles.modeCard} ${styles.modeDisabled}`}
            >
              <div className={styles.modeInner}>
                <div className={styles.modeBadgeMuted}>Locked</div>
                <h2 className={styles.modeTitleMuted}>Special Modes</h2>
                <p className={styles.modeDescMuted}>
                  Experimental rulesets, fun events, and limited-time modes
                  may unlock here in the future.
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
            <span className={styles.infoLabel}>Format</span>
            <span className={styles.infoValue}>Custom Lobbies</span>
          </div>
        </section>
      </div>
    </div>
  );
}
