// pages/valorant/bracket.js
import React, { useEffect, useState } from "react";
import styles from "../../styles/Valorant.module.css";
import Bracket16 from "../../components/Bracket16";
import LosersBracket16 from "../../components/LosersBracket16";
import GrandFinalCenter from "../../components/GrandFinalCenter";

// ---- Change this to the tournament id you use in your API route ----
const TID = "VALO-SOLO-SKIRMISH-1";

export default function BracketPage() {
  // auth (unchanged)
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  // live registration counters
  const [regInfo, setRegInfo] = useState(null);
  const [loadingReg, setLoadingReg] = useState(true);

  // ---------- AUTH CHECK ----------
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch("/api/whoami", { credentials: "same-origin" });
        const data = await res.json();
        if (!ignore) {
          setLoggedIn(!!data.loggedIn);
          setLoadingAuth(false);
        }
      } catch {
        if (!ignore) setLoadingAuth(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  // ---------- FETCH LIVE REGISTRATIONS ----------
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch(`/api/tournaments/${TID}/registrations`);
        const data = await res.json();
        if (!ignore) setRegInfo(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (!ignore) setLoadingReg(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  // ---------- MANUAL BRACKET DATA (EDIT THESE NAMES DURING THE EVENT) ----------
  // Round of 16 (you already filled these—keep updating as needed)
  const leftR16 = [
    ["temppjmdkrzyfekn", "Chicken Wang"],
    ["海友糕手", "蓝蝴蝶ya"],
    ["sparkle", "巧克力炸香蕉"],
    ["彼岸花ya", "Mellul"],
  ];
  const rightR16 = [
    ["叶秋风", "Squid"],
    ["Cactus", "July ya"],
    ["Qenquin", "№NeedZzz"],
    ["Ethan Sylor", "卡提希娅の仆人"],
  ];

  // >>> Update these as results come in <<<
  // Quarterfinals: two matches per side (top/bottom). Put the two player names for each match.
  const leftQF = [
    ["temppjmdkrzyfekn", "Chicken Wang"], // Left QF1 (winners of Left R16 #1 & #2)
    ["海友糕手", "蓝蝴蝶ya"],               // Left QF2 (winners of Left R16 #3 & #4)
  ];
  const rightQF = [
    ["叶秋风", "Squid"],   // Right QF1 (winners of Right R16 #1 & #2)
    ["Cactus", "July ya"], // Right QF2 (winners of Right R16 #3 & #4)
  ];

  // Semifinals: ONE match per side. Provide TWO names (the two QF winners on that side).
  const leftSF = ["temppjmdkrzyfekn", "海友糕手"]; // Left SF = winner(LQF1) vs winner(LQF2)
  const rightSF = ["叶秋风", "Cactus"];           // Right SF = winner(RQF1) vs winner(RQF2)

  // Final (center): winners of the two semifinals.
  const finalLeft  = "Left SF Winner";   // replace when known
  const finalRight = "Right SF Winner";  // replace when known
  const finalChamp = "TBD";              // replace when champion is decided

  // Compose object for Bracket16 (it expects this shape)
  const bracketData = {
    left:  { R16: leftR16,  QF: leftQF,  SF: leftSF },
    right: { R16: rightR16, QF: rightQF, SF: rightSF },
    final: { left: finalLeft, right: finalRight, champion: finalChamp },
  };

  // ---------- TEXT FOR SLOTS / STATUS ----------
  const capacity   = regInfo?.capacity ?? 16;
  const registered = regInfo?.registered ?? 0;
  const remaining  = regInfo?.remaining ?? Math.max(capacity - registered, 0);
  const slotsText  = loadingReg ? "Loading…" : `${registered} / ${capacity}`;
  const statusText = loadingReg
    ? "Checking capacity…"
    : regInfo?.isFull
    ? "Full — waitlist"
    : `Open — ${remaining} left`;

  // ---------- MANUAL GRAND-FINAL BANNER TEXTS (CENTER WIDGET) ----------
  const wbFinalWinner = "WB Champion (TBD)";     // set when WB Final ends
  const lbFinalWinner = "LB Champion (TBD)";     // set when LB Final ends
  const grandChampion = "Tournament Champion (TBD)"; // set when the event ends

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
            <div className={styles.detailValueHighlight}>{slotsText}</div>

            <div className={styles.detailLabel}>STATUS</div>
            <div className={styles.detailValue}>{statusText}</div>

            <div className={styles.detailLabel}>STREAM</div>
            <div className={styles.detailValue}>[TBD]</div>
          </div>
        </section>

        {/* ===== Winners Bracket (full-bleed) ===== */}
        <section className={`${styles.card} fullBleed`}>
          {!loadingAuth && !loggedIn ? (
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
                href={`/api/auth/discord?next=${encodeURIComponent("/valorant/bracket")}`}
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

        {/* ===== CENTER GRAND FINAL (shared banner) ===== */}
        <GrandFinalCenter
          wbChampion={wbFinalWinner}
          lbChampion={lbFinalWinner}
          champion={grandChampion}
        />

        {/* ===== Losers Bracket (kept as-is; edit inside its component when needed) ===== */}
        <section className={`${styles.card} fullBleed`}>
          <LosersBracket16
            lbR1={Array(8).fill(null)}   
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
            <div className={styles.footerBrand}>
              VALCOMP — community-run Valorant events
            </div>
            <div className={styles.footerSub}>
              Brackets, prize pools, leaderboards coming soon.
            </div>
            <div className={styles.footerCopy}>© 2025 valcomp</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
