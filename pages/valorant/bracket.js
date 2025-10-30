// pages/valorant/bracket.js
import React, { useEffect, useState } from "react";
import styles from "../../styles/Valorant.module.css";

export default function BracketPage() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  // later this will come from real data
  const registeredPlayers = [
    // "Player1",
    // "Player2",
  ];

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch("/api/whoami", { credentials: "same-origin" });
        const data = await res.json();
        if (!ignore) {
          setLoggedIn(!!data.loggedIn);
          setUser(data.user || null);
          setLoading(false);
        }
      } catch {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>

        {/* ===== Card 1: Bracket / Login gate ===== */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>BRACKET / REGISTERED PLAYERS</h2>
            {loggedIn && <span className={styles.badgeGreen}>OPEN</span>}
          </div>

          {/* Loading */}
          {loading && (
            <p style={{ color: "#cbd5e1", margin: 0 }}>Checking your session…</p>
          )}

          {/* Not logged in */}
          {!loading && !loggedIn && (
            <>
              <p style={{ color: "#cbd5e1", marginTop: 0 }}>
                <strong>Log in</strong> to view brackets and your registration!
              </p>
              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a
                  href="/api/auth/discord"
                  style={{
                    display: "inline-block",
                    background: "#5865F2",
                    color: "#fff",
                    fontWeight: 800,
                    padding: "10px 14px",
                    borderRadius: 10,
                    textDecoration: "none",
                    boxShadow: "0 10px 26px rgba(88,101,242,.35)",
                  }}
                >
                  Log in with Discord
                </a>
                <a
                  href="/valorant"
                  style={{
                    display: "inline-block",
                    background: "#1e2129",
                    color: "#e4e6ed",
                    fontWeight: 700,
                    padding: "10px 14px",
                    borderRadius: 10,
                    textDecoration: "none",
                    border: "1px solid #2e3442",
                  }}
                >
                  View event details
                </a>
              </div>
            </>
          )}

          {/* Logged in (your existing UI) */}
          {!loading && loggedIn && (
            <>
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
                <div className={styles.detailValue}>
                  Check-in required at start time
                </div>

                <div className={styles.detailLabel}>BRACKET</div>
                <div className={styles.detailValue}>Coming soon</div>

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
            </>
          )}
        </section>

        {/* ===== Card 2: Reminders (always visible) ===== */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>TOURNAMENT REMINDERS</h2>
          <ul className={styles.rulesList}>
            <li>You MUST be available at 7:00 PM EST for check-in or you may lose your slot.</li>
            <li>No scripts/macros/cheats. Instant DQ.</li>
            <li>Screenshot final score and send in Discord within 5 minutes of match end.</li>
            <li>Winner receives the prize skin after verification.</li>
          </ul>
        </section>

        {/* Footer */}
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
