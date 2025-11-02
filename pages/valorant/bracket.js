// pages/valorant/bracket.js
import React, { useEffect, useState } from "react";
import styles from "../../styles/Valorant.module.css";
import Bracket16 from "../../components/Bracket16";
import LosersBracket16 from "../../components/LosersBracket16";
import GrandFinalCenter from "../../components/GrandFinalCenter";

const TID = "VALO-SOLO-SKIRMISH-1";

export default function BracketPage() {
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  const [regInfo, setRegInfo] = useState(null);
  const [loadingReg, setLoadingReg] = useState(true);

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

  const leftQF = [
    ["TBD", "TBD"],
    ["TBD", "TBD"],
  ];
  const rightQF = [
    ["TBD", "TBD"],
    ["TBD", "TBD"],
  ];

  const leftSF = ["TBD", "TBD"];
  const rightSF = ["TBD", "TBD"];

  const finalLeft  = "SF Winner 1";
  const finalRight = "SF Winner 2";
  const finalChamp = "TBD";

  const bracketData = {
    left:  { R16: leftR16,  QF: leftQF,  SF: leftSF },
    right: { R16: rightR16, QF: rightQF, SF: rightSF },
    final: { left: finalLeft, right: finalRight, champion: finalChamp },
  };

  const capacity   = regInfo?.capacity ?? 16;
  const registered = regInfo?.registered ?? 0;
  const remaining  = regInfo?.remaining ?? Math.max(capacity - registered, 0);
  const slotsText  = loadingReg ? "Loading…" : `${registered} / ${capacity}`;
  const statusText = loadingReg
    ? "Checking capacity…"
    : regInfo?.isFull
    ? "Full — waitlist"
    : `Open — ${remaining} left`;

  const wbFinalWinner = "WB Champion (TBD)";
  const lbFinalWinner = "LB Champion (TBD)";
  const grandChampion = "Tournament Champion (TBD)";

  // Manual ranking panel
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
        {/* ===== Split header ===== */}
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
                {/* CHANGED: show 5TQ instead of [TBD] */}
                <div className={styles.detailValue}>5TQ</div>
              </div>
            </div>

            {/* RIGHT: ranking */}
            <div className="col">
              {/* CHANGED: header label */}
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
              .splitGrid {
                grid-template-columns: 1fr;
              }
            }
            .col { min-width: 0; }

            .rankHeader {
              color: #dfe6f3;
              font-weight: 900;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              font-size: 12px;
              margin-bottom: 10px;
              opacity: 0.9;
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
              letter-spacing: 0.04em;
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

        {/* ===== CENTER GRAND FINAL ===== */}
        <GrandFinalCenter
          wbChampion={wbFinalWinner}
          lbChampion={lbFinalWinner}
          champion={grandChampion}
        />

        {/* ===== Losers Bracket ===== */}
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
