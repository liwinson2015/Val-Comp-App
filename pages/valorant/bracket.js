// pages/valorant/bracket.js
import React, { useEffect, useState } from "react";
import styles from "../../styles/Valorant.module.css";
import Bracket16 from "../../components/Bracket16";
import LosersBracket16 from "../../components/LosersBracket16";

/**
 * Full bracket page with SLOTS/STATUS/STREAM + bracket + rules.
 * Winners (your current single-elim) + Losers bracket underneath.
 */
export default function BracketPage() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch("/api/whoami", { credentials: "same-origin" });
        const data = await res.json();
        if (!ignore) {
          setLoggedIn(!!data.loggedIn);
          setLoading(false);
        }
      } catch {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  // Placeholder data; wire to DB later
  const bracketData = {
    left: {
      R16: [
        ["temppjmdkrzyfekn", "Chicken Wang"],
        ["海友糕手", "蓝蝴蝶ya"],
        ["sparkle", "巧克力炸香蕉"],
        ["彼岸花ya", "Mellul"],
      ],
    },
    right: {
      R16: [
        ["叶秋风", "Squid"],
        ["Cactus", "July ya"],
        ["Qenquin", "№NeedZzz"],
        ["Ethan Sylor", "卡提希娅の仆人"],
      ],
    },
    final: { left: "TBD", right: "TBD", champion: "TBD" },
  };

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* ===== Header ===== */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>CHAMPIONSHIP BRACKET — 16 PLAYERS</h2>
          </div>

          <p style={{ color: "#97a3b6", marginTop: 0 }}>
            Single Elimination • Seeds auto-assigned
          </p>

          {/* Details row */}
          <div className={styles.detailGrid}>
            <div className={styles.detailLabel}>SLOTS</div>
            <div className={styles.detailValueHighlight}>0 / 16</div>

            <div className={styles.detailLabel}>STATUS</div>
            <div className={styles.detailValue}>Check-in required at start time</div>

            <div className={styles.detailLabel}>STREAM</div>
            <div className={styles.detailValue}>[TBD]</div>
          </div>
        </section>

        {/* ===== Brackets (FULL WIDTH) ===== */}
        <section className={`${styles.card} fullBleed`}>
          {loading ? (
            <p style={{ color: "#9aa6bb" }}>Checking your session…</p>
          ) : !loggedIn ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "#0d1117",
                border: "1px solid #273247",
                borderRadius: 10,
                padding: "10px 12px",
                color: "#c9d4e6",
                marginBottom: 10,
              }}
            >
              <div>Log in to view your placement.</div>
              <a
                href={`/api/auth/discord?next=${encodeURIComponent(
                  "/valorant/bracket"
                )}`}
                style={{
                  background: "#5865F2",
                  color: "#fff",
                  textDecoration: "none",
                  padding: "8px 10px",
                  borderRadius: 8,
                  fontWeight: 800,
                }}
              >
                Log in with Discord
              </a>
            </div>
          ) : null}

          {/* === Winners Bracket === */}
          <Bracket16 data={bracketData} />

          {/* === Losers Bracket (directly below) === */}
          <div style={{ marginTop: 24 }}>
            <LosersBracket16
              lbR1={[
                { name: "LB P1" }, { name: "LB P2" },
                { name: "LB P3" }, { name: "LB P4" },
                { name: "LB P5" }, { name: "LB P6" },
                { name: "LB P7" }, { name: "LB P8" },
              ]}
              dropR2={[
                { name: "WB R2 Loser 1" },
                { name: "WB R2 Loser 2" },
                { name: "WB R2 Loser 3" },
                { name: "WB R2 Loser 4" },
              ]}
              dropSF={[ { name: "WB SF Loser 1" }, { name: "WB SF Loser 2" } ]}
              dropWBF={[ { name: "WB Final Loser" } ]}
              wbChampion={[ { name: "WB Champion" } ]}
            />
          </div>

          {/* Full-width override styling */}
          <style jsx>{`
            .fullBleed {
              width: 100vw;
              margin-left: calc(50% - 50vw);
              margin-right: calc(50% - 50vw);
              overflow: visible;
              background: #0b0e13;
              padding: 2rem 0;
            }
          `}</style>
        </section>

        {/* ===== Rules / Reminders ===== */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>TOURNAMENT REMINDERS</h2>
          <ul className={styles.rulesList}>
            <li>
              Be available at <strong>7:00 PM EST</strong> for check-in or you
              may lose your slot.
            </li>
            <li>No scripts, macros, or cheats — instant disqualification.</li>
            <li>
              Screenshot final score and DM in Discord within 5 minutes of match
              end.
            </li>
            <li>Winner receives the prize skin after verification.</li>
          </ul>
        </section>

        {/* ===== Footer ===== */}
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
