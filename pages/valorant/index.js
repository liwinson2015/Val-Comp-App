// pages/valorant/index.js
import React from "react";
import Link from "next/link";
import styles from "../../styles/ValorantDetailsV3.module.css";

export default function ValorantEventPage() {
  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>

        {/* HERO */}
        <section className={styles.hero}>
          <div className={styles.heroGlow} />
          <div className={styles.heroInner}>
            <div className={styles.chip}>VALORANT • 1v1 EVENT</div>
            <h1 className={styles.title}>Solo Skirmish #1</h1>
            <p className={styles.subtitle}>
              Head-to-head duel event. Claim the crown and the skin. Bragging rights included.
            </p>
            <div className={styles.ctaRow}>
              <a href="/valorant/register" className={styles.btnPrimary}>Register</a>
              <a
                href="https://discord.gg/yuGpPr6MAa"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.btnGhost}
              >
                Join Discord
              </a>
            </div>
          </div>
        </section>

        {/* QUICK STRIP */}
        <section className={styles.quickStrip}>
          <div className={styles.quickItem}>
            <span className={styles.quickLabel}>Server</span>
            <span className={styles.quickValue}>NA • Custom Lobby</span>
          </div>
          <div className={styles.quickItem}>
            <span className={styles.quickLabel}>Maps</span>
            <span className={styles.quickValue}>Skirmish A / B / C (random)</span>
          </div>
          <div className={styles.quickItem}>
            <span className={styles.quickLabel}>Rules</span>
            <span className={styles.quickValue}>No smurfing • No cheats</span>
          </div>
        </section>

        {/* TWO-COLUMN SECTION */}
        <section className={styles.twocol}>
          {/* Facts */}
          <article className={styles.card}>
            <header className={styles.cardHead}>
              <h2 className={styles.cardTitle}>Quick Facts</h2>
            </header>
            <div className={styles.facts}>
              <div>Mode</div><div>1v1 skirmish</div>
              <div>Slots</div><div>16 players</div>
              <div>Format</div><div>Best-of-1 • First to <strong>20</strong> • <strong>Win by 2</strong></div>
              <div>Map</div><div>Randomized: A / B / C</div>
              <div>Server</div><div>NA (custom lobby)</div>
              <div>Check-in</div><div>Arrive in Discord <strong>15 min</strong> before start</div>
              <div>Entry</div><div>Free</div>
              <div>Prize</div><div>Skin (TBD) + bragging rights</div>
            </div>
          </article>

          {/* Format & Scoring */}
          <article className={styles.card}>
            <header className={styles.cardHead}>
              <h2 className={styles.cardTitle}><span className={styles.badge}>1</span> Format & Scoring</h2>
            </header>
            <ul className={styles.list}>
              <li><strong>Match:</strong> Single game (Bo1).</li>
              <li><strong>Win the game:</strong> Reach <strong>20</strong> eliminations and lead by <strong>2</strong>.</li>
              <li><strong>No timer:</strong> Play continues until the 2-point lead is reached.</li>
              <li><strong>Map picks:</strong> Random each round from Skirmish A/B/C.</li>
              <li><strong>Lobby:</strong> Host/admin invites both players—be online at your slot.</li>
            </ul>
          </article>
        </section>

        {/* RULES */}
        <section className={styles.cardWide}>
          <header className={styles.cardHead}>
            <h2 className={styles.cardTitle}><span className={styles.badge}>2</span> Rules & Conduct</h2>
          </header>
          <ul className={styles.list}>
            <li>No smurfing, no scripts, no third-party aim tools.</li>
            <li>No-show grace period is 5 minutes; after that, a substitute may take the slot.</li>
            <li>Disconnects: before 3 kills → remake; after 3 kills → continue from score unless admin rules otherwise.</li>
            <li>Report results in Discord with a screenshot; both players must confirm.</li>
            <li>Admins have the final ruling on disputes.</li>
          </ul>
        </section>

        {/* SCHEDULE */}
        <section className={styles.cardWide}>
          <header className={styles.cardHead}>
            <h2 className={styles.cardTitle}><span className={styles.badge}>3</span> Schedule & Reporting</h2>
          </header>
          <div className={styles.facts}>
            <div>Check-in</div><div>15 minutes before bracket start in <strong>#check-in</strong></div>
            <div>Round pace</div><div>Be ready—matches fire back-to-back</div>
            <div>Report</div><div>Post final score + screenshot in <strong>#match-report</strong></div>
            <div>Stream</div><div>Selected matches may be streamed or clipped</div>
          </div>
        </section>

        {/* Footer space */}
        <div className={styles.space} />
      </div>
    </div>
  );
}
