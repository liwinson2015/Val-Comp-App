// components/LosersBracket.jsx
import React from "react";
import s from "../styles/LosersBracket.module.css";

/**
 * Losers Bracket (double-elim) compact view.
 * Shows LB R1 -> R2A/R2B -> R3A/R3B -> R4 -> LB Final.
 * At the far right, it renders a small "LB Winner" box so the result is explicit.
 *
 * Props:
 *  - data: {
 *      r1: [ "LB P1", "LB P2", ..., "LB P8" ]          // 8 seeds (display only)
 *      r2a: [["TBD","WB R2 Loser 1"], ...]             // 4 matches
 *      r3a: [["TBD","TBD"], ...]                        // 2 matches
 *      r3b: [["TBD","WB SF Loser 1"], ...]              // 2 matches (drop-ins)
 *      r4:  [["TBD","TBD"], ...]                        // 2 matches
 *      final: ["TBD","WB Final Loser"]                  // LB Final (2 players)
 *      lbWinner: "TBD"                                  // <- winner of LB Final (displayed & export)
 *    }
 */
export default function LosersBracket({ data = {} }) {
  const r1 = data.r1 ?? [
    "LB P1", "LB P2", "LB P3", "LB P4", "LB P5", "LB P6", "LB P7", "LB P8",
  ];

  const r2a = data.r2a ?? [
    ["TBD", "WB R2 Loser 1"],
    ["TBD", "WB R2 Loser 2"],
    ["TBD", "WB R2 Loser 3"],
    ["TBD", "WB R2 Loser 4"],
  ];

  const r3a = data.r3a ?? [
    ["TBD", "TBD"],
    ["TBD", "TBD"],
  ];

  const r3b = data.r3b ?? [
    ["TBD", "WB SF Loser 1"],
    ["TBD", "WB SF Loser 2"],
  ];

  const r4 = data.r4 ?? [
    ["TBD", "TBD"],
    ["TBD", "TBD"],
  ];

  const lbFinal = data.final ?? ["TBD", "WB Final Loser"];
  const lbWinner = data.lbWinner ?? "TBD";

  return (
    <div className={s.viewport}>
      <div className={s.title}>LOSERS BRACKET</div>

      <div className={s.grid}>
        {/* LB ROUND 1 (labels only, 8 seeds) */}
        <Column title="LB ROUND 1">
          {r1.map((name, i) => (
            <OneSlot key={`r1-${i}`} label={name} />
          ))}
        </Column>

        {/* LB ROUND 2 (WB R2 drop-ins) */}
        <Column title="LB ROUND 2 (WB R2 DROP-INS)">
          {r2a.map((m, i) => (
            <Pair key={`r2a-${i}`} top={m[0]} bot={m[1]} />
          ))}
        </Column>

        {/* LB ROUND 3A (winners from R2A) */}
        <Column title="LB ROUND 3A">
          {r3a.map((m, i) => (
            <Pair key={`r3a-${i}`} top={m[0]} bot={m[1]} />
          ))}
        </Column>

        {/* LB ROUND 3B (WB SF drop-ins) */}
        <Column title="LB ROUND 3B (WB SF DROP-INS)">
          {r3b.map((m, i) => (
            <Pair key={`r3b-${i}`} top={m[0]} bot={m[1]} />
          ))}
        </Column>

        {/* LB ROUND 4 */}
        <Column title="LB ROUND 4">
          {r4.map((m, i) => (
            <Pair key={`r4-${i}`} top={m[0]} bot={m[1]} />
          ))}
        </Column>

        {/* LB FINAL (shows winner to the right) */}
        <div className={s.finalCol}>
          <div className={s.roundTitle}>LB FINAL</div>
          <Pair top={lbFinal[0]} bot={lbFinal[1]} />
        </div>

        {/* LB WINNER RESULT */}
        <div className={s.winnerCol}>
          <div className={s.winnerTitle}>LB WINNER</div>
          <div className={s.arm} aria-hidden="true" />
          <div className={s.winnerBox} title={lbWinner}>
            <span className={s.winnerText}>{lbWinner}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== Reusable bits ===== */

function Column({ title, children }) {
  return (
    <div className={s.col}>
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
      {/* vertical join + right stub via CSS */}
    </div>
  );
}

function OneSlot({ label = "TBD" }) {
  return (
    <div className={s.oneSlot} title={label}>
      <span className={s.label}>{label}</span>
    </div>
  );
}
