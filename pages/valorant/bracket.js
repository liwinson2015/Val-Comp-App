import React from "react";
import styles from "../../styles/Valorant.module.css";

export default function BracketPage() {
  // later this will come from real data
  const registeredPlayers = [
    // "Player1",
    // "Player2",
    // "Player3",
  ];

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* Header card / status */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>
              BRACKET / REGISTERED PLAYERS
            </h2>
            <span className={styles.badgeGreen}>OPEN</span>
          </div>

          <p
            style={{
              color: "#cbd5e1",
              fontSize: "0.9rem",
              lineHeight: "1.5rem",
              marginTop: 0,
              marginBottom: "1rem",
            }}
          >
            Below is the current list of players who are registered for{" "}
            <strong>Valorant Solo Skirmish #1</strong>.
            <br />
            Bracket coming soon. Seeding will be randomized before the event.
          </p>

          {/* Registered Players List */}
          <div className={styles.detailGrid}>
            <div className={styles.detailLabel}>SLOTS</div>
            <div className={styles.detailValueHighlight}>
              {registeredPlayers.length} / 16
            </div>

            <div className={styles.detailLabel}>STATUS</div>
            <div className={styles.detailValue}>Check-in required at start time</div>

            <div className={styles.detailLabel}>BRACKET</div>
            <div className={styles.detailValue}>
              Coming soon
            </div>

            <div className={styles.detailLabel}>STREAM</div>
            <div className={styles.detailValue}>[TBD]</div>
          </div>

          {/* Player names area */}
          <div
            style={{
              marginTop: "1.5rem",
              paddingTop: "1rem",
              borderTop: "1px solid rgba(148,163,184,0.2)",
            }}
          >
            <div
              style={{
                color: "#8b93a7",
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "0.5rem",
              }}
            >
              Registered Players
            </div>

            {registeredPlayers.length === 0 ? (
              <div
                style={{
                  color: "#8b93a7",
                  fontSize: "0.8rem",
                  fontStyle: "italic",
                }}
              >
                No players yet. Registration is still open.
              </div>
            ) : (
              <ul
                style={{
                  listStyle: "disc",
                  paddingLeft: "1rem",
                  margin: 0,
                  color: "#cbd5e1",
                  fontSize: "0.9rem",
                  lineHeight: "1.6",
                }}
              >
                {registeredPlayers.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <a
              href="/valorant"
              style={{
                backgroundColor: "#2a2a2e",
                border: "1px solid rgba(148,163,184,0.3)",
                borderRadius: "4px",
                color: "#ffffff",
                fontSize: "0.8rem",
                fontWeight: 600,
                textDecoration: "none",
                padding: "0.6rem 0.9rem",
                display: "inline-block",
              }}
            >
              ← Back to Event Page
            </a>
          </div>
        </section>

        {/* Rules / Notes card to match styling */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>TOURNAMENT REMINDERS</h2>
          <ul className={styles.rulesList}>
            <li>You MUST be available at 7:00 PM EST for check-in or you may lose your slot.</li>
            <li>No scripts/macros/cheats. Instant DQ.</li>
            <li>Screenshot final score and send in Discord within 5 minutes of match end.</li>
            <li>Winner receives the prize skin after verification.</li>
          </ul>
        </section>

        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <div className={styles.footerBrand}>
              VALCOMP — community-run Valorant events
            </div>
            <div className={styles.footerSub}>
              Brackets, paid prize pools, and leaderboards coming soon.
            </div>
            <div className={styles.footerCopy}>© 2025 valcomp</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
