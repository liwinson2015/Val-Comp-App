// pages/valorant/bracket.js
import React, { useEffect, useState } from "react";
import styles from "../../styles/Valorant.module.css";
import Bracket16 from "../../components/Bracket16";
import LosersBracket16 from "../../components/LosersBracket16";
import GrandFinalCenter from "../../components/GrandFinalCenter";

// Change to your tournament id that /api/tournaments/[id]/registrations expects
const TID = "VALO-SOLO-SKIRMISH-1";

export default function BracketPage() {
  // ---- auth (unchanged) ----
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  // ---- live registration counters ----
  const [regInfo, setRegInfo] = useState(null);
  const [loadingReg, setLoadingReg] = useState(true);

  // --- check auth ---
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
    return () => { ignore = true; };
  }, []);

  // --- fetch live registrations for header counters ---
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
    return () => { ignore = true; };
  }, []);

  // ============================
  // MANUAL BRACKET DATA (EDIT)
  // ============================

  // Winners bracket — Round of 16
  const leftR16 = [
    ["temppjmdkrzyfekn", "Chicken Wang"],
    ["海友糕手", "蓝蝴蝶ya"],
    ["sparkle", "巧克力炸香蕉"],
    ["彼岸花ya", "SimpleFish"],
  ];
  const rightR16 = [
    ["叶秋风", "Squid"],
    ["Cactus", "七月ya"],
    ["Qenquin", "Booey"],
    ["Ethan Sylor", "卡提希娅の仆人"],
  ];

  // Winners bracket — Quarterfinals (2 matches per side)
  const leftQF = [
    ["temppjmdkrzyfekn", "蓝蝴蝶ya"], // LQF1
    ["巧克力炸香蕉", "SimpleFish"],      // LQF2
  ];
  const rightQF = [
    ["叶秋风", "七月ya"], // RQF1
    ["Qenquin", "卡提希娅の仆人"], // RQF2
  ];

  // Winners bracket — Semifinals (1 match per side)
  const leftSF = ["temppjmdkrzyfekn", "SimpleFish"];
  const rightSF = ["叶秋风", "卡提希娅の仆人"];

  // Final (center)
  const finalLeft  = "SF Winner 1";
  const finalRight = "SF Winner 2";
  const finalChamp = "TBD";

  const bracketData = {
    left:  { R16: leftR16,  QF: leftQF,  SF: leftSF },
    right: { R16: rightR16, QF: rightQF, SF: rightSF },
    final: { left: finalLeft, right: finalRight, champion: finalChamp },
  };

  // Losers bracket — EDIT THESE during the event
  // r1: 4 matches (8 players)
  const lb_r1 = [
    ["Squid", "Booey"],
    ["Cactus", "海友糕手"],
    ["sparkle", "Ethan Sylor"],
    ["Chicken Wang", "彼岸花ya"],
  ];

  // r2: 4 matches (WB R2 drop-ins appear as the 2nd name in each pair)
  const lb_r2 = [
    ["Booey", "蓝蝴蝶ya"],
    ["海友糕手", "巧克力炸香蕉"],
    ["Sparkle", "July ya"],
    ["彼岸花ya", "Qenquin"],
  ];

  // r3a: 2 matches (winners from r2)
  const lb_r3a = [
    ["蓝蝴蝶ya", "TBD"],
    ["sparkle", "彼岸花ya"],
  ];

  // r3b: 2 matches (WB Semifinal losers drop in)
  const lb_r3b = [
    ["TBD", "WB SF Loser 1"],
    ["TBD", "WB SF Loser 2"],
  ];

  // r4: 1 match
  const lb_r4 = [["TBD", "TBD"]];

  // LB Final: 1 match
  const lb_final = ["TBD", "WB Final Loser"];

  // LB Winner pill
  const lb_winner = "TBD";

  // ============================
  // HEADER TEXTS
  // ============================
  const capacity   = regInfo?.capacity ?? 16;
  const registered = regInfo?.registered ?? 0;
  const remaining  = regInfo?.remaining ?? Math.max(capacity - registered, 0);
  const slotsText  = loadingReg ? "Loading…" : `${registered} / ${capacity}`;
  const statusText = loadingReg
    ? "Checking capacity…"
    : regInfo?.isFull
    ? "Full — waitlist"
    : `Open — ${remaining} left`;

  // Grand final banner texts
  const wbFinalWinner = "WB Champion (TBD)";
  const lbFinalWinner = "LB Champion (TBD)";
  const grandChampion = "Tournament Champion (TBD)";

  // Manual ranking list for the right half of the header
  const placements = {
    first: "TBD",
    second: "TBD",
    third: "TBD",
    fourth: "TBD",
    fifthToSixth: ["TBD", "TBD"],
    seventhToEighth: ["TBD", "TBD"],
    ninthToTwelfth: ["TBD", "TBD", "TBD", "TBD"],
    thirteenthToSixteenth: ["TBD", "TBD", "TBD", "TBD"],
  };

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* ===== Split header (Info + Ranking) ===== */}
        <section className={styles.card}>
          <div className="splitGrid">
            {/* LEFT: info */}
            <div className="col">
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
                <div className={styles.detailValue}>5TQ</div>
              </div>
            </div>

            {/* RIGHT: ranking */}
            <div className="col">
              <div className="rankHeader">Ranking</div>

              <div className="rankRows">
                <div className="rankRow">
                  <div className="rankBadge gold">1st</div>
                  <div className="rankNames">{placements.first}</div>
                </div>

                <div className="rankRow">
                  <div className="rankBadge silver">2nd</div>
                  <div className="rankNames">{placements.second}</div>
                </div>

                <div className="rankRow">
                  <div className="rankBadge bronze">3rd</div>
                  <div className="rankNames">{placements.third}</div>
                </div>

                <div className="rankRow">
                  <div className="rankBadge">4th</div>
                  <div className="rankNames">{placements.fourth}</div>
                </div>

                <div className="rankRow">
                  <div className="rankBadge">5–6</div>
                  <div className="rankNames">
                    {placements.fifthToSixth.join(" • ")}
                  </div>
                </div>

                <div className="rankRow">
                  <div className="rankBadge">7–8</div>
                  <div className="rankNames">
                    {placements.seventhToEighth.join(" • ")}
                  </div>
                </div>

                <div className="rankRow">
                  <div className="rankBadge">9–12</div>
                  <div className="rankNames">
                    {placements.ninthToTwelfth.join(" • ")}
                  </div>
                </div>

                <div className="rankRow">
                  <div className="rankBadge">13–16</div>
                  <div className="rankNames">
                    {placements.thirteenthToSixteenth.join(" • ")}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <style jsx>{`
            .splitGrid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 24px;
              align-items: start;
            }
            @media (max-width: 980px) {
              .splitGrid { grid-template-columns: 1fr; }
            }
            .col { min-width: 0; }

            .rankHeader {
              color: #dfe6f3;
              font-weight: 900;
              letter-spacing: .08em;
              text-transform: uppercase;
              font-size: 12px;
              margin-bottom: 10px;
              opacity: .9;
            }
            .rankRows { display: grid; gap: 10px; }
            .rankRow {
              display: grid;
              grid-template-columns: 80px 1fr;
              align-items: center;
              gap: 12px;
              background: #0d1117;
              border: 1px solid #273247;
              border-radius: 10px;
              padding: 10px 12px;
            }
            .rankBadge {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              border-radius: 8px;
              padding: 6px 10px;
              font-weight: 800;
              font-size: 12px;
              letter-spacing: .04em;
              color: #0b0e13;
              background: #e6edf8;
            }
            .rankBadge.gold { background: #ffe08a; }
            .rankBadge.silver { background: #d7dde7; }
            .rankBadge.bronze { background: #f0b68a; }
            .rankNames {
              color: #c9d4e6;
              font-weight: 700;
              font-size: 14px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          `}</style>
        </section>

        {/* ===== Winners Bracket ===== */}
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

        {/* ===== Center Grand Final banner ===== */}
        <GrandFinalCenter
          wbChampion={wbFinalWinner}
          lbChampion={lbFinalWinner}
          champion={grandChampion}
        />

        {/* ===== Losers Bracket (now fully editable via props) ===== */}
        <section className={`${styles.card} fullBleed`}>
          <LosersBracket16
            r1={lb_r1}
            r2={lb_r2}
            r3a={lb_r3a}
            r3b={lb_r3b}
            r4={lb_r4}
            lbFinal={lb_final}
            lbWinner={lb_winner}
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
