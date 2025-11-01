// components/LosersBracket16.jsx
import React from "react";
import s from "../styles/LosersBracket16.module.css";

/**
 * Losers bracket (compact) for a 16-player double-elimination.
 * Columns: R1 → R2 (WB R2 drop-ins) → R3A → R3B (WB SF drop-ins) → R4 → LB Final → LB Winner
 * Notes are shown under pairs to indicate sources (WB R2 / WB SF / WB Final Loser).
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
  showSourceLabels = true,
}) {
  // utilities
  const pairs = (list) => {
    const out = [];
    for (let i = 0; i < list.length; i += 2) out.push([list[i] ?? "TBD", list[i + 1] ?? "TBD"]);
    return out;
  };

  // R1: 8 players -> 4 matches
  const r1Pairs = pairs(lbR1.length ? lbR1 : [
    "LB P1","LB P2","LB P3","LB P4","LB P5","LB P6","LB P7","LB P8",
  ]);

  // R2: 4 matches: (TBD) vs (WB R2 Loser X)
  const r2Pairs = dropR2.map((d) => ["TBD", d || "TBD"]);
  const r2Notes = r2Pairs.map(() => (showSourceLabels ? "vs WB R2 Loser" : null));

  // R3A: 2 matches (TBD vs TBD)
  const r3aPairs = [["TBD", "TBD"], ["TBD", "TBD"]];

  // R3B: drop-ins from WB SF – (TBD) vs (WB SF Loser X)
  const r3bPairs = dropSF.map((d) => ["TBD", d || "TBD"]);
  const r3bNotes = r3bPairs.map(() => (showSourceLabels ? "vs WB SF Loser" : null));

  // R4: 2 matches (TBD vs TBD)
  const r4Pairs = [["TBD", "TBD"], ["TBD", "TBD"]];

  // LB Final: (TBD) vs (WB Final Loser)
  const lbFinalPair = ["TBD", wbFinalLoser || "WB Final Loser"];
  const lbFinalNote = showSourceLabels ? "WB Final Loser" : null;

  return (
    <div className={s.viewport}>
      <div className={s.stage}>
        <div className={s.grid}>
          {/* 1) LB Round 1 */}
          <Round title="LB Round 1">
            {r1Pairs.map((p, i) => (
              <Pair key={`r1-${i}`} top={p[0]} bot={p[1]} />
            ))}
          </Round>

          {/* 2) LB Round 2 (WB R2 drop-ins) */}
          <Round title="LB Round 2 (WB R2 drop-ins)">
            {r2Pairs.map((p, i) => (
              <Pair key={`r2-${i}`} top={p[0]} bot={p[1]} join note={r2Notes[i]} />
            ))}
          </Round>

          {/* 3) LB Round 3A */}
          <Round title="LB Round 3A">
            {r3aPairs.map((p, i) => (
              <Pair key={`r3a-${i}`} top={p[0]} bot={p[1]} join />
            ))}
          </Round>

          {/* 4) LB Round 3B (WB SF drop-ins) */}
          <Round title="LB Round 3B (WB SF drop-ins)">
            {r3bPairs.map((p, i) => (
              <Pair key={`r3b-${i}`} top={p[0]} bot={p[1]} join note={r3bNotes[i]} />
            ))}
          </Round>

          {/* 5) LB Round 4 */}
          <Round title="LB Round 4">
            {r4Pairs.map((p, i) => (
              <Pair key={`r4-${i}`} top={p[0]} bot={p[1]} join />
            ))}
          </Round>

          {/* 6) LB Final */}
          <Round title="LB Final">
            <Pair top={lbFinalPair[0]} bot={lbFinalPair[1]} join note={lbFinalNote} />
          </Round>

          {/* 7) LB Winner */}
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

function Pair({ top = "TBD", bot = "TBD", join = false, note = null }) {
  return (
    <div className={`${s.pair} ${join ? s.join : ""}`}>
      <div className={s.slot} title={top}><span className={s.label}>{top}</span></div>
      <div className={s.slot} title={bot}><span className={s.label}>{bot}</span></div>
      {note ? <div className={s.note}>{note}</div> : null}
    </div>
  );
}
