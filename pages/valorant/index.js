// pages/valorant/index.js
import React, { useEffect, useState } from "react";
import styles from "../../styles/Valorant.module.css";

export default function ValorantEventPage() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    fetch("/api/whoami")
      .then((r) => r.json())
      .then((d) => setLoggedIn(!!d.loggedIn))
      .catch(() => setLoggedIn(false));
  }, []);

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* Event header */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h1 className={styles.heroTitle} style={{ margin: 0 }}>
              VALORANT — Solo Skirmish #1
            </h1>
          </div>
          <p className={styles.heroSubtitle} style={{ marginTop: 8 }}>
            16-player 1v1 aim duels. Bragging rights. Skin prize for the winner.
          </p>

          {/* Action buttons */}
          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {loggedIn ? (
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
                }}
              >
                Register
              </a>
            ) : (
              <a
                href="/api/auth/discord"
                style={{
                  display: "inline-block",
                  background: "#5865F2",
                  color: "white",
                  fontWeight: 700,
                  padding: "10px 14px",
                  borderRadius: 10,
                  textDecoration: "none",
                }}
              >
                Sign in with Discord
              </a>
            )}

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
