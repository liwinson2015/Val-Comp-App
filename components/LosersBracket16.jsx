// components/LosersBracket16.jsx
import React from "react";
import s from "../styles/LosersBracket16.module.css";

/**
 * Losers Bracket (16 players total entering across rounds)
 * Structure:
 *  - LB Round 1: 8 players (4 matches)
 *  - LB Round 2 (WB R2 drop-ins): 4 matches
 *  - LB Round 3A: 2 matches
 *  - LB Round 3B (WB SF drop-ins): 2 matches
 *  - LB Round 4: 1 match  <-- (two players total, as requested)
 *  - LB Final: 1 match -> LB Winner (champ pill at the far right)
 */
export default function LosersBracket16({
  // Optional arrays if you want to pass real names later; otherwise we show TBD
  lbR1 = Array(8).fill(null),      // 8 players -> 4 matches
  dropR2 = Array(4).fill(null),     // 4 WB R2 losers (labels shown in the second slot of each R2 match)
  dropSF = Array(2).fill(null),     // 2 WB SF losers (labels shown in the second slot of each R3B match)
  wbFinalLoser = "WB Final Loser",  // label inside the bottom slot of LB Final
  lbWinner = "TBD",                 // text inside the LB Winner pill
}) {
  return (
    <div className={s.lbViewport}>
      <div className={s.lbStage}>
        <div className={s.lbGrid}>
          {/* R1 — 8 players -> 4 matches */}
          <Round title="LB Round 1" tier="r1">
            {chunk(lbR1, 2).map((pair, i) => (
              <Pair key={`R1-${i}`} top={pair[0] ?? "TBD"} bot={pair[1] ?? "TBD"} />
            ))}
          </Round>

          {/* R2 — 4 matches; bottom slot shows WB R2 drop-in label */}
          <Round title="LB Round 2 (WB R2 Drop-ins)" tier="r2">
            {[0, 1, 2, 3].map((i) => (
              <Pair
                key={`R2-${i}`}
                top="TBD"
                bot={dropR2[i] ?? "WB R2 Loser"}
              />
            ))}
          </Round>

          {/* R3A — 2 matches (winners from R2) */}
          <Round title="LB Round 3A" tier="r3a">
            {[0, 1].map((i) => (
              <Pair key={`R3A-${i}`} top="TBD" bot="TBD" />
            ))}
          </Round>

          {/* R3B — 2 matches with WB SF drop-ins */}
          <Round title="LB Round 3B (WB SF Drop-ins)" tier="r3b">
            {[0, 1].map((i) => (
              <Pair
                key={`R3B-${i}`}
                top="TBD"
                bot={dropSF[i] ?? (i === 0 ? "WB SF Loser 1" : "WB SF Loser 2")}
              />
            ))}
          </Round>

          {/* R4 — SINGLE match (two players total) */}
          <Round title="LB Round 4" tier="r4">
            <Pair top="TBD" bot="TBD" />
          </Round>

          {/* LB Final — SINGLE match; bottom shows WB Final Loser */}
          <Round title="LB Final" tier="rFinal">
            <Pair top="TBD" bot={wbFinalLoser || "WB Final Loser"} />
          </Round>

          {/* LB Winner pill */}
          <div className={s.lbWinnerCol}>
            <div className={s.lbWinnerTitle}>LB Winner</div>
            <div className={s.lbWinnerPill}>
              <span className={s.lbWinnerText}>{lbWinner}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- building blocks ---------- */

function Round({ title, tier, children }) {
  return (
    <div className={`${s.round} ${s[tier]}`}>
      <div className={s.roundTitle}>{title}</div>
      <div className={s.stack}>{children}</div>
    </div>
  );
}

function Pair({ top = "TBD", bot = "TBD" }) {
  return (
    <div className={s.pair}>
      <div className={s.slot} title={top}>
        <span className={s.label}>{top}</span>
      </div>
      <div className={s.slot} title={bot} style={{ marginTop: "10px" }}>
        <span className={s.label}>{bot}</span>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function chunk(arr = [], size = 2) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
