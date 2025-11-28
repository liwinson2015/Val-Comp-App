// pages/tournaments-hub/valorant-types/index.js
import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../../../styles/ValTour.module.css";

export default function ValorantTypesPage() {
  const router = useRouter();

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* HERO */}
        <section className={styles.hero}>
          <div className={styles.heroBadge}>VALORANT TOURNAMENTS</div>
          <h1 className={styles.heroTitle}>Select a Format</h1>
          <p className={styles.heroSubtitle}>
            Choose your preferred game mode below and jump into the next 5TQ
            competition.
          </p>
        </section>

        {/* MAIN PANEL */}
        <section className={styles.panel}>
          <div className={styles.cardGrid}>
            {/* 1v1 CARD */}
            <Link
              href="/tournaments-hub/valorant-types/1v1"
              className={styles.modeCard}
            >
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

            {/* 2v2 CARD */}
            <Link
              href="/tournaments-hub/valorant-types/2v2"
              className={styles.modeCard}
            >
              <div className={styles.modeInner}>
                <div className={styles.modeBadge}>● Duo Queue</div>
                <h2 className={styles.modeTitle}>2v2 WINGMAN</h2>
                <p className={styles.modeDesc}>
                  Grab a partner and run coordinated skirmishes against other
                  duos.
                </p>
                <div className={styles.modeCtaRow}>
                  <span className={styles.modeCta}>View Tournaments →</span>
                </div>
              </div>
            </Link>

            {/* 5v5 CARD */}
            <Link
              href="/tournaments-hub/valorant-types/5v5"
              className={styles.modeCard}
            >
              <div className={styles.modeInner}>
                <div className={styles.modeBadge}>● Team Bracket</div>
                <h2 className={styles.modeTitle}>5v5 STANDARD</h2>
                <p className={styles.modeDesc}>
                  Full team tactical play with captains, map picks, and full
                  brackets.
                </p>
                <div className={styles.modeCtaRow}>
                  <span className={styles.modeCta}>View Tournaments →</span>
                </div>
              </div>
            </Link>
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

        {/* BACK BUTTON */}
        <div className={styles.backRow}>
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={() => router.back()}
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}
