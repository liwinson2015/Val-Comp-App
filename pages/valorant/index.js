// pages/valorant/index.js
import React from "react";
import styles from "../../styles/Valorant.module.css";

export default function ValorantEventPage() {
  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* Hero matches your site's original look */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroBadge}>VALORANT TOURNAMENT</div>
            <h1 className={styles.heroTitle}>VALORANT — Solo Skirmish #1</h1>
            <p className={styles.heroSubtitle}>
              16-player 1v1 aim duels. Bragging rights. Skin prize for the winner.
            </p>

            {/* Action buttons in the hero, same vibe as original */}
            <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
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

        {/* Rules / details card – same card styling as home */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>RULES & DETAILS</h2>
          </div>
          <ul className={styles.rulesList}>
            <li>Single-elimination 1v1 on approved maps.</li>
            <li>Show up on time; no-shows may be replaced by subs.</li>
            <li>No smurfing. No cheats. Clips may be streamed.</li>
            <li>Report scores in Discord with a screenshot.</li>
            <li>Admins have final say on disputes.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
