// pages/valorant/bracket.js
import React, { useEffect, useState } from "react";
import styles from "../../styles/Valorant.module.css";
import Bracket16 from "../../components/Bracket16";
import LosersBracket16 from "../../components/LosersBracket16";
import GrandFinalCenter from "../../components/GrandFinalCenter";

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
    return () => { ignore = true; };
  }, []);

  // Winners bracket sample data (unchanged)
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
    final: { left: "TBD", right: "TBD", champion: "TBD" }, // WB Final area inside Bracket16
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
            Double Elimination • Seeds auto-assigned
          </p>
          <div className={styles.detailGrid}>
            <div className={styles.detailLabel}>SLOTS</div>
            <div className={styles.detailValueHighlight}>0 / 16</div>
            <div className={styles.detailLabel}>STATUS</div>
            <div className={styles.detailValue}>Check-in required at start time</div>
            <div className={styles.detailLabel}>STREAM</div>
            <div className={styles.detailValue}>[TBD]</div>
          </div>
        </section>

        {/* ===== Winners Bracket (full-bleed like before) ===== */}
        <section className={`${styles.card} fullBleed`}>
          {!loading && !loggedIn ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "#0d1117", border: "1px solid #273247",
              borderRadius: 10, padding: "10px 12px", color: "#c9d4e6",
              marginBottom: 10
            }}>
              <div>Log in to view your placement.</div>
              <a
                href={`/api/auth/discord?next=${encodeURIComponent("/valorant/bracket")}`}
                style={{
                  background: "#5865F2", color: "#fff", textDecoration: "none",
                  padding: "8px 10px", borderRadius: 8, fontWeight: 800
                }}
              >
                Log in with Discord
              </a>
            </div>
          ) : null}

          <Bracket16 data={bracketData} />

          <style jsx>{`
            .fullBleed {
              width: 100vw;
              margin-left: calc(50% - 50vw);
              margin-right: calc(50% - 50vw);
              overflow: visible;
              background: #0b0e13;
              padding: 2rem 0 1rem;
            }
          `}</style>
        </section>

        {/* ===== CENTERED GRAND FINAL (shared) ===== */}
        <GrandFinalCenter
          wbChampion="WB Champion"
          lbChampion="LB Champion"
          champion="TBD"
        />

        {/* ===== Losers Bracket (no GF inside) ===== */}
        <section className={`${styles.card} fullBleed`}>
          <LosersBracket16
            lbR1={Array(8).fill(null)}      /* replace with real losers later */
            dropR2={Array(4).fill(null)}
            dropSF={Array(2).fill(null)}
            dropWBF={Array(1).fill(null)}
          />
          <style jsx>{`
            .fullBleed {
              width: 100vw;
              margin-left: calc(50% - 50vw);
              margin-right: calc(50% - 50vw);
              overflow: visible;
              background: #0b0e13;
              padding: 1rem 0 2rem;
            }
          `}</style>
        </section>

        {/* ===== Rules ===== */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>TOURNAMENT REMINDERS</h2>
          <ul className={styles.rulesList}>
            <li>Be available at <strong>7:00 PM EST</strong> for check-in.</li>
            <li>No scripts, macros, or cheats — instant DQ.</li>
            <li>Screenshot final score and DM in Discord within 5 minutes.</li>
            <li>Winner receives the prize after verification.</li>
          </ul>
        </section>

        {/* ===== Footer ===== */}
        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <div className={styles.footerBrand}>VALCOMP — community-run Valorant events</div>
            <div className={styles.footerSub}>Brackets, prize pools, leaderboards coming soon.</div>
            <div className={styles.footerCopy}>© 2025 valcomp</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
