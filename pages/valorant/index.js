// pages/valorant/index.js
import React from "react";
import styles from "../../styles/ValorantDetails.module.css";

export default function ValorantEventPage() {
  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroBadge}>VALORANT TOURNAMENT</div>
            <h1 className={styles.heroTitle}>VALORANT — SOLO SKIRMISH #1</h1>
            <p className={styles.heroSubtitle}>
              1v1 skirmish duels. Bragging rights. Skin prize for the winner.
            </p>

            {/* CTAs (same links, upgraded styling) */}
            <div className={styles.ctaRow}>
              <a href="/valorant/register" className={styles.btnPrimary}>
                Register
              </a>
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

        {/* Quick facts */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>Quick Facts</h2>
          </div>
          <div className={styles.factsGrid}>
            <div className={styles.factLabel}>Mode</div>
            <div className={styles.factValue}>1v1 Skirmish</div>

            <div className={styles.factLabel}>Slots</div>
            <div className={styles.factValue}>16 Players</div>

            <div className={styles.factLabel}>Format</div>
            <div className={styles.factValue}>
              Best-of-1 • First to <strong>20</strong> kills • <strong>Win by 2</strong>
            </div>

            <div className={styles.factLabel}>Map</div>
            <div className={styles.factValue}>Randomized: Skirmish A, B, or C</div>

            <div className={styles.factLabel}>Server</div>
            <div className={styles.factValue}>NA (custom lobby)</div>

            <div className={styles.factLabel}>Check-in</div>
            <div className={styles.factValue}>15 minutes before start in Discord</div>

            <div className={styles.factLabel}>Entry</div>
            <div className={styles.factValue}>Free</div>

            <div className={styles.factLabel}>Prize</div>
            <div className={styles.factValue}>Skin (TBD) + bragging rights</div>
          </div>
        </section>

        {/* Format & Scoring */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>
              <span className={styles.badge}>1</span> Format &amp; Scoring
            </h2>
          </div>
          <ul className={styles.ruleList}>
            <li>
              <strong>Match:</strong> <strong>Best-of-1</strong>.
            </li>
            <li>
              <strong>Game Win Condition:</strong> First to <strong>20</strong> kills and
              must lead by <strong>2</strong> (win-by-two).
            </li>
            <li>
              <strong>No time cap.</strong> Play continues until win-by-two is achieved.
            </li>
            <li>
              <strong>Map:</strong> Randomized each match between <em>Skirmish A / B / C</em>.
            </li>
            <li>
              <strong>Lobby:</strong> Admin/stream host invites both players. Be online and ready at your match time.
            </li>
          </ul>
        </section>

        {/* Rules & Conduct */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>
              <span className={styles.badge}>2</span> Rules &amp; Conduct
            </h2>
          </div>
          <ul className={styles.ruleList}>
            <li>No smurfing. No cheats, scripts, or third-party aim tools.</li>
            <li>No-shows: 5-minute grace, then you may be replaced by a sub.</li>
            <li>
              Disconnects before 3 kills → remake; after 3 kills → continue from score unless admin rules otherwise.
            </li>
            <li>Report scores in Discord with a screenshot; both players must confirm.</li>
            <li>Admins have final say on disputes.</li>
          </ul>
        </section>

        {/* Schedule & Reporting */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>
              <span className={styles.badge}>3</span> Schedule &amp; Reporting
            </h2>
          </div>
          <div className={styles.factsGrid}>
            <div className={styles.factLabel}>Check-in</div>
            <div className={styles.factValue}>
              15 minutes before bracket start in <strong>#check-in</strong>
            </div>

            <div className={styles.factLabel}>Round Pace</div>
            <div className={styles.factValue}>Please be ready; matches fire back-to-back</div>

            <div className={styles.factLabel}>Report</div>
            <div className={styles.factValue}>
              Post final score + screenshot in <strong>#match-report</strong>
            </div>

            <div className={styles.factLabel}>Stream</div>
            <div className={styles.factValue}>Select matches may be streamed or clipped</div>
          </div>
        </section>

        {/* Eligibility / Registration */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>
              <span className={styles.badge}>4</span> Eligibility &amp; Registration
            </h2>
          </div>
          <ul className={styles.ruleList}>
            <li>Must join Discord and respond to check-in pings.</li>
            <li>One entry per player. Duplicate entries will be removed.</li>
            <li>
              If you’ve already registered, the Register page will show you as locked-in automatically.
            </li>
          </ul>
        </section>

        {/* Footer spacer */}
        <div className={styles.footerSpace} />
      </div>
    </div>
  );
}
