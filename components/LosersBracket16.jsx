// components/LosersBracket16.jsx
import React from "react";
import s from "../styles/LosersBracket16.module.css";

/**
 * Losers bracket for 16-player double elimination (compact, centered).
 * Exact round sizes:
 *   R1: 4 matches (8 players)
 *   R2 (WB R2 drop-ins): 4 matches
 *   R3A: 2 matches
 *   R3B (WB SF drop-ins): 2 matches
 *   R4: 1 match
 *   LB Final: 1 match
 *   LB Winner: pill
 *
 * All "drop-in" labels are INSIDE boxes (no external “vs …” text).
 */
export default function LosersBracket16({
  r1 = Array(4).fill(["TBD", "TBD"]),
  r2 = [
    ["TBD", "WB R2 Loser"],
    ["TBD", "WB R2 Loser"],
    ["TBD", "WB R2 Loser"],
    ["TBD", "WB R2 Loser"],
  ],
  r3a = Array(2).fill(["TBD", "TBD"]),
  r3b = [
    ["TBD", "WB SF Loser 1"],
    ["TBD", "WB SF Loser 2"],
  ],
  r4 = Array(1).fill(["TBD", "TBD"]),
  lbFinal = ["TBD", "WB Final Loser"],
  lbWinner = "TBD",
}) {
  return (
    <div className={s.lbViewport}>
      <div className={s.lbStage}>
        <div className={s.lbGrid}>
          {/* R1 — 4 matches */}
          <Round title="LB Round 1" cls="r1">
            {r1.slice(0, 4).map((m, i) => (
              <Pair key={`r1-${i}`} top={m[0]} bot={m[1]} />
            ))}
          </Round>

          {/* R2 — 4 matches (WB R2 drop-ins) */}
          <Round title="LB Round 2 (WB R2 drop-ins)" cls="r2">
            {r2.slice(0, 4).map((m, i) => (
              <Pair key={`r2-${i}`} top={m[0]} bot={m[1]} />
            ))}
          </Round>

          {/* R3A — 2 matches (winners from R2) */}
          <Round title="LB Round 3A" cls="r3a">
            {r3a.slice(0, 2).map((m, i) => (
              <Pair key={`r3a-${i}`} top={m[0]} bot={m[1]} />
            ))}
          </Round>

          {/* R3B — 2 matches (WB SF drop-ins) */}
          <Round title="LB Round 3B (WB SF drop-ins)" cls="r3b">
            {r3b.slice(0, 2).map((m, i) => (
              <Pair key={`r3b-${i}`} top={m[0]} bot={m[1]} />
            ))}
          </Round>

          {/* R4 — 1 match */}
          <Round title="LB Round 4" cls="r4">
            {r4.slice(0, 1).map((m, i) => (
              <Pair key={`r4-${i}`} top={m[0]} bot={m[1]} />
            ))}
          </Round>

          {/* LB Final — 1 match */}
          <Round title="LB Final" cls="rFinal">
            <Pair top={lbFinal[0]} bot={lbFinal[1]} />
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

function Round({ title, cls, children }) {
  return (
    <div className={`${s.round} ${s[cls] || ""}`}>
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
      <div className={s.slot} title={bot}>
        <span className={s.label}>{bot}</span>
      </div>
    </div>
  );
}
