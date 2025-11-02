// components/LosersBracket16.jsx
import React from "react";
import s from "../styles/LosersBracket16.module.css";

/**
 * Losers bracket for 16-player double elimination (compact, centered).
 * Supports TWO ways to provide data:
 *  1) Single object prop `data` with keys:
 *     { R1, R2A, R2B, R3A, R3B, R4, LBF, LBWinner }
 *     - R1: 4 matches -> [["A","B"],["C","D"],["E","F"],["G","H"]]
 *     - R2A: 2 matches -> [["wR1-1","wR1-2"],["wR1-3","wR1-4"]]
 *     - R2B: 2 matches -> [["WB R2 Loser 1","TBD"],["WB R2 Loser 2","TBD"]] (labels INSIDE boxes)
 *     - R3A: 2 matches
 *     - R3B: 2 matches (WB SF drop-ins)
 *     - R4:  1 match
 *     - LBF: ["LB finalist","WB Final Loser"]
 *     - LBWinner: "TBD"
 *
 *  2) Backward-compat props: r1, r2, r3a, r3b, r4, lbFinal, lbWinner
 */

export default function LosersBracket16(props) {
  const norm = normalize(props);

  return (
    <div className={s.lbViewport}>
      <div className={s.lbStage}>
        <div className={s.lbGrid}>
          {/* R1 — 4 matches (8 players) */}
          <Round title="LB Round 1" cls="r1">
            {norm.R1.map((m, i) => (
              <Pair key={`r1-${i}`} top={m[0]} bot={m[1]} />
            ))}
          </Round>

          {/* R2 — 4 matches (WB R2 drop-ins paired with R2A) */}
          <Round title="LB Round 2 (WB R2 drop-ins)" cls="r2">
            {norm.R2.map((m, i) => (
              <Pair key={`r2-${i}`} top={m[0]} bot={m[1]} />
            ))}
          </Round>

          {/* R3A — 2 matches */}
          <Round title="LB Round 3A" cls="r3a">
            {norm.R3A.map((m, i) => (
              <Pair key={`r3a-${i}`} top={m[0]} bot={m[1]} />
            ))}
          </Round>

          {/* R3B — 2 matches (WB SF drop-ins) */}
          <Round title="LB Round 3B (WB SF drop-ins)" cls="r3b">
            {norm.R3B.map((m, i) => (
              <Pair key={`r3b-${i}`} top={m[0]} bot={m[1]} />
            ))}
          </Round>

          {/* R4 — 1 match */}
          <Round title="LB Round 4" cls="r4">
            <Pair top={norm.R4[0][0]} bot={norm.R4[0][1]} />
          </Round>

          {/* LB Final — 1 match */}
          <Round title="LB Final" cls="rFinal">
            <Pair top={norm.LBF[0]} bot={norm.LBF[1]} />
          </Round>

          {/* LB Winner pill */}
          <div className={s.lbWinnerCol}>
            <div className={s.lbWinnerTitle}>LB Winner</div>
            <div className={s.lbWinnerPill}>
              <span className={s.lbWinnerText}>{norm.LBWinner}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

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

function normalize(props) {
  // If a single `data` object is provided, prefer that
  const d = props.data;
  if (d) {
    return {
      R1: ensurePairs(d.R1, 4, "LB P"),
      R2: mergePairs(d.R2A, d.R2B, 2, "WB R2 Loser"),
      R3A: ensurePairs(d.R3A, 2, "TBD"),
      R3B: ensurePairs(
        d.R3B ?? [
          ["TBD", "WB SF Loser 1"],
          ["TBD", "WB SF Loser 2"],
        ],
        2,
        "TBD"
      ),
      R4: ensurePairs(d.R4, 1, "TBD"),
      LBF: Array.isArray(d.LBF) ? d.LBF : ["TBD", "WB Final Loser"],
      LBWinner: d.LBWinner ?? "TBD",
    };
  }

  // Backward-compat with your previous props (r1, r2, r3a, r3b, r4, lbFinal, lbWinner)
  const r1 = props.r1 ?? Array(4).fill(["TBD", "TBD"]);
  const r2 = props.r2 ?? [
    ["TBD", "WB R2 Loser"],
    ["TBD", "WB R2 Loser"],
    ["TBD", "WB R2 Loser"],
    ["TBD", "WB R2 Loser"],
  ];
  const r3a = props.r3a ?? Array(2).fill(["TBD", "TBD"]);
  const r3b = props.r3b ?? [
    ["TBD", "WB SF Loser 1"],
    ["TBD", "WB SF Loser 2"],
  ];
  const r4 = props.r4 ?? Array(1).fill(["TBD", "TBD"]);
  const lbFinal = props.lbFinal ?? ["TBD", "WB Final Loser"];
  const lbWinner = props.lbWinner ?? "TBD";

  return {
    R1: ensurePairs(r1, 4, "LB P"),
    // r2 already comes as 4 matches; keep as-is
    R2: ensurePairs(r2, 4, "TBD"),
    R3A: ensurePairs(r3a, 2, "TBD"),
    R3B: ensurePairs(r3b, 2, "TBD"),
    R4: ensurePairs(r4, 1, "TBD"),
    LBF: lbFinal,
    LBWinner: lbWinner,
  };
}

function ensurePairs(arr, needed, filler) {
  const out = Array.from({ length: needed }, (_, i) => {
    const v = arr?.[i];
    if (Array.isArray(v) && v.length >= 2) return [String(v[0] ?? "TBD"), String(v[1] ?? "TBD")];
    return [filler, "TBD"];
  });
  return out;
}

/**
 * Merge R2A (2 matches) and R2B (2 drop-in matches) into 4 matches list.
 * If either side is missing, fall back gracefully.
 */
function mergePairs(r2a, r2b, needed, dropInLabelBase) {
  const a = ensurePairs(r2a ?? [], needed, "TBD");
  const b = ensurePairs(
    r2b ??
      [
        ["TBD", `${dropInLabelBase} 1`],
        ["TBD", `${dropInLabelBase} 2`],
      ],
    needed,
    "TBD"
  );
  // Interleave A1,B1,A2,B2 -> total 4 matches
  return [a[0], b[0], a[1], b[1]];
}
