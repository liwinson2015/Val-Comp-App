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
              1v1 aim duels. Bragging rights. Skin prize for the winner.
            </p>

            {/* Buttons (no new ones) */}
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

        {/* Quick facts */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>QUICK FACTS</h2>
          </div>
          <div className={styles.detailGrid}>
            <div className={styles.detailLabel}>Mode</div>
            <div className={styles.detailValue}>1v1 Aim Duels</div>

            <div className={styles.detailLabel}>Slots</div>
            <div className={styles.detailValue}>16 Players</div>

            <div className={styles.detailLabel}>Format</div>
            <div className={styles.detailValue}>
              Best-of-3 (first to 15 kills per game). Need 2 wins to advance.
            </div>

            <div className={styles.detailLabel}>Server</div>
            <div className={styles.detailValue}>NA (custom lobby)</div>

            <div className={styles.detailLabel}>Check-in</div>
            <div className={styles.detailValue}>
              15 minutes before start in Discord
            </div>

            <div className={styles.detailLabel}>Entry</div>
            <div className={styles.detailValue}>Free</div>

            <div className={styles.detailLabel}>Prize</div>
            <div className={styles.detailValue}>Skin (TBD) + bragging rights</div>
          </div>
        </section>

        {/* Format & Scoring */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>FORMAT & SCORING</h2>
          </div>
          <ul className={styles.rulesList}>
            <li>
              <strong>Match:</strong> Best-of-3. Each game is{" "}
              <strong>first to 15 kills</strong> (or 8-minute cap).
            </li>
            <li>
              <strong>Win Condition:</strong> First player to win{" "}
              <strong>2 games</strong> takes the match and advances.
            </li>
            <li>
              <strong>Time Cap:</strong> If time expires, player with more kills
              wins that game; tie → sudden death (first +2 kill lead).
            </li>
            <li>
              <strong>Side/Map:</strong> Standard aim map / custom range. Admin
              decides map rotation if needed.
            </li>
            <li>
              <strong>Lobby:</strong> Admin or stream host invites both players.
              Be online and ready at your match time.
            </li>
          </ul>
        </section>

        {/* Rules */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>RULES & CONDUCT</h2>
          </div>
          <ul className={styles.rulesList}>
            <li>No smurfing. No cheats, scripts, or third-party aim tools.</li>
            <li>
              No-shows: 5-minute grace. After that, you may be replaced by a
              sub.
            </li>
            <li>
              Disconnects before 3 kills → remake; after 3 kills → continue
              from score unless admin rules otherwise.
            </li>
            <li>
              Report scores in Discord with a screenshot; both players must
              confirm.
            </li>
            <li>Admins have final say on disputes.</li>
          </ul>
        </section>

        {/* Schedule & Reporting */}
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
            <div className={styles.detailValue}>
              Please be ready; matches fire back-to-back
            </div>

            <div className={styles.detailLabel}>Report</div>
            <div className={styles.detailValue}>
              Post the final score and screenshot in <strong>#match-report</strong>
            </div>

            <div className={styles.detailLabel}>Stream</div>
            <div className={styles.detailValue}>
              Select matches may be streamed or clipped
            </div>
          </div>
        </section>

        {/* Eligibility / Registration policy */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>ELIGIBILITY & REGISTRATION</h2>
          </div>
          <ul className={styles.rulesList}>
            <li>Must join Discord and respond to check-in pings.</li>
            <li>One entry per player. Duplicate entries will be removed.</li>
            <li>
              If you’ve already registered, the Register page will show you as
              locked-in automatically.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
