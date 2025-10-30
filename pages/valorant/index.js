// pages/valorant/index.js
import React from "react";
import styles from "../../styles/Valorant.module.css";

export default function ValorantEventPage() {
  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroBadge}>VALORANT TOURNAMENT</div>
            <h1 className={styles.heroTitle}>VALORANT — Solo Skirmish #1</h1>
            <p className={styles.heroSubtitle}>
              1v1 skirmish duels. Bragging rights. Skin prize for the winner.
            </p>

            {/* Buttons (unchanged) */}
            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <a
                href="/valorant/register"
                style={{
                  display: "inline-block",
                  background: "#ff0046",
                  color: "white",
                  fontWeight: 700,
                  padding: "10px 14px",
                  borderRadius: 10,
                  textDecoration: "none",
                  boxShadow: "0 10px 30px rgba(255,0,70,0.35)",
                }}
              >
                Register
              </a>
              <a
                href="https://discord.gg/yuGpPr6MAa"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  background: "#2a2f3a",
                  color: "white",
                  fontWeight: 700,
                  padding: "10px 14px",
                  borderRadius: 10,
                  textDecoration: "none",
                  border: "1px solid #3a4150",
                }}
              >
                Join Discord
              </a>
            </div>
          </div>
        </section>

        {/* Quick facts (updated) */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>QUICK FACTS</h2>
          </div>
          <div className={styles.detailGrid}>
            <div className={styles.detailLabel}>Mode</div>
            <div className={styles.detailValue}>1v1 Skirmish</div>

            <div className={styles.detailLabel}>Slots</div>
            <div className={styles.detailValue}>16 Players</div>

            <div className={styles.detailLabel}>Format</div>
            <div className={styles.detailValue}>
              Best-of-1 • First to <strong>20</strong> kills • <strong>Win by 2</strong>
            </div>

            <div className={styles.detailLabel}>Map</div>
            <div className={styles.detailValue}>Randomized: Skirmish A, B, or C</div>

            <div className={styles.detailLabel}>Server</div>
            <div className={styles.detailValue}>NA (custom lobby)</div>

            <div className={styles.detailLabel}>Check-in</div>
            <div className={styles.detailValue}>15 minutes before start in Discord</div>

            <div className={styles.detailLabel}>Entry</div>
            <div className={styles.detailValue}>Free</div>

            <div className={styles.detailLabel}>Prize</div>
            <div className={styles.detailValue}>Skin (TBD) + bragging rights</div>
          </div>
        </section>

        {/* Format & Scoring (updated) */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>FORMAT & SCORING</h2>
          </div>
          <ul className={styles.rulesList}>
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

        {/* Rules & Conduct (unchanged) */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>RULES & CONDUCT</h2>
          </div>
          <ul className={styles.rulesList}>
            <li>No smurfing. No cheats, scripts, or third-party aim tools.</li>
            <li>No-shows: 5-minute grace, then you may be replaced by a sub.</li>
            <li>
              Disconnects before 3 kills → remake; after 3 kills → continue from score unless admin rules otherwise.
            </li>
            <li>Report scores in Discord with a screenshot; both players must confirm.</li>
            <li>Admins have final say on disputes.</li>
          </ul>
        </section>

        {/* Schedule & Reporting (unchanged) */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>SCHEDULE & REPORTING</h2>
          </div>
          <div className={styles.detailGrid}>
            <div className={styles.detailLabel}>Check-in</div>
            <div className={styles.detailValue}>
              15 minutes before bracket start in <strong>#check-in</strong>
            </div>

            <div className={styles.detailLabel}>Round Pace</div>
            <div className={styles.detailValue}>Please be ready; matches fire back-to-back</div>

            <div className={styles.detailLabel}>Report</div>
            <div className={styles.detailValue}>
              Post final score + screenshot in <strong>#match-report</strong>
            </div>

            <div className={styles.detailLabel}>Stream</div>
            <div className={styles.detailValue}>Select matches may be streamed or clipped</div>
          </div>
        </section>

        {/* Eligibility / Registration policy (unchanged) */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>ELIGIBILITY & REGISTRATION</h2>
          </div>
          <ul className={styles.rulesList}>
            <li>Must join Discord and respond to check-in pings.</li>
            <li>One entry per player. Duplicate entries will be removed.</li>
            <li>
              If you’ve already registered, the Register page will show you as locked-in automatically.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
