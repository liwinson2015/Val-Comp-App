// pages/valorant/index.js
import React from "react";
import styles from "../../styles/Valorant.module.css";

export default function ValorantEventPage() {
  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* Top card (title + subtitle + buttons) */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h1 className={styles.heroTitle} style={{ margin: 0 }}>
              VALORANT — Solo Skirmish #1
            </h1>
          </div>

          <p className={styles.heroSubtitle} style={{ marginTop: 6, marginBottom: 14 }}>
            16-player 1v1 aim duels. Bragging rights. Skin prize for the winner.
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a
              href="/valorant/register"
              style={{
                display: "inline-block",
                background: "#ff0046",
                color: "#fff",
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
                color: "#fff",
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
        </section>

        {/* Rules / details */}
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
