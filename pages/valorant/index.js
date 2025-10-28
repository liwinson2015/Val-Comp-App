import React from "react";
import styles from "../../styles/Valorant.module.css";

export default function ValorantTournament() {
  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* HERO / TOP Banner */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroBadge}>VALCOMP.GG // COMMUNITY EVENT</div>
            <h1 className={styles.heroTitle}>VALORANT SOLO SKIRMISH #1</h1>
            <p className={styles.heroSubtitle}>
              16-player 1v1 bracket • Hosted by 5TQ • Winner gets a gun skin
            </p>
          </div>
        </section>

        {/* EVENT DETAILS */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>EVENT DETAILS</h2>
            <span className={styles.badgeRed}>FREE ENTRY</span>
          </div>

          <div className={styles.detailGrid}>
            <div className={styles.detailLabel}>FORMAT</div>
            <div className={styles.detailValue}>
              16 players · Single Elim · 1v1 aim/skirmish
            </div>

            <div className={styles.detailLabel}>PRIZE</div>
            <div className={styles.detailValue}>
              Valorant skin (up to $15 value)
            </div>

            <div className={styles.detailLabel}>DATE</div>
            <div className={styles.detailValue}>
              November 2nd · 7:00 PM EST
            </div>

            <div className={styles.detailLabel}>REGION</div>
            <div className={styles.detailValue}>NA servers</div>
          </div>

          {/* ACTION BUTTONS */}
          <div className={styles.buttonRow}>
            {/* REGISTER:
               Right now this always goes to /login.
               Later we'll make this smart:
               - if user IS logged in -> send them to /valorant/register
               - if user is NOT logged in -> keep sending them to /login
            */}
            <a className={styles.btnRed} href="/login">
              Register
            </a>

            {/* JOIN DISCORD:
               Real invite to your server
            */}
            <a
              className={styles.btnDark}
              href="https://discord.gg/yuGpPr6MAa"
              target="_blank"
              rel="noopener noreferrer"
            >
              Join Discord
            </a>
          </div>

          <p className={styles.smallNote}>
            Registration is first come first served. 16 slots + 2 backup subs.
            You must be available at start time or you'll be replaced.
          </p>
        </section>

        {/* BRACKET / STATUS */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>BRACKET / STATUS</h2>
            <span className={styles.badgeGreen}>OPEN</span>
          </div>

          <div className={styles.detailGrid}>
            <div className={styles.detailLabel}>SLOTS</div>
            <div className={styles.detailValueHighlight}>0 / 16</div>

            <div className={styles.detailLabel}>BRACKET</div>
            <div className={styles.detailValue}>Coming soon</div>

            <div className={styles.detailLabel}>STREAM</div>
            <div className={styles.detailValue}>[TBD]</div>
          </div>
        </section>

        {/* CORE RULES */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>CORE RULES</h2>
          <ul className={styles.rulesList}>
            <li>
              1v1 custom lobby. First to 13 kills OR first to 5 rounds (TO sets
              final format).
            </li>
            <li>No scripts / macros / cheats. Instant DQ.</li>
            <li>Players must screenshot final score and send to staff.</li>
            <li>
              Report results in Discord within 5 min of match ending.
            </li>
            <li>Winner receives the skin after verification.</li>
          </ul>
        </section>

        {/* FOOTER */}
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
