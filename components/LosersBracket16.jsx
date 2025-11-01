// components/LosersBracket16.jsx
import React from "react";
import s from "../styles/LosersBracket16.module.css";

/**
 * Losers bracket (compact) for a 16-player double-elimination.
 * Drop-ins are now rendered INSIDE the boxes (no 'vs' notes outside).
 */
export default function LosersBracket16({
  lbR1 = [
    "LB P1","LB P2","LB P3","LB P4",
    "LB P5","LB P6","LB P7","LB P8",
  ],
  dropR2 = ["WB R2 Loser 1","WB R2 Loser 2","WB R2 Loser 3","WB R2 Loser 4"],
  dropSF = ["WB SF Loser 1","WB SF Loser 2"],
  wbFinalLoser = "WB Final Loser",
  lbWinner = "TBD",
}) {
  const pairs = (list) => {
    const out = [];
    for (let i = 0; i < list.length; i += 2) out.push([list[i] ?? "TBD", list[i + 1] ?? "TBD"]);
    return out;
  };

  // LB Round 1 – 8 players -> 4 matches
  const r1Pairs = pairs(lbR1);

  // LB Round 2 – lower player = WB R2 Loser
  const r2Pairs = dropR2.map((d) => ["TBD", d || "TBD"]);

  // LB Round 3A – 2 matches
  const r3aPairs = [["TBD", "TBD"], ["TBD", "TBD"]];

  // LB Round 3B – lower player = WB SF Loser
  const r3bPairs = dropSF.map((d) => ["TBD", d || "TBD"]);

  // LB Round 4 – 2 matches
  const r4Pairs = [["TBD", "TBD"], ["TBD", "TBD"]];

  // LB Final – lower player = WB Final Loser
  const lbFinalPair = ["TBD", wbFinalLoser || "WB Final Loser"];

  return (
    <div className={s.viewport}>
      <div className={s.stage}>
        <div className={s.grid}>
          {/* LB Round 1 */}
          <Round title="LB Round 1">
            {r1Pairs.map((p, i) => (
              <Pair key={`r1-${i}`} top={p[0]} bot={p[1]} />
            ))}
          </Round>

          {/* LB Round 2 (WB R2 drop-ins) */}
          <Round title="LB Round 2 (WB R2 drop-ins)">
            {r2Pairs.map((p, i) => (
              <Pair key={`r2-${i}`} top={p[0]} bot={p[1]} join />
            ))}
          </Round>

          {/* LB Round 3A */}
          <Round title="LB Round 3A">
            {r3aPairs.map((p, i) => (
              <Pair key={`r3a-${i}`} top={p[0]} bot={p[1]} join />
            ))}
          </Round>

          {/* LB Round 3B (WB SF drop-ins) */}
          <Round title="LB Round 3B (WB SF drop-ins)">
            {r3bPairs.map((p, i) => (
              <Pair key={`r3b-${i}`} top={p[0]} bot={p[1]} join />
            ))}
          </Round>

          {/* LB Round 4 */}
          <Round title="LB Round 4">
            {r4Pairs.map((p, i) => (
              <Pair key={`r4-${i}`} top={p[0]} bot={p[1]} join />
            ))}
          </Round>

          {/* LB Final */}
          <Round title="LB Final">
            <Pair top={lbFinalPair[0]} bot={lbFinalPair[1]} join />
          </Round>

          {/* LB Winner */}
          <div className={s.lbFinalCol}>
            <div className={s.lbWinnerTitle}>LB Winner</div>
            <div className={s.lbWinnerBox}>{lbWinner || "TBD"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Helper components */

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
      <div className={s.slot}><span className={s.label}>{top}</span></div>
      <div className={s.slot}><span className={s.label}>{bot}</span></div>
    </div>
  );
}
