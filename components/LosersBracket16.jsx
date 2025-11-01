// components/LosersBracket16.jsx
import React from "react";
import s from "../styles/LosersBracket16.module.css";

/**
 * Losers bracket (compact) for a 16-player double-elimination.
 * Columns (7 total):
 * 1) LB R1 (8 players => 4 winners)
 * 2) LB R2 (WB R2 drop-ins) – 4 matches (each vs LB R1 winners)
 * 3) LB R3A – 2 matches
 * 4) LB R3B (WB SF drop-ins) – 2 matches (each vs LB R3A winners)
 * 5) LB R4 – 2 matches
 * 6) LB Final – 1 match (vs WB Final Loser)
 * 7) LB Winner – 1 box (advances to Grand Final)
 *
 * All props are optional; sensible defaults render labels so nothing “disappears”.
 */
export default function LosersBracket16({
  lbR1 = [
    "LB P1","LB P2","LB P3","LB P4",
    "LB P5","LB P6","LB P7","LB P8",
  ],               // 8 players (top-to-bottom)
  dropR2 = ["WB R2 Loser 1","WB R2 Loser 2","WB R2 Loser 3","WB R2 Loser 4"],
  dropSF = ["WB SF Loser 1","WB SF Loser 2"],
  wbFinalLoser = "WB Final Loser",
  lbWinner = "TBD"
}) {
  // Helpers to pair into [top, bot]
  const pairs = (list) => {
    const out = [];
    for (let i = 0; i < list.length; i += 2) out.push([list[i] ?? "TBD", list[i+1] ?? "TBD"]);
    return out;
  };

  // R1: 8 players => 4 pairs
  const r1Pairs = pairs(lbR1.length ? lbR1 : [
    "LB P1","LB P2","LB P3","LB P4","LB P5","LB P6","LB P7","LB P8"
  ]);

  // R2: 4 matches – left side winners vs WB R2 drop-ins
  // We render *two* slots per match: [TBD, drop-in]
  const r2Pairs = dropR2.map((d) => ["TBD", d || "TBD"]);

  // R3A: winners from R2 – 2 matches (placeholder TBD vs TBD)
  const r3aPairs = [["TBD", "TBD"], ["TBD", "TBD"]];

  // R3B: WB SF drop-ins vs R3A winners
  const r3bPairs = dropSF.map((d) => ["TBD", d || "TBD"]); // (TBD) vs (WB SF loser)

  // R4: winners from R3B – 2 matches
  const r4Pairs = [["TBD", "TBD"], ["TBD", "TBD"]];

  // LB Final: 1 match – winner of R4 vs WB Final Loser
  const lbFinalPair = ["TBD", wbFinalLoser || "WB Final Loser"];

  return (
    <div className={s.viewport}>
      <div className={s.stage}>
        <div className={s.grid}>
          {/* COL 1: LB Round 1 */}
          <Round title="LB Round 1">
            {r1Pairs.map((p, i) => (
              <Pair key={`r1-${i}`} top={p[0]} bot={p[1]} />
            ))}
          </Round>

          {/* COL 2: LB Round 2 (WB R2 drop-ins) */}
          <Round title="LB Round 2 (WB R2 drop-ins)">
            {r2Pairs.map((p, i) => (
              <Pair key={`r2-${i}`} top={p[0]} bot={p[1]} join />
            ))}
          </Round>

          {/* COL 3: LB Round 3A */}
          <Round title="LB Round 3A">
            {r3aPairs.map((p, i) => (
              <Pair key={`r3a-${i}`} top={p[0]} bot={p[1]} join />
            ))}
          </Round>

          {/* COL 4: LB Round 3B (WB SF drop-ins) */}
          <Round title="LB Round 3B (WB SF drop-ins)">
            {r3bPairs.map((p, i) => (
              <Pair key={`r3b-${i}`} top={p[0]} bot={p[1]} join />
            ))}
          </Round>

          {/* COL 5: LB Round 4 */}
          <Round title="LB Round 4">
            {r4Pairs.map((p, i) => (
              <Pair key={`r4-${i}`} top={p[0]} bot={p[1]} join />
            ))}
          </Round>

          {/* COL 6: LB Final */}
          <Round title="LB Final">
            <Pair top={lbFinalPair[0]} bot={lbFinalPair[1]} join />
          </Round>

          {/* COL 7: LB Winner */}
          <div className={s.lbFinalCol}>
            <div className={s.lbWinnerTitle}>LB Winner</div>
            <div className={s.lbWinnerBox}>{lbWinner || "TBD"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- primitives ---------- */

function Round({ title, children }) {
  return (
    <div className={s.round}>
      <div className={s.roundTitle}>{title}</div>
      <div className={s.stack}>{children}</div>
    </div>
  );
}

function Pair({ top = "TBD", bot = "TBD", join = false }) {
  return (
    <div className={`${s.pair} ${join ? s.join : ""}`}>
      <div className={s.slot} title={top}><span className={s.label}>{top}</span></div>
      <div className={s.slot} title={bot}><span className={s.label}>{bot}</span></div>
    </div>
  );
}
