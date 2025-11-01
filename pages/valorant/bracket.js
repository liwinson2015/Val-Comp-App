// pages/valorant/bracket.js
import React, { useEffect, useState } from "react";
import styles from "../../styles/Valorant.module.css";
import Bracket16 from "../../components/Bracket16";
import LosersBracket16 from "../../components/LosersBracket16";
import GrandFinalCenter from "../../components/GrandFinalCenter";

const TID = "VALO-SOLO-SKIRMISH-1"; // unique tournament id you’re counting

export default function BracketPage() {
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  // live registration info
  const [regInfo, setRegInfo] = useState(null);
  const [loadingReg, setLoadingReg] = useState(true);

  // ---- auth check (unchanged) ----
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

  // ---- fetch live registrations for this tournament ----
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

  // ====== Winners bracket sample data (unchanged for now) ======
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

  // ====== MANUAL STRINGS YOU WILL UPDATE DURING THE EVENT ======
  const wbFinalWinner = "WB Champion (TBD)";
  const lbFinalWinner = "LB Champion (TBD)";
  const grandChampion = "Tournament Champion (TBD)";

  // ---- derive slots text from API (fallback to 0/16 if loading) ----
  const capacity = regInfo?.capacity ?? 16;
  const registered = regInfo?.registered ?? 0;
  const remaining = regInfo?.remaining ?? Math.max(capacity - registered, 0);
  const slotsText = loadingReg ? "Loading…" : `${registered} / ${capacity}`;

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
            <div className={styles.detailValueHighlight}>
              {slotsText}
            </div>

            <div className={styles.detailLabel}>STATUS</div>
            <div className={styles.detailValue}>
              {loadingReg
                ? "Checking capacity…"
                : regInfo?.isFull
                ? "Full — waitlist"
                : `Open — ${remaining} left`}
            </div>

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

        {/* ===== CENTERED GRAND FINAL ===== */}
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
