import React from "react";
import styles from "../styles/Valorant.module.css";

export default function HomePage() {
  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* Top intro / hero for the whole org */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroBadge}>5TQ GAMING TOURNAMENTS</div>
            <h1 className={styles.heroTitle}>Welcome to ValComp</h1>
            <p className={styles.heroSubtitle}>
              Community-run competitive events. Hosted by 5TQ.
              <br />
              Sign in, claim your slot, get placed into a live bracket. Prize
              for the winner.
            </p>
          </div>
        </section>

        {/* Active / upcoming games */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>CURRENT / UPCOMING EVENTS</h2>
          </div>

          <div className={styles.detailGrid}>
            <div className={styles.detailLabel}>VALORANT</div>
            <div className={styles.detailValue}>
              <strong>Solo Skirmish #1</strong> – 16-player 1v1, skin prize.
              <br />
              <a
                href="/valorant"
                style={{
                  color: "#ff4655",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                View details →
              </a>
            </div>

            <div className={styles.detailLabel}>LEAGUE</div>
            <div className={styles.detailValue}>
              Teamfight / League of Legends (Coming Soon).
              <br />
              <span style={{ color: "#8b93a7", fontStyle: "italic" }}>
                Not open yet
              </span>
            </div>
          </div>
        </section>

        {/* How it works section */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>HOW IT WORKS</h2>
          </div>

          <ul className={styles.rulesList}>
            <li>We announce a bracket (like Valorant Solo Skirmish #1).</li>
            <li>You register using your in-game name and Discord.</li>
            <li>You show up at the start time. No-shows are replaced by subs.</li>
            <li>
              You play on stream / in lobby. Report score in Discord with
              screenshot.
            </li>
            <li>Winner gets the prize (skin, etc.).</li>
          </ul>
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <div className={styles.footerBrand}>
              VALCOMP — community-run Valorant events
            </div>
            <div className={styles.footerSub}>
              More brackets, paid prize pools, and leaderboards coming soon.
            </div>
            <div className={styles.footerCopy}>© 2025 valcomp</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
